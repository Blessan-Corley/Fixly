import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth.js';
import connectDB from '../../../../lib/db.js';
import Job from '../../../../models/Job.js';
import User from '../../../../models/User.js';
import { rateLimit } from '../../../../utils/rateLimiting.js';

export const dynamic = 'force-dynamic'; 
export async function GET(request) {
  console.log('🔍 Dashboard stats API called');
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimit(request, 'dashboard_stats', 30, 60); // 30 requests per minute
    if (!rateLimitResult.success) {
      console.log('❌ Rate limit exceeded');
      return NextResponse.json(
        { message: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    console.log('✅ Rate limit passed');
    const session = await getServerSession(authOptions);
    console.log('📋 Session check:', {
      hasSession: !!session,
      hasUser: !!session?.user,
      hasUserId: !!session?.user?.id,
      userId: session?.user?.id
    });
    
    if (!session?.user?.id) {
      console.log('❌ No session or user ID found');
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      );
    }

    // ✅ CRITICAL FIX: Handle temporary session IDs
    const userId = session.user.id;
    if (userId.startsWith('temp_')) {
      console.log('⚠️ Temporary session detected in dashboard stats:', userId);
      return NextResponse.json(
        { 
          message: 'Session not properly established. Please complete signup.',
          needsReauth: true,
          needsSignup: true
        },
        { status: 401 }
      );
    }

    // ✅ CRITICAL FIX: Handle Google users vs MongoDB users
    const isGoogleUser = !userId.match(/^[0-9a-fA-F]{24}$/);

    if (isGoogleUser) {
      console.log('🔍 Google user stats request:', userId);
      // For Google users who haven't completed signup, return empty stats
      return NextResponse.json({
        totalJobs: 0,
        activeJobs: 0,
        completedJobs: 0,
        pendingApplications: 0,
        totalEarnings: 0,
        monthlyStats: [],
        recentActivity: []
      });
    }

    console.log('📊 Stats request for user:', session.user.id, 'role:', session.user.role);

    await connectDB();

    const user = await User.findById(session.user.id);
    if (!user) {
      console.log('❌ User not found in database:', session.user.id);
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }

    if (!user.role) {
      console.log('❌ User has no role');
      return NextResponse.json(
        { message: 'User role not set. Please complete your profile.' },
        { status: 400 }
      );
    }

    console.log('✅ User found, role:', user.role);

    let stats = {};

    switch (user.role) {
      case 'hirer':
        stats = await getHirerStats(user._id);
        break;
      case 'fixer':
        stats = await getFixerStats(user._id);
        break;
      case 'admin':
        stats = await getAdminStats();
        break;
      default:
        console.log('❌ Invalid user role:', user.role);
        return NextResponse.json(
          { message: `Invalid user role: ${user.role}` },
          { status: 400 }
        );
    }

    return NextResponse.json(stats);

  } catch (error) {
    console.error('❌ Dashboard stats error:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    return NextResponse.json(
      { 
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
      },
      { status: 500 }
    );
  }
}

async function getHirerStats(userId) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  // Get all jobs posted by this hirer
  const [
    totalJobs,
    activeJobs,
    completedJobs,
    cancelledJobs,
    jobsThisMonth,
    jobsToday,
    totalApplications,
    pendingApplications,
    totalSpent,
    avgCompletionTime,
    topFixers
  ] = await Promise.all([
    // Total jobs posted
    Job.countDocuments({ createdBy: userId }),
    
    // Active jobs (open + in_progress)
    Job.countDocuments({ 
      createdBy: userId, 
      status: { $in: ['open', 'in_progress'] } 
    }),
    
    // Completed jobs
    Job.countDocuments({ 
      createdBy: userId, 
      status: 'completed' 
    }),
    
    // Cancelled jobs
    Job.countDocuments({ 
      createdBy: userId, 
      status: 'cancelled' 
    }),
    
    // Jobs this month
    Job.countDocuments({ 
      createdBy: userId, 
      createdAt: { $gte: startOfMonth } 
    }),
    
    // Jobs today
    Job.countDocuments({ 
      createdBy: userId, 
      createdAt: { $gte: startOfToday } 
    }),
    
    // Total applications received
    Job.aggregate([
      { $match: { createdBy: userId } },
      { $project: { applicationCount: { $size: '$applications' } } },
      { $group: { _id: null, total: { $sum: '$applicationCount' } } }
    ]),
    
    // Pending applications
    Job.aggregate([
      { $match: { createdBy: userId } },
      { $unwind: '$applications' },
      { $match: { 'applications.status': 'pending' } },
      { $count: 'pending' }
    ]),
    
    // Total amount spent
    Job.aggregate([
      { 
        $match: { 
          createdBy: userId, 
          status: 'completed',
          'budget.type': { $ne: 'negotiable' }
        } 
      },
      { $group: { _id: null, total: { $sum: '$budget.amount' } } }
    ]),
    
    // Average completion time
    Job.aggregate([
      { 
        $match: { 
          createdBy: userId, 
          status: 'completed',
          'progress.startedAt': { $exists: true },
          'progress.completedAt': { $exists: true }
        } 
      },
      {
        $project: {
          completionTime: {
            $divide: [
              { $subtract: ['$progress.completedAt', '$progress.startedAt'] },
              1000 * 60 * 60 * 24 // Convert to days
            ]
          }
        }
      },
      { $group: { _id: null, avgDays: { $avg: '$completionTime' } } }
    ]),
    
    // Top fixers worked with
    Job.aggregate([
      { 
        $match: { 
          createdBy: userId, 
          status: 'completed',
          assignedTo: { $exists: true }
        } 
      },
      { $group: { _id: '$assignedTo', jobsCompleted: { $sum: 1 } } },
      { $sort: { jobsCompleted: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'fixer'
        }
      },
      { $unwind: '$fixer' },
      {
        $project: {
          name: '$fixer.name',
          username: '$fixer.username',
          photoURL: '$fixer.photoURL',
          rating: '$fixer.rating',
          jobsCompleted: 1
        }
      }
    ])
  ]);

  return {
    totalJobs,
    activeJobs,
    completedJobs,
    cancelledJobs,
    jobsThisMonth,
    jobsToday,
    totalApplications: totalApplications[0]?.total || 0,
    pendingApplications: pendingApplications[0]?.pending || 0,
    totalSpent: totalSpent[0]?.total || 0,
    avgCompletionTime: Math.round(avgCompletionTime[0]?.avgDays || 0),
    topFixers,
    completionRate: totalJobs > 0 ? Math.round((completedJobs / totalJobs) * 100) : 0,
    responseRate: totalApplications[0]?.total > 0 ? 
      Math.round(((totalApplications[0]?.total - (pendingApplications[0]?.pending || 0)) / totalApplications[0]?.total) * 100) : 0
  };
}

