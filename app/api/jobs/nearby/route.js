import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';
import { MongoClient } from 'mongodb';
import { validateAndSanitize, addSecurityHeaders } from '../../../../utils/validation';
import { NearbyJobsQueryBuilder, FallbackQueryBuilder, QueryResultProcessor } from '../../../../utils/queryOptimization';

const uri = process.env.MONGODB_URI;
let client;

async function connectToDatabase() {
  if (!client) {
    client = new MongoClient(uri);
    await client.connect();
  }
  return client.db('fixly');
}

export async function POST(request) {
  try {
    const body = await request.json();
    
    // Enhanced input validation with proper error handling
    const latitude = validateAndSanitize.number(body.latitude, { 
      min: -90, 
      max: 90, 
      required: true 
    });
    
    const longitude = validateAndSanitize.number(body.longitude, { 
      min: -180, 
      max: 180, 
      required: true 
    });
    
    const radius = validateAndSanitize.number(body.radius, { 
      min: 1, 
      max: 100 // Max 100km for security
    }) || 10;
    
    const limit = validateAndSanitize.number(body.limit, { 
      min: 1, 
      max: 50 // Max 50 per request for performance
    }) || 20;
    
    const offset = validateAndSanitize.number(body.offset, { 
      min: 0, 
      max: 10000 // Prevent excessive pagination
    }) || 0;

    // Validate and sanitize filters
    const filters = body.filters || {};
    const sanitizedFilters = {};
    
    if (filters.minBudget) {
      sanitizedFilters.minBudget = validateAndSanitize.number(filters.minBudget, { min: 0, max: 1000000 });
    }
    if (filters.maxBudget) {
      sanitizedFilters.maxBudget = validateAndSanitize.number(filters.maxBudget, { min: 0, max: 1000000 });
    }
    if (filters.category && typeof filters.category === 'string') {
      sanitizedFilters.category = filters.category.trim().toLowerCase();
    }
    if (filters.urgency && typeof filters.urgency === 'string') {
      const validUrgency = ['asap', 'flexible', 'scheduled'];
      if (validUrgency.includes(filters.urgency)) {
        sanitizedFilters.urgency = filters.urgency;
      }
    }
    if (filters.skills && Array.isArray(filters.skills)) {
      sanitizedFilters.skills = filters.skills.slice(0, 20).map(skill => 
        typeof skill === 'string' ? skill.trim().toLowerCase() : ''
      ).filter(Boolean);
    }

    // Validate sort parameters
    const validSortBy = ['distance', 'date', 'salary', 'rating'];
    const sortBy = validSortBy.includes(body.sortBy) ? body.sortBy : 'distance';
    const sortOrder = [1, -1].includes(body.sortOrder) ? body.sortOrder : 1;

    const db = await connectToDatabase();
    const jobs = db.collection('jobs');

    // Initialize optimized query builder and result processor
    const queryBuilder = new NearbyJobsQueryBuilder();
    const resultProcessor = new QueryResultProcessor({ lat: latitude, lng: longitude });
    
    let queryResult;
    
    try {
      // Build optimized geospatial aggregation pipeline
      const { pipeline, options } = queryBuilder
        .addGeoNearStage(latitude, longitude, radius * 1000, sanitizedFilters)
        .addProjection(false) // List view - minimal details
        .addCreatorLookup(true) // Minimal creator info for performance
        .addSort(sortBy, sortOrder)
        .addFacetedPagination(offset, limit, offset === 0 && limit <= 20)
        .buildWithHints();

      // Execute optimized query with performance hints
      const results = await jobs.aggregate(pipeline, options).toArray();
      
      // Process results efficiently
      queryResult = resultProcessor.processFacetedResults(results, limit);
      
    } catch (geoError) {
      // Secure error logging - don't expose internal details
      console.error('Geospatial query failed, using fallback. Error type:', geoError.name);
      
      // Log detailed error server-side only (not exposed to client)
      if (process.env.NODE_ENV === 'development') {
        console.log('Geospatial error details:', geoError.message);
      }
      
      // Use optimized fallback query builder
      const fallbackBuilder = new FallbackQueryBuilder(sanitizedFilters);
      const { query: fallbackQuery, options: fallbackOptions } = fallbackBuilder
        .addFilters()
        .addLocationFilter(latitude, longitude, radius)
        .build();

      // Execute optimized fallback query
      const fallbackResults = await jobs
        .find(fallbackQuery, fallbackOptions)
        .skip(offset)
        .limit(limit + 1) // Get one extra for hasMore detection
        .sort(getSortCriteria(sortBy, sortOrder, false))
        .toArray();

      // Process fallback results with distance calculation
      const processedFallback = fallbackResults.map(job => 
        resultProcessor.processJobItem(job)
      ).filter(job => {
        // Filter by radius if distance was calculated
        return !job.distance || job.distance <= radius * 1000;
      });

      queryResult = {
        jobs: processedFallback.slice(0, limit), // Remove extra item
        hasMore: processedFallback.length > limit,
        total: null // Don't calculate total for fallback queries
      };
    }

    // Optional: Add user personalization (if performance allows)
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    // Apply personalization if user is logged in (lightweight version)
    if (userId && queryResult.jobs.length > 0) {
      try {
        // Lightweight personalization - just add user preference indicators
        const userPrefs = await db.collection('users').findOne(
          { _id: userId },
          { projection: { skills: 1, 'preferences.preferredCategories': 1 } }
        );

        if (userPrefs) {
          queryResult.jobs = queryResult.jobs.map(job => ({
            ...job,
            matchesUserSkills: userPrefs.skills?.some(skill => 
              job.skillsRequired?.includes(skill.name?.toLowerCase())
            ) || false,
            matchesPreferences: userPrefs.preferences?.preferredCategories?.includes(job.category) || false
          }));
        }
      } catch (perfError) {
        // Don't fail the request if personalization fails
        console.warn('Personalization failed:', perfError.name);
      }
    }

    // Lightweight analytics tracking (async to not block response)
    if (userId) {
      // Fire and forget analytics
      setImmediate(() => {
        db.collection('analytics').insertOne({
          userId,
          action: 'nearby_jobs_search',
          location: { latitude, longitude },
          radius,
          resultsCount: queryResult.jobs.length,
          timestamp: new Date()
        }).catch(err => console.warn('Analytics tracking failed:', err.name));
      });
    }

    // Create response with security headers using optimized results
    const response = NextResponse.json({
      success: true,
      jobs: queryResult.jobs,
      pagination: {
        offset: offset,
        limit: limit,
        returned: queryResult.jobs.length,
        hasMore: queryResult.hasMore,
        ...(queryResult.total !== null && { total: queryResult.total }),
        nextOffset: queryResult.hasMore ? offset + limit : null
      },
      location: { latitude, longitude },
      radius: radius,
      filters: {
        sortBy,
        sortOrder,
        ...sanitizedFilters
      },
      performance: {
        queryType: queryResult.total !== null ? 'geospatial_with_count' : 'optimized',
        timestamp: new Date().toISOString()
      }
    });

    // Add security headers
    return addSecurityHeaders(response);

  } catch (error) {
    // Secure error logging - don't expose internal details
    console.error('Nearby jobs search error:', error.name, error.message);
    
    // Determine appropriate error response based on error type
    let statusCode = 500;
    let message = 'An error occurred while searching for nearby jobs';
    
    if (error.message.includes('required') || error.message.includes('Invalid')) {
      statusCode = 400;
      message = error.message;
    } else if (error.name === 'ValidationError') {
      statusCode = 400;
      message = 'Invalid input parameters';
    }
    
    const errorResponse = NextResponse.json(
      { 
        success: false,
        error: message,
        code: 'NEARBY_JOBS_ERROR'
      },
      { status: statusCode }
    );
    
    return addSecurityHeaders(errorResponse);
  }
}

