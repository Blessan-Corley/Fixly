import { Types } from 'mongoose';

import { notFound, requireSession, respond, unauthorized } from '@/lib/api';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import connectDB from '@/lib/mongodb';
import JobDraft from '@/models/JobDraft';

export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{
    draftId: string;
  }>;
};

type DraftDetailSource = {
  _id: unknown;
  title?: string;
  description?: string;
  skillsRequired?: unknown[];
  budget?: Record<string, unknown>;
  location?: Record<string, unknown>;
  deadline?: Date;
  scheduledDate?: Date;
  urgency?: string;
  attachments?: unknown[];
  currentStep?: number;
  completedSteps?: Array<{ step: number; completedAt: Date }>;
  draftStatus?: string;
  completionPercentage?: number;
  validationStatus?: Record<string, unknown>;
  lastActivity?: Date;
  lastAutoSave?: Date;
  lastManualSave?: Date;
  ageInHours?: number;
  hoursUntilExpiry?: number;
  isExpired?: boolean;
  photoCount?: number;
  videoCount?: number;
  createdAt?: Date;
  updatedAt?: Date;
  updateActivity: () => Promise<unknown>;
};

function isValidObjectId(value?: string): value is string {
  return !!value && Types.ObjectId.isValid(value);
}

export async function GET(_request: Request, props: RouteContext) {
  const params = await props.params;
  try {
    const auth = await requireSession();
    if ('error' in auth) return auth.error;
    const userId = typeof auth.session.user.id === 'string' ? auth.session.user.id : '';
    if (!userId) return unauthorized();

    const draftId = params?.draftId;
    if (!draftId) {
      return respond({ success: false, message: 'Draft ID is required' }, 400);
    }

    if (!isValidObjectId(draftId)) {
      return respond({ success: false, message: 'Invalid draft ID' }, 400);
    }

    await connectDB();

    const draft = (await JobDraft.findOne({
      _id: draftId,
      createdBy: userId,
    })) as DraftDetailSource | null;

    if (!draft) {
      return notFound('Draft');
    }

    if (draft.isExpired) {
      return respond(
        { success: false, message: 'Draft has expired and will be deleted soon' },
        410
      );
    }

    await draft.updateActivity();

    return respond({
      success: true,
      draft: {
        _id: draft._id,
        title: draft.title,
        description: draft.description,
        skillsRequired: draft.skillsRequired,
        budget: draft.budget,
        location: draft.location,
        deadline: draft.deadline,
        scheduledDate: draft.scheduledDate,
        urgency: draft.urgency,
        attachments: draft.attachments,
        currentStep: draft.currentStep,
        completedSteps: draft.completedSteps,
        draftStatus: draft.draftStatus,
        completionPercentage: draft.completionPercentage,
        validationStatus: draft.validationStatus,
        lastActivity: draft.lastActivity,
        lastAutoSave: draft.lastAutoSave,
        lastManualSave: draft.lastManualSave,
        ageInHours: draft.ageInHours,
        hoursUntilExpiry: draft.hoursUntilExpiry,
        isExpired: draft.isExpired,
        photoCount: draft.photoCount,
        videoCount: draft.videoCount,
        createdAt: draft.createdAt,
        updatedAt: draft.updatedAt,
      },
    });
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('Error loading draft:', err);
    return respond(
      {
        success: false,
        message: 'Failed to load draft',
        error: env.NODE_ENV === 'development' ? err.message : undefined,
      },
      500
    );
  }
}
