import { NextResponse } from 'next/server';
import connectDB from '../../../../lib/mongodb';
import User from '../../../../models/User';
import Job from '../../../../models/Job';
import { withErrorHandler, validateRequired, AuthenticationError } from '../../../../lib/errorHandling';
import { cache, analytics } from '../../../../lib/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';

export const GET = withErrorHandler(async (request) => {
  await connectDB();
  
  // Check if user is admin
  const session = await getServerSession(authOptions);
  if (!session?.user?.isAdmin) {
    throw new AuthenticationError('Admin access required');
  }

  const { searchParams } = new URL(request.url);
  const range = searchParams.get('range') || '7d';
  
  // Calculate date range
  const now = new Date();
  const daysBack = {
    '1d': 1,
    '7d': 7,
    '30d': 30,
    '90d': 90
  }[range] || 7;
  
  const startDate = new Date(now.getTime() - (daysBack * 24 * 60 * 60 * 1000));
  
  // Check cache first
  const cacheKey = `admin_dashboard_${range}_${Math.floor(now.getTime() / (5 * 60 * 1000))}`; // 5 min cache
  const cachedData = await cache.get(cacheKey);
  
  if (cachedData) {
    return NextResponse.json(cachedData);
  }

  try {
    // Run all queries in parallel for better performance
    const [
      totalUsers,
      activeUsers,
      newUsers,
      totalJobs,
      activeJobs,
      completedJobs,
      newJobs,
      totalRevenue,
      pendingPayouts,
      averageRating,
      userGrowthData,
      jobTrends,
      revenueData
    ] = await Promise.all([
      // User metrics
      User.countDocuments(),
      User.countDocuments({ 
        lastActive: { $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) } 
      }),
      User.countDocuments({ createdAt: { $gte: startDate } }),
      
      // Job metrics
      Job.countDocuments(),
      Job.countDocuments({ status: { $in: ['open', 'in-progress'] } }),
      Job.countDocuments({ status: 'completed' }),
      Job.countDocuments({ createdAt: { $gte: startDate } }),
      
      // Revenue metrics (would need a Transaction model)
      Promise.resolve(0), // Placeholder for total revenue
      Promise.resolve(0), // Placeholder for pending payouts
      
      // Rating metrics
      Job.aggregate([
        { $match: { rating: { $exists: true, $ne: null } } },
        { $group: { _id: null, avgRating: { $avg: '$rating' } } }
      ]),
      
      // Growth data for charts
      User.aggregate([
        {
          $match: { createdAt: { $gte: startDate } }
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id': 1 } }
      ]),
      
      // Job trends
      Job.aggregate([
        {
          $match: { createdAt: { $gte: startDate } }
        },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
              status: '$status'
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.date': 1 } }
      ]),
      
      // Revenue data (placeholder)
      Promise.resolve([])
    ]);

    // Process data
    const dashboardData = {
      overview: {
        totalUsers,
        activeUsers,
        newUsers,
        totalJobs,
        activeJobs,
        completedJobs,
        newJobs,
        totalRevenue,
        pendingPayouts,
        averageRating: averageRating[0]?.avgRating || 0,
        averageResponseTime: 2.5 // Placeholder
      },
      
      charts: {
        userGrowth: userGrowthData,
        jobTrends: jobTrends,
        revenue: revenueData
      },
      
      // Additional metrics
      topSkills: await Job.aggregate([
        { $unwind: '$skillsRequired' },
        { $group: { _id: '$skillsRequired', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),
      
      topLocations: await Job.aggregate([
        { $group: { _id: '$location.city', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),
      
      recentActivity: await Job.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('hirer', 'firstName lastName')
        .select('title status createdAt hirer')
    };

    // Cache for 5 minutes
    await cache.set(cacheKey, dashboardData, 300);
    
    // Track analytics
    await analytics.trackEvent('admin_dashboard_viewed', {
      userId: session.user.id,
      range,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json(dashboardData);
    
  } catch (error) {
    console.error('Dashboard data fetch error:', error);
    throw error;
  }
});

export const dynamic = 'force-dynamic';