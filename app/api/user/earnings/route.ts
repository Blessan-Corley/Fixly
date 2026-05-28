import { badRequest, requireSession, respond } from '@/lib/api';
import { createStandardError, requirePermission } from '@/lib/authorization';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import connectDB from '@/lib/mongodb';
import { redisUtils } from '@/lib/redis';
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
import { buildDateRanges, fetchEarningsAggregates } from './earnings.queries';
import {
  DETAILS_CACHE_TTL_SECONDS,
  EarningsQuerySchema,
  SUMMARY_CACHE_TTL_SECONDS,
  type CachedEarningsPayload,
  type EarningsPayload,
  type RecentEarningsJob,
} from './earnings.types';

export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  try {
    const rateLimitResult = await rateLimit(request, 'earnings', 30, 60 * 1000);
    if (!rateLimitResult.success) {
      return respond({ message: 'Too many requests. Please try again later.' }, 429);
    }

    const auth = await requireSession();
    if ('error' in auth) return auth.error;
    const userId = toTrimmedString(auth.session.user.id);
    if (!userId) return badRequest('Invalid user context');

    await connectDB();

    const user = await User.findById(userId).select('_id role');
    if (!user) return createStandardError(404, 'NOT_FOUND', 'User not found');
    try {
      requirePermission({ role: user.role }, 'read', 'user');
    } catch {
      return createStandardError(403, 'FORBIDDEN', 'Insufficient permissions');
    }

    const role = asRole(user.role);
    if (!role) {
      return respond({ earnings: { total: 0, thisMonth: 0, thisWeek: 0, lastMonth: 0, completedJobs: 0, averageJobValue: 0, growth: { monthly: 0, weekly: 0 } } });
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
    const datePath = role === 'hirer' ? 'completion.confirmedAt' : 'progress.completedAt';
    const counterpartPath = role === 'hirer' ? 'assignedTo' : 'createdBy';

    const cacheTtl = includeDetails ? DETAILS_CACHE_TTL_SECONDS : SUMMARY_CACHE_TTL_SECONDS;
    const cacheKey = `earnings:${String(user._id)}:${role}:${includeDetails ? 'details' : 'summary'}`;
    const cached = parseCachedPayload(await redisUtils.get(cacheKey));
    if (cached) {
      const { _cacheTimestamp, ...rest } = cached;
      return respond(
        { ...rest, cached: true, cacheTimestamp: _cacheTimestamp },
        200,
        { headers: { 'X-Cache': 'HIT', 'Cache-Control': `max-age=${cacheTtl}` } }
      );
    }

    const ranges = buildDateRanges();
    const { summary, thisMonth, thisWeek, lastWeek, lastMonth, historyRows, recentRows } =
      await fetchEarningsAggregates(user._id, ownerPath, datePath, counterpartPath, includeDetails, ranges);

    const total = aggregateNumber(summary, 'total');
    const completedJobs = aggregateNumber(summary, 'completedJobs');
    const thisMonthTotal = aggregateNumber(thisMonth, 'total');
    const thisWeekTotal = aggregateNumber(thisWeek, 'total');
    const lastWeekTotal = aggregateNumber(lastWeek, 'total');
    const lastMonthTotal = aggregateNumber(lastMonth, 'total');

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
      payload.history = buildHistory(historyRows, ranges.now);
      payload.recentJobs = recentRows
        .map((row) => toRecentEarningsJob(row, counterpartPath, datePath))
        .filter((row): row is RecentEarningsJob => row !== null);
    }

    const cachePayload: CachedEarningsPayload = { ...payload, _cacheTimestamp: new Date().toISOString() };
    await redisUtils.set(cacheKey, cachePayload, cacheTtl);

    return respond(payload, 200, { headers: { 'X-Cache': 'MISS', 'Cache-Control': `max-age=${cacheTtl}` } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Earnings fetch error:', error);
    return respond(
      { message: 'Internal server error', error: env.NODE_ENV === 'development' ? message : 'Server error' },
      500
    );
  }
}
