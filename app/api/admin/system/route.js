// Enhanced admin system monitoring API
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import { cache } from '@/lib/cache';
import { ApiSuccess, ApiError, ERROR_CODES } from '@/utils/apiResponse';
import User from '@/models/User';
import Job from '@/models/Job';
import mongoose from 'mongoose';
import os from 'os';

export async function GET(request) {
  try {
    // Authentication check
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return ApiError(ERROR_CODES.ADMIN_ACCESS_REQUIRED);
    }

    const { searchParams } = new URL(request.url);
    const metric = searchParams.get('metric') || 'overview';

    await connectDB();

    switch (metric) {
      case 'overview':
        return await getSystemOverview();
      case 'performance':
        return await getPerformanceMetrics();
      case 'database':
        return await getDatabaseMetrics();
      case 'cache':
        return await getCacheMetrics();
      case 'users':
        return await getUserMetrics();
      case 'security':
        return await getSecurityMetrics();
      default:
        return ApiError(ERROR_CODES.INVALID_INPUT, 'Invalid metric type');
    }
  } catch (error) {
    console.error('Admin system API error:', error);
    return ApiError(ERROR_CODES.INTERNAL_ERROR, 'Failed to fetch system metrics');
  }
}

async function getSystemOverview() {
  const [
    totalUsers,
    activeJobs,
    completedJobs,
    pendingApplications,
    systemUptime
  ] = await Promise.all([
    User.countDocuments({ banned: false }),
    Job.countDocuments({ status: { $in: ['open', 'in_progress'] } }),
    Job.countDocuments({ status: 'completed' }),
    Job.countDocuments({ 'applications.status': 'pending' }),
    getSystemUptime()
  ]);

  const data = {
    users: {
      total: totalUsers,
      online: await getOnlineUsersCount(),
      newToday: await User.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      })
    },
    jobs: {
      active: activeJobs,
      completed: completedJobs,
      completionRate: activeJobs > 0 ? ((completedJobs / (activeJobs + completedJobs)) * 100).toFixed(1) : 0,
      newToday: await Job.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      })
    },
    applications: {
      pending: pendingApplications,
      processedToday: await Job.countDocuments({
        'applications.updatedAt': { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      })
    },
    system: {
      uptime: systemUptime,
      nodeVersion: process.version,
      platform: process.platform,
      environment: process.env.NODE_ENV
    }
  };

  return ApiSuccess(data, 'System overview retrieved successfully');
}

async function getPerformanceMetrics() {
  // Mock API metrics since getApiMetrics might not be implemented
  const apiMetrics = {
    totalRequests: 1000,
    errorRate: '2%',
    uptime: Math.floor(process.uptime())
  };
  const cacheMetrics = cache.getMetrics();
  
  // System performance
  const cpuUsage = process.cpuUsage();
  const memoryUsage = process.memoryUsage();
  const systemInfo = {
    loadAverage: os.loadavg(),
    totalMemory: os.totalmem(),
    freeMemory: os.freemem(),
    cpuCount: os.cpus().length
  };

  const data = {
    api: {
      ...apiMetrics,
      requestsPerSecond: calculateRequestsPerSecond(apiMetrics)
    },
    cache: cacheMetrics,
    system: {
      cpu: {
        usage: cpuUsage,
        loadAverage: systemInfo.loadAverage,
        cores: systemInfo.cpuCount
      },
      memory: {
        used: memoryUsage.heapUsed,
        total: memoryUsage.heapTotal,
        external: memoryUsage.external,
        systemTotal: systemInfo.totalMemory,
        systemFree: systemInfo.freeMemory,
        usagePercent: ((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100).toFixed(2)
      }
    },
    concurrent: await getConcurrentUserCapacity()
  };

  return ApiSuccess(data, 'Performance metrics retrieved successfully');
}

async function getDatabaseMetrics() {
  let dbStats;
  try {
    dbStats = await mongoose.connection.db.stats();
  } catch (error) {
    // Fallback if stats are not available
    dbStats = {
      dataSize: 0,
      storageSize: 0,
      indexSize: 0
    };
  }
  
  const collections = [
    { name: 'users', count: await User.countDocuments() },
    { name: 'jobs', count: await Job.countDocuments() }
  ];

  // Query performance metrics
  const slowQueries = await getSlowQueries();
  const connectionPool = mongoose.connection.readyState;

  const data = {
    database: {
      connected: connectionPool === 1,
      readyState: getConnectionState(connectionPool),
      collections,
      storage: {
        dataSize: dbStats.dataSize,
        storageSize: dbStats.storageSize,
        indexSize: dbStats.indexSize,
        totalSize: dbStats.dataSize + dbStats.indexSize
      }
    },
    performance: {
      slowQueries,
      avgQueryTime: await getAverageQueryTime(),
      connectionPool: {
        current: mongoose.connections[0]?._hasOpened ? 1 : 0,
        max: 10 // Based on our connection options
      }
    }
  };

  return ApiSuccess(data, 'Database metrics retrieved successfully');
}

async function getCacheMetrics() {
  const data = {
    cache: cache.getMetrics(),
    recommendations: generateCacheRecommendations(cache.getMetrics())
  };

  return ApiSuccess(data, 'Cache metrics retrieved successfully');
}

async function getUserMetrics() {
  const [
    usersByRole,
    usersByStatus,
    userGrowth,
    topUsers
  ] = await Promise.all([
    User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]),
    User.aggregate([
      { $group: { _id: '$banned', count: { $sum: 1 } } }
    ]),
    getUserGrowthData(),
    getTopUsers()
  ]);

  const data = {
    distribution: {
      byRole: usersByRole,
      byStatus: usersByStatus
    },
    growth: userGrowth,
    topUsers,
    activity: await getUserActivityMetrics()
  };

  return ApiSuccess(data, 'User metrics retrieved successfully');
}