async function getFixerStats(userId) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

  const user = await User.findById(userId);

  // Get application statistics
  const [
    totalApplications,
    pendingApplications,
    acceptedApplications,
    rejectedApplications,
    applicationsThisMonth,
    activeJobs,
    recentJobs,
    monthlyEarnings,
    yearlyEarnings,
    totalEarnings,
    weeklyEarnings,
    lastMonthEarnings,
    successRate
  ] = await Promise.all([
    // Total applications sent
    Job.aggregate([
      { $unwind: '$applications' },
      { $match: { 'applications.fixer': userId } },
      { $count: 'total' }
    ]),
    
    // Pending applications
    Job.aggregate([
      { $unwind: '$applications' },
      { $match: { 'applications.fixer': userId, 'applications.status': 'pending' } },
      { $count: 'pending' }
    ]),
    
    // Accepted applications
    Job.aggregate([
      { $unwind: '$applications' },
      { $match: { 'applications.fixer': userId, 'applications.status': 'accepted' } },
      { $count: 'accepted' }
    ]),
    
    // Rejected applications
    Job.aggregate([
      { $unwind: '$applications' },
      { $match: { 'applications.fixer': userId, 'applications.status': 'rejected' } },
      { $count: 'rejected' }
    ]),
    
    // Applications this month
    Job.aggregate([
      { $unwind: '$applications' },
      { 
        $match: { 
          'applications.fixer': userId,
          'applications.appliedAt': { $gte: startOfMonth }
        } 
      },
      { $count: 'thisMonth' }
    ]),
    
    // Active jobs (in progress)
    Job.countDocuments({ 
      assignedTo: userId, 
      status: 'in_progress' 
    }),
    
    // Recent jobs for portfolio
    Job.find({ 
      assignedTo: userId, 
      status: { $in: ['completed', 'in_progress'] } 
    })
    .populate('createdBy', 'name username rating location')
    .sort({ 'progress.startedAt': -1 })
    .limit(5),
    
    // Monthly earnings
    Job.aggregate([
      { 
        $match: { 
          assignedTo: userId, 
          status: 'completed',
          'progress.completedAt': { $gte: startOfMonth }
        } 
      },
      { $group: { _id: null, total: { $sum: '$budget.amount' } } }
    ]),
    
    // Yearly earnings
    Job.aggregate([
      { 
        $match: { 
          assignedTo: userId, 
          status: 'completed',
          'progress.completedAt': { $gte: startOfYear }
        } 
      },
      { $group: { _id: null, total: { $sum: '$budget.amount' } } }
    ]),

    // Total lifetime earnings
    Job.aggregate([
      { 
        $match: { 
          assignedTo: userId, 
          status: 'completed'
        } 
      },
      { $group: { _id: null, total: { $sum: '$budget.amount' } } }
    ]),

    // Weekly earnings
    Job.aggregate([
      { 
        $match: { 
          assignedTo: userId, 
          status: 'completed',
          'progress.completedAt': { $gte: startOfWeek }
        } 
      },
      { $group: { _id: null, total: { $sum: '$budget.amount' } } }
    ]),

    // Last month earnings
    Job.aggregate([
      { 
        $match: { 
          assignedTo: userId, 
          status: 'completed',
          'progress.completedAt': { $gte: startOfLastMonth, $lte: endOfLastMonth }
        } 
      },
      { $group: { _id: null, total: { $sum: '$budget.amount' } } }
    ]),
    
    // Success rate (accepted applications / total applications)
    Job.aggregate([
      { $unwind: '$applications' },
      { $match: { 'applications.fixer': userId } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          accepted: {
            $sum: {
              $cond: [{ $eq: ['$applications.status', 'accepted'] }, 1, 0]
            }
          }
        }
      }
    ])
  ]);

  const successRateData = successRate[0];
  const calculatedSuccessRate = successRateData && successRateData.total > 0 ? 
    Math.round((successRateData.accepted / successRateData.total) * 100) : 0;

  return {
    totalApplications: totalApplications[0]?.total || 0,
    pendingApplications: pendingApplications[0]?.pending || 0,
    acceptedApplications: acceptedApplications[0]?.accepted || 0,
    rejectedApplications: rejectedApplications[0]?.rejected || 0,
    applicationsThisMonth: applicationsThisMonth[0]?.thisMonth || 0,
    activeJobs,
    jobsCompleted: user.jobsCompleted || 0,
    totalEarnings: totalEarnings[0]?.total || 0,
    monthlyEarnings: monthlyEarnings[0]?.total || 0,
    yearlyEarnings: yearlyEarnings[0]?.total || 0,
    weeklyEarnings: weeklyEarnings[0]?.total || 0,
    lastMonthEarnings: lastMonthEarnings[0]?.total || 0,
    rating: user.rating || { average: 0, count: 0 },
    successRate: calculatedSuccessRate,
    creditsUsed: user.plan?.creditsUsed || 0,
    creditsRemaining: user.plan?.type === 'pro' ? 'unlimited' : Math.max(0, 3 - (user.plan?.creditsUsed || 0)),
    planType: user.plan?.type || 'free',
    planStatus: user.plan?.status || 'active',
    recentJobs: recentJobs.map(job => ({
      _id: job._id,
      title: job.title,
      status: job.status,
      budget: job.budget,
      createdBy: job.createdBy,
      startedAt: job.progress?.startedAt,
      completedAt: job.progress?.completedAt
    }))
  };
}

