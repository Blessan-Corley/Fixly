import { Types } from 'mongoose';
import { NextRequest } from 'next/server';
import { z } from 'zod';

import { badRequest, parseQuery, requireSession, respond, serverError } from '@/lib/api';
import { createStandardError, requirePermission } from '@/lib/authorization';
import { logger } from '@/lib/logger';
import connectDB from '@/lib/mongodb';
import { redisUtils } from '@/lib/redis';
import Job from '@/models/Job';
import { rateLimit } from '@/utils/rateLimiting';

const FIXER_APPS_CACHE_TTL = 120; // 2 minutes

export const dynamic = 'force-dynamic';

const APPLICATION_STATUSES = ['pending', 'accepted', 'rejected', 'withdrawn'] as const;
type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

type SessionUser = {
  id?: string;
  role?: string;
};

type JobApplication = {
  _id?: Types.ObjectId | string;
  fixer?: Types.ObjectId | string;
  proposedAmount?: number;
  timeEstimate?: unknown;
  coverLetter?: string;
  status?: string;
  appliedAt?: Date | string;
  materialsList?: unknown[];
};

type JobRecord = {
  _id: Types.ObjectId | string;
  title?: string;
  description?: string;
  budget?: unknown;
  location?: unknown;
  status?: string;
  createdAt?: Date | string;
  deadline?: Date | string;
  skillsRequired?: unknown;
  createdBy?: unknown;
  assignedTo?: unknown;
  applications?: JobApplication[];
};

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function toTrimmedString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parsePositiveInt(value: string | null, fallback: number, max: number): number {
  const parsed = Number.parseInt(value || '', 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
}

function toObjectIdString(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value instanceof Types.ObjectId) return value.toString();
  if (value && typeof value === 'object' && '_id' in value) {
    const nested = (value as { _id?: unknown })._id;
    return toObjectIdString(nested);
  }
  if (value && typeof value === 'object' && 'toString' in value) {
    const stringified = String(value);
    return stringified === '[object Object]' ? '' : stringified;
  }
  return '';
}

function toApplicationStatus(value: string | null): ApplicationStatus | null | 'invalid' {
  if (!value) return null;
  return APPLICATION_STATUSES.includes(value as ApplicationStatus)
    ? (value as ApplicationStatus)
    : 'invalid';
}

const FixerApplicationsQuerySchema = z.object({
  status: z.enum(['pending', 'accepted', 'rejected', 'withdrawn']).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(50).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const rateLimitResult = await rateLimit(request, 'fixer_applications', 30, 60 * 1000);
    if (!rateLimitResult.success) {
      return respond({ message: 'Too many requests. Please try again later.' }, 429);
    }

    const auth = await requireSession();
    if ('error' in auth) {
      return auth.error;
    }

    const sessionUser = auth.session.user as SessionUser;
    const userId = toTrimmedString(sessionUser.id);

    if (!userId) {
      return createStandardError(401, 'UNAUTHORIZED', 'Authentication required');
    }
    try {
      requirePermission(sessionUser, 'read', 'application');
    } catch {
      return createStandardError(403, 'FORBIDDEN', 'Only fixers can view applications');
    }

    if (!Types.ObjectId.isValid(userId)) {
      return badRequest('Invalid user context');
    }

    const parsedQuery = parseQuery(request, FixerApplicationsQuerySchema);
    if ('error' in parsedQuery) {
      return parsedQuery.error;
    }

    const statusParam = parsedQuery.data.status ?? null;
    const search = toTrimmedString(parsedQuery.data.search);
    const page = parsePositiveInt(String(parsedQuery.data.page ?? 1), 1, 100000);
    const limit = parsePositiveInt(String(parsedQuery.data.limit ?? 10), 10, 50);
    const skip = (page - 1) * limit;

    const status = toApplicationStatus(statusParam);
    if (status === 'invalid') {
      return badRequest('Invalid application status filter');
    }

    const cacheKey = `fixer-apps:v1:${userId}:${status ?? 'all'}:${search ?? '-'}:${page}:${limit}`;
    const cached = await redisUtils.get<unknown>(cacheKey);
    if (cached !== null) {
      return respond(cached as Record<string, unknown>);
    }

    await connectDB();

    const fixerObjectId = new Types.ObjectId(userId);
    const applicationFilter: Record<string, unknown> = {
      fixer: fixerObjectId,
    };

    if (status) {
      applicationFilter.status = status;
    }

    const matchQuery: Record<string, unknown> = {
      applications: { $elemMatch: applicationFilter },
    };

    if (search) {
      const sanitizedSearch = escapeRegex(search);
      matchQuery.$or = [
        { title: { $regex: sanitizedSearch, $options: 'i' } },
        { description: { $regex: sanitizedSearch, $options: 'i' } },
      ];
    }

    const jobs = (await Job.find(matchQuery)
      .select(
        '_id title description budget location status createdAt deadline skillsRequired createdBy assignedTo applications'
      )
      .populate('createdBy', 'name username profilePhoto')
      .populate('assignedTo', 'name username')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean()) as JobRecord[];

    const applications = jobs
      .map((job) => {
        const jobApplications = Array.isArray(job.applications) ? job.applications : [];
        const application = jobApplications.find(
          (item) => toObjectIdString(item.fixer) === userId && (!status || item.status === status)
        );

        if (!application) return null;

        return {
          _id: application._id,
          job: {
            _id: job._id,
            title: job.title,
            description: job.description,
            budget: job.budget,
            location: job.location,
            status: job.status,
            createdAt: job.createdAt,
            deadline: job.deadline,
            skillsRequired: Array.isArray(job.skillsRequired) ? job.skillsRequired : [],
            createdBy: job.createdBy,
            assignedTo: job.assignedTo,
          },
          proposedAmount: application.proposedAmount,
          timeEstimate: application.timeEstimate,
          coverLetter: application.coverLetter,
          status: application.status,
          appliedAt: application.appliedAt,
          materialsList: Array.isArray(application.materialsList) ? application.materialsList : [],
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    const totalApplications = await Job.countDocuments(matchQuery);
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
