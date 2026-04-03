import { startSession } from 'mongoose';
import { after } from 'next/server';

import { requireSession } from '@/lib/api/auth';
import { parseBody } from '@/lib/api/parse';
import {
  badRequest,
  forbidden,
  notFound,
  respond,
  serverError,
  tooManyRequests,
  unauthorized,
} from '@/lib/api/response';
import { requirePermission } from '@/lib/authorization';
import { logger } from '@/lib/logger';
import connectDB from '@/lib/mongodb';
import { csrfGuard } from '@/lib/security/csrf';
import { invalidateDashboardStatsCache } from '@/lib/services/dashboardStatsService';
import { MessageService } from '@/lib/services/messageService';
import { moderateUserGeneratedContent } from '@/lib/validations/content-policy';
import Job from '@/models/Job';
import { acceptApplicationOnJob } from '@/models/job/workflow';
import User from '@/models/User';
import { rateLimit } from '@/utils/rateLimiting';

import { invalidateJobReadCaches } from '../../job-route-utils';
import { getValidatedJobId, isValidObjectId, type JobRouteContext } from '../../route.shared';

import { updateApplicationSchema, type TxApplication } from './applications.types';
import { notifyApplicationDecision } from './put.notifications';

export async function PUT(request: Request, segmentData: JobRouteContext): Promise<Response> {
  const params = await segmentData.params;
  try {
    const rateLimitResult = await rateLimit(request, 'applications_update', 30, 60 * 1000);
    if (!rateLimitResult.success) {
      return tooManyRequests('Too many requests. Please try again later.');
    }

    const auth = await requireSession();
    if ('error' in auth) return auth.error;
    const { session } = auth;
    const userId = session.user.id;
    if (!userId) return unauthorized();

    const csrfResult = csrfGuard(request, session);
    if (csrfResult) return csrfResult;

    try {
      requirePermission(session.user, 'update', 'application');
    } catch {
      return forbidden('Insufficient permissions');
    }

    const jobIdResult = getValidatedJobId(params, 'message');
    if (!jobIdResult.ok) return jobIdResult.response;
    const { jobId } = jobIdResult;

    const parsed = await parseBody(request, updateApplicationSchema);
    if ('error' in parsed) return parsed.error;
    const { applicationId, status, message } = parsed.data;

    const nextStatus = status === 'accepted' ? 'accepted' : 'rejected';
    if (!isValidObjectId(applicationId)) return badRequest('Invalid application ID');

    const responseMessage = typeof message === 'string' ? message.trim() : '';
    if (responseMessage) {
      const moderation = await moderateUserGeneratedContent(responseMessage, {
        context: 'job_application',
        fieldLabel: 'Application response',
        userId,
      });
      if (!moderation.allowed) {
        return respond(
          {
            message: moderation.message,
            violations: moderation.violations,
            suggestions: moderation.suggestions,
          },
          400
        );
      }
    }

    await connectDB();

    const job = await Job.findById(jobId);
    if (!job) return notFound('Job');
    if (String(job.createdBy) !== userId) {
      return forbidden('Only job creator can update applications');
    }

    const application = job.applications.id(applicationId);
    if (!application) return notFound('Application');
    if (application.status !== 'pending') {
      return badRequest(`Application already ${application.status}`);
    }

    const rejectedApplicants: Array<{ fixerId: string; jobTitle: string }> = [];
    const previousApplicationStatus = application.status || 'pending';
    let acceptedFixerId: string | null = null;
    let acceptedJobTitle = job.title;

    if (nextStatus === 'accepted') {
      if (job.status !== 'open') {
        return badRequest('Job is no longer open for accepting applications');
      }

      const dbSession = await startSession();
      try {
        dbSession.startTransaction();

        const txJob = await Job.findById(jobId).session(dbSession);
        if (!txJob) {
          await dbSession.abortTransaction();
          return notFound('Job');
        }

        const txApplication = txJob.applications.id(applicationId);
        if (!txApplication) {
          await dbSession.abortTransaction();
          return notFound('Application');
        }

        if (txApplication.status !== 'pending') {
          await dbSession.abortTransaction();
          return badRequest(`Application already ${txApplication.status}`);
        }

        acceptedFixerId = String(txApplication.fixer);
        acceptedJobTitle = txJob.title;

        const acceptedFixer = await User.findById(acceptedFixerId).session(dbSession);
        if (!acceptedFixer) {
          await dbSession.abortTransaction();
          return notFound('Fixer');
        }

        if (!acceptedFixer.canBeAssignedJob()) {
          await dbSession.abortTransaction();
          return badRequest(
            'Selected fixer has reached their job limit. Please select another applicant.'
          );
        }

        if (acceptedFixer.plan?.type !== 'pro') {
          // Atomic increment avoids read-modify-save race condition
          await User.updateOne(
            { _id: acceptedFixer._id },
            { $inc: { 'plan.creditsUsed': 1 } },
            { session: dbSession }
          );
        }

        const acceptResult = acceptApplicationOnJob(txJob, applicationId, new Date());
        if (!acceptResult.ok) {
          await dbSession.abortTransaction();
          return badRequest('Failed to accept this application');
        }

        txJob.applications.forEach((app: TxApplication) => {
          if (String(app._id) !== applicationId && app.status === 'pending') {
            rejectedApplicants.push({ fixerId: String(app.fixer), jobTitle: txJob.title });
          }
        });

        await txJob.save({ session: dbSession });
        await dbSession.commitTransaction();
      } catch (transactionError) {
        await dbSession.abortTransaction();
        logger.error('Transaction error:', transactionError);
        return serverError('Failed to update application. Please try again.');
      } finally {
        dbSession.endSession();
      }
    } else {
      application.status = 'rejected';
      await job.save();
    }

    await invalidateJobReadCaches(jobId);
    await Promise.allSettled([
      invalidateDashboardStatsCache(String(job.createdBy)),
      invalidateDashboardStatsCache(acceptedFixerId || String(application.fixer)),
    ]);

    if (acceptedFixerId) {
      try {
        await MessageService.createJobConversation(jobId, userId, acceptedFixerId);
      } catch (conversationError) {
        logger.error('Failed to create private conversation:', conversationError);
      }
    }

    const updatedFixerId = acceptedFixerId || (application.fixer ? String(application.fixer) : '');

    after(() =>
      notifyApplicationDecision({
        jobId,
        applicationId,
        previousStatus: previousApplicationStatus,
        nextStatus,
        jobTitle: acceptedJobTitle,
        updatedFixerId,
        hirerId: userId,
        hirerName: session.user.name ?? 'Hirer',
        rejectedApplicants,
      })
    );

    return respond({ success: true, message: `Application ${status} successfully` });
  } catch (error) {
    logger.error('Update application error:', error);
    return serverError('Failed to update application');
  }
}
