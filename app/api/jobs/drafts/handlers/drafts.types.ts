import { z } from 'zod';

export type DraftSaveBody = {
  draftId?: unknown;
  formData?: unknown;
  currentStep?: unknown;
  saveType?: unknown;
  completedSteps?: unknown;
};

export type DraftFormData = {
  title?: unknown;
  description?: unknown;
  skillsRequired?: unknown;
  budget?: unknown;
  location?: unknown;
  deadline?: unknown;
  scheduledDate?: unknown;
  urgency?: unknown;
  attachments?: unknown;
};

export type DraftAttachmentInput = {
  id?: string;
  url?: string;
  type?: string;
  size?: number;
  isImage?: boolean;
  isVideo?: boolean;
  width?: number;
  height?: number;
  duration?: number;
  filename?: string;
  name?: string;
  publicId?: string;
};

export type DraftSummarySource = {
  _id: unknown;
  title?: string;
  description?: string;
  completionPercentage?: number;
  currentStep?: number;
  draftStatus?: string;
  lastActivity?: Date;
  lastAutoSave?: Date;
  lastManualSave?: Date;
  ageInHours?: number;
  hoursUntilExpiry?: number;
  isExpired?: boolean;
  photoCount?: number;
  videoCount?: number;
  convertedToJob?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  attachments?: DraftAttachmentInput[];
  addManualSave: (step: number, dataSnapshot: Record<string, unknown>) => Promise<unknown>;
  addAutoSave: (step: number, dataSnapshot: Record<string, unknown>) => Promise<unknown>;
  updateActivity: () => Promise<unknown>;
};

export const DraftSaveSchema = z.object({
  draftId: z.unknown().optional(),
  formData: z.unknown().optional(),
  currentStep: z.unknown().optional(),
  saveType: z.unknown().optional(),
  completedSteps: z.unknown().optional(),
});
