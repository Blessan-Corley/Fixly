import { respond, serverError, tooManyRequests } from '@/lib/api';
import { requireAdmin } from '@/lib/api/auth';
import { logger } from '@/lib/logger';
import connectDB from '@/lib/mongodb';
import Job from '@/models/Job';
import { rateLimit } from '@/utils/rateLimiting';

import {
  buildEnhancedJob,
  escapeRegex,
  parsePositiveInt,
  parseSortBy,
  parseStatus,
  parseUrgency,
  toTrimmedString,
} from './admin-jobs.helpers';
import type { LeanJobRecord, SortBy } from './admin-jobs.types';

const sortMap: Record<SortBy, Record<string, 1 | -1>> = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  deadline: { deadline: 1 },
  budget_high: { 'budget.amount': -1 },
  budget_low: { 'budget.amount': 1 },
};

export async function GET(request: Request): Promise<Response> {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  try {
    const rateLimitResult = await rateLimit(request, 'admin_jobs', 50, 60 * 1000);
    if (!rateLimitResult.success) {
      return tooManyRequests('Too many requests. Please try again later.');
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parsePositiveInt(searchParams.get('page'), 1);
    const limit = Math.min(parsePositiveInt(searchParams.get('limit'), 20), 100);
    const search = toTrimmedString(searchParams.get('search')) ?? '';
    const status = parseStatus(searchParams.get('status'));
    const urgency = parseUrgency(searchParams.get('urgency'));
    const sortBy = parseSortBy(searchParams.get('sortBy'));

    const query: Record<string, unknown> = {};
    if (search) {
      const sanitizedSearch = escapeRegex(search);
      query.$or = [
        { title: { $regex: sanitizedSearch, $options: 'i' } },
        { description: { $regex: sanitizedSearch, $options: 'i' } },
      ];
    }
    if (status) query.status = status;
    if (urgency) query.urgency = urgency;

    const sort = sortMap[sortBy];
    const skip = (page - 1) * limit;

    const [jobs, total] = await Promise.all([
      Job.find(query)
        .select(
          'title description status urgency deadline createdAt budget location applications createdBy assignedTo featured'
        )
        .populate('createdBy', 'name username email photoURL location')
        .populate('assignedTo', 'name username photoURL rating')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Job.countDocuments(query),
    ]);

    const now = Date.now();
    const enhancedJobs = (jobs as LeanJobRecord[]).map((job) => buildEnhancedJob(job, now));

    return respond({
      jobs: enhancedJobs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + jobs.length < total,
      },
      filters: {
        search,
        status: status ?? '',
        urgency: urgency ?? '',
        sortBy,
      },
    });
  } catch (error: unknown) {
    logger.error('Admin jobs error:', error);
    return serverError('Failed to fetch jobs');
  }
}
