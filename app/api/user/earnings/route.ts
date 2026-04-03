import { badRequest, requireSession, respond } from '@/lib/api';
import { createStandardError, requirePermission } from '@/lib/authorization';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import connectDB from '@/lib/mongodb';
import { redisUtils } from '@/lib/redis';
import Job from '@/models/Job';
import User from '@/models/User';
import { rateLimit } from '@/utils/rateLimiting';

import {
  aggregateNumber,
  asRole,
  buildHistory,
  growthPercent,
  parseCachedPayload,
  toRecentEarningsJob,
  toTrimmedString,
} from './earnings.helpers';
import {
  DETAILS_CACHE_TTL_SECONDS,
  EarningsQuerySchema,
  SUMMARY_CACHE_TTL_SECONDS,
  type CachedEarningsPayload,
  type CounterpartPath,
  type DatePath,
  type EarningsPayload,
  type HistoryAggregateRow,
  type RecentEarningsJob,
  type SummaryAggregateRow,
  type TotalAggregateRow,
} from './earnings.types';

export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  try {
    const rateLimitResult = await rateLimit(request, 'earnings', 30, 60 * 1000);
    if (!rateLimitResult.success) {
      return respond({ message: 'Too many requests. Please try again later.' }, 429);
    }

    const auth = await requireSession();
    if ('error' in auth) {
      return auth.error;
    }
    const userId = toTrimmedString(auth.session.user.id);
    if (!userId) {
      return badRequest('Invalid user context');
    }

    await connectDB();

    const user = await User.findById(userId).select('_id role');
    if (!user) {
      return createStandardError(404, 'NOT_FOUND', 'User not found');
    }
    try {
      requirePermission({ role: user.role }, 'read', 'user');
    } catch {
      return createStandardError(403, 'FORBIDDEN', 'Insufficient permissions');
    }

    const role = asRole(user.role);
    if (!role) {
      return respond({
        earnings: {
          total: 0,
          thisMonth: 0,
          thisWeek: 0,
          lastMonth: 0,
          completedJobs: 0,
          averageJobValue: 0,
          growth: { monthly: 0, weekly: 0 },
        },
      });
    }

    const url = new URL(request.url);
    const parsedQuery = EarningsQuerySchema.safeParse({
      period: url.searchParams.get('period') ?? undefined,
      details: url.searchParams.get('details') ?? undefined,
    });
    if (!parsedQuery.success) {
      return respond({ error: 'Validation failed', details: parsedQuery.error.flatten() }, 400);
    }

    const includeDetailsParam = parsedQuery.data.details;
    const includeDetails = includeDetailsParam === '1' || includeDetailsParam === 'true';

    const ownerPath: 'createdBy' | 'assignedTo' = role === 'hirer' ? 'createdBy' : 'assignedTo';
    const datePath: DatePath =
      role === 'hirer' ? 'completion.confirmedAt' : 'progress.completedAt';
    const counterpartPath: CounterpartPath = role === 'hirer' ? 'assignedTo' : 'createdBy';

    const cacheKey = `earnings:${String(user._id)}:${role}:${includeDetails ? 'details' : 'summary'}`;
    const cached = parseCachedPayload(await redisUtils.get(cacheKey));
    if (cached) {
      const { _cacheTimestamp, ...rest } = cached;
      return respond(
        { ...rest, cached: true, cacheTimestamp: _cacheTimestamp },
        200,
        {
          headers: {
            'X-Cache': 'HIT',
            'Cache-Control': `max-age=${includeDetails ? DETAILS_CACHE_TTL_SECONDS : SUMMARY_CACHE_TTL_SECONDS}`,
          },
        }
      );
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startOfLastWeek = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    const startOfHistoryWindow = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const baseMatch: Record<string, unknown> = {
      [ownerPath]: user._id,
      status: 'completed',
      [datePath]: { $exists: true },
    };

    const [summary, thisMonth, thisWeek, lastWeek, lastMonth, historyRows, recentRows] =
      await Promise.all([
        Job.aggregate([
          { $match: baseMatch },
          {
            $group: {
              _id: null,
              total: { $sum: '$budget.amount' },
              completedJobs: { $sum: 1 },
            },
          },
        ]),
        Job.aggregate([
          { $match: { ...baseMatch, [datePath]: { $gte: startOfMonth } } },
          { $group: { _id: null, total: { $sum: '$budget.amount' } } },
        ]),
        Job.aggregate([
          { $match: { ...baseMatch, [datePath]: { $gte: startOfWeek } } },
          { $group: { _id: null, total: { $sum: '$budget.amount' } } },
        ]),
        Job.aggregate([
          { $match: { ...baseMatch, [datePath]: { $gte: startOfLastWeek, $lt: startOfWeek } } },
          { $group: { _id: null, total: { $sum: '$budget.amount' } } },
        ]),
        Job.aggregate([
          {
            $match: {
              ...baseMatch,
              [datePath]: { $gte: startOfLastMonth, $lte: endOfLastMonth },
            },
          },
          { $group: { _id: null, total: { $sum: '$budget.amount' } } },
        ]),
        includeDetails
          ? Job.aggregate([
              {
                $match: { ...baseMatch, [datePath]: { $gte: startOfHistoryWindow } },
              },
              {
                $group: {
                  _id: {
                    year: { $year: `$${datePath}` },
                    month: { $month: `$${datePath}` },
                  },
                  total: { $sum: '$budget.amount' },
                  jobs: { $sum: 1 },
                },
              },
              { $sort: { '_id.year': 1, '_id.month': 1 } },
            ])
          : Promise.resolve([]),
        includeDetails
          ? Job.find(baseMatch)
              .select(`title status budget.amount ${datePath} ${counterpartPath}`)
              .populate(counterpartPath, 'name username location')
              .sort({ [datePath]: -1 })
              .limit(10)
              .lean()
          : Promise.resolve([]),
      ]);

    const total = aggregateNumber(summary as SummaryAggregateRow[], 'total');
    const completedJobs = aggregateNumber(summary as SummaryAggregateRow[], 'completedJobs');
    const thisMonthTotal = aggregateNumber(thisMonth as TotalAggregateRow[], 'total');
    const thisWeekTotal = aggregateNumber(thisWeek as TotalAggregateRow[], 'total');
    const lastWeekTotal = aggregateNumber(lastWeek as TotalAggregateRow[], 'total');
    const lastMonthTotal = aggregateNumber(lastMonth as TotalAggregateRow[], 'total');

    const payload: EarningsPayload = {
      earnings: {
        total,
        thisMonth: thisMonthTotal,
        thisWeek: thisWeekTotal,
        lastMonth: lastMonthTotal,
        completedJobs,
        averageJobValue: completedJobs > 0 ? Math.round(total / completedJobs) : 0,
        growth: {
          monthly: growthPercent(thisMonthTotal, lastMonthTotal),
          weekly: growthPercent(thisWeekTotal, lastWeekTotal),
        },
      },
    };

    if (includeDetails) {
      payload.history = buildHistory(historyRows as HistoryAggregateRow[], now);
      payload.recentJobs = (recentRows as unknown[])
        .map((row) => toRecentEarningsJob(row, counterpartPath, datePath))
        .filter((row): row is RecentEarningsJob => row !== null);
    }

    const cachePayload: CachedEarningsPayload = {
      ...payload,
      _cacheTimestamp: new Date().toISOString(),
    };
    await redisUtils.set(
      cacheKey,
      cachePayload,
      includeDetails ? DETAILS_CACHE_TTL_SECONDS : SUMMARY_CACHE_TTL_SECONDS
    );

    return respond(payload, 200, {
      headers: {
        'X-Cache': 'MISS',
        'Cache-Control': `max-age=${includeDetails ? DETAILS_CACHE_TTL_SECONDS : SUMMARY_CACHE_TTL_SECONDS}`,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Earnings fetch error:', error);
    return respond(
      {
        message: 'Internal server error',
        error: env.NODE_ENV === 'development' ? message : 'Server error',
      },
      500
    );
  }
}
