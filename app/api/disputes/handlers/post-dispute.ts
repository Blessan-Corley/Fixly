import { after } from 'next/server';

import {
  type AdminActivityPayload,
  type DisputeOpenedPayload,
  Channels,
  Events,
} from '@/lib/ably/events';
import { publishToChannel } from '@/lib/ably/publisher';
import {
  badRequest,
  forbidden,
  notFound,
  requireSession,
  respond,
  serverError,
  tooManyRequests,
  unauthorized,
} from '@/lib/api';
import { parseBody } from '@/lib/api/parse';
import { requirePermission } from '@/lib/authorization';
import {
  createDisputeRecord,
  findActiveDisputeForJob,
} from '@/lib/disputes/state';
import { inngest } from '@/lib/inngest/client';
import { logger } from '@/lib/logger';
import connectDB from '@/lib/mongodb';
import { csrfGuard } from '@/lib/security/csrf';
import { moderateUserGeneratedContent } from '@/lib/validations/content-policy';
import Dispute from '@/models/Dispute';
import Job from '@/models/Job';
import { rateLimit } from '@/utils/rateLimiting';

import {
  CreateDisputeBodySchema,
  getUserContact,
  toIdString,
  type CreateDisputeBody,
  type SessionUser,
} from './shared';

export async function handlePostDispute(request: Request): Promise<Response> {
  try {
    const rateLimitResult = await rateLimit(request, 'create_dispute', 3, 60 * 60 * 1000);
    if (!rateLimitResult.success) {
      return tooManyRequests('Too many dispute submissions. Please try again later.');
    }

    const auth = await requireSession();
    if ('error' in auth) return auth.error;

    const userId = auth.session.user.id;
    if (!userId) return unauthorized();

    const currentUser: SessionUser = {
      id: userId,
      name: auth.session.user.name ?? undefined,
      role: typeof auth.session.user.role === 'string' ? auth.session.user.role : undefined,
    };

    const csrfResult = csrfGuard(request, auth.session);
    if (csrfResult) return csrfResult;

    try {
      requirePermission(currentUser, 'create', 'dispute');
    } catch {
      return forbidden('Insufficient permissions');
    }

    const parsedBody = await parseBody(request, CreateDisputeBodySchema);
    if ('error' in parsedBody) return parsedBody.error;
    const body: CreateDisputeBody = parsedBody.data;

    const {
      jobId,
      againstUserId,
      category,
      subcategory,
      title,
      description,
      desiredOutcome,
      desiredOutcomeDetails,
      disputedAmount,
      refundRequested,
      additionalPaymentRequested,
      evidence = [],
    } = body;

    if (!jobId || !againstUserId || !category || !title || !description || !desiredOutcome) {
      return badRequest('Missing required fields');
    }

    if (title.length > 150 || description.length > 2000) {
      return badRequest('Title or description too long');
    }

    const disputeFields = [
      { label: 'Dispute title', value: title.trim() },
      { label: 'Dispute description', value: description.trim() },
      { label: 'Desired outcome', value: desiredOutcome.trim() },
      { label: 'Desired outcome details', value: desiredOutcomeDetails?.trim() ?? '' },
    ];

    for (const field of disputeFields) {
      if (!field.value) continue;
      const moderation = await moderateUserGeneratedContent(field.value, {
        context: 'dispute',
        fieldLabel: field.label,
        userId,
      });
      if (!moderation.allowed) {
        return badRequest(moderation.message ?? 'Content validation failed', {
          violations: moderation.violations,
          suggestions: moderation.suggestions,
        });
      }
    }

    for (const evidenceItem of evidence) {
      const descriptionValue =
        typeof evidenceItem?.description === 'string' ? evidenceItem.description.trim() : '';
      if (!descriptionValue) continue;
      const moderation = await moderateUserGeneratedContent(descriptionValue, {
        context: 'dispute',
        fieldLabel: 'Evidence description',
        userId,
      });
      if (!moderation.allowed) {
        return badRequest(moderation.message ?? 'Content validation failed', {
          violations: moderation.violations,
          suggestions: moderation.suggestions,
        });
      }
    }

    if (againstUserId === userId) {
      return badRequest('You cannot create a dispute against yourself');
    }

    await connectDB();

    const job = (await Job.findById(jobId)
      .select('title createdBy assignedTo client fixer')
      .lean()) as Record<string, unknown> | null;

    if (!job) return notFound('Job');

    const hirerId = toIdString(job.createdBy ?? job.client);
    const fixerId = toIdString(job.assignedTo ?? job.fixer);
    const isHirer = hirerId === userId;
    const isFixer = !!fixerId && fixerId === userId;

    if (!isHirer && !isFixer) {
      return forbidden('You can only create disputes for jobs you are involved in');
    }

    const expectedAgainstUserId = isHirer ? fixerId : hirerId;
    if (!expectedAgainstUserId || againstUserId !== expectedAgainstUserId) {
      return badRequest('You can only create disputes against the other party in this job');
    }

    const existingDispute = await findActiveDisputeForJob(jobId);
    if (existingDispute) return badRequest('There is already an active dispute for this job');

    const amount = Number(disputedAmount ?? refundRequested ?? additionalPaymentRequested ?? 0);
    let priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium';
    if (amount > 100000) priority = 'urgent';
    else if (amount > 50000 || category === 'safety_concern') priority = 'high';
    else if (amount < 5000) priority = 'low';

    const dispute = await createDisputeRecord({
      jobId,
      initiatedBy: userId,
      againstUser: againstUserId,
      category,
      subcategory,
      title: title.trim(),
      description: description.trim(),
      desiredOutcome,
      desiredOutcomeDetails: desiredOutcomeDetails?.trim(),
      amount: { disputedAmount, refundRequested, additionalPaymentRequested },
      priority,
      evidence: evidence
        .filter((item) => item?.type && item?.url)
        .map((item) => ({
          type: item.type as 'image' | 'document' | 'screenshot' | 'chat_log',
          url: item.url,
          filename: item.filename,
          description: item.description,
        })),
    });

    const populatedDispute = await Dispute.findById(dispute._id)
      .populate('job', 'title category budget')
      .populate('initiatedBy', 'name username email photoURL')
      .populate('againstUser', 'name username email photoURL')
      .lean();

    const [hirer, fixer] = await Promise.all([
      getUserContact(hirerId),
      getUserContact(fixerId),
    ]);

    after(async () => {
      await Promise.allSettled([
        inngest
          .send({
            name: 'dispute/opened',
            data: {
              disputeId: dispute.disputeId,
              jobId,
              jobTitle: String(job.title ?? 'a job'),
              openedByUserId: auth.session.user.id,
              hirerId: hirerId ?? '',
              hirerEmail: hirer?.email ?? '',
              hirerName: hirer?.name ?? 'Hirer',
              fixerId: fixerId ?? '',
              fixerEmail: fixer?.email ?? '',
              fixerName: fixer?.name ?? 'Fixer',
              reason: description.trim(),
            },
          })
          .catch((inngestError) => {
            logger.error('Dispute opened workflow dispatch failed:', inngestError);
          }),
        publishToChannel(Channels.job(jobId), Events.job.disputeOpened, {
          disputeId: String(dispute._id),
          jobId,
          openedBy: userId,
          reason: description.trim(),
        } satisfies DisputeOpenedPayload),
        publishToChannel(Channels.admin, Events.admin.disputeCreated, {
          type: 'dispute.created',
          entityId: String(dispute._id),
          entityType: 'dispute',
          description: `New dispute opened for job "${String(job.title ?? 'a job')}"`,
          severity: 'warning',
          timestamp: new Date().toISOString(),
        } satisfies AdminActivityPayload),
      ]);
    });

    return respond({ success: true, dispute: populatedDispute, message: 'Dispute submitted successfully' }, 201);
  } catch (error) {
    logger.error('Create dispute error:', error);
    return serverError('Failed to create dispute');
  }
}
