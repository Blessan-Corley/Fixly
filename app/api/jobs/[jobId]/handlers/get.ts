import { Types } from 'mongoose';

import { requireSession } from '@/lib/api/auth';
import {
  notFound,
  respond,
  serverError,
  tooManyRequests,
  unauthorized,
} from '@/lib/api/response';
import { logger } from '@/lib/logger';
import connectDB from '@/lib/mongodb';
import { redisUtils } from '@/lib/redis';
import Job from '@/models/Job';
import { countActiveApplicationsOnJob } from '@/models/job/workflow';
import User from '@/models/User';
import { rateLimit } from '@/utils/rateLimiting';

const JOB_DETAIL_TTL = 60; // 60 seconds

import type { JsonObject } from '../job-route-utils';
import { sanitizeString, toIdString } from '../job-route-utils';
import type { JobApplicationLike } from '../route-actions';
import {
  CACHE_HEADERS,
  getValidatedJobId,
  type JobRouteContext,
  withCacheControl,
} from '../route.shared';

import { addLegacyAliases, asRecord, sanitizeApplications } from './get.helpers';

export async function GET(request: Request, segmentData: JobRouteContext) {
  const params = await segmentData.params;
  try {
    const rateLimitResult = await rateLimit(request, 'job_details', 20, 60 * 1000);
    if (!rateLimitResult.success) {
      return tooManyRequests('Too many requests. Please try again later.');
    }

    const jobIdResult = getValidatedJobId(params, 'message');
    if (!jobIdResult.ok) return jobIdResult.response;
    const { jobId } = jobIdResult;

    const auth = await requireSession();
    if ('error' in auth) return auth.error;
    const { session } = auth;
    const userId = session.user.id;
    if (!userId) return unauthorized();

    const cacheKey = `job:detail:v1:${jobId}:${userId}`;
    const cached = await redisUtils.get<Record<string, unknown>>(cacheKey);
    if (cached !== null) {
      const response = respond(cached);
      return withCacheControl(response, CACHE_HEADERS.PRIVATE_NO_STORE);
    }

    await connectDB();

    const user = await User.findById(userId)
      .select('role plan skills location banned name')
      .lean<{
        _id?: unknown;
        role?: string;
        plan?: { type?: string; creditsUsed?: number };
        skills?: string[];
        location?: { city?: string };
        banned?: boolean;
        name?: string;
      } | null>();

    if (!user) return notFound('User');

    // Single aggregation: project commentCount via $size to avoid loading all comment sub-docs
    const [jobAgg] = await Job.aggregate<{
      _id?: unknown;
      title?: string;
      description?: string;
      skillsRequired?: string[];
      budget?: { type?: string; amount?: number };
      urgency?: string;
      status?: string;
      location?: { city?: string; state?: string };
      createdBy?: Record<string, unknown> | unknown;
      assignedTo?: Record<string, unknown> | unknown;
      applications?: JobApplicationLike[];
      completion?: { confirmedAt?: unknown };
      createdAt?: Date | string;
      commentCount?: number;
      [key: string]: unknown;
    }>([
      { $match: { _id: new Types.ObjectId(jobId) } },
      {
        $addFields: {
          commentCount: { $size: { $ifNull: ['$comments', []] } },
        },
      },
      { $project: { comments: 0 } },
    ]).exec();

    if (!jobAgg) return notFound('Job');

    await Job.populate(jobAgg, [
      {
        path: 'createdBy',
        select: 'name username photoURL picture rating location isVerified createdAt phone email',
      },
      {
        path: 'assignedTo',
        select: 'name username photoURL picture rating location isVerified phone email',
      },
    ]);

    const job = jobAgg;
    const applications = Array.isArray(job.applications) ? job.applications : [];
    const activeApplicationCount = countActiveApplicationsOnJob({ applications });
    const commentCount = typeof job.commentCount === 'number' ? job.commentCount : 0;
    const hasApplied = applications.some(
      (application) =>
        application?.status !== 'withdrawn' && toIdString(application?.fixer) === String(user._id)
    );

    const isJobCreator = toIdString(job.createdBy) === String(user._id);
    const isAssignedFixer = !!job.assignedTo && toIdString(job.assignedTo) === String(user._id);
    const isInvolved = isJobCreator || isAssignedFixer || hasApplied;

    const searchParams = new URL(request.url).searchParams;
    const forApplication = searchParams.get('forApplication') === 'true';

    const canViewFullDetails =
      user.role !== 'fixer' ||
      user.plan?.type === 'pro' ||
      Number(user.plan?.creditsUsed ?? 0) < 3 ||
      isInvolved ||
      forApplication;

    let jobData: JsonObject = { ...job };
    const createdBy = asRecord(job.createdBy);
    const createdByLocation = asRecord(createdBy.location);

    if (user.role === 'fixer' && !canViewFullDetails) {
      jobData = {
        _id: job._id,
        title: job.title,
        description:
          typeof job.description === 'string' && job.description.length > 200
            ? `${job.description.slice(0, 200)}...`
            : job.description,
        skillsRequired: job.skillsRequired ?? [],
        budget:
          job.budget?.type === 'negotiable'
            ? { type: 'negotiable' }
            : {
                type: job.budget?.type,
                amount:
                  typeof job.budget?.amount === 'number' && job.budget.amount > 0
                    ? `INR ${Math.floor(job.budget.amount / 1000)}k+`
                    : null,
              },
        urgency: job.urgency,
        status: job.status,
        location: { city: job.location?.city, state: job.location?.state },
        createdBy: { name: createdBy.name, rating: createdBy.rating },
        applicationCount: activeApplicationCount,
        commentCount,
        createdAt: job.createdAt,
        restrictedView: true,
      };
    } else if (user.role === 'fixer') {
      const jobCompleted = job.status === 'completed' && !!job.completion?.confirmedAt;
      const showContactInfo = isAssignedFixer && jobCompleted;

      jobData.createdBy = {
        name: createdBy.name,
        username: createdBy.username,
        photoURL: createdBy.photoURL,
        picture: createdBy.picture,
        rating: createdBy.rating,
        isVerified: createdBy.isVerified,
        location: { city: createdByLocation.city, state: createdByLocation.state },
      };

      if (showContactInfo) {
        jobData.createdBy = {
          ...asRecord(jobData.createdBy),
          phone: createdBy.phone,
          email: createdBy.email,
        };
        jobData.location = job.location;
      } else {
        jobData.location = { city: job.location?.city, state: job.location?.state };
      }

      jobData.contactInfoRestricted = !showContactInfo;
    }

    if (user.role === 'hirer' && isJobCreator && job.assignedTo) {
      const jobCompleted = job.status === 'completed' && !!job.completion?.confirmedAt;

      if (!jobCompleted && jobData.assignedTo) {
        const assignedToData = asRecord(jobData.assignedTo);
        const assignedLocation = asRecord(assignedToData.location);
        jobData.assignedTo = {
          ...assignedToData,
          phone: undefined,
          email: undefined,
          location: { city: assignedLocation.city, state: assignedLocation.state },
        };
      }

      jobData.fixerContactInfoRestricted = !jobCompleted;
    }

    let skillMatchPercentage = 0;
    if (user.role === 'fixer' && Array.isArray(user.skills)) {
      const userSkills = user.skills.map((skill: string) => skill.toLowerCase());
      const requiredSkills = Array.isArray(job.skillsRequired) ? job.skillsRequired : [];
      const matchingSkills = requiredSkills.filter((skill: string) =>
        userSkills.includes(String(skill).toLowerCase())
      );
      skillMatchPercentage =
        requiredSkills.length > 0 ? (matchingSkills.length / requiredSkills.length) * 100 : 0;
    }

    const isLocalJob =
      sanitizeString(user.location?.city).toLowerCase() ===
      sanitizeString(job.location?.city).toLowerCase();

    const visibleApplications = sanitizeApplications(applications, String(user._id), isJobCreator);

    if (!jobData.restrictedView) {
      jobData = {
        ...jobData,
        hasApplied,
        skillMatchPercentage,
        isLocalJob,
        applicationCount: activeApplicationCount,
        commentCount,
        canMessage: isInvolved,
        applications: visibleApplications,
      };
    } else {
      jobData = {
        ...jobData,
        hasApplied: false,
        skillMatchPercentage: 0,
        isLocalJob: false,
        canMessage: false,
        canApply: false,
      };
    }

    const responsePayload = { success: true, job: addLegacyAliases(jobData) };
    await redisUtils.set(cacheKey, responsePayload, JOB_DETAIL_TTL);
    const response = respond(responsePayload);
    return withCacheControl(response, CACHE_HEADERS.PRIVATE_NO_STORE);
  } catch (error) {
    logger.error('Get job details error:', error);
    return serverError('Failed to fetch job details');
  }
}
