// utils/queryOptimization.js - Database query optimization utilities
import { validateAndSanitize } from './validation';

/**
 * Optimized aggregation pipeline builder for nearby jobs
 * Reduces database load and improves response times
 */
export class NearbyJobsQueryBuilder {
  constructor() {
    this.pipeline = [];
    this.facetPipeline = null;
  }

  /**
   * Add geospatial matching with optimized indexing
   * @param {number} latitude - User latitude
   * @param {number} longitude - User longitude  
   * @param {number} maxDistance - Maximum distance in meters
   * @param {Object} filters - Additional filters
   * @returns {NearbyJobsQueryBuilder} - Chain-able builder
   */
  addGeoNearStage(latitude, longitude, maxDistance, filters = {}) {
    const geoNearStage = {
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        distanceField: 'distance',
        maxDistance: maxDistance,
        spherical: true,
        key: 'location.coordinates',
        // Pre-filter at database level for performance
        query: {
          status: 'open',
          isActive: true,
          isDeleted: { $ne: true },
          // Only add filters that exist to avoid null checks
          ...(filters.minBudget && { 'budget.amount': { $gte: filters.minBudget } }),
          ...(filters.maxBudget && { 'budget.amount': { $lte: filters.maxBudget } }),
          ...(filters.category && { category: filters.category }),
          ...(filters.urgency && { urgency: filters.urgency }),
          ...(filters.skills?.length && { skillsRequired: { $in: filters.skills } }),
          // Index-friendly date filtering
          deadline: { $gte: new Date() },
          ...(filters.experienceLevel && { experienceLevel: filters.experienceLevel })
        }
      }
    };

