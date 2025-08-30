import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';
import { MongoClient } from 'mongodb';
import { validateAndSanitize, addSecurityHeaders } from '../../../../utils/validation';
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

// Rate limiting specifically for admin routes
const adminRateLimit = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 100, // Max 100 different admin IPs per minute
  maxRequests: 200, // 200 requests per minute for admin operations
});

// Enhanced admin authentication middleware
async function authenticateAdmin(request) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return { error: 'Authentication required', status: 401 };
  }
  
  // Verify admin role from database (don't trust session alone)
  await connectToDatabase();
  const user = await User.findById(session.user.id).select('role banned isActive adminMetadata');
  
  if (!user) {
    return { error: 'User not found', status: 404 };
  }
  
  if (user.role !== 'admin') {
    return { error: 'Admin access required', status: 403 };
  }
  
  if (user.banned || !user.isActive) {
    return { error: 'Account suspended', status: 403 };
  }
  
  if (user.adminMetadata?.accountStatus === 'suspended') {
    return { error: 'Admin account suspended', status: 403 };
  }
  
  return { user, session };
}

// GET /api/admin/users - Get users with advanced filtering
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
    
    // Comprehensive filtering parameters with validation
    const filters = {
      // Search and pagination
      search: validateAndSanitize.string(searchParams.get('search'), { maxLength: 100 }),
      page: validateAndSanitize.number(searchParams.get('page'), { min: 1, max: 1000 }) || 1,
      limit: validateAndSanitize.number(searchParams.get('limit'), { min: 1, max: 100 }) || 20,
      
      // Basic filters
      role: validateAndSanitize.string(searchParams.get('role'), { 
        enum: ['hirer', 'fixer', 'admin'] 
      }),
      banned: searchParams.get('banned') === 'true' ? true : 
             searchParams.get('banned') === 'false' ? false : undefined,
      verified: searchParams.get('verified') === 'true' ? true : 
               searchParams.get('verified') === 'false' ? false : undefined,
      active: searchParams.get('active') === 'true' ? true : 
             searchParams.get('active') === 'false' ? false : undefined,
      
      // Location filters
      city: validateAndSanitize.string(searchParams.get('city'), { maxLength: 50 }),
      state: validateAndSanitize.string(searchParams.get('state'), { maxLength: 50 }),
      country: validateAndSanitize.string(searchParams.get('country'), { maxLength: 50 }),
      
      // User details
      username: validateAndSanitize.string(searchParams.get('username'), { maxLength: 20 }),
      email: validateAndSanitize.string(searchParams.get('email'), { maxLength: 100 }),
      name: validateAndSanitize.string(searchParams.get('name'), { maxLength: 50 }),
      
      // Admin-specific filters
      riskLevel: validateAndSanitize.string(searchParams.get('riskLevel'), {
        enum: ['low', 'medium', 'high', 'critical']
      }),
      accountStatus: validateAndSanitize.string(searchParams.get('accountStatus'), {
        enum: ['active', 'suspended', 'restricted', 'under_review']
      }),
      kycStatus: validateAndSanitize.string(searchParams.get('kycStatus'), {
        enum: ['not_started', 'pending', 'approved', 'rejected']
      }),
      verificationLevel: validateAndSanitize.string(searchParams.get('verificationLevel'), {
        enum: ['none', 'basic', 'verified', 'premium']
      }),
      
      // Special flags
      flagged: searchParams.get('flagged') === 'true',
      suspicious: searchParams.get('suspicious') === 'true',
      needsReview: searchParams.get('needsReview') === 'true',
      highValue: searchParams.get('highValue') === 'true', // High earnings/activity users
      
      // Date filters
      createdAfter: searchParams.get('createdAfter') ? 
        new Date(searchParams.get('createdAfter')) : undefined,
      createdBefore: searchParams.get('createdBefore') ? 
        new Date(searchParams.get('createdBefore')) : undefined,
      lastActiveAfter: searchParams.get('lastActiveAfter') ? 
        new Date(searchParams.get('lastActiveAfter')) : undefined,
      lastActiveBefore: searchParams.get('lastActiveBefore') ? 
        new Date(searchParams.get('lastActiveBefore')) : undefined,
      
      // Performance filters
      minRating: validateAndSanitize.number(searchParams.get('minRating'), { 
        min: 0, max: 5 
      }),
      minJobsCompleted: validateAndSanitize.number(searchParams.get('minJobsCompleted'), { 
        min: 0 
      }),
      minEarnings: validateAndSanitize.number(searchParams.get('minEarnings'), { 
        min: 0 
      }),
      
      // Quality and trust scores
      qualityScoreMin: validateAndSanitize.number(searchParams.get('qualityScoreMin'), { 
        min: 0, max: 100 
      }),
      qualityScoreMax: validateAndSanitize.number(searchParams.get('qualityScoreMax'), { 
        min: 0, max: 100 
      }),
      trustScoreMin: validateAndSanitize.number(searchParams.get('trustScoreMin'), { 
        min: 0, max: 100 
      }),
      trustScoreMax: validateAndSanitize.number(searchParams.get('trustScoreMax'), { 
        min: 0, max: 100 
      }),
      
      // Sorting
      sortBy: validateAndSanitize.string(searchParams.get('sortBy'), {
        enum: ['newest', 'oldest', 'name', 'username', 'email', 'rating', 'activity', 
               'quality', 'trust', 'risk', 'jobs', 'earnings', 'relevance']
      }) || 'newest',
      sortOrder: validateAndSanitize.string(searchParams.get('sortOrder'), {
        enum: ['asc', 'desc']
      }) || 'desc'
    };

    await connectToDatabase();
    
    // Build aggregation pipeline for comprehensive user data
    const pipeline = [];
    
    // Match stage - build query based on filters
    const matchQuery = {};
    
    // Basic filters
    if (filters.role) matchQuery.role = filters.role;
    if (filters.banned !== undefined) matchQuery.banned = filters.banned;
    if (filters.verified !== undefined) matchQuery.isVerified = filters.verified;
    if (filters.active !== undefined) matchQuery.isActive = filters.active;
    
    // Location filters
    if (filters.city) {
      matchQuery['location.city'] = new RegExp(filters.city, 'i');
    }
    if (filters.state) {
      matchQuery['location.state'] = new RegExp(filters.state, 'i');
    }
    if (filters.country) {
      matchQuery['location.country'] = new RegExp(filters.country, 'i');
    }
    
    // User details
    if (filters.username) {
      matchQuery.username = new RegExp(filters.username, 'i');
    }
    if (filters.email) {
      matchQuery.email = new RegExp(filters.email, 'i');
    }
    if (filters.name) {
      matchQuery.name = new RegExp(filters.name, 'i');
    }
    
    // Admin metadata filters
    if (filters.riskLevel) {
      matchQuery['adminMetadata.riskLevel'] = filters.riskLevel;
    }
    if (filters.accountStatus) {
      matchQuery['adminMetadata.accountStatus'] = filters.accountStatus;
    }
    if (filters.kycStatus) {
      matchQuery['adminMetadata.kycStatus'] = filters.kycStatus;
    }
    if (filters.verificationLevel) {
      matchQuery['adminMetadata.verificationLevel'] = filters.verificationLevel;
    }
    
    // Special flags
    if (filters.flagged) {
      matchQuery['adminMetadata.flaggedBy.0'] = { $exists: true };
    }
    if (filters.suspicious) {
      matchQuery.$or = [
        { 'activityMetrics.suspicious.multipleAccounts': true },
        { 'activityMetrics.suspicious.unusualActivity': true },
        { 'activityMetrics.suspicious.rapidLocationChange': true },
        { 'activityMetrics.suspicious.deviceInconsistency': true }
      ];
    }
    if (filters.needsReview) {
      matchQuery.$or = [
        { 'adminMetadata.reviewedBy': { $exists: false } },
        { 'adminMetadata.flaggedBy.0': { $exists: true } },
        { 'adminMetadata.riskLevel': 'high' },
        { 'adminMetadata.qualityScore': { $lt: 30 } }
      ];
    }
    if (filters.highValue) {
      matchQuery.$or = [
        { totalEarnings: { $gte: 50000 } },
        { jobsCompleted: { $gte: 100 } },
        { 'rating.average': { $gte: 4.5 }, 'rating.count': { $gte: 20 } }
      ];
    }
    
    // Date filters
    if (filters.createdAfter || filters.createdBefore) {
      matchQuery.createdAt = {};
      if (filters.createdAfter) matchQuery.createdAt.$gte = filters.createdAfter;
      if (filters.createdBefore) matchQuery.createdAt.$lte = filters.createdBefore;
    }
    if (filters.lastActiveAfter || filters.lastActiveBefore) {
      matchQuery.lastActivityAt = {};
      if (filters.lastActiveAfter) matchQuery.lastActivityAt.$gte = filters.lastActiveAfter;
      if (filters.lastActiveBefore) matchQuery.lastActivityAt.$lte = filters.lastActiveBefore;
    }
    
    // Performance filters
    if (filters.minRating) {
      matchQuery['rating.average'] = { $gte: filters.minRating };
    }
    if (filters.minJobsCompleted) {
      matchQuery.jobsCompleted = { $gte: filters.minJobsCompleted };
    }
    if (filters.minEarnings) {
      matchQuery.totalEarnings = { $gte: filters.minEarnings };
    }
    
    // Quality and trust scores
    if (filters.qualityScoreMin || filters.qualityScoreMax) {
      matchQuery['adminMetadata.qualityScore'] = {};
      if (filters.qualityScoreMin) {
        matchQuery['adminMetadata.qualityScore'].$gte = filters.qualityScoreMin;
      }
      if (filters.qualityScoreMax) {
        matchQuery['adminMetadata.qualityScore'].$lte = filters.qualityScoreMax;
      }
    }
    if (filters.trustScoreMin || filters.trustScoreMax) {
      matchQuery['adminMetadata.trustScore'] = {};
      if (filters.trustScoreMin) {
        matchQuery['adminMetadata.trustScore'].$gte = filters.trustScoreMin;
      }
      if (filters.trustScoreMax) {
        matchQuery['adminMetadata.trustScore'].$lte = filters.trustScoreMax;
      }
    }
    
    // Text search
    if (filters.search) {
      matchQuery.$text = { $search: filters.search };
    }
    
    // Add match stage
    if (Object.keys(matchQuery).length > 0) {
      pipeline.push({ $match: matchQuery });
    }
    
    // Add lookup for related data
    pipeline.push(
      // Lookup recent jobs created
      {
        $lookup: {
          from: 'jobs',
          let: { userId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$createdBy', '$$userId'] },
                createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
              }
            },
            { $count: 'count' }
          ],
          as: 'recentJobsCreated'
        }
      },
      // Lookup recent jobs assigned
      {
        $lookup: {
          from: 'jobs',
          let: { userId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$assignedTo', '$$userId'] },
                'progress.startedAt': { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
              }
            },
            { $count: 'count' }
          ],
          as: 'recentJobsAssigned'
        }
      },
      // Lookup user locations for admin reference
      {
        $lookup: {
          from: 'userlocations',
          localField: '_id',
          foreignField: 'userId',
          as: 'locationRecords'
        }
      }
    );
    
    // Add computed fields
    pipeline.push({
      $addFields: {
        recentJobsCreatedCount: { 
          $ifNull: [{ $arrayElemAt: ['$recentJobsCreated.count', 0] }, 0] 
        },
        recentJobsAssignedCount: { 
          $ifNull: [{ $arrayElemAt: ['$recentJobsAssigned.count', 0] }, 0] 
        },
        locationRecordCount: { $size: '$locationRecords' },
        daysSinceLastActive: {
          $divide: [
            { $subtract: [new Date(), '$lastActivityAt'] },
            1000 * 60 * 60 * 24
          ]
        },
        accountAge: {
          $divide: [
            { $subtract: [new Date(), '$createdAt'] },
            1000 * 60 * 60 * 24
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
      case 'name':
        sortStage.name = filters.sortOrder === 'asc' ? 1 : -1;
        break;
      case 'username':
        sortStage.username = filters.sortOrder === 'asc' ? 1 : -1;
        break;
      case 'email':
        sortStage.email = filters.sortOrder === 'asc' ? 1 : -1;
        break;
      case 'rating':
        sortStage['rating.average'] = filters.sortOrder === 'asc' ? 1 : -1;
        sortStage['rating.count'] = filters.sortOrder === 'asc' ? 1 : -1;
        break;
      case 'activity':
        sortStage.lastActivityAt = filters.sortOrder === 'asc' ? 1 : -1;
        break;
      case 'quality':
        sortStage['adminMetadata.qualityScore'] = filters.sortOrder === 'asc' ? 1 : -1;
        break;
      case 'trust':
        sortStage['adminMetadata.trustScore'] = filters.sortOrder === 'asc' ? 1 : -1;
        break;
      case 'risk':
        const riskOrder = { low: 1, medium: 2, high: 3, critical: 4 };
        sortStage['adminMetadata.riskLevel'] = filters.sortOrder === 'asc' ? 1 : -1;
        break;
      case 'jobs':
        sortStage.jobsCompleted = filters.sortOrder === 'asc' ? 1 : -1;
        break;
      case 'earnings':
        sortStage.totalEarnings = filters.sortOrder === 'asc' ? 1 : -1;
        break;
      case 'relevance':
        if (filters.search) {
          sortStage.score = { $meta: 'textScore' };
        } else {
          sortStage.lastActivityAt = -1;
        }
        break;
      default:
        sortStage.lastActivityAt = -1;
    }
    
    pipeline.push({ $sort: sortStage });
    
    // Faceted aggregation for pagination and count
    pipeline.push({
      $facet: {
        data: [
          { $skip: (filters.page - 1) * filters.limit },
          { $limit: filters.limit },
          {
            $project: {
              // Basic info
              _id: 1,
              username: 1,
              name: 1,
              email: 1,
              phone: 1,
              role: 1,
              
              // Status
              isVerified: 1,
              emailVerified: 1,
              phoneVerified: 1,
              banned: 1,
              bannedReason: 1,
              bannedAt: 1,
              isActive: 1,
              
              // Location
              location: 1,
              
              // Profile
              profilePhoto: 1,
              picture: 1,
              bio: 1,
              
              // Stats
              rating: 1,
              jobsCompleted: 1,
              totalEarnings: 1,
              badges: 1,
              
              // Activity
              lastActivityAt: 1,
              lastLoginAt: 1,
              createdAt: 1,
              
              // Admin metadata (full access for admins)
              adminMetadata: 1,
              activityMetrics: 1,
              
              // Computed fields
              recentJobsCreatedCount: 1,
              recentJobsAssignedCount: 1,
              locationRecordCount: 1,
              daysSinceLastActive: 1,
              accountAge: 1,
              
              // Security sensitive (limited fields)
              plan: { type: 1, status: 1 }
            }
          }
        ],
        count: [{ $count: 'total' }],
        stats: [
          {
            $group: {
              _id: null,
              totalUsers: { $sum: 1 },
              activeUsers: { $sum: { $cond: ['$isActive', 1, 0] } },
              verifiedUsers: { $sum: { $cond: ['$isVerified', 1, 0] } },
              bannedUsers: { $sum: { $cond: ['$banned', 1, 0] } },
              highRiskUsers: { $sum: { $cond: [{ $eq: ['$adminMetadata.riskLevel', 'high'] }, 1, 0] } },
              flaggedUsers: { $sum: { $cond: [{ $gt: [{ $size: { $ifNull: ['$adminMetadata.flaggedBy', []] } }, 0] }, 1, 0] } },
              avgRating: { $avg: '$rating.average' },
              avgJobsCompleted: { $avg: '$jobsCompleted' },
              avgTotalEarnings: { $avg: '$totalEarnings' },
              avgQualityScore: { $avg: '$adminMetadata.qualityScore' },
              avgTrustScore: { $avg: '$adminMetadata.trustScore' }
            }
          }
        ]
      }
    });
    
    const db = await connectToDatabase();
    const results = await db.collection('users').aggregate(pipeline).toArray();
    
    const users = results[0].data || [];
    const totalCount = results[0].count[0]?.total || 0;
    const stats = results[0].stats[0] || {};
    
    // Log admin action for audit trail
    setTimeout(() => {
      db.collection('admin_audit_log').insertOne({
        adminId: auth.user._id,
        adminUsername: auth.user.username,
        action: 'users_list_viewed',
        filters: filters,
        resultCount: users.length,
        totalAvailable: totalCount,
        timestamp: new Date(),
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        userAgent: request.headers.get('user-agent')
      }).catch(err => console.warn('Audit log failed:', err.name));
    }, 0);
    
    const response = NextResponse.json({
      success: true,
      data: {
        users,
        pagination: {
          page: filters.page,
          limit: filters.limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / filters.limit),
          hasMore: filters.page * filters.limit < totalCount
        },
        stats,
        filters: filters,
        timestamp: new Date().toISOString()
      }
    });
    
    return addSecurityHeaders(response);
    
  } catch (error) {
    console.error('Admin users list error:', error.name, error.message);
    
    const errorResponse = NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch users',
        code: 'ADMIN_USERS_FETCH_ERROR'
      },
      { status: 500 }
    );
    
    return addSecurityHeaders(errorResponse);
  }
}

