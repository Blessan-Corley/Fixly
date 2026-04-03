import { badRequest, parseBody, requireSession, respond, unauthorized } from '@/lib/api';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import connectDB from '@/lib/mongodb';
import { redisRateLimit } from '@/lib/redis';
import { csrfGuard } from '@/lib/security/csrf';
import { moderateUserGeneratedContent } from '@/lib/validations/content-policy';
import JobDraft from '@/models/JobDraft';

import {
  getClientIp,
  isValidObjectId,
  normalizeAttachments,
  normalizeCompletedSteps,
  normalizeFormData,
  normalizeSaveType,
  parseDate,
  parseStep,
} from './drafts.helpers';
import type { DraftSaveBody, DraftSummarySource } from './drafts.types';
import { DraftSaveSchema } from './drafts.types';

export async function POST(request: Request): Promise<Response> {
  try {
    const ip = getClientIp(request);
    const rateLimitResult = await redisRateLimit(`draft_save:${ip}`, 60, 3600);
    if (!rateLimitResult.success) {
      return respond(
        {
          success: false,
          message: 'Too many draft save requests. Please try again later.',
          resetTime: new Date(rateLimitResult.resetTime).toISOString(),
        },
        429
      );
    }

    const auth = await requireSession();
    if ('error' in auth) return auth.error;
    const userId = typeof auth.session.user.id === 'string' ? auth.session.user.id : '';
    if (!userId) return unauthorized();

    const csrfResult = csrfGuard(request, auth.session);
    if (csrfResult) return csrfResult;

    const parsed = await parseBody(request, DraftSaveSchema);
    if ('error' in parsed) return parsed.error;
    const body = parsed.data as DraftSaveBody;

    const draftId = typeof body.draftId === 'string' ? body.draftId.trim() : '';
    const formData = normalizeFormData(body.formData);
    const currentStep = parseStep(body.currentStep, 1);
    const saveType = normalizeSaveType(body.saveType);
    const completedSteps = normalizeCompletedSteps(body.completedSteps);

    if (draftId && !isValidObjectId(draftId)) return badRequest('Invalid draft ID');

    await connectDB();

    const normalizedPayload = {
      title: typeof formData.title === 'string' ? formData.title : '',
      description: typeof formData.description === 'string' ? formData.description : '',
      skillsRequired: Array.isArray(formData.skillsRequired) ? formData.skillsRequired : [],
      budget:
        formData.budget && typeof formData.budget === 'object'
          ? formData.budget
          : { type: 'negotiable' },
      location:
        formData.location && typeof formData.location === 'object' ? formData.location : {},
      deadline: parseDate(formData.deadline),
      scheduledDate: parseDate(formData.scheduledDate),
      urgency: typeof formData.urgency === 'string' ? formData.urgency : 'flexible',
      attachments: normalizeAttachments(formData.attachments),
      currentStep,
      completedSteps: completedSteps.map((step) => ({ step, completedAt: new Date() })),
    };

    for (const field of [
      { label: 'Draft title', value: normalizedPayload.title.trim() },
      { label: 'Draft description', value: normalizedPayload.description.trim() },
    ]) {
      if (!field.value) continue;
      const moderation = await moderateUserGeneratedContent(field.value, {
        context: 'job_draft',
        fieldLabel: field.label,
        userId,
      });
      if (!moderation.allowed) {
        return respond(
          {
            success: false,
            message: moderation.message,
            violations: moderation.violations,
            suggestions: moderation.suggestions,
          },
          400
        );
      }
    }

    for (const rawSkill of Array.isArray(normalizedPayload.skillsRequired)
      ? normalizedPayload.skillsRequired
      : []) {
      if (typeof rawSkill !== 'string' || !rawSkill.trim()) continue;
      const moderation = await moderateUserGeneratedContent(rawSkill.trim(), {
        context: 'job_draft',
        fieldLabel: 'Draft skill',
        userId,
      });
      if (!moderation.allowed) {
        return respond(
          {
            success: false,
            message: moderation.message,
            violations: moderation.violations,
            suggestions: moderation.suggestions,
          },
          400
        );
      }
    }

    let draft: DraftSummarySource;
    let isNewDraft = false;

    if (draftId) {
      const existingDraft = await JobDraft.findOne({ _id: draftId, createdBy: userId });
      if (!existingDraft) {
        return respond({ success: false, message: 'Draft not found or access denied' }, 404);
      }
      Object.assign(existingDraft, normalizedPayload);
      draft = existingDraft as DraftSummarySource;
    } else {
      isNewDraft = true;
      draft = new JobDraft({
        createdBy: userId,
        ...normalizedPayload,
        draftStatus: saveType === 'manual' ? 'manually_saved' : 'auto_saved',
      }) as DraftSummarySource;
    }

    const dataSnapshot = {
      title: normalizedPayload.title,
      description: normalizedPayload.description,
      skillsRequired: normalizedPayload.skillsRequired,
      budget: normalizedPayload.budget,
      location: normalizedPayload.location,
      deadline: normalizedPayload.deadline,
      scheduledDate: normalizedPayload.scheduledDate,
      urgency: normalizedPayload.urgency,
      attachments: normalizedPayload.attachments,
    };

    if (saveType === 'manual') {
      await draft.addManualSave(currentStep, dataSnapshot);
    } else {
      await draft.addAutoSave(currentStep, dataSnapshot);
    }

    await draft.updateActivity();

    return respond({
      success: true,
      message: `Draft ${saveType === 'manual' ? 'manually' : 'automatically'} saved`,
      draft: {
        _id: draft._id,
        title: draft.title ?? 'Untitled Job',
        completionPercentage: draft.completionPercentage,
        currentStep: draft.currentStep,
        draftStatus: draft.draftStatus,
        lastActivity: draft.lastActivity,
        lastAutoSave: draft.lastAutoSave,
        lastManualSave: draft.lastManualSave,
        isNewDraft,
      },
    });
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('Error saving draft:', err);
    return respond(
      {
        success: false,
        message: 'Failed to save draft',
        error: env.NODE_ENV === 'development' ? err.message : undefined,
      },
      500
    );
  }
}
