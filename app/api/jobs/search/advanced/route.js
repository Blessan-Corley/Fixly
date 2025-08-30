// app/api/jobs/search/advanced/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import Job from '@/models/Job';
import { rateLimit } from '@/utils/rateLimiting';
import { validateAndSanitize, addSecurityHeaders } from '@/utils/validation';

export const dynamic = 'force-dynamic';

// GET /api/jobs/search/advanced - Advanced job search with multiple filters
export async function GET(request) {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimit(request, 'api_requests', 200, 15 * 60 * 1000);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { message: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      );
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    
    // Pagination
    const page = Math.max(1, parseInt(searchParams.get('page')) || 1);
    const limit = Math.min(Math.max(1, parseInt(searchParams.get('limit')) || 20), 100);
    
    // Search parameters
    const query = searchParams.get('q') || '';
    const location = searchParams.get('location') || '';
    const skills = searchParams.get('skills')?.split(',').filter(Boolean) || [];
    const category = searchParams.get('category') || '';
    
    // Filters
    const minBudget = searchParams.get('minBudget') ? parseFloat(searchParams.get('minBudget')) : null;
    const maxBudget = searchParams.get('maxBudget') ? parseFloat(searchParams.get('maxBudget')) : null;
    const budgetType = searchParams.get('budgetType') || '';
    const urgency = searchParams.get('urgency') || '';
    const experienceLevel = searchParams.get('experienceLevel') || '';
    const jobType = searchParams.get('jobType') || '';
    const featured = searchParams.get('featured') === 'true';
    const hasAttachments = searchParams.get('hasAttachments') === 'true';
    
    // Date filters
    const datePosted = searchParams.get('datePosted') || ''; // today, week, month, all
    const deadline = searchParams.get('deadline') || ''; // today, week, month
    
    // Location filters
    const userLat = searchParams.get('lat') ? parseFloat(searchParams.get('lat')) : null;
    const userLng = searchParams.get('lng') ? parseFloat(searchParams.get('lng')) : null;
    const maxDistance = searchParams.get('maxDistance') ? parseInt(searchParams.get('maxDistance')) : null;
    
    // Sorting
    const sortBy = searchParams.get('sortBy') || 'relevance';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Build MongoDB query
    const mongoQuery = { status: 'open' };

    // Text search
    if (query) {
      mongoQuery.$text = { $search: query };
    }

    // Skills filter
    if (skills.length > 0) {
      mongoQuery.skillsRequired = { $in: skills.map(skill => skill.toLowerCase()) };
    }

    // Budget filters
    if (minBudget || maxBudget) {
      mongoQuery['budget.amount'] = {};
      if (minBudget) mongoQuery['budget.amount'].$gte = minBudget;
      if (maxBudget) mongoQuery['budget.amount'].$lte = maxBudget;
    }

    if (budgetType) {
      mongoQuery['budget.type'] = budgetType;
    }

    // Basic filters
    if (urgency) mongoQuery.urgency = urgency;
    if (experienceLevel) mongoQuery.experienceLevel = experienceLevel;
    if (jobType) mongoQuery.type = jobType;
    if (featured) mongoQuery.featured = true;
    
    // Attachments filter
    if (hasAttachments) {
      mongoQuery.attachments = { $exists: true, $not: { $size: 0 } };
    }

    // Location filters
    if (location) {
      mongoQuery.$or = [
        { 'location.city': new RegExp(location, 'i') },
        { 'location.state': new RegExp(location, 'i') },
        { 'location.address': new RegExp(location, 'i') }
      ];
    }

    // Geospatial search if coordinates provided
    if (userLat && userLng) {
      const distance = maxDistance ? maxDistance * 1000 : 50000; // Default 50km
      mongoQuery['location.coordinates'] = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [userLng, userLat]
          },
          $maxDistance: distance
        }
      };
    }

    // Date filters
    const now = new Date();
    if (datePosted) {
      let dateThreshold;
      switch (datePosted) {
        case 'today':
          dateThreshold = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          dateThreshold = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          dateThreshold = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
      }
      if (dateThreshold) {
        mongoQuery.createdAt = { $gte: dateThreshold };
      }
    }

    if (deadline) {
      let deadlineThreshold;
      switch (deadline) {
        case 'today':
          deadlineThreshold = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
          break;
        case 'week':
          deadlineThreshold = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          deadlineThreshold = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
          break;
      }
      if (deadlineThreshold) {
        mongoQuery.deadline = { $lte: deadlineThreshold };
      }
    }

    // Sorting
    let sort = {};
    switch (sortBy) {
      case 'relevance':
        if (query) {
          sort.score = { $meta: 'textScore' };
        } else {
          sort.featured = -1;
          sort.createdAt = -1;
        }
        break;
      case 'newest':
        sort.createdAt = sortOrder === 'asc' ? 1 : -1;
        break;
      case 'deadline':
        sort.deadline = sortOrder === 'desc' ? -1 : 1;
        break;
      case 'budget':
        sort['budget.amount'] = sortOrder === 'asc' ? 1 : -1;
        break;
      case 'distance':
        // Distance sorting is handled by $near in query
        sort.featured = -1;
        break;
      case 'applications':
        sort.applicationCount = sortOrder === 'asc' ? 1 : -1;
        break;
      case 'views':
        sort['views.count'] = sortOrder === 'asc' ? 1 : -1;
        break;
      default:
        sort.featured = -1;
        sort.createdAt = -1;
    }

    const skip = (page - 1) * limit;

    // Execute query with aggregation for application count
    const pipeline = [
      { $match: mongoQuery },
      {
        $addFields: {
          applicationCount: {
            $size: {
              $filter: {
                input: '$applications',
                cond: { $ne: ['$$this.status', 'withdrawn'] }
              }
            }
          },
          timeRemaining: {
            $subtract: ['$deadline', new Date()]
          },
          isUrgent: {
            $lt: [{ $subtract: ['$deadline', new Date()] }, 24 * 60 * 60 * 1000]
          }
        }
      },
      { $sort: sort },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: 'users',
          localField: 'createdBy',
          foreignField: '_id',
          as: 'creator',
          pipeline: [
            {
              $project: {
                name: 1,
                username: 1,
                profilePhoto: 1,
                picture: 1,
                rating: 1,
                location: 1,
                isVerified: 1,
                plan: 1
              }
            }
          ]
        }
      },
      {
        $project: {
          title: 1,
          description: 1,
          skillsRequired: 1,
          budget: 1,
          location: 1,
          deadline: 1,
          urgency: 1,
          type: 1,
          experienceLevel: 1,
          featured: 1,
          attachments: 1,
          views: 1,
          likes: { $size: '$likes' },
          applicationCount: 1,
          timeRemaining: 1,
          isUrgent: 1,
          createdAt: 1,
          updatedAt: 1,
          creator: { $arrayElemAt: ['$creator', 0] }
        }
      }
    ];

    // Get total count for pagination
    const countPipeline = [
      { $match: mongoQuery },
      { $count: 'total' }
    ];

    const [jobs, countResult] = await Promise.all([
      Job.aggregate(pipeline),
      Job.aggregate(countPipeline)
    ]);

    const total = countResult[0]?.total || 0;

    // Process jobs with additional computed fields
    const processedJobs = jobs.map(job => ({
      ...job,
      timeRemainingText: formatTimeRemaining(job.timeRemaining),
      budgetText: formatBudget(job.budget),
      locationText: formatLocation(job.location),
      isLiked: false, // TODO: Check if current user liked this job
      canApply: true // TODO: Check if current user can apply
    }));

    // Generate facets for filters
    const facets = await generateSearchFacets(mongoQuery);

    const response = NextResponse.json({
      success: true,
      jobs: processedJobs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + jobs.length < total
      },
      facets,
      searchQuery: {
        query,
        location,
        skills,
        filters: {
          minBudget,
          maxBudget,
          budgetType,
          urgency,
          experienceLevel,
          jobType,
          featured,
          hasAttachments,
          datePosted,
          deadline,
          maxDistance
        },
        sort: { sortBy, sortOrder }
      },
      meta: {
        searchTime: Date.now(),
        totalResults: total,
        hasLocation: !!(userLat && userLng)
      }
    });

    return addSecurityHeaders(response);

  } catch (error) {
    console.error('Advanced job search error:', error);
    const response = NextResponse.json(
      { message: 'Failed to search jobs' },
      { status: 500 }
    );
    return addSecurityHeaders(response);
  }
}

