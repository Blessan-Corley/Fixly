// Phase 2: Removed duplicate legacy application events in favor of the typed realtime contract.
import { after } from 'next/server';

import { requireSession } from '@/lib/api/auth';
import { parseBody } from '@/lib/api/parse';
import {
  forbidden,
  notFound,
  respond,
  serverError,
  tooManyRequests,
  unauthorized,
} from '@/lib/api/response';
import { logger } from '@/lib/logger';
import connectDB from '@/lib/mongodb';
import { redisUtils } from '@/lib/redis';
import { csrfGuard } from '@/lib/security/csrf';
import Job from '@/models/Job';
import { countActiveApplicationsOnJob } from '@/models/job/workflow';
import User from '@/models/User';
import { rateLimit } from '@/utils/rateLimiting';

import { invalidateJobReadCaches, toIdString } from '../../job-route-utils';
import { getValidatedJobId, type JobRouteContext } from '../../route.shared';

import {
  getUserPhotoUrl,
  normalizeMaterialsList,
  normalizeTimeEstimate,
  validateAndParseApplication,
} from './apply.helpers';
import { applyBodySchema, type ApplyBody } from './apply.types';
import { notifyApplicationSubmitted } from './post.notifications';
import { asRecord } from './shared';

export async function POST(request: Request, segmentData: JobRouteContext): Promise<Response> {
  const params = await segmentData.params;
  try {
    const rateLimitResult = await rateLimit(request, 'job_application', 20, 60 * 60 * 1000);
    if (!rateLimitResult.success) {
      return tooManyRequests('Too many job applications. Please try again later.');
    }

    const auth = await requireSession();
    if ('error' in auth) return auth.error;
    const { session } = auth;
    const userId = session.user.id;
    if (!userId) return unauthorized();
    const csrfResult = csrfGuard(request, session);
    if (csrfResult) return csrfResult;

    const jobIdResult = getValidatedJobId(params, 'message');
    if (!jobIdResult.ok) return jobIdResult.response;
    const { jobId } = jobIdResult;

    const parsed = await parseBody(request, applyBodySchema);
    if ('error' in parsed) return parsed.error;
    const body: ApplyBody = parsed.data;

    await connectDB();

    const user = await User.findById(userId)
      .select('role banned isActive plan name picture profilePhoto')
      .lean<{
        _id: import('mongoose').Types.ObjectId;
        role?: string;
        banned?: boolean;
        isActive?: boolean;
        plan?: { type?: string; status?: string; creditsUsed?: number };
        name?: string;
        picture?: string;
        profilePhoto?: string;
      }>();
    if (!user || user.role !== 'fixer') return forbidden('Only fixers can apply to jobs');
    if (user.banned) return forbidden('Account suspended');
    if (user.isActive === false) return forbidden('Account is inactive');

    const job = await Job.findById(jobId).populate('createdBy', 'name username email preferences');
    if (!job) return notFound('Job');

    if (job.status !== 'open') return respond({ message: 'This job is no longer accepting applications' }, 400);
    if (job.deadline && new Date(job.deadline) < new Date()) {
      return respond({ message: 'Application deadline has passed' }, 400);
    }
    if (!job.canApply(user._id)) return respond({ message: 'You cannot apply to this job' }, 400);

    const validationResult = await validateAndParseApplication(body, job.budget, userId);
    if ('error' in validationResult) return validationResult.error;
    const { proposedAmount, description, requirements, specialNotes, negotiationNotes } =
      validationResult.data;

    const normalizedTimeEstimate = normalizeTimeEstimate(body.timeEstimate, body.estimatedTime);
    const materialsList = normalizeMaterialsList(body.materialsList);

    let priceVariance = 0;
    let priceVariancePercentage = 0;
    if (typeof job.budget?.amount === 'number' && job.budget.amount > 0) {
      priceVariance = proposedAmount - job.budget.amount;
      priceVariancePercentage = (priceVariance / job.budget.amount) * 100;
    }

    const application: Record<string, unknown> = {
      fixer: user._id,
      proposedAmount,
      priceVariance: Math.round(priceVariance),
      priceVariancePercentage: Math.round(priceVariancePercentage * 100) / 100,
      description,
      materialsIncluded: Boolean(body.materialsIncluded),
      requirements,
      specialNotes,
      negotiationNotes,
      status: 'pending',
      appliedAt: new Date(),
    };
    if (normalizedTimeEstimate) application.timeEstimate = normalizedTimeEstimate;
    if (materialsList.length) application.materialsList = materialsList;

    job.applications.push(application);

    logger.info('Job application submitted', {
      jobId: String(job._id),
      userId: String(user._id),
      proposedAmount,
      timestamp: new Date().toISOString(),
    });

    await job.save();
    await invalidateJobReadCaches(job._id);
    void redisUtils.invalidatePattern(`fixer-apps:v1:${userId}:*`);

    const newApplication = job.applications[job.applications.length - 1];
    const hirerId = toIdString(job.createdBy);
    const applicationId = String(newApplication._id);
    const hirerRecord = asRecord(job.createdBy);
    const fixerName = user.name ?? session.user.name ?? 'Fixer';

    after(() =>
      notifyApplicationSubmitted({
        jobId,
        applicationId,
        fixerId: userId,
        fixerName,
        fixerAvatar: getUserPhotoUrl(user),
        hirerId,
        hirerEmail: typeof hirerRecord.email === 'string' ? hirerRecord.email : '',
        hirerName:
          typeof hirerRecord.name === 'string' && hirerRecord.name.trim().length > 0
            ? hirerRecord.name
            : 'Hirer',
        jobTitle: String(job.title ?? 'your job'),
        applicationCount: countActiveApplicationsOnJob(job),
      })
    );

    return respond(
      {
        success: true,
        message: 'Application submitted successfully',
        application: {
          _id: String(newApplication._id),
          proposedAmount: newApplication.proposedAmount,
          priceVariance: newApplication.priceVariance,
          priceVariancePercentage: newApplication.priceVariancePercentage,
          timeEstimate: newApplication.timeEstimate,
          status: newApplication.status,
          appliedAt: newApplication.appliedAt,
          coverLetter: newApplication.negotiationNotes ?? newApplication.description,
          workPlan: newApplication.description,
        },
        budgetComparison:
          typeof job.budget?.amount === 'number'
            ? {
                jobBudget: job.budget.amount,
                proposedAmount: newApplication.proposedAmount,
                difference: newApplication.priceVariance,
                percentageDifference: newApplication.priceVariancePercentage,
                budgetType: job.budget.type,
              }
            : null,
        creditsRemaining:
          user.plan?.type === 'pro'
            ? 'unlimited'
            : Math.max(0, 3 - Number(user.plan?.creditsUsed ?? 0)),
        creditNote: 'Credits are deducted only when your application is accepted.',
      },
      201
    );
  } catch (error) {
    logger.error('Job application error:', error);
    return serverError('Failed to submit application. Please try again.');
  }
}
