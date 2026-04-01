import type { NextResponse } from 'next/server';

import { parseQuery, respond, serverError } from '@/lib/api';
import { requireAdmin } from '@/lib/api/auth';
import { logger } from '@/lib/logger';
import connectDB from '@/lib/mongodb';
import { redisUtils } from '@/lib/redis';
import Dispute from '@/models/Dispute';
import Job from '@/models/Job';
import Review from '@/models/Review';
import User from '@/models/User';

import {
  adminAnalyticsQuerySchema,
  buildCreatedAtFilter,
  parseCachedAnalytics,
  parseTimeRange,
  resolveRangeStart,
  type AdminAnalyticsResponse,
  type UserSignupByRole,
} from './helpers';

export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<NextResponse> {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  const parsed = parseQuery(request as never, adminAnalyticsQuerySchema);
  if ('error' in parsed) return parsed.error;

  try {
    const { session } = auth;
    const timeRange = parseTimeRange(parsed.data.timeRange ?? null);
    const eventType = parsed.data.eventType || null;
    const startDate = resolveRangeStart(timeRange);
    const createdAtFilter = buildCreatedAtFilter(startDate);
    const cacheKey = `admin:analytics:${timeRange}:${eventType ?? 'all'}`;

    const cached = parseCachedAnalytics(await redisUtils.get(cacheKey));
    if (cached) return respond(cached);

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
        Job.countDocuments({ ...createdAtFilter, status: 'completed' }),
        Job.aggregate<{ count: number }>([
          { $unwind: '$applications' },
          ...(startDate ? [{ $match: { 'applications.appliedAt': { $gte: startDate } } }] : []),
          { $count: 'count' },
        ]),
        Review.aggregate<{ count: number; averageRating: number }>([
          { $match: createdAtFilter },
          { $group: { _id: null, count: { $sum: 1 }, averageRating: { $avg: '$rating.overall' } } },
        ]),
        User.countDocuments({ lastActivityAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }),
        Dispute.countDocuments(createdAtFilter),
      ]);

    const responsePayload: AdminAnalyticsResponse = {
      success: true,
      filters: { timeRange, eventType },
      analytics: {
        userSignups: {
          total: userSignupsByRole.reduce((total, entry) => total + entry.count, 0),
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

    logger.info({ userId: session.user.id, timeRange, eventType }, 'Admin analytics queried');

    return respond(responsePayload);
  } catch (error: unknown) {
    logger.error('Admin analytics query failed', error);
    return serverError('Failed to fetch analytics');
  }
}