// Helper function to format time remaining
function formatTimeRemaining(timeInMs) {
  if (timeInMs <= 0) return 'Expired';
  
  const days = Math.floor(timeInMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((timeInMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  if (days > 0) return `${days} day${days > 1 ? 's' : ''} left`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} left`;
  return 'Less than 1 hour left';
}

// Helper function to format budget
function formatBudget(budget) {
  if (!budget.amount) return budget.type === 'negotiable' ? 'Negotiable' : 'Not specified';
  
  const amount = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: budget.currency || 'INR'
  }).format(budget.amount);
  
  switch (budget.type) {
    case 'fixed': return amount;
    case 'hourly': return `${amount}/hour`;
    case 'negotiable': return `${amount} (Negotiable)`;
    default: return amount;
  }
}

// Helper function to format location
function formatLocation(location) {
  const parts = [location.city, location.state].filter(Boolean);
  return parts.join(', ');
}

// Generate search facets for filtering
async function generateSearchFacets(baseQuery) {
  try {
    const pipeline = [
      { $match: baseQuery },
      {
        $facet: {
          skills: [
            { $unwind: '$skillsRequired' },
            { $group: { _id: '$skillsRequired', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 20 }
          ],
          budgetRanges: [
            {
              $bucket: {
                groupBy: '$budget.amount',
                boundaries: [0, 1000, 5000, 15000, 50000, 100000, Infinity],
                default: 'Other',
                output: { count: { $sum: 1 } }
              }
            }
          ],
          urgency: [
            { $group: { _id: '$urgency', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
          ],
          experienceLevel: [
            { $group: { _id: '$experienceLevel', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
          ],
          jobType: [
            { $group: { _id: '$type', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
          ],
          locations: [
            { $group: { _id: '$location.city', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 15 }
          ]
        }
      }
    ];

    const facetResults = await Job.aggregate(pipeline);
    return facetResults[0] || {};
  } catch (error) {
    console.error('Error generating facets:', error);
    return {};
  }
}