async function getAdminStats() {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  const [
    totalUsers,
    totalHirers,
    totalFixers,
    activeUsers,
    newUsersToday,
    newUsersThisMonth,
    totalJobs,
    openJobs,
    inProgressJobs,
    completedJobs,
    newJobsToday,
    totalApplications,
    pendingApplications,
    totalRevenue,
    monthlyRevenue,
    topFixers,
    topHirers,
    platformStats
  ] = await Promise.all([
    // User statistics
    User.countDocuments({}),
    User.countDocuments({ role: 'hirer' }),
    User.countDocuments({ role: 'fixer' }),
    User.countDocuments({ 
      $or: [
        { lastLoginAt: { $gte: new Date(now - 30 * 24 * 60 * 60 * 1000) } },
        { createdAt: { $gte: new Date(now - 30 * 24 * 60 * 60 * 1000) } }
      ]
    }),
    User.countDocuments({ createdAt: { $gte: startOfToday } }),
    User.countDocuments({ createdAt: { $gte: startOfMonth } }),
    
    // Job statistics
    Job.countDocuments({}),
    Job.countDocuments({ status: 'open' }),
    Job.countDocuments({ status: 'in_progress' }),
    Job.countDocuments({ status: 'completed' }),
    Job.countDocuments({ createdAt: { $gte: startOfToday } }),
    
    // Application statistics
    Job.aggregate([
      { $project: { applicationCount: { $size: '$applications' } } },
      { $group: { _id: null, total: { $sum: '$applicationCount' } } }
    ]),
    Job.aggregate([
      { $unwind: '$applications' },
      { $match: { 'applications.status': 'pending' } },
      { $count: 'pending' }
    ]),
    
    // Revenue statistics (from pro subscriptions)
    User.aggregate([
      { 
        $match: { 
          'plan.type': 'pro',
          'plan.status': 'active'
        } 
      },
      { $group: { _id: null, total: { $sum: 99 } } } // ₹99 per subscription
    ]),
    User.aggregate([
      { 
        $match: { 
          'plan.type': 'pro',
          'plan.status': 'active',
          'plan.startDate': { $gte: startOfMonth }
        } 
      },
      { $group: { _id: null, total: { $sum: 99 } } }
    ]),
    
    // Top fixers by rating and jobs completed
    User.find({ role: 'fixer' })
      .sort({ 'rating.average': -1, jobsCompleted: -1 })
      .limit(10)
      .select('name username photoURL rating jobsCompleted totalEarnings'),
    
    // Top hirers by jobs posted
    User.aggregate([
      { $match: { role: 'hirer' } },
      {
        $lookup: {
          from: 'jobs',
          localField: '_id',
          foreignField: 'createdBy',
          as: 'jobs'
        }
      },
      {
        $project: {
          name: 1,
          username: 1,
          photoURL: 1,
          rating: 1,
          jobsPosted: { $size: '$jobs' },
          completedJobs: {
            $size: {
              $filter: {
                input: '$jobs',
                cond: { $eq: ['$$this.status', 'completed'] }
              }
            }
          }
        }
      },
      { $sort: { jobsPosted: -1 } },
      { $limit: 10 }
    ]),
    
    // Platform performance metrics
    Job.aggregate([
      {
        $group: {
          _id: null,
          avgBudget: { $avg: '$budget.amount' },
          avgApplications: { $avg: { $size: '$applications' } },
          completionRate: {
            $avg: {
              $cond: [{ $eq: ['$status', 'completed'] }, 1, 0]
            }
          }
        }
      }
    ])
  ]);

  return {
    users: {
      total: totalUsers,
      hirers: totalHirers,
      fixers: totalFixers,
      active: activeUsers,
      newToday: newUsersToday,
      newThisMonth: newUsersThisMonth
    },
    jobs: {
      total: totalJobs,
      open: openJobs,
      inProgress: inProgressJobs,
      completed: completedJobs,
      newToday: newJobsToday,
      completionRate: totalJobs > 0 ? Math.round((completedJobs / totalJobs) * 100) : 0
    },
    applications: {
      total: totalApplications[0]?.total || 0,
      pending: pendingApplications[0]?.pending || 0,
      avgPerJob: platformStats[0]?.avgApplications || 0
    },
    revenue: {
      total: totalRevenue[0]?.total || 0,
      monthly: monthlyRevenue[0]?.total || 0,
      avgJobBudget: Math.round(platformStats[0]?.avgBudget || 0)
    },
    topFixers,
    topHirers,
    platform: {
      avgBudget: Math.round(platformStats[0]?.avgBudget || 0),
      avgApplicationsPerJob: Math.round(platformStats[0]?.avgApplications || 0),
      completionRate: Math.round((platformStats[0]?.completionRate || 0) * 100)
    }
  };
}