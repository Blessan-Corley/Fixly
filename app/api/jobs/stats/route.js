// app/api/jobs/stats/route.js
import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Job from '@/models/Job';
import User from '@/models/User';
import { redisUtils } from '@/lib/redis';
import { getServerAbly, CHANNELS, EVENTS } from '@/lib/ably';

export async function GET(request) {
  try {
    const cacheKey = 'job_stats:real_time';

    // Try to get from cache first
    try {
      const cached = await redisUtils.get(cacheKey);
      if (cached) {
        return NextResponse.json(JSON.parse(cached));
      }
    } catch (cacheError) {
      console.log('Cache miss for job stats');
    }

    await connectDB();

    // Get comprehensive job statistics
    const [
      totalJobs,
      urgentJobs,
      trendingSkills,
      activeUsers,
      recentJobs
    ] = await Promise.all([
      // Total active jobs
      Job.countDocuments({ status: 'open' }),

      // Urgent jobs (high priority or deadline within 24 hours)
      Job.countDocuments({
        status: 'open',
        $or: [
          { urgency: 'urgent' },
          { deadline: { $lte: new Date(Date.now() + 24 * 60 * 60 * 1000) } }
        ]
      }),

      // Trending skills (most requested in last 7 days)
      Job.aggregate([
        {
          $match: {
            createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
            status: { $in: ['open', 'assigned'] }
          }
        },
        { $unwind: '$skills' },
        {
          $group: {
            _id: '$skills',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 10 },
        {
          $project: {
            skill: '$_id',
            count: 1,
            _id: 0
          }
        }
      ]),

      // Active users (logged in within last hour)
      User.countDocuments({
        lastActive: { $gte: new Date(Date.now() - 60 * 60 * 1000) }
      }),

      // Recent job activity for nearby calculation
      Job.find({
        status: 'open',
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }).select('location coordinates').lean()
    ]);

    // Calculate location-based statistics
    const nearbyJobs = recentJobs.filter(job =>
      job.coordinates &&
      job.coordinates.latitude &&
      job.coordinates.longitude
    ).length;

    const stats = {
      total: totalJobs,
      urgent: urgentJobs,
      nearby: nearbyJobs,
      trending: trendingSkills,
      activeUsers: activeUsers,
      lastUpdated: new Date().toISOString()
    };

    // Cache for 2 minutes
    try {
      await redisUtils.setex(cacheKey, 120, JSON.stringify(stats));
    } catch (cacheError) {
      console.error('Failed to cache job stats:', cacheError);
    }

    // Broadcast stats update via Ably for real-time updates
    try {
      const ably = getServerAbly();
      const channel = ably.channels.get(CHANNELS.jobStats || 'jobs:stats');

      await channel.publish(EVENTS.STATS_UPDATED || 'stats_updated', {
        total: totalJobs,
        urgent: urgentJobs,
        nearby: nearbyJobs,
        activeUsers: activeUsers,
        timestamp: new Date().toISOString()
      });
    } catch (ablyError) {
      console.error('Failed to broadcast job stats:', ablyError);
    }

    return NextResponse.json(stats);

  } catch (error) {
    console.error('Job stats error:', error);
    return NextResponse.json(
      {
        message: 'Failed to get job statistics',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

// POST endpoint for updating stats manually (for admin use)
export async function POST(request) {
  try {
    const body = await request.json();
    const { forceRefresh } = body;

    if (forceRefresh) {
      // Clear cache to force fresh data
      try {
        await redisUtils.del('job_stats:real_time');
      } catch (error) {
        console.error('Failed to clear stats cache:', error);
      }
    }

    // Get fresh stats
    const response = await GET(request);
    return response;

  } catch (error) {
    console.error('Force refresh stats error:', error);
    return NextResponse.json(
      { message: 'Failed to refresh statistics' },
      { status: 500 }
    );
  }
}