import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';
import { MongoClient } from 'mongodb';
import { validateAndSanitize, addSecurityHeaders } from '../../../../utils/validation';
import User from '../../../../models/User';
import Job from '../../../../models/Job';
import { rateLimit } from '../../../../utils/rateLimiting';
import { withErrorHandling, createError, safeExecute } from '../../../../utils/serverErrorHandler';

const uri = process.env.MONGODB_URI;
let client;

async function connectToDatabase() {
  if (!client) {
    client = new MongoClient(uri);
    await client.connect();
  }
  return client.db('fixly');
}

// Rate limiting configuration for dashboard
const DASHBOARD_RATE_LIMIT = {
  key: 'admin_dashboard',
  maxAttempts: 60,
  windowMs: 60 * 1000 // 1 minute
};

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

// GET /api/admin/dashboard - Comprehensive admin dashboard with real-time data
export async function GET(request) {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimit(request, DASHBOARD_RATE_LIMIT.key, DASHBOARD_RATE_LIMIT.maxAttempts, DASHBOARD_RATE_LIMIT.windowMs);
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
    
    // Time range for analytics (default to last 30 days)
    const range = validateAndSanitize.string(searchParams.get('range'), {
      enum: ['1d', '7d', '30d', '90d', '1y']
    }) || '30d';
    
    const includeDetails = searchParams.get('includeDetails') === 'true';
    const includeCharts = searchParams.get('includeCharts') !== 'false'; // Default true

    // Calculate date ranges
    const now = new Date();
    const rangeMultipliers = {
      '1d': 1,
      '7d': 7,
      '30d': 30,
      '90d': 90,
      '1y': 365
    };
    
    const daysBack = rangeMultipliers[range] || 30;
    const startDate = new Date(now.getTime() - (daysBack * 24 * 60 * 60 * 1000));
    const previousStartDate = new Date(startDate.getTime() - (daysBack * 24 * 60 * 60 * 1000));

    await connectToDatabase();
    const db = await connectToDatabase();

    // Execute comprehensive analytics queries in parallel for optimal performance
    const [
      // Overview metrics
      overviewMetrics,
      previousOverviewMetrics,
      
      // User analytics
      userAnalytics,
      userGrowthData,
      userLocationBreakdown,
      userRoleDistribution,
      
      // Job analytics
      jobAnalytics,
      jobTrendData,
      jobLocationBreakdown,
      jobCategoryBreakdown,
      
      // Financial analytics
      financialMetrics,
      revenueData,
      
      // Platform health
      healthMetrics,
      securityMetrics,
      
      // Recent activity
      recentUsers,
      recentJobs,
      flaggedContent,
      
      // Admin activity log
      adminActivity
    ] = await Promise.all([
      // Overview metrics (current period)
      Promise.all([
        User.countDocuments(),
        User.countDocuments({ isActive: true }),
        User.countDocuments({ createdAt: { $gte: startDate } }),
        User.countDocuments({ banned: true }),
        Job.countDocuments(),
        Job.countDocuments({ status: 'open' }),
        Job.countDocuments({ status: 'in_progress' }),
        Job.countDocuments({ status: 'completed' }),
        Job.countDocuments({ createdAt: { $gte: startDate } }),
      ]).then(results => ({
        totalUsers: results[0],
        activeUsers: results[1],
        newUsers: results[2],
        bannedUsers: results[3],
        totalJobs: results[4],
        openJobs: results[5],
        inProgressJobs: results[6],
        completedJobs: results[7],
        newJobs: results[8]
      })),
      
      // Previous period for comparison
      Promise.all([
        User.countDocuments({ createdAt: { $gte: previousStartDate, $lt: startDate } }),
        Job.countDocuments({ createdAt: { $gte: previousStartDate, $lt: startDate } }),
      ]).then(results => ({
        previousNewUsers: results[0],
        previousNewJobs: results[1]
      })),
      
      // User analytics
      User.aggregate([
        {
          $group: {
            _id: null,
            totalUsers: { $sum: 1 },
            verifiedUsers: { $sum: { $cond: ['$isVerified', 1, 0] } },
            bannedUsers: { $sum: { $cond: ['$banned', 1, 0] } },
            hirers: { $sum: { $cond: [{ $eq: ['$role', 'hirer'] }, 1, 0] } },
            fixers: { $sum: { $cond: [{ $eq: ['$role', 'fixer'] }, 1, 0] } },
            admins: { $sum: { $cond: [{ $eq: ['$role', 'admin'] }, 1, 0] } },
            avgRating: { $avg: '$rating.average' },
            avgJobsCompleted: { $avg: '$jobsCompleted' },
            avgTotalEarnings: { $avg: '$totalEarnings' },
            highRiskUsers: { $sum: { $cond: [{ $eq: ['$adminMetadata.riskLevel', 'high'] }, 1, 0] } },
            flaggedUsers: { $sum: { $cond: [{ $gt: [{ $size: { $ifNull: ['$adminMetadata.flaggedBy', []] } }, 0] }, 1, 0] } },
            suspendedUsers: { $sum: { $cond: [{ $eq: ['$adminMetadata.accountStatus', 'suspended'] }, 1, 0] } }
          }
        }
      ]).then(result => result[0] || {}),
      
      // User growth data for charts
      includeCharts ? User.aggregate([
        {
          $match: { createdAt: { $gte: startDate } }
        },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
              role: '$role'
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.date': 1 } }
      ]) : Promise.resolve([]),
      
      // User location breakdown
      User.aggregate([
        {
          $group: {
            _id: {
              city: '$location.city',
              state: '$location.state',
              country: '$location.country'
            },
            count: { $sum: 1 },
            verified: { $sum: { $cond: ['$isVerified', 1, 0] } },
            avgRating: { $avg: '$rating.average' }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 20 }
      ]),
      
      // User role distribution over time
      includeCharts ? User.aggregate([
        {
          $group: {
            _id: '$role',
            count: { $sum: 1 },
            avgRating: { $avg: '$rating.average' },
            avgJobsCompleted: { $avg: '$jobsCompleted' }
          }
        }
      ]) : Promise.resolve([]),
      
      // Job analytics
      Job.aggregate([
        {
          $group: {
            _id: null,
            totalJobs: { $sum: 1 },
            openJobs: { $sum: { $cond: [{ $eq: ['$status', 'open'] }, 1, 0] } },
            inProgressJobs: { $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] } },
            completedJobs: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
            cancelledJobs: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
            disputedJobs: { $sum: { $cond: ['$dispute.raised', 1, 0] } },
            featuredJobs: { $sum: { $cond: ['$featured', 1, 0] } },
            urgentJobs: { $sum: { $cond: [{ $eq: ['$urgency', 'asap'] }, 1, 0] } },
            avgBudget: { $avg: '$budget.amount' },
            totalBudget: { $sum: '$budget.amount' },
            avgViews: { $avg: '$views.count' },
            avgApplications: { $avg: { $size: { $ifNull: ['$applications', []] } } },
            avgRating: { $avg: '$completion.rating' },
            flaggedJobs: { $sum: { $cond: [{ $gt: [{ $size: { $ifNull: ['$adminMetadata.flaggedBy', []] } }, 0] }, 1, 0] } },
            highValueJobs: { $sum: { $cond: [{ $gte: ['$budget.amount', 50000] }, 1, 0] } }
          }
        }
      ]).then(result => result[0] || {}),
      
      // Job trend data for charts
      includeCharts ? Job.aggregate([
        {
          $match: { createdAt: { $gte: startDate } }
        },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
              status: '$status'
            },
            count: { $sum: 1 },
            totalBudget: { $sum: '$budget.amount' }
          }
        },
        { $sort: { '_id.date': 1 } }
      ]) : Promise.resolve([]),
      
      // Job location breakdown
      Job.aggregate([
        {
          $group: {
            _id: {
              city: '$location.city',
              state: '$location.state'
            },
            count: { $sum: 1 },
            avgBudget: { $avg: '$budget.amount' },
            completedJobs: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 20 }
      ]),
      
      // Job category/skills breakdown
      Job.aggregate([
        { $unwind: { path: '$skillsRequired', preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: '$skillsRequired',
            count: { $sum: 1 },
            avgBudget: { $avg: '$budget.amount' },
            completionRate: {
              $avg: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
            }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 20 }
      ]),
      
      // Financial metrics
      Job.aggregate([
        {
          $match: { 
            status: 'completed',
            'completion.confirmedAt': { $gte: startDate }
          }
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$budget.amount' },
            totalJobs: { $sum: 1 },
            avgJobValue: { $avg: '$budget.amount' }
          }
        }
      ]).then(result => result[0] || { totalRevenue: 0, totalJobs: 0, avgJobValue: 0 }),
      
      // Revenue data for charts
      includeCharts ? Job.aggregate([
        {
          $match: { 
            status: 'completed',
            'completion.confirmedAt': { $gte: startDate }
          }
        },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: '%Y-%m-%d', date: '$completion.confirmedAt' } }
            },
            revenue: { $sum: '$budget.amount' },
            jobCount: { $sum: 1 }
          }
        },
        { $sort: { '_id.date': 1 } }
      ]) : Promise.resolve([]),
      
      // Platform health metrics
      Promise.all([
        db.collection('admin_audit_log').countDocuments({ timestamp: { $gte: startDate } }),
        User.countDocuments({ lastActivityAt: { $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) } }),
        Job.countDocuments({ 'dispute.raised': true, 'dispute.status': 'pending' }),
        User.countDocuments({ 'adminMetadata.accountStatus': 'suspended' }),
      ]).then(results => ({
        adminActions: results[0],
        activeUsers24h: results[1],
        pendingDisputes: results[2],
        suspendedAccounts: results[3]
      })),
      
      // Security metrics
      Promise.all([
        User.countDocuments({ 'activityMetrics.suspicious.multipleAccounts': true }),
        User.countDocuments({ 'activityMetrics.suspicious.unusualActivity': true }),
        User.countDocuments({ 'adminMetadata.flaggedBy.0': { $exists: true } }),
        db.collection('admin_audit_log').countDocuments({ 
          action: /ban|suspend|flag/,
          timestamp: { $gte: startDate }
        }),
      ]).then(results => ({
        suspiciousAccounts: results[0],
        unusualActivity: results[1],
        flaggedUsers: results[2],
        securityActions: results[3]
      })),
      
      // Recent users (if details requested)
      includeDetails ? User.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .select('username name email role createdAt isVerified banned adminMetadata')
        .lean() : Promise.resolve([]),
      
      // Recent jobs (if details requested)
      includeDetails ? Job.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .select('title status budget.amount createdByInfo deadline urgency featured')
        .lean() : Promise.resolve([]),
      
      // Flagged content that needs review
      Promise.all([
        User.find({ 'adminMetadata.flaggedBy.0': { $exists: true } })
          .sort({ 'adminMetadata.flaggedBy.flaggedAt': -1 })
          .limit(5)
          .select('username name adminMetadata.flaggedBy')
          .lean(),
        Job.find({ 'adminMetadata.flaggedBy.0': { $exists: true } })
          .sort({ 'adminMetadata.flaggedBy.flaggedAt': -1 })
          .limit(5)
          .select('title createdByInfo adminMetadata.flaggedBy')
          .lean()
      ]).then(results => ({
        flaggedUsers: results[0],
        flaggedJobs: results[1]
      })),
      
      // Recent admin activity
      db.collection('admin_audit_log')
        .find()
        .sort({ timestamp: -1 })
        .limit(20)
        .toArray()
    ]);

    // Calculate growth percentages
    const userGrowthPercent = previousOverviewMetrics.previousNewUsers > 0 ?
      ((overviewMetrics.newUsers - previousOverviewMetrics.previousNewUsers) / previousOverviewMetrics.previousNewUsers * 100) : 0;
    
    const jobGrowthPercent = previousOverviewMetrics.previousNewJobs > 0 ?
      ((overviewMetrics.newJobs - previousOverviewMetrics.previousNewJobs) / previousOverviewMetrics.previousNewJobs * 100) : 0;

    // Process chart data for frontend consumption
    const processedUserGrowthData = userGrowthData.reduce((acc, item) => {
      const date = item._id.date;
      if (!acc[date]) acc[date] = { date, hirers: 0, fixers: 0, admins: 0, total: 0 };
      acc[date][item._id.role] = item.count;
      acc[date].total += item.count;
      return acc;
    }, {});

    const processedJobTrendData = jobTrendData.reduce((acc, item) => {
      const date = item._id.date;
      if (!acc[date]) acc[date] = { date, open: 0, in_progress: 0, completed: 0, cancelled: 0, total: 0, revenue: 0 };
      acc[date][item._id.status] = item.count;
      acc[date].total += item.count;
      acc[date].revenue += item.totalBudget || 0;
      return acc;
    }, {});

    const processedRevenueData = revenueData.map(item => ({
      date: item._id.date,
      revenue: item.revenue,
      jobs: item.jobCount
    }));

    // Compile comprehensive dashboard data
    const dashboardData = {
      success: true,
      data: {
        // Overview with growth indicators
        overview: {
          ...overviewMetrics,
          userGrowthPercent: Math.round(userGrowthPercent * 100) / 100,
          jobGrowthPercent: Math.round(jobGrowthPercent * 100) / 100,
          completionRate: overviewMetrics.totalJobs > 0 ? 
            Math.round((overviewMetrics.completedJobs / overviewMetrics.totalJobs) * 100) : 0,
          verificationRate: userAnalytics.totalUsers > 0 ?
            Math.round((userAnalytics.verifiedUsers / userAnalytics.totalUsers) * 100) : 0
        },
        
        // Detailed analytics
        analytics: {
          users: {
            ...userAnalytics,
            locationBreakdown: userLocationBreakdown,
            roleDistribution: userRoleDistribution
          },
          jobs: {
            ...jobAnalytics,
            locationBreakdown: jobLocationBreakdown,
            categoryBreakdown: jobCategoryBreakdown,
            completionRate: jobAnalytics.totalJobs > 0 ?
              Math.round((jobAnalytics.completedJobs / jobAnalytics.totalJobs) * 100) : 0
          },
          financial: {
            ...financialMetrics,
            revenuePerDay: financialMetrics.totalJobs > 0 ?
              Math.round(financialMetrics.totalRevenue / daysBack) : 0
          }
        },
        
        // Platform health
        health: {
          ...healthMetrics,
          ...securityMetrics,
          systemStatus: 'healthy', // This would be determined by actual health checks
          uptime: '99.9%' // This would be calculated from actual monitoring
        },
        
        // Chart data (only if requested)
        ...(includeCharts && {
          charts: {
            userGrowth: Object.values(processedUserGrowthData).sort((a, b) => a.date.localeCompare(b.date)),
            jobTrends: Object.values(processedJobTrendData).sort((a, b) => a.date.localeCompare(b.date)),
            revenue: processedRevenueData.sort((a, b) => a.date.localeCompare(b.date))
          }
        }),
        
        // Recent activity (only if details requested)
        ...(includeDetails && {
          recent: {
            users: recentUsers,
            jobs: recentJobs,
            adminActivity: adminActivity.slice(0, 10) // Limit to 10 most recent
          }
        }),
        
        // Items needing attention
        alerts: {
          flaggedUsers: flaggedContent.flaggedUsers.length,
          flaggedJobs: flaggedContent.flaggedJobs.length,
          pendingDisputes: healthMetrics.pendingDisputes,
          suspendedAccounts: healthMetrics.suspendedAccounts,
          flaggedContent: {
            users: flaggedContent.flaggedUsers,
            jobs: flaggedContent.flaggedJobs
          }
        },
        
        // Metadata
        meta: {
          range,
          generatedAt: new Date().toISOString(),
          dataUpToDate: true,
          adminId: auth.user._id,
          adminUsername: auth.session.user.username
        }
      }
    };

    // Log dashboard access for audit
    setTimeout(() => {
      db.collection('admin_audit_log').insertOne({
        adminId: auth.user._id,
        adminUsername: auth.session.user.username,
        action: 'dashboard_accessed',
        details: { range, includeDetails, includeCharts },
        timestamp: new Date(),
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        userAgent: request.headers.get('user-agent')
      }).catch(err => console.warn('Audit log failed:', err.name));
    }, 0);

    const response = NextResponse.json(dashboardData);
    return addSecurityHeaders(response);

  } catch (error) {
    console.error('Admin dashboard error:', error.name, error.message);
    
    const errorResponse = NextResponse.json(
      {
        success: false,
        error: 'Failed to load dashboard data',
        code: 'ADMIN_DASHBOARD_ERROR'
      },
      { status: 500 }
    );
    
    return addSecurityHeaders(errorResponse);
  }
}

export const dynamic = 'force-dynamic';