    this.pipeline.push(geoNearStage);
    return this;
  }

  /**
   * Add efficient field projection to reduce data transfer
   * @param {boolean} includeDetails - Whether to include full details
   * @returns {NearbyJobsQueryBuilder}
   */
  addProjection(includeDetails = false) {
    const baseProjection = {
      $project: {
        title: 1,
        description: includeDetails ? 1 : { $substr: ['$description', 0, 200] }, // Truncate for list view
        skillsRequired: 1,
        budget: 1,
        urgency: 1,
        type: 1,
        location: {
          city: 1,
          state: 1,
          coordinates: 1
        },
        distance: 1,
        distanceKm: { $round: [{ $divide: ['$distance', 1000] }, 2] },
        createdAt: 1,
        deadline: 1,
        status: 1,
        featured: 1,
        featuredUntil: 1,
        estimatedDuration: 1,
        experienceLevel: 1,
        // Pre-calculate application count for performance
        applicationCount: { 
          $size: { 
            $filter: {
              input: { $ifNull: ['$applications', []] },
              cond: { $ne: ['$$this.status', 'withdrawn'] }
            }
          }
        },
        // Calculate time remaining at database level
        timeRemaining: {
          $let: {
            vars: {
              timeDiff: { $subtract: ['$deadline', new Date()] }
            },
            in: {
              $cond: {
                if: { $lte: ['$$timeDiff', 0] },
                then: 'expired',
                else: {
                  $let: {
                    vars: {
                      days: { $floor: { $divide: ['$$timeDiff', 86400000] } },
                      hours: { $floor: { $divide: [{ $mod: ['$$timeDiff', 86400000] }, 3600000] } }
                    },
                    in: {
                      $cond: {
                        if: { $gt: ['$$days', 0] },
                        then: { $concat: [{ $toString: '$$days' }, ' days'] },
                        else: { $concat: [{ $toString: '$$hours' }, ' hours'] }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        isUrgent: { $lte: [{ $subtract: ['$deadline', new Date()] }, 86400000] } // 24 hours in ms
      }
    };

    this.pipeline.push(baseProjection);
    return this;
  }

  /**
   * Add lookup for creator information (optimized)
   * @param {boolean} minimal - Whether to fetch minimal creator info
   * @returns {NearbyJobsQueryBuilder}
   */
  addCreatorLookup(minimal = true) {
    const lookup = {
      $lookup: {
        from: 'users',
        localField: 'createdBy',
        foreignField: '_id',
        as: 'creator',
        // Use pipeline for more efficient data fetching
        pipeline: [
          {
            $project: minimal ? {
              name: 1,
              username: 1,
              photoURL: 1,
              rating: 1,
              verificationStatus: 1
            } : {
              name: 1,
              username: 1,
              photoURL: 1,
              rating: 1,
              totalJobs: 1,
              verificationStatus: 1,
              location: { city: 1, state: 1 },
              memberSince: '$createdAt'
            }
          }
        ]
      }
    };

    // Unwind the creator array
    const unwind = {
      $unwind: {
        path: '$creator',
        preserveNullAndEmptyArrays: true
      }
    };

    this.pipeline.push(lookup, unwind);
    return this;
  }

  /**
   * Add efficient sorting with compound indexes
   * @param {string} sortBy - Sort field
   * @param {number} sortOrder - Sort direction (1 or -1)
   * @returns {NearbyJobsQueryBuilder}
   */
  addSort(sortBy = 'distance', sortOrder = 1) {
    let sortStage;

    switch (sortBy) {
      case 'distance':
        sortStage = { $sort: { distance: sortOrder } };
        break;
      case 'date':
        sortStage = { $sort: { createdAt: sortOrder, featured: -1 } }; // Featured first
        break;
      case 'budget':
        sortStage = { $sort: { 'budget.amount': sortOrder, distance: 1 } };
        break;
      case 'rating':
        sortStage = { $sort: { 'creator.rating': sortOrder, distance: 1 } };
        break;
      case 'deadline':
        sortStage = { $sort: { deadline: sortOrder, distance: 1 } };
        break;
      default:
        // Default to distance with featured jobs first
        sortStage = { $sort: { featured: -1, featuredUntil: -1, distance: 1 } };
    }

    this.pipeline.push(sortStage);
    return this;
  }

  /**
   * Add faceted pagination for better performance with counts
   * @param {number} offset - Skip count
   * @param {number} limit - Limit count
   * @param {boolean} includeTotal - Whether to include total count
   * @returns {NearbyJobsQueryBuilder}
   */
  addFacetedPagination(offset, limit, includeTotal = false) {
    const facetStage = {
      $facet: {
        data: [
          { $skip: offset },
          { $limit: limit + 1 } // Get one extra to check for more results
        ]
      }
    };

    // Only calculate total if needed (expensive operation)
    if (includeTotal && offset === 0 && limit <= 20) {
      facetStage.$facet.totalCount = [
        { $count: "count" }
      ];
    }

    this.facetPipeline = facetStage;
    return this;
  }

  /**
   * Build the final optimized pipeline
   * @returns {Array} - MongoDB aggregation pipeline
   */
  build() {
    if (this.facetPipeline) {
      this.pipeline.push(this.facetPipeline);
    }
    return this.pipeline;
  }

  /**
   * Build pipeline with performance hints
   * @returns {Object} - Pipeline with execution hints
   */
  buildWithHints() {
    return {
      pipeline: this.pipeline,
      options: {
        allowDiskUse: false, // Keep in memory for better performance
        maxTimeMS: 5000, // 5 second timeout
        hint: 'location.coordinates_2dsphere', // Force geospatial index usage
        collation: { locale: 'en', strength: 2 } // Case-insensitive sorting
      }
    };
  }
}

/**
 * Optimized fallback query builder for non-geospatial queries
 */
export class FallbackQueryBuilder {
  constructor(filters = {}) {
    this.filters = filters;
    this.query = {
      status: 'open',
      isActive: true,
      isDeleted: { $ne: true },
      deadline: { $gte: new Date() }
    };
    this.sortOptions = {};
  }

  /**
   * Add optimized filtering with compound indexes
   * @returns {FallbackQueryBuilder}
   */
  addFilters() {
    // Only add filters that exist to leverage sparse indexes
    if (this.filters.minBudget) {
      this.query['budget.amount'] = { ...this.query['budget.amount'], $gte: this.filters.minBudget };
    }
    if (this.filters.maxBudget) {
      this.query['budget.amount'] = { ...this.query['budget.amount'], $lte: this.filters.maxBudget };
    }
    if (this.filters.category) {
      this.query.category = this.filters.category;
    }
    if (this.filters.urgency) {
      this.query.urgency = this.filters.urgency;
    }
    if (this.filters.skills?.length) {
      this.query.skillsRequired = { $in: this.filters.skills };
    }
    if (this.filters.experienceLevel) {
      this.query.experienceLevel = this.filters.experienceLevel;
    }

    return this;
  }

  /**
   * Add location-based filtering when coordinates are available
   * @param {number} latitude - User latitude
   * @param {number} longitude - User longitude
   * @param {number} radius - Search radius in km
   * @returns {FallbackQueryBuilder}
   */
  addLocationFilter(latitude, longitude, radius) {
    // Use bounding box for initial filtering (faster than geo queries)
    const kmToDegree = radius / 111.32; // Rough conversion
    
    this.query.$and = [
      { 'location.lat': { $gte: latitude - kmToDegree, $lte: latitude + kmToDegree } },
      { 'location.lng': { $gte: longitude - kmToDegree, $lte: longitude + kmToDegree } }
    ];

    return this;
  }

  /**
   * Build query with performance optimizations
   * @returns {Object}
   */
  build() {
    return {
      query: this.query,
      options: {
        maxTimeMS: 3000, // 3 second timeout for fallback
        hint: { status: 1, createdAt: -1 } // Use compound index
      }
    };
  }
}

/**
 * Query result processor for consistent formatting
 */
export class QueryResultProcessor {
  constructor(userLocation) {
    this.userLocation = userLocation;
  }

  /**
   * Process faceted aggregation results
   * @param {Array} results - Raw aggregation results
   * @param {number} limit - Original limit
   * @returns {Object} - Processed results with pagination info
   */
  processFacetedResults(results, limit) {
    if (!results || results.length === 0) {
      return { jobs: [], hasMore: false, total: null };
    }

    const result = results[0];
    const jobs = result.data || [];
    const hasMore = jobs.length > limit;
    
    // Remove extra item used for hasMore detection
    if (hasMore) {
      jobs.pop();
    }

    // Extract total count if available
    const total = result.totalCount?.[0]?.count || null;

    return {
      jobs: jobs.map(job => this.processJobItem(job)),
      hasMore,
      total
    };
  }

  /**
   * Process individual job items with performance optimizations
   * @param {Object} job - Raw job data
   * @returns {Object} - Processed job data
   */
  processJobItem(job) {
    // Calculate distance if not already calculated
    if (!job.distance && this.userLocation && job.location?.lat && job.location?.lng) {
      const distance = this.calculateDistance(
        this.userLocation.lat,
        this.userLocation.lng,
        job.location.lat,
        job.location.lng
      );
      job.distance = distance * 1000; // Convert to meters
      job.distanceKm = Math.round(distance * 100) / 100;
    }

    // Ensure consistent data structure
    return {
      _id: job._id,
      title: job.title,
      description: job.description,
      skillsRequired: job.skillsRequired || [],
      budget: job.budget,
      location: {
        city: job.location?.city,
        state: job.location?.state,
        coordinates: job.location?.coordinates
      },
      urgency: job.urgency,
      type: job.type,
      deadline: job.deadline,
      estimatedDuration: job.estimatedDuration,
      experienceLevel: job.experienceLevel,
      distance: job.distance,
      distanceKm: job.distanceKm,
      timeRemaining: job.timeRemaining,
      isUrgent: job.isUrgent,
      featured: job.featured,
      applicationCount: job.applicationCount || 0,
      creator: job.creator,
      createdAt: job.createdAt
    };
  }

  /**
   * Efficient distance calculation using Haversine formula
   * @param {number} lat1 - First latitude
   * @param {number} lng1 - First longitude
   * @param {number} lat2 - Second latitude
   * @param {number} lng2 - Second longitude
   * @returns {number} - Distance in kilometers
   */
  calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }
}

export default {
  NearbyJobsQueryBuilder,
  FallbackQueryBuilder,
  QueryResultProcessor
};