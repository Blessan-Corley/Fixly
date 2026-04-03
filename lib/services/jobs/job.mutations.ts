import { logger } from '@/lib/logger';
import { runJobPostSideEffects } from '@/lib/services/jobPostSideEffects';
import type { JobPostRecord, CreateJobInput } from '@/lib/services/jobs/createJob';
import { buildCreateJobInput } from '@/lib/services/jobs/job.mapper';
import {
  validateAttachments,
  validateBudgetAmount,
  validateDates,
  validateLocation,
  validateTitleDescription,
} from '@/lib/services/jobs/job.mutations.validators';
import {
  asTrimmedString,
  getBudgetType,
  getJobType,
  getUrgency,
  isRecord,
  isValidObjectId,
  normalizeSkillsRequired,
  toBoolean,
  toFiniteNumber,
} from '@/lib/services/jobs/job.schema';
import type { CreateJobBody } from '@/lib/services/jobs/job.types';
import { moderateJobContent, moderateJobSkills } from '@/lib/services/jobs/jobModeration';
import Job from '@/models/Job';

type MutationError = {
  body: Record<string, unknown>;
  status: number;
};

type PreparedJobPayloadResult =
  | { jobData: CreateJobInput; draftId: string; error?: never }
  | { jobData?: never; draftId?: never; error: MutationError };

export function queueJobPostSideEffects(jobId: string, task: () => Promise<void>): void {
  void Promise.resolve()
    .then(task)
    .catch((error: unknown) => {
      logger.error({ error, jobId }, 'Job post side effects scheduling failed');
    });
}

export function getJobPostingCooldownError(user: {
  canPostJob?: () => boolean;
  getNextJobPostTime?: () => Date | null;
}): MutationError | null {
  if (typeof user.canPostJob !== 'function' || user.canPostJob()) {
    return null;
  }

  const nextAllowedTime =
    typeof user.getNextJobPostTime === 'function' ? user.getNextJobPostTime() : null;

  if (!(nextAllowedTime instanceof Date)) {
    return null;
  }

  const now = Date.now();
  const diff = nextAllowedTime.getTime() - now;
  const hoursLeft = Math.ceil(diff / (1000 * 60 * 60));
  const minutesLeft = Math.ceil(diff / (1000 * 60));
  const timeMessage = hoursLeft >= 1 ? `${hoursLeft} hour(s)` : `${minutesLeft} minute(s)`;

  return {
    body: {
      message: `You can post another job in ${timeMessage}. Upgrade to Pro for unlimited posting!`,
    },
    status: 429,
  };
}

export async function prepareJobPostPayload(
  body: CreateJobBody,
  user: {
    _id: string;
    plan?: { type?: string; status?: string } | null;
  },
  sessionUserId: string
): Promise<PreparedJobPayloadResult> {
  const title = asTrimmedString(body.title);
  const description = asTrimmedString(body.description);
  const urgency = getUrgency(body.urgency);
  const type = getJobType(body.type);
  const featuredRequested = toBoolean(body.featured);

  if (!title || !description || !isRecord(body.location) || !Array.isArray(body.attachments)) {
    return {
      error: {
        body: {
          success: false,
          message:
            'Missing required fields: title, description, location, and at least 1 photo are required',
        },
        status: 400,
      },
    };
  }

  const titleDescError = validateTitleDescription(title, description);
  if (titleDescError) return { error: titleDescError };

  const attachResult = validateAttachments(body.attachments as unknown[]);
  if (attachResult.error) return { error: attachResult.error };

  const datesResult = validateDates(body, urgency, Date.now());
  if (datesResult.error) return { error: datesResult.error };

  const locationResult = validateLocation(body.location as Record<string, unknown>);
  if (locationResult.error) return { error: locationResult.error };

  const budgetInput = isRecord(body.budget) ? body.budget : {};
  const budgetType = getBudgetType(budgetInput.type);
  const budgetAmount = toFiniteNumber(budgetInput.amount);
  const materialsIncluded = toBoolean(budgetInput.materialsIncluded);

  const budgetError = validateBudgetAmount(budgetType, budgetAmount);
  if (budgetError) return { error: budgetError };

  const draftId = asTrimmedString(body.draftId);
  if (draftId && !isValidObjectId(draftId)) {
    return {
      error: {
        body: { success: false, message: 'Invalid draft ID' },
        status: 400,
      },
    };
  }

  const skillsRequired = normalizeSkillsRequired(body.skillsRequired);

  const moderationResult = await moderateJobContent(title, description, sessionUserId);
  if (!moderationResult.approved) {
    return {
      error: {
        body: {
          success: false,
          message: moderationResult.message,
          violations: moderationResult.violations,
          suggestions: moderationResult.suggestions,
          severity: moderationResult.severity,
        },
        status: 422,
      },
    };
  }

  const skillsModeration = await moderateJobSkills(skillsRequired, sessionUserId);
  if (!skillsModeration.approved) {
    return {
      error: {
        body: {
          success: false,
          message: skillsModeration.message,
          violations: skillsModeration.violations,
          suggestions: skillsModeration.suggestions,
          severity: skillsModeration.severity,
        },
        status: 422,
      },
    };
  }

  const { address, city, state, pincode, lat, lng } = locationResult;
  const { deadline, scheduledDate } = datesResult;

  return {
    jobData: buildCreateJobInput({
      title,
      description,
      skillsRequired,
      budgetType,
      budgetAmount,
      materialsIncluded,
      address,
      city,
      state,
      pincode,
      lat,
      lng,
      deadline,
      urgency,
      type,
      userId: user._id,
      featured: featuredRequested && user.plan?.type === 'pro' && user.plan?.status === 'active',
      attachments: attachResult.attachments,
      scheduledDate,
    }),
    draftId,
  };
}

export async function runQueuedJobPostSideEffects(
  job: JobPostRecord,
  userId: string,
  draftId: string
): Promise<void> {
  await runJobPostSideEffects(job, userId, { draftId });
}

export async function closeJob(jobId: string, reason: string): Promise<void> {
  logger.debug({ jobId, reason }, 'Closing inactive job');
  await Job.findByIdAndUpdate(jobId, {
    $set: {
      status: 'expired',
      'cancellation.reason': reason,
      'cancellation.cancelledAt': new Date(),
    },
  });
}
