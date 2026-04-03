import type { NextResponse } from 'next/server';
import { z } from 'zod';

import { parseQuery, respond, serverError } from '@/lib/api';
import { requireAdmin } from '@/lib/api/auth';
import { logger } from '@/lib/logger';
import connectDB from '@/lib/mongodb';
import { redisUtils } from '@/lib/redis';
import Dispute from '@/models/Dispute';
import Job from '@/models/Job';
import Review from '@/models/Review';
import User from '@/models/User';

export const dynamic = 'force-dynamic';

type SessionUser = {
  id?: string;
  role?: string;
};

type AdminAnalyticsTimeRange = '7d' | '30d' | '90d' | 'all';

type UserSignupByRole = {
  role: string;
  count: number;
};

type AdminAnalyticsResponse = {
  success: true;
  filters: {
    timeRange: AdminAnalyticsTimeRange;
    eventType: string | null;
  };
  analytics: {
    userSignups: {
      total: number;
      byRole: UserSignupByRole[];
    };
    jobsPosted: number;
    jobsCompleted: number;
    applicationsSubmitted: number;
    reviewsSubmitted: number;
    averageRating: number;
    activeUsers: number;
    disputesRaised: number;
  };
};

const adminAnalyticsQuerySchema = z.object({
  timeRange: z.enum(['7d', '30d', '90d', 'all']).optional(),
  eventType: z.string().trim().optional(),
});

function parseTimeRange(value: string | null): AdminAnalyticsTimeRange {
  if (value === '7d' || value === '30d' || value === '90d' || value === 'all') {
    return value;
  }
  return '30d';
}

function resolveRangeStart(timeRange: AdminAnalyticsTimeRange): Date | null {
  if (timeRange === 'all') {
    return null;
  }

  const now = Date.now();
  const days =
    timeRange === '7d' ? 7 : timeRange === '90d' ? 90 : 30;

  return new Date(now - days * 24 * 60 * 60 * 1000);
}

function buildCreatedAtFilter(startDate: Date | null): Record<string, unknown> {
  if (!startDate) {
    return {};
  }

  return {
    createdAt: { $gte: startDate },
  };
}

function parseCachedAnalytics(value: unknown): AdminAnalyticsResponse | null {
  if (!value) return null;

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as unknown;
      return parsed && typeof parsed === 'object' ? (parsed as AdminAnalyticsResponse) : null;
    } catch {
      return null;
    }
  }

  return typeof value === 'object' ? (value as AdminAnalyticsResponse) : null;
}

export async function GET(request: Request): Promise<NextResponse> {
  const auth = await requireAdmin();
  if ('error' in auth) {
    return auth.error;
  }

  const parsed = parseQuery(request as never, adminAnalyticsQuerySchema);
  if ('error' in parsed) {
    return parsed.error;
  }

  try {
    const { session } = auth;
    const timeRange = parseTimeRange(parsed.data.timeRange ?? null);
    const eventType = parsed.data.eventType || null;
    const startDate = resolveRangeStart(timeRange);
    const createdAtFilter = buildCreatedAtFilter(startDate);
    const cacheKey = `admin:analytics:${timeRange}:${eventType ?? 'all'}`;

    const cached = parseCachedAnalytics(await redisUtils.get(cacheKey));
    if (cached) {
      return respond(cached);
    }

    await connectDB();

    const [userSignupsByRole, jobsPosted, jobsCompleted, applicationsAggregate, reviewsAggregate, activeUsers, disputesRaised] =
      await Promise.all([
        User.aggregate<UserSignupByRole>([
          { $match: createdAtFilter },
          { $group: { _id: '$role', count: { $sum: 1 } } },
          { $project: { _id: 0, role: { $ifNull: ['$_id', 'unknown'] }, count: 1 } },
          { $sort: { role: 1 } },
        ]),
        Job.countDocuments(createdAtFilter),
        Job.countDocuments({
          ...createdAtFilter,
          status: 'completed',
        }),
        Job.aggregate<{ count: number }>([
          { $unwind: '$applications' },
          ...(startDate ? [{ $match: { 'applications.appliedAt': { $gte: startDate } } }] : []),
          { $count: 'count' },
        ]),
        Review.aggregate<{ count: number; averageRating: number }>([
          { $match: createdAtFilter },
          {
            $group: {
              _id: null,
              count: { $sum: 1 },
              averageRating: { $avg: '$rating.overall' },
            },
          },
        ]),
        User.countDocuments({
          lastActivityAt: {
            $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        }),
        Dispute.countDocuments(createdAtFilter),
      ]);

    const userSignupsTotal = userSignupsByRole.reduce((total, entry) => total + entry.count, 0);
    const responsePayload: AdminAnalyticsResponse = {
      success: true,
      filters: {
        timeRange,
        eventType,
      },
      analytics: {
        userSignups: {
          total: userSignupsTotal,
          byRole: userSignupsByRole,
        },
        jobsPosted,
        jobsCompleted,
        applicationsSubmitted: Number(applicationsAggregate[0]?.count ?? 0),
        reviewsSubmitted: Number(reviewsAggregate[0]?.count ?? 0),
        averageRating: Number(reviewsAggregate[0]?.averageRating ?? 0),
        activeUsers,
        disputesRaised,
      },
    };

    await redisUtils.set(cacheKey, responsePayload, 300);

    logger.info(
      {
        userId: session.user.id,
        timeRange,
        eventType,
      },
      'Admin analytics queried'
    );

    return respond(responsePayload);
  } catch (error: unknown) {
    logger.error('Admin analytics query failed', error);
    return serverError('Failed to fetch analytics');
  }
}