// Get sort criteria for MongoDB queries
function getSortCriteria(sortBy, sortOrder = 1, isGeoQuery = true) {
  const order = parseInt(sortOrder) || 1;
  
  switch (sortBy) {
    case 'date':
    case 'createdAt':
      return { createdAt: -order }; // Newest first by default
    case 'salary':
    case 'budget':
      return { 'salary.min': order, 'salary.max': order };
    case 'rating':
      return { 'client.rating': -order }; // Highest rating first
    case 'applications':
      return { applicationsCount: -order }; // Most applications first
    case 'views':
      return { viewCount: -order }; // Most viewed first
    case 'distance':
    default:
      if (isGeoQuery) {
        return { distance: order }; // Closest first by default
      } else {
        return { createdAt: -1 }; // Fallback to date for non-geo queries
      }
  }
}

// Calculate job relevance score based on user profile
function calculateRelevanceScore(job, userProfile) {
  if (!userProfile) return 0;

  let score = 0;

  // Skill matching (40% weight)
  if (userProfile.skills && job.skills) {
    const matchingSkills = job.skills.filter(skill => 
      userProfile.skills.some(userSkill => 
        userSkill.name.toLowerCase() === skill.toLowerCase()
      )
    );
    const skillMatchRatio = matchingSkills.length / Math.max(job.skills.length, 1);
    score += skillMatchRatio * 40;
  }

  // Category preference (30% weight)
  if (userProfile.preferences?.preferredCategories) {
    if (userProfile.preferences.preferredCategories.includes(job.category)) {
      score += 30;
    }
  }

  // Budget preference (20% weight)
  if (userProfile.preferences?.budgetRange && job.budget) {
    const jobBudgetMin = job.budget.min || 0;
    const jobBudgetMax = job.budget.max || jobBudgetMin;
    const userBudgetMin = userProfile.preferences.budgetRange.min || 0;
    const userBudgetMax = userProfile.preferences.budgetRange.max || Infinity;
    
    if (jobBudgetMin >= userBudgetMin && jobBudgetMax <= userBudgetMax) {
      score += 20;
    } else if (jobBudgetMin <= userBudgetMax && jobBudgetMax >= userBudgetMin) {
      score += 10; // Partial overlap
    }
  }

  // Experience level match (10% weight)
  if (userProfile.completedJobs && job.requirements?.experienceLevel) {
    const userExperienceLevel = getUserExperienceLevel(userProfile.completedJobs);
    if (userExperienceLevel === job.requirements.experienceLevel) {
      score += 10;
    }
  }

  return Math.min(score, 100); // Cap at 100
}

function getUserExperienceLevel(completedJobs) {
  const count = completedJobs || 0;
  if (count < 5) return 'beginner';
  if (count < 20) return 'intermediate';
  return 'expert';
}

// Calculate distance between two points using Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in kilometers
}

function toRad(value) {
  return (value * Math.PI) / 180;
}