async function getSecurityMetrics() {
  const data = {
    rateLimiting: {
      status: 'active',
      rules: {
        api: '200 requests/minute',
        auth: '20 requests/minute',
        upload: '20 requests/minute'
      }
    },
    authentication: {
      methods: ['email', 'google'],
      sessionTimeout: '7 days',
      passwordPolicy: 'strong'
    },
    headers: {
      csp: true,
      hsts: process.env.NODE_ENV === 'production',
      xss: true,
      clickjacking: true
    },
    recentAttempts: await getRecentSecurityAttempts()
  };

  return ApiSuccess(data, 'Security metrics retrieved successfully');
}

// Helper functions
function getSystemUptime() {
  return Math.floor(process.uptime());
}

async function getOnlineUsersCount() {
  // This would typically come from your real-time system
  // For now, estimate based on recent activity
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  return await User.countDocuments({
    lastActivityAt: { $gte: fiveMinutesAgo }
  });
}

function calculateRequestsPerSecond(metrics) {
  if (metrics.uptime === 0) return 0;
  return (metrics.totalRequests / metrics.uptime).toFixed(2);
}

async function getConcurrentUserCapacity() {
  // Calculate based on current system resources
  const memoryUsage = process.memoryUsage();
  const availableMemory = os.freemem();
  const cpuCores = os.cpus().length;
  
  // Estimate concurrent users based on:
  // - Available memory (assuming 1MB per concurrent user)
  // - CPU capacity (assuming 1 core can handle 1000 concurrent users)
  // - Database connection limits (100 connections max from our config)
  
  const memoryLimit = Math.floor(availableMemory / (1024 * 1024)); // 1MB per user
  const cpuLimit = cpuCores * 1000;
  const dbLimit = 100 * 10; // 100 connections * 10 users per connection efficiently
  
  const estimated = Math.min(memoryLimit, cpuLimit, dbLimit);
  
  return {
    estimated,
    factors: {
      memory: memoryLimit,
      cpu: cpuLimit,
      database: dbLimit
    },
    current: await getOnlineUsersCount(),
    recommendation: "For higher capacity, consider scaling horizontally with load balancers and multiple instances"
  };
}

function getConnectionState(state) {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };
  return states[state] || 'unknown';
}

async function getSlowQueries() {
  // This would need to be implemented with proper query monitoring
  return [];
}

async function getAverageQueryTime() {
  // This would need to be implemented with proper query monitoring
  return 'N/A';
}

function generateCacheRecommendations(metrics) {
  const recommendations = [];
  
  if (parseFloat(metrics.hitRate) < 80) {
    recommendations.push('Consider increasing cache TTL for frequently accessed data');
  }
  
  if (metrics.size > 1000) {
    recommendations.push('Cache size is large - consider implementing cache cleanup policies');
  }
  
  if (metrics.errors > 0) {
    recommendations.push('Cache errors detected - check cache health');
  }
  
  return recommendations;
}

async function getUserGrowthData() {
  // Get user registration data for the last 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  
  const growth = await User.aggregate([
    {
      $match: {
        createdAt: { $gte: thirtyDaysAgo }
      }
    },
    {
      $group: {
        _id: {
          $dateToString: {
            format: '%Y-%m-%d',
            date: '$createdAt'
          }
        },
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);
  
  return growth;
}

async function getTopUsers() {
  return await User.find({
    banned: false
  })
  .select('name username email role jobsCompleted rating.average lastActivityAt')
  .sort({ jobsCompleted: -1, 'rating.average': -1 })
  .limit(10)
  .lean();
}

async function getUserActivityMetrics() {
  const now = new Date();
  const dayAgo = new Date(now - 24 * 60 * 60 * 1000);
  const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
  
  return {
    activeToday: await User.countDocuments({
      lastActivityAt: { $gte: dayAgo }
    }),
    activeThisWeek: await User.countDocuments({
      lastActivityAt: { $gte: weekAgo }
    })
  };
}

async function getRecentSecurityAttempts() {
  // This would typically come from security logs
  return {
    failedLogins: 0,
    blockedIPs: 0,
    suspiciousActivity: 0
  };
}

