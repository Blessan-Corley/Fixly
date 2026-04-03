import mongoose from 'mongoose';

export type DraftBudgetType = 'fixed' | 'negotiable' | 'hourly';
export type DraftCurrency = 'INR' | 'USD';
export type DraftUrgency = 'asap' | 'flexible' | 'scheduled';
export type DraftStatus = 'active' | 'auto_saved' | 'manually_saved' | 'abandoned';
export type SaveType = 'auto' | 'manual' | 'step_change';

export interface DraftAttachment {
  id: string;
  url: string;
  publicId: string;
  filename?: string;
  type: string;
  size: number;
  isImage: boolean;
  isVideo: boolean;
  width?: number;
  height?: number;
  duration?: number;
  createdAt: Date;
}

export interface ValidationStepStatus {
  isValid: boolean;
  errors: string[];
  lastChecked?: Date;
}

export interface ValidationStatus {
  step1: ValidationStepStatus;
  step2: ValidationStepStatus;
  step3: ValidationStepStatus;
  step4: ValidationStepStatus;
  [key: string]: ValidationStepStatus | undefined;
}

export interface JobDraftSaveHistoryEntry {
  saveType: SaveType;
  step: number;
  savedAt: Date;
  dataSnapshot?: Record<string, unknown>;
}

export interface JobDraft {
  title: string;
  description: string;
  skillsRequired: string[];
  budget: {
    type: DraftBudgetType;
    amount?: number;
    currency: DraftCurrency;
  };
  location: {
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    lat?: number;
    lng?: number;
  };
  deadline?: Date;
  scheduledDate?: Date;
  urgency: DraftUrgency;
  attachments: DraftAttachment[];
  createdBy: mongoose.Types.ObjectId | string;
  draftStatus: DraftStatus;
  currentStep: number;
  completedSteps: Array<{ step: number; completedAt: Date }>;
  saveHistory: JobDraftSaveHistoryEntry[];
  lastAutoSave: Date;
  autoSaveCount: number;
  lastManualSave?: Date;
  manualSaveCount: number;
  lastActivity: Date;
  totalTimeSpent: number;
  interactionCount: number;
  validationStatus: ValidationStatus;
  completionPercentage: number;
  estimatedCompletionTime: number;
  convertedToJob: boolean;
  convertedJobId?: mongoose.Types.ObjectId | string;
  convertedAt?: Date;
  expiresAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export type JobDraftDocument = mongoose.HydratedDocument<JobDraft, JobDraftMethods>;

export interface JobDraftMethods {
  updateActivity(): Promise<JobDraftDocument>;
  addAutoSave(step: number, dataSnapshot: Record<string, unknown>): Promise<JobDraftDocument>;
  addManualSave(step: number, dataSnapshot: Record<string, unknown>): Promise<JobDraftDocument>;
  updateStepCompletion(step: number): Promise<JobDraftDocument>;
  updateValidationStatus(
    step: number,
    isValid: boolean,
    errors?: string[]
  ): Promise<JobDraftDocument>;
  convertToJob(jobId: string): Promise<JobDraftDocument>;
  markAbandoned(): Promise<JobDraftDocument>;
  extendExpiry(days?: number): Promise<JobDraftDocument>;
}

export interface JobDraftAnalytics {
  totalDrafts: number;
  convertedDrafts: number;
  averageCompletionPercentage: number;
  totalTimeSpent: number;
  averageAutoSaves: number;
  averageManualSaves: number;
}

export interface JobDraftModel extends mongoose.Model<JobDraft, object, JobDraftMethods> {
  findUserDrafts(userId: string, limit?: number): Promise<JobDraftDocument[]>;
  findExpiredDrafts(): Promise<JobDraftDocument[]>;
  getDraftAnalytics(userId: string): Promise<JobDraftAnalytics[]>;
}