// POST /api/admin/users - Bulk operations on users
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
      enum: ['bulk_flag', 'bulk_suspend', 'bulk_verify', 'bulk_ban', 'bulk_unban', 
             'bulk_update_role', 'bulk_update_risk', 'export_data'],
      required: true
    });
    
    const userIds = body.userIds?.filter(id => 
      typeof id === 'string' && id.length === 24
    ) || [];
    
    if (action !== 'export_data' && userIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid user IDs provided' },
        { status: 400 }
      );
    }
    
    if (userIds.length > 100) {
      return NextResponse.json(
        { success: false, error: 'Cannot process more than 100 users at once' },
        { status: 400 }
      );
    }
    
    await connectToDatabase();
    let result = {};
    
    switch (action) {
      case 'bulk_flag':
        const flagReason = validateAndSanitize.string(body.reason, { 
          required: true, maxLength: 200 
        });
        const flagSeverity = validateAndSanitize.string(body.severity, {
          enum: ['low', 'medium', 'high', 'critical']
        }) || 'medium';
        
        const flagUpdate = {
          $push: {
            'adminMetadata.flaggedBy': {
              userId: auth.user._id,
              reason: flagReason,
              severity: flagSeverity,
              flaggedAt: new Date(),
              status: 'pending'
            }
          },
          $set: {
            'adminMetadata.lastModifiedBy': auth.user._id,
            'adminMetadata.lastModifiedAt': new Date()
          }
        };
        
        result = await User.updateMany(
          { _id: { $in: userIds } },
          flagUpdate
        );
        break;
        
      case 'bulk_suspend':
        const suspendReason = validateAndSanitize.string(body.reason, { 
          required: true, maxLength: 200 
        });
        const suspendUntil = body.suspendUntil ? new Date(body.suspendUntil) : 
                            new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days default
        
        const suspendUpdate = {
          $set: {
            'adminMetadata.accountStatus': 'suspended',
            'adminMetadata.suspensionReason': suspendReason,
            'adminMetadata.suspendedUntil': suspendUntil,
            'adminMetadata.lastModifiedBy': auth.user._id,
            'adminMetadata.lastModifiedAt': new Date(),
            isActive: false
          }
        };
        
        result = await User.updateMany(
          { _id: { $in: userIds } },
          suspendUpdate
        );
        break;
        
      case 'bulk_verify':
        result = await User.updateMany(
          { _id: { $in: userIds } },
          {
            $set: {
              isVerified: true,
              emailVerified: true,
              'adminMetadata.verificationLevel': 'verified',
              'adminMetadata.lastModifiedBy': auth.user._id,
              'adminMetadata.lastModifiedAt': new Date()
            }
          }
        );
        break;
        
      case 'bulk_ban':
        const banReason = validateAndSanitize.string(body.reason, { 
          required: true, maxLength: 200 
        });
        
        result = await User.updateMany(
          { _id: { $in: userIds } },
          {
            $set: {
              banned: true,
              bannedReason: banReason,
              bannedAt: new Date(),
              bannedBy: auth.user._id,
              isActive: false,
              'adminMetadata.accountStatus': 'suspended',
              'adminMetadata.riskLevel': 'critical',
              'adminMetadata.lastModifiedBy': auth.user._id,
              'adminMetadata.lastModifiedAt': new Date()
            }
          }
        );
        break;
        
      case 'bulk_unban':
        result = await User.updateMany(
          { _id: { $in: userIds } },
          {
            $set: {
              banned: false,
              isActive: true,
              'adminMetadata.accountStatus': 'active',
              'adminMetadata.riskLevel': 'low',
              'adminMetadata.lastModifiedBy': auth.user._id,
              'adminMetadata.lastModifiedAt': new Date()
            },
            $unset: {
              bannedReason: 1,
              bannedAt: 1,
              bannedBy: 1,
              'adminMetadata.suspensionReason': 1,
              'adminMetadata.suspendedUntil': 1
            }
          }
        );
        break;
        
      case 'bulk_update_role':
        const newRole = validateAndSanitize.string(body.role, {
          enum: ['hirer', 'fixer', 'admin'],
          required: true
        });
        
        result = await User.updateMany(
          { _id: { $in: userIds } },
          {
            $set: {
              role: newRole,
              'adminMetadata.lastModifiedBy': auth.user._id,
              'adminMetadata.lastModifiedAt': new Date()
            }
          }
        );
        break;
        
      case 'bulk_update_risk':
        const riskLevel = validateAndSanitize.string(body.riskLevel, {
          enum: ['low', 'medium', 'high', 'critical'],
          required: true
        });
        
        result = await User.updateMany(
          { _id: { $in: userIds } },
          {
            $set: {
              'adminMetadata.riskLevel': riskLevel,
              'adminMetadata.lastModifiedBy': auth.user._id,
              'adminMetadata.lastModifiedAt': new Date()
            }
          }
        );
        break;
        
      case 'export_data':
        // This would be handled by a separate export endpoint for security
        return NextResponse.json(
          { success: false, error: 'Use /api/admin/export endpoint for data export' },
          { status: 400 }
        );
        
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
    
    // Log admin action for audit trail
    setTimeout(() => {
      connectToDatabase().then(db => {
        db.collection('admin_audit_log').insertOne({
          adminId: auth.user._id,
          adminUsername: auth.user.username,
          action: `bulk_operation_${action}`,
          targetUserIds: userIds,
          affectedCount: result.modifiedCount || result.matchedCount || 0,
          additionalData: {
            reason: body.reason,
            severity: body.severity,
            role: body.role,
            riskLevel: body.riskLevel,
            suspendUntil: body.suspendUntil
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
        userIds,
        timestamp: new Date().toISOString()
      }
    });
    
    return addSecurityHeaders(response);
    
  } catch (error) {
    console.error('Admin bulk operation error:', error.name, error.message);
    
    const errorResponse = NextResponse.json(
      {
        success: false,
        error: 'Bulk operation failed',
        code: 'ADMIN_BULK_OPERATION_ERROR'
      },
      { status: 500 }
    );
    
    return addSecurityHeaders(errorResponse);
  }
}