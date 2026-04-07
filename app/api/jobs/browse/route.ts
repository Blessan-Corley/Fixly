import { badRequest, getOptionalSession, respond, serverError, tooManyRequests } from '@/lib/api';
import { logger } from '@/lib/logger';
import connectDB from '@/lib/mongodb';
import { redisUtils } from '@/lib/redis';
import { JobSearchParamsSchema } from '@/lib/validations/job';
import Job from '@/models/Job';
import { rateLimit } from '@/utils/rateLimiting';

import {
  BROWSE_CACHE_TTL,
  buildBrowseCacheKey,
  buildBrowseQuery,
  buildSort,
  mapBrowseJob,
  parsePositiveInt,
  type BrowseJob,
} from './helpers';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const rateLimitResult = await rateLimit(request, 'browse_jobs', 120, 60 * 1000);
    if (!rateLimitResult.success) {
      return tooManyRequests('Too many requests. Please try again later.');
    }

    await connectDB();

    const session = await getOptionalSession();
    const viewerUserId = typeof session?.user?.id === 'string' ? session.user.id : null;

    const { searchParams } = new URL(request.url);

    const bypassCache =
      request.headers.get('cache-control')?.includes('no-cache') ||
      request.headers.get('pragma')?.includes('no-cache');

    const cacheKey = buildBrowseCacheKey(searchParams, viewerUserId);

    if (!bypassCache) {
      try {
        const cached = await redisUtils.get<unknown>(cacheKey);
        if (cached) {
          const cachedResponse = respond(cached as Parameters<typeof respond>[0]);
          cachedResponse.headers.set('X-Cache', 'HIT');
          cachedResponse.headers.set('Cache-Control', 'private, max-age=30, stale-while-revalidate=60');
          return cachedResponse;
        }
      } catch {
        // Redis unavailable — continue to DB
      }
    }

    const rawSkills = (searchParams.get('skills') || '').trim();
    const parsedQuery = JobSearchParamsSchema.safeParse({
      q: searchParams.get('q') || searchParams.get('search') || undefined,
      location: searchParams.get('location') || undefined,
      skills: rawSkills ? rawSkills.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean) : undefined,
      budgetMin: searchParams.get('budgetMin') || undefined,
      budgetMax: searchParams.get('budgetMax') || undefined,
      budgetType: searchParams.get('budgetType') || undefined,
      urgency: searchParams.get('urgency') || undefined,
      datePosted: searchParams.get('datePosted') || undefined,
      sortBy: searchParams.get('sortBy') || undefined,
      page: searchParams.get('page') || undefined,
      limit: searchParams.get('limit') || undefined,
    });
    if (!parsedQuery.success) {
      return badRequest('Validation failed', parsedQuery.error.flatten().fieldErrors);
    }

    const page = parsePositiveInt(String(parsedQuery.data.page), 1, 1, 10000);
    const limit = parsePositiveInt(String(parsedQuery.data.limit), 12, 1, 50);
    const skip = (page - 1) * limit;

    const search = (parsedQuery.data.q || '').trim();
    const query = buildBrowseQuery({
      search,
      location: (parsedQuery.data.location || '').trim(),
      urgency: (parsedQuery.data.urgency || '').trim(),
      skills: parsedQuery.data.skills ?? [],
      budgetMin: parsedQuery.data.budgetMin ?? null,
      budgetMax: parsedQuery.data.budgetMax ?? null,
    });

    const projectionFields = {
      title: 1, description: 1, skillsRequired: 1, budget: 1, urgency: 1, deadline: 1,
      status: 1, location: 1, views: 1, createdAt: 1, createdBy: 1,
      'applications.fixer': 1, 'applications.status': 1, 'comments._id': 1,
      ...(search ? { score: { $meta: 'textScore' as const } } : {}),
    };

    const jobs = await Job.find(query)
      .select(projectionFields)
      .populate('createdBy', 'name username photoURL rating location isVerified')
      .sort(buildSort((parsedQuery.data.sortBy || 'newest').trim(), Boolean(search)))
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Job.countDocuments(query);
    const mappedJobs = (jobs as BrowseJob[]).map((job) => mapBrowseJob(job, viewerUserId));

    const responsePayload = {
      success: true,
      jobs: mappedJobs,
      pagination: { page, limit, total, pages: Math.ceil(total / limit), hasMore: skip + mappedJobs.length < total },
    };

    if (!bypassCache) {
      try {
        await redisUtils.set(cacheKey, responsePayload, BROWSE_CACHE_TTL);
      } catch {
        // Redis unavailable — serve uncached
      }
    }

    const response = respond(responsePayload);
    response.headers.set('X-Cache', 'MISS');
    response.headers.set('Cache-Control', 'private, max-age=30, stale-while-revalidate=60');
    response.headers.set('Vary', 'Cookie');
    return response;
  } catch (error: unknown) {
    logger.error('Browse jobs error:', error);
    return serverError('Failed to fetch jobs');
  }
}
