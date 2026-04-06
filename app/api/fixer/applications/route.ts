import { Types } from 'mongoose';
import { NextRequest } from 'next/server';

import { badRequest, parseQuery, requireSession, respond, serverError } from '@/lib/api';
import { createStandardError, requirePermission } from '@/lib/authorization';
import { logger } from '@/lib/logger';
import connectDB from '@/lib/mongodb';
import { redisUtils } from '@/lib/redis';
import Job from '@/models/Job';
import { rateLimit } from '@/utils/rateLimiting';

import {
  FIXER_APPS_CACHE_TTL,
  FixerApplicationsQuerySchema,
  buildMatchQuery,
  extractApplicationEntry,
  parsePositiveInt,
  toApplicationStatus,
  toTrimmedString,
  type ApplicationStatus,
  type JobRecord,
  type SessionUser,
} from './helpers';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const rateLimitResult = await rateLimit(request, 'fixer_applications', 30, 60 * 1000);
    if (!rateLimitResult.success) return respond({ message: 'Too many requests. Please try again later.' }, 429);

    const auth = await requireSession();
    if ('error' in auth) return auth.error;

    const sessionUser = auth.session.user as SessionUser;
    const userId = toTrimmedString(sessionUser.id);
    if (!userId) return createStandardError(401, 'UNAUTHORIZED', 'Authentication required');
    try {
      requirePermission(sessionUser, 'read', 'application');
    } catch {
      return createStandardError(403, 'FORBIDDEN', 'Only fixers can view applications');
    }
    if (!Types.ObjectId.isValid(userId)) return badRequest('Invalid user context');

    const parsedQuery = parseQuery(request, FixerApplicationsQuerySchema);
    if ('error' in parsedQuery) return parsedQuery.error;

    const statusParam = parsedQuery.data.status ?? null;
    const search = toTrimmedString(parsedQuery.data.search);
    const page = parsePositiveInt(String(parsedQuery.data.page ?? 1), 1, 100000);
    const limit = parsePositiveInt(String(parsedQuery.data.limit ?? 10), 10, 50);

    const status = toApplicationStatus(statusParam) as ApplicationStatus | null | 'invalid';
    if (status === 'invalid') return badRequest('Invalid application status filter');

    const resolvedStatus = status === null ? null : (status as ApplicationStatus);
    const cacheKey = `fixer-apps:v1:${userId}:${resolvedStatus ?? 'all'}:${search ?? '-'}:${page}:${limit}`;
    const cached = await redisUtils.get<unknown>(cacheKey);
    if (cached !== null) return respond(cached as Record<string, unknown>);

    await connectDB();

    const fixerObjectId = new Types.ObjectId(userId);
    const matchQuery = buildMatchQuery(fixerObjectId, resolvedStatus, search);

    const [jobs, totalApplications] = await Promise.all([
      Job.find(matchQuery)
        .select('_id title description budget location status createdAt deadline skillsRequired createdBy assignedTo applications')
        .populate('createdBy', 'name username profilePhoto')
        .populate('assignedTo', 'name username')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip((page - 1) * limit)
        .lean() as Promise<JobRecord[]>,
      Job.countDocuments(matchQuery),
    ]);

    const applications = jobs
      .map((job) => extractApplicationEntry(job, userId, resolvedStatus))
      .filter((item): item is NonNullable<typeof item> => item !== null);

    const totalPages = Math.max(1, Math.ceil(totalApplications / limit));
    const responseData = {
      success: true,
      applications,
      pagination: {
        currentPage: page,
        totalPages,
        totalApplications,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };

    await redisUtils.set(cacheKey, responseData, FIXER_APPS_CACHE_TTL);
    return respond(responseData);
  } catch (error: unknown) {
    logger.error('Fixer applications error:', error);
    return serverError('Failed to fetch applications');
  }
}
