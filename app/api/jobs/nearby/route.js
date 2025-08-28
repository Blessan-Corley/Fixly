import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';
import { MongoClient } from 'mongodb';

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
    const { 
      latitude, 
      longitude, 
      radius = 10, 
      limit = 20, // Reduced default for better performance
      offset = 0, // For pagination
      filters = {},
      sortBy = 'distance', // distance, date, salary, rating
      sortOrder = 1 // 1 for asc, -1 for desc
    } = await request.json();

    if (!latitude || !longitude) {
      return NextResponse.json(
        { error: 'Latitude and longitude are required' },
        { status: 400 }
      );
    }

    // Validate pagination parameters
    const validatedLimit = Math.min(Math.max(parseInt(limit) || 20, 1), 50); // Max 50 per request
    const validatedOffset = Math.max(parseInt(offset) || 0, 0);
    const validatedRadius = Math.min(Math.max(parseFloat(radius) || 10, 1), 100); // Max 100km

    const db = await connectToDatabase();
    const jobs = db.collection('jobs');

    // Try geospatial query first, fallback to regular query if no index
    let nearbyJobs;
    
    try {
      // Build aggregation pipeline for nearby jobs with geospatial query
      const pipeline = [
        {
          $geoNear: {
            near: {
              type: 'Point',
              coordinates: [parseFloat(longitude), parseFloat(latitude)]
            },
            distanceField: 'distance',
            maxDistance: validatedRadius * 1000, // Convert km to meters
            spherical: true,
            key: 'location', // Specify which field to use for geospatial search
            query: {
              isActive: true,
              isDeleted: { $ne: true },
              // Add additional filters
              ...(filters.minBudget && { 'budget.min': { $gte: filters.minBudget } }),
              ...(filters.maxBudget && { 'budget.max': { $lte: filters.maxBudget } }),
              ...(filters.category && { category: filters.category }),
              ...(filters.urgency && { urgency: filters.urgency }),
              ...(filters.skills && filters.skills.length > 0 && { 
                skills: { $in: filters.skills } 
              })
            }
          }
        },
      {
        $addFields: {
          distanceKm: { $round: [{ $divide: ['$distance', 1000] }, 2] }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'client',
          pipeline: [
            {
              $project: {
                fullName: 1,
                profilePicture: 1,
                rating: 1,
                totalJobs: 1,
                verificationStatus: 1
              }
            }
          ]
        }
      },
      {
        $unwind: {
          path: '$client',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          title: 1,
          description: 1,
          category: 1,
          subcategory: 1,
          budget: 1,
          urgency: 1,
          skills: 1,
          location: 1,
          distance: '$distance',
          distanceKm: 1,
          createdAt: 1,
          deadline: 1,
          applicationsCount: { $size: { $ifNull: ['$applications', []] } },
          client: 1,
          images: 1,
          requirements: 1,
          preferredTime: 1,
          estimatedDuration: 1
        }
      },
      {
        $sort: getSortCriteria(sortBy, sortOrder)
      },
      {
        $skip: validatedOffset
      },
      {
        $limit: validatedLimit + 1 // Get one extra to check if there are more
      }
    ];

      nearbyJobs = await jobs.aggregate(pipeline).toArray();
      
    } catch (geoError) {
      // Fallback to regular query if geospatial index is missing
      console.warn('Geospatial query failed, using fallback:', geoError.message);
      
      const fallbackQuery = {
        isActive: true,
        isDeleted: { $ne: true },
        ...(filters.minBudget && { 'budget.min': { $gte: filters.minBudget } }),
        ...(filters.maxBudget && { 'budget.max': { $lte: filters.maxBudget } }),
        ...(filters.category && { category: filters.category }),
        ...(filters.urgency && { urgency: filters.urgency }),
        ...(filters.skills && filters.skills.length > 0 && { 
          skills: { $in: filters.skills } 
        })
      };

      nearbyJobs = await jobs.find(fallbackQuery)
        .skip(validatedOffset)
        .limit(validatedLimit)
        .sort(getSortCriteria(sortBy, sortOrder, false))
        .toArray();

      // Calculate distance manually for fallback results
      nearbyJobs = nearbyJobs.map(job => {
        if (job.location && job.location.coordinates) {
          const [jobLng, jobLat] = job.location.coordinates;
          const distance = calculateDistance(latitude, longitude, jobLat, jobLng) * 1000; // Convert to meters
          return {
            ...job,
            distance,
            distanceKm: Math.round(distance / 1000 * 100) / 100
          };
        }
        return {
          ...job,
          distance: null,
          distanceKm: null
        };
      }).filter(job => {
        // Filter by radius if distance could be calculated
        if (job.distance !== null) {
          return job.distance <= validatedRadius * 1000;
        }
        return true; // Include jobs without location data
      }).sort((a, b) => {
        if (a.distance === null && b.distance === null) return 0;
        if (a.distance === null) return 1;
        if (b.distance === null) return -1;
        return a.distance - b.distance;
      });
    }

    // Get user session to check for personalized recommendations
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    // Add personalization if user is logged in
    if (userId) {
      // Get user profile for better matching
      const userProfile = await db.collection('users').findOne(
        { _id: userId },
        { projection: { skills: 1, preferences: 1, completedJobs: 1 } }
      );

      // Add relevance score based on user skills and preferences
      nearbyJobs.forEach(job => {
        job.relevanceScore = calculateRelevanceScore(job, userProfile);
      });

      // Sort by combination of distance and relevance for logged-in users
      nearbyJobs.sort((a, b) => {
        const aScore = (a.relevanceScore * 0.4) + ((10 - a.distanceKm) * 0.6);
        const bScore = (b.relevanceScore * 0.4) + ((10 - b.distanceKm) * 0.6);
        return bScore - aScore;
      });
    }

    // Track nearby job searches for analytics
    if (userId) {
      await db.collection('analytics').insertOne({
        userId,
        action: 'nearby_jobs_search',
        location: { latitude, longitude },
        radius,
        resultsCount: nearbyJobs.length,
        filters,
        timestamp: new Date()
      });
    }

    // Efficient pagination check - get one extra item to check if there are more
    const hasMore = nearbyJobs.length > validatedLimit;
    if (hasMore) {
      nearbyJobs.pop(); // Remove the extra item
    }
    
    // Only count total for first page and only if specifically requested
    let totalCount = null;
    if (validatedOffset === 0 && validatedLimit <= 20) {
      try {
        // Fast count estimation - only for small result sets
        const estimatedCount = await jobs.estimatedDocumentCount();
        if (estimatedCount < 1000) {
          const countResult = await jobs.aggregate([
            {
              $geoNear: {
                near: {
                  type: 'Point',
                  coordinates: [parseFloat(longitude), parseFloat(latitude)]
                },
                distanceField: 'distance',
                maxDistance: validatedRadius * 1000,
                spherical: true,
                key: 'location',
                query: {
                  isActive: true,
                  isDeleted: { $ne: true },
                  ...(filters.minBudget && { 'salary.min': { $gte: filters.minBudget } }),
                  ...(filters.maxBudget && { 'salary.max': { $lte: filters.maxBudget } }),
                  ...(filters.category && { category: filters.category }),
                  ...(filters.urgency && { urgency: filters.urgency }),
                  ...(filters.skills && filters.skills.length > 0 && { 
                    skills: { $in: filters.skills } 
                  })
                }
              }
            },
            { $count: "total" }
          ]).toArray();
          totalCount = countResult[0]?.total || 0;
        }
      } catch (error) {
        console.warn('Count estimation failed, skipping total count');
      }
    }

    return NextResponse.json({
      success: true,
      jobs: nearbyJobs,
      pagination: {
        offset: validatedOffset,
        limit: validatedLimit,
        returned: nearbyJobs.length,
        hasMore,
        ...(totalCount !== null && { total: totalCount }),
        nextOffset: hasMore ? validatedOffset + validatedLimit : null
      },
      location: { latitude, longitude },
      radius: validatedRadius,
      filters: {
        sortBy,
        sortOrder,
        ...filters
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Nearby jobs search error:', error);
    return NextResponse.json(
      { error: 'Failed to search nearby jobs' },
      { status: 500 }
    );
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