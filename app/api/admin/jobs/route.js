import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';
import { MongoClient } from 'mongodb';
import { validateAndSanitize, addSecurityHeaders } from '../../../../utils/validation';
import Job from '../../../../models/Job';
import User from '../../../../models/User';
import { rateLimit } from '../../../../utils/rateLimiting';

const uri = process.env.MONGODB_URI;
let client;

async function connectToDatabase() {
  if (!client) {
    client = new MongoClient(uri);
    await client.connect();
  }
  return client.db('fixly');
}

// Rate limiting for admin operations
const adminRateLimit = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 100,
  maxRequests: 200, // 200 requests per minute for admin operations
});

// Enhanced admin authentication
async function authenticateAdmin(request) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return { error: 'Authentication required', status: 401 };
  }
  
  await connectToDatabase();
  const user = await User.findById(session.user.id).select('role banned isActive adminMetadata');
  
  if (!user || user.role !== 'admin' || user.banned || !user.isActive) {
    return { error: 'Admin access required', status: 403 };
  }
  
  if (user.adminMetadata?.accountStatus === 'suspended') {
    return { error: 'Admin account suspended', status: 403 };
  }
  
  return { user, session };
}

// GET /api/admin/jobs - Get jobs with comprehensive filtering and analytics
export async function GET(request) {
  try {
    // Apply rate limiting
    const rateLimitResult = await adminRateLimit(request);
    if (rateLimitResult.error) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    // Authenticate admin
    const auth = await authenticateAdmin(request);
    if (auth.error) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status }
      );
    }

    const { searchParams } = new URL(request.url);
    
    // Comprehensive filtering with validation
    const filters = {
      // Search and pagination
      search: validateAndSanitize.string(searchParams.get('search'), { maxLength: 100 }),
      page: validateAndSanitize.number(searchParams.get('page'), { min: 1, max: 1000 }) || 1,
      limit: validateAndSanitize.number(searchParams.get('limit'), { min: 1, max: 100 }) || 20,
      
      // Job status and type
      status: validateAndSanitize.string(searchParams.get('status'), {
        enum: ['open', 'in_progress', 'completed', 'cancelled', 'disputed', 'expired']
      }),
      urgency: validateAndSanitize.string(searchParams.get('urgency'), {
        enum: ['asap', 'flexible', 'scheduled']
      }),
      type: validateAndSanitize.string(searchParams.get('type'), {
        enum: ['one-time', 'recurring']
      }),
      experienceLevel: validateAndSanitize.string(searchParams.get('experienceLevel'), {
        enum: ['beginner', 'intermediate', 'expert']
      }),
      
      // Location filters
      city: validateAndSanitize.string(searchParams.get('city'), { maxLength: 50 }),
      state: validateAndSanitize.string(searchParams.get('state'), { maxLength: 50 }),
      country: validateAndSanitize.string(searchParams.get('country'), { maxLength: 50 }),
      
      // User filters
      creatorUsername: validateAndSanitize.string(searchParams.get('creatorUsername'), { maxLength: 20 }),
      creatorEmail: validateAndSanitize.string(searchParams.get('creatorEmail'), { maxLength: 100 }),
      assignedToUsername: validateAndSanitize.string(searchParams.get('assignedToUsername'), { maxLength: 20 }),
      
      // Budget filters
      budgetMin: validateAndSanitize.number(searchParams.get('budgetMin'), { min: 0 }),
      budgetMax: validateAndSanitize.number(searchParams.get('budgetMax'), { min: 0 }),
      budgetType: validateAndSanitize.string(searchParams.get('budgetType'), {
        enum: ['fixed', 'negotiable', 'hourly']
      }),
      
      // Date filters
      createdAfter: searchParams.get('createdAfter') ? new Date(searchParams.get('createdAfter')) : undefined,
      createdBefore: searchParams.get('createdBefore') ? new Date(searchParams.get('createdBefore')) : undefined,
      deadlineAfter: searchParams.get('deadlineAfter') ? new Date(searchParams.get('deadlineAfter')) : undefined,
      deadlineBefore: searchParams.get('deadlineBefore') ? new Date(searchParams.get('deadlineBefore')) : undefined,
      
      // Admin-specific filters
      featured: searchParams.get('featured') === 'true',
      disputed: searchParams.get('disputed') === 'true',
      flagged: searchParams.get('flagged') === 'true',
      promoted: searchParams.get('promoted') === 'true',
      needsReview: searchParams.get('needsReview') === 'true',
      highValue: searchParams.get('highValue') === 'true',
      
      // Quality and engagement filters
      minRating: validateAndSanitize.number(searchParams.get('minRating'), { min: 0, max: 5 }),
      minViews: validateAndSanitize.number(searchParams.get('minViews'), { min: 0 }),
      minApplications: validateAndSanitize.number(searchParams.get('minApplications'), { min: 0 }),
      qualityScoreMin: validateAndSanitize.number(searchParams.get('qualityScoreMin'), { min: 0, max: 100 }),
      qualityScoreMax: validateAndSanitize.number(searchParams.get('qualityScoreMax'), { min: 0, max: 100 }),
      riskLevel: validateAndSanitize.string(searchParams.get('riskLevel'), {
        enum: ['low', 'medium', 'high']
      }),
      priority: validateAndSanitize.string(searchParams.get('priority'), {
        enum: ['low', 'normal', 'high', 'urgent']
      }),
      
      // Skills filter
      skills: searchParams.get('skills') ? searchParams.get('skills').split(',').map(s => s.trim().toLowerCase()).slice(0, 10) : [],
      
      // Sorting
      sortBy: validateAndSanitize.string(searchParams.get('sortBy'), {
        enum: ['newest', 'oldest', 'deadline', 'budget_high', 'budget_low', 'views', 
               'applications', 'rating', 'priority', 'quality', 'relevance']
      }) || 'newest',
      sortOrder: validateAndSanitize.string(searchParams.get('sortOrder'), {
        enum: ['asc', 'desc']
      }) || 'desc'
    };

    await connectToDatabase();
    
    // Build comprehensive aggregation pipeline
    const pipeline = [];
    
    // Match stage - build query based on filters
    const matchQuery = {};
    
    // Basic filters
    if (filters.status) matchQuery.status = filters.status;
    if (filters.urgency) matchQuery.urgency = filters.urgency;
    if (filters.type) matchQuery.type = filters.type;
    if (filters.experienceLevel) matchQuery.experienceLevel = filters.experienceLevel;
    
    // Location filters
    if (filters.city) {
      matchQuery.$or = [
        { 'location.city': new RegExp(filters.city, 'i') },
        { 'geoData.addressComponents.locality': new RegExp(filters.city, 'i') }
      ];
    }
    if (filters.state) {
      matchQuery.$or = [
        ...(matchQuery.$or || []),
        { 'location.state': new RegExp(filters.state, 'i') },
        { 'geoData.addressComponents.administrativeAreaLevel1': new RegExp(filters.state, 'i') }
      ];
    }
    if (filters.country) {
      matchQuery['geoData.addressComponents.country'] = new RegExp(filters.country, 'i');
    }
    
    // User filters
    if (filters.creatorUsername) {
      matchQuery['createdByInfo.username'] = new RegExp(filters.creatorUsername, 'i');
    }
    if (filters.creatorEmail) {
      matchQuery['createdByInfo.email'] = new RegExp(filters.creatorEmail, 'i');
    }
    if (filters.assignedToUsername) {
      matchQuery['assignedToInfo.username'] = new RegExp(filters.assignedToUsername, 'i');
    }
    
    // Budget filters
    if (filters.budgetMin || filters.budgetMax) {
      matchQuery['budget.amount'] = {};
      if (filters.budgetMin) matchQuery['budget.amount'].$gte = filters.budgetMin;
      if (filters.budgetMax) matchQuery['budget.amount'].$lte = filters.budgetMax;
    }
    if (filters.budgetType) {
      matchQuery['budget.type'] = filters.budgetType;
    }
    
    // Date filters
    if (filters.createdAfter || filters.createdBefore) {
      matchQuery.createdAt = {};
      if (filters.createdAfter) matchQuery.createdAt.$gte = filters.createdAfter;
      if (filters.createdBefore) matchQuery.createdAt.$lte = filters.createdBefore;
    }
    if (filters.deadlineAfter || filters.deadlineBefore) {
      matchQuery.deadline = {};
      if (filters.deadlineAfter) matchQuery.deadline.$gte = filters.deadlineAfter;
      if (filters.deadlineBefore) matchQuery.deadline.$lte = filters.deadlineBefore;
    }
    
    // Admin-specific filters
    if (filters.featured) matchQuery.featured = true;
    if (filters.disputed) matchQuery['dispute.raised'] = true;
    if (filters.promoted) matchQuery['adminMetadata.isPromoted'] = true;
    if (filters.flagged) matchQuery['adminMetadata.flaggedBy.0'] = { $exists: true };
    
    if (filters.needsReview) {
      matchQuery.$or = [
        { 'adminMetadata.reviewedBy': { $exists: false } },
        { 'adminMetadata.flaggedBy.0': { $exists: true } },
        { 'dispute.raised': true },
        { 'adminMetadata.qualityScore': { $lt: 40 } }
      ];
    }
    
    if (filters.highValue) {
      matchQuery.$or = [
        { 'budget.amount': { $gte: 50000 } },
        { 'views.count': { $gte: 100 } },
        { $expr: { $gte: [{ $size: '$applications' }, 20] } }
      ];
    }
    
    // Quality filters
    if (filters.minRating) {
      matchQuery['completion.rating'] = { $gte: filters.minRating };
    }
    if (filters.minViews) {
      matchQuery['views.count'] = { $gte: filters.minViews };
    }
    if (filters.minApplications) {
      matchQuery.$expr = { $gte: [{ $size: '$applications' }, filters.minApplications] };
    }
    if (filters.qualityScoreMin || filters.qualityScoreMax) {
      matchQuery['adminMetadata.qualityScore'] = {};
      if (filters.qualityScoreMin) matchQuery['adminMetadata.qualityScore'].$gte = filters.qualityScoreMin;
      if (filters.qualityScoreMax) matchQuery['adminMetadata.qualityScore'].$lte = filters.qualityScoreMax;
    }
    if (filters.riskLevel) {
      matchQuery['adminMetadata.riskLevel'] = filters.riskLevel;
    }
    if (filters.priority) {
      matchQuery['adminMetadata.priority'] = filters.priority;
    }
    
    // Skills filter
    if (filters.skills.length > 0) {
      matchQuery.skillsRequired = { $in: filters.skills };
    }
    
    // Text search
    if (filters.search) {
      matchQuery.$text = { $search: filters.search };
    }
    
    // Add match stage
    if (Object.keys(matchQuery).length > 0) {
      pipeline.push({ $match: matchQuery });
    }
    
    // Add computed fields and enrichment
    pipeline.push({
      $addFields: {
        applicationCount: { $size: { $ifNull: ['$applications', []] } },
        commentCount: { $size: { $ifNull: ['$comments', []] } },
        likeCount: { $size: { $ifNull: ['$likes', []] } },
        isExpired: { $lt: ['$deadline', new Date()] },
        isUrgent: {
          $lt: ['$deadline', new Date(Date.now() + 24 * 60 * 60 * 1000)] // Less than 24 hours
        },
        daysSinceCreated: {
          $divide: [
            { $subtract: [new Date(), '$createdAt'] },
            1000 * 60 * 60 * 24
          ]
        },
        daysUntilDeadline: {
          $divide: [
            { $subtract: ['$deadline', new Date()] },
            1000 * 60 * 60 * 24
          ]
        },
        budgetRange: {
          $cond: [
            { $lt: ['$budget.amount', 1000] }, 'low',
            { $cond: [
              { $lt: ['$budget.amount', 10000] }, 'medium',
              'high'
            ]}
          ]
        },
        engagementScore: {
          $add: [
            { $multiply: ['$views.count', 1] },
            { $multiply: [{ $size: { $ifNull: ['$applications', []] } }, 10] },
            { $multiply: [{ $size: { $ifNull: ['$likes', []] } }, 5] },
            { $multiply: [{ $size: { $ifNull: ['$comments', []] } }, 3] }
          ]
        }
      }
    });
    
    // Sorting
    const sortStage = {};
    switch (filters.sortBy) {
      case 'newest':
        sortStage.createdAt = filters.sortOrder === 'asc' ? 1 : -1;
        break;
      case 'oldest':
        sortStage.createdAt = filters.sortOrder === 'asc' ? 1 : -1;
        break;
      case 'deadline':
        sortStage.deadline = filters.sortOrder === 'asc' ? 1 : -1;
        break;
      case 'budget_high':
        sortStage['budget.amount'] = filters.sortOrder === 'asc' ? 1 : -1;
        break;
      case 'budget_low':
        sortStage['budget.amount'] = filters.sortOrder === 'asc' ? 1 : -1;
        break;
      case 'views':
        sortStage['views.count'] = filters.sortOrder === 'asc' ? 1 : -1;
        break;
      case 'applications':
        sortStage.applicationCount = filters.sortOrder === 'asc' ? 1 : -1;
        break;
      case 'rating':
        sortStage['completion.rating'] = filters.sortOrder === 'asc' ? 1 : -1;
        break;
      case 'priority':
        sortStage['adminMetadata.priority'] = filters.sortOrder === 'asc' ? 1 : -1;
        break;
      case 'quality':
        sortStage['adminMetadata.qualityScore'] = filters.sortOrder === 'asc' ? 1 : -1;
        break;
      case 'relevance':
        if (filters.search) {
          sortStage.score = { $meta: 'textScore' };
        } else {
          sortStage.engagementScore = -1;
        }
        break;
      default:
        sortStage.createdAt = -1;
    }
    
    pipeline.push({ $sort: sortStage });
    
    // Faceted aggregation for pagination and stats
    pipeline.push({
      $facet: {
        data: [
          { $skip: (filters.page - 1) * filters.limit },
          { $limit: filters.limit },
          {
            $project: {
              // Basic job info
              _id: 1,
              title: 1,
              description: 1,
              status: 1,
              urgency: 1,
              type: 1,
              experienceLevel: 1,
              
              // Budget and timing
              budget: 1,
              deadline: 1,
              estimatedDuration: 1,
              scheduledDate: 1,
              
              // Location
              location: 1,
              hasGeoLocation: 1,
              locationPrecision: 1,
              
              // Skills and requirements
              skillsRequired: 1,
              
              // Creator and assignee info (cached)
              createdByInfo: 1,
              assignedToInfo: 1,
              
              // Engagement
              views: 1,
              featured: 1,
              featuredUntil: 1,
              
              // Progress and completion
              progress: 1,
              completion: 1,
              dispute: 1,
              cancellation: 1,
              
              // Admin metadata
              adminMetadata: 1,
              
              // Timestamps
              createdAt: 1,
              updatedAt: 1,
              
              // Computed fields
              applicationCount: 1,
              commentCount: 1,
              likeCount: 1,
              isExpired: 1,
              isUrgent: 1,
              daysSinceCreated: 1,
              daysUntilDeadline: 1,
              budgetRange: 1,
              engagementScore: 1
            }
          }
        ],
        count: [{ $count: 'total' }],
        stats: [
          {
            $group: {
              _id: null,
              totalJobs: { $sum: 1 },
              openJobs: { $sum: { $cond: [{ $eq: ['$status', 'open'] }, 1, 0] } },
              inProgressJobs: { $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] } },
              completedJobs: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
              cancelledJobs: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
              disputedJobs: { $sum: { $cond: ['$dispute.raised', 1, 0] } },
              expiredJobs: { $sum: { $cond: ['$isExpired', 1, 0] } },
              urgentJobs: { $sum: { $cond: ['$isUrgent', 1, 0] } },
              featuredJobs: { $sum: { $cond: ['$featured', 1, 0] } },
              flaggedJobs: { $sum: { $cond: [{ $gt: [{ $size: { $ifNull: ['$adminMetadata.flaggedBy', []] } }, 0] }, 1, 0] } },
              avgBudget: { $avg: '$budget.amount' },
              avgViews: { $avg: '$views.count' },
              avgApplications: { $avg: '$applicationCount' },
              avgQualityScore: { $avg: '$adminMetadata.qualityScore' },
              totalBudget: { $sum: '$budget.amount' }
            }
          }
        ],
        categoryBreakdown: [
          {
            $group: {
              _id: '$skillsRequired',
              count: { $sum: 1 },
              avgBudget: { $avg: '$budget.amount' }
            }
          },
          { $sort: { count: -1 } },
          { $limit: 10 }
        ],
        locationBreakdown: [
          {
            $group: {
              _id: {
                city: '$location.city',
                state: '$location.state'
              },
              count: { $sum: 1 },
              avgBudget: { $avg: '$budget.amount' }
            }
          },
          { $sort: { count: -1 } },
          { $limit: 20 }
        ]
      }
    });
    
    const db = await connectToDatabase();
    const results = await db.collection('jobs').aggregate(pipeline).toArray();
    
    const jobs = results[0].data || [];
    const totalCount = results[0].count[0]?.total || 0;
    const stats = results[0].stats[0] || {};
    const categoryBreakdown = results[0].categoryBreakdown || [];
    const locationBreakdown = results[0].locationBreakdown || [];
    
    // Log admin action for audit trail
    setTimeout(() => {
      db.collection('admin_audit_log').insertOne({
        adminId: auth.user._id,
        adminUsername: auth.session.user.username,
        action: 'jobs_list_viewed',
        filters: filters,
        resultCount: jobs.length,
        totalAvailable: totalCount,
        timestamp: new Date(),
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        userAgent: request.headers.get('user-agent')
      }).catch(err => console.warn('Audit log failed:', err.name));
    }, 0);
    
    const response = NextResponse.json({
      success: true,
      data: {
        jobs,
        pagination: {
          page: filters.page,
          limit: filters.limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / filters.limit),
          hasMore: filters.page * filters.limit < totalCount
        },
        stats,
        categoryBreakdown,
        locationBreakdown,
        filters: filters,
        timestamp: new Date().toISOString()
      }
    });
    
    return addSecurityHeaders(response);
    
  } catch (error) {
    console.error('Admin jobs list error:', error.name, error.message);
    
    const errorResponse = NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch jobs',
        code: 'ADMIN_JOBS_FETCH_ERROR'
      },
      { status: 500 }
    );
    
    return addSecurityHeaders(errorResponse);
  }
}

// POST /api/admin/jobs - Bulk operations on jobs
export async function POST(request) {
  try {
    // Apply rate limiting
    const rateLimitResult = await adminRateLimit(request);
    if (rateLimitResult.error) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    // Authenticate admin
    const auth = await authenticateAdmin(request);
    if (auth.error) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status }
      );
    }

    const body = await request.json();
    
    const action = validateAndSanitize.string(body.action, {
      enum: ['bulk_cancel', 'bulk_feature', 'bulk_unfeature', 'bulk_resolve_dispute', 
             'bulk_flag', 'bulk_promote', 'bulk_update_priority', 'bulk_update_quality'],
      required: true
    });
    
    const jobIds = body.jobIds?.filter(id => 
      typeof id === 'string' && id.length === 24
    ) || [];
    
    if (jobIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid job IDs provided' },
        { status: 400 }
      );
    }
    
    if (jobIds.length > 100) {
      return NextResponse.json(
        { success: false, error: 'Cannot process more than 100 jobs at once' },
        { status: 400 }
      );
    }
    
    await connectToDatabase();
    let result = {};
    
    switch (action) {
      case 'bulk_cancel':
        const cancelReason = validateAndSanitize.string(body.reason, { 
          required: true, maxLength: 200 
        });
        
        result = await Job.updateMany(
          { _id: { $in: jobIds }, status: { $in: ['open', 'in_progress'] } },
          {
            $set: {
              status: 'cancelled',
              'cancellation.cancelled': true,
              'cancellation.cancelledBy': auth.user._id,
              'cancellation.reason': cancelReason,
              'cancellation.cancelledAt': new Date(),
              'adminMetadata.lastModifiedBy': auth.user._id,
              'adminMetadata.lastModifiedAt': new Date()
            }
          }
        );
        break;
        
      case 'bulk_feature':
        const featureDays = validateAndSanitize.number(body.days, { min: 1, max: 30 }) || 7;
        
        result = await Job.updateMany(
          { _id: { $in: jobIds } },
          {
            $set: {
              featured: true,
              featuredUntil: new Date(Date.now() + featureDays * 24 * 60 * 60 * 1000),
              'adminMetadata.lastModifiedBy': auth.user._id,
              'adminMetadata.lastModifiedAt': new Date()
            }
          }
        );
        break;
        
      case 'bulk_unfeature':
        result = await Job.updateMany(
          { _id: { $in: jobIds } },
          {
            $set: {
              featured: false,
              'adminMetadata.lastModifiedBy': auth.user._id,
              'adminMetadata.lastModifiedAt': new Date()
            },
            $unset: { featuredUntil: 1 }
          }
        );
        break;
        
      case 'bulk_resolve_dispute':
        const resolution = validateAndSanitize.string(body.resolution, { 
          required: true, maxLength: 500 
        });
        
        result = await Job.updateMany(
          { _id: { $in: jobIds }, 'dispute.raised': true },
          {
            $set: {
              status: 'completed',
              'dispute.status': 'resolved',
              'dispute.resolvedBy': auth.user._id,
              'dispute.resolution': resolution,
              'dispute.resolvedAt': new Date(),
              'adminMetadata.lastModifiedBy': auth.user._id,
              'adminMetadata.lastModifiedAt': new Date()
            }
          }
        );
        break;
        
      case 'bulk_flag':
        const flagReason = validateAndSanitize.string(body.reason, { 
          required: true, maxLength: 200 
        });
        
        result = await Job.updateMany(
          { _id: { $in: jobIds } },
          {
            $push: {
              'adminMetadata.flaggedBy': {
                userId: auth.user._id,
                reason: flagReason,
                flaggedAt: new Date(),
                status: 'pending'
              }
            },
            $set: {
              'adminMetadata.lastModifiedBy': auth.user._id,
              'adminMetadata.lastModifiedAt': new Date()
            }
          }
        );
        break;
        
      case 'bulk_promote':
        const promoteUntil = body.promoteUntil ? new Date(body.promoteUntil) :
                            new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        
        result = await Job.updateMany(
          { _id: { $in: jobIds } },
          {
            $set: {
              'adminMetadata.isPromoted': true,
              'adminMetadata.promotedUntil': promoteUntil,
              'adminMetadata.lastModifiedBy': auth.user._id,
              'adminMetadata.lastModifiedAt': new Date()
            }
          }
        );
        break;
        
      case 'bulk_update_priority':
        const priority = validateAndSanitize.string(body.priority, {
          enum: ['low', 'normal', 'high', 'urgent'],
          required: true
        });
        
        result = await Job.updateMany(
          { _id: { $in: jobIds } },
          {
            $set: {
              'adminMetadata.priority': priority,
              'adminMetadata.lastModifiedBy': auth.user._id,
              'adminMetadata.lastModifiedAt': new Date()
            }
          }
        );
        break;
        
      case 'bulk_update_quality':
        const qualityScore = validateAndSanitize.number(body.qualityScore, {
          min: 0, max: 100, required: true
        });
        
        result = await Job.updateMany(
          { _id: { $in: jobIds } },
          {
            $set: {
              'adminMetadata.qualityScore': qualityScore,
              'adminMetadata.lastModifiedBy': auth.user._id,
              'adminMetadata.lastModifiedAt': new Date()
            }
          }
        );
        break;
        
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
    
    // Send notifications for impactful actions
    if (['bulk_cancel', 'bulk_resolve_dispute'].includes(action)) {
      setTimeout(async () => {
        try {
          const jobs = await Job.find({ _id: { $in: jobIds } })
            .populate('createdBy assignedTo')
            .lean();
            
          for (const job of jobs) {
            if (action === 'bulk_cancel') {
              // Notify job creator
              if (job.createdBy) {
                await User.findByIdAndUpdate(job.createdBy._id, {
                  $push: {
                    notifications: {
                      type: 'job_cancelled',
                      title: 'Job Cancelled by Admin',
                      message: `Your job "${job.title}" has been cancelled by administration. ${body.reason || ''}`,
                      createdAt: new Date()
                    }
                  }
                });
              }
              
              // Notify assigned fixer
              if (job.assignedTo) {
                await User.findByIdAndUpdate(job.assignedTo._id, {
                  $push: {
                    notifications: {
                      type: 'job_cancelled',
                      title: 'Job Cancelled',
                      message: `The job "${job.title}" has been cancelled by administration. ${body.reason || ''}`,
                      createdAt: new Date()
                    }
                  }
                });
              }
            }
          }
        } catch (notifError) {
          console.warn('Notification sending failed:', notifError.name);
        }
      }, 0);
    }
    
    // Log admin action for audit trail
    setTimeout(() => {
      connectToDatabase().then(db => {
        db.collection('admin_audit_log').insertOne({
          adminId: auth.user._id,
          adminUsername: auth.session.user.username,
          action: `bulk_operation_${action}`,
          targetJobIds: jobIds,
          affectedCount: result.modifiedCount || result.matchedCount || 0,
          additionalData: {
            reason: body.reason,
            resolution: body.resolution,
            priority: body.priority,
            qualityScore: body.qualityScore,
            days: body.days,
            promoteUntil: body.promoteUntil
          },
          timestamp: new Date(),
          ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
          userAgent: request.headers.get('user-agent')
        });
      }).catch(err => console.warn('Audit log failed:', err.name));
    }, 0);
    
    const response = NextResponse.json({
      success: true,
      data: {
        action,
        affectedCount: result.modifiedCount || result.matchedCount || 0,
        jobIds,
        timestamp: new Date().toISOString()
      }
    });
    
    return addSecurityHeaders(response);
    
  } catch (error) {
    console.error('Admin bulk job operation error:', error.name, error.message);
    
    const errorResponse = NextResponse.json(
      {
        success: false,
        error: 'Bulk operation failed',
        code: 'ADMIN_BULK_JOB_OPERATION_ERROR'
      },
      { status: 500 }
    );
    
    return addSecurityHeaders(errorResponse);
  }
}