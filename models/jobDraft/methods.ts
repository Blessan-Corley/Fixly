import type mongoose from 'mongoose';

import type { JobDraft, JobDraftDocument, JobDraftModel, JobDraftMethods, ValidationStatus } from './types';

export function addJobDraftMethods(
  schema: mongoose.Schema<JobDraft, JobDraftModel, JobDraftMethods>
): void {
  schema.methods.updateActivity = function (this: JobDraftDocument) {
    this.lastActivity = new Date();
    this.interactionCount += 1;
    return this.save();
  };

  schema.methods.addAutoSave = function (
    this: JobDraftDocument,
    step: number,
    dataSnapshot: Record<string, unknown>
  ) {
    this.saveHistory.push({ saveType: 'auto', step, savedAt: new Date(), dataSnapshot });
    this.lastAutoSave = new Date();
    this.autoSaveCount += 1;
    this.lastActivity = new Date();
    if (this.saveHistory.length > 50) {
      this.saveHistory = this.saveHistory.slice(-50);
    }
    return this.save();
  };

  schema.methods.addManualSave = function (
    this: JobDraftDocument,
    step: number,
    dataSnapshot: Record<string, unknown>
  ) {
    this.saveHistory.push({ saveType: 'manual', step, savedAt: new Date(), dataSnapshot });
    this.lastManualSave = new Date();
    this.manualSaveCount += 1;
    this.lastActivity = new Date();
    this.draftStatus = 'manually_saved';
    if (this.saveHistory.length > 50) {
      this.saveHistory = this.saveHistory.slice(-50);
    }
    return this.save();
  };

  schema.methods.updateStepCompletion = function (this: JobDraftDocument, step: number) {
    if (!this.completedSteps.find((item) => item.step === step)) {
      this.completedSteps.push({ step, completedAt: new Date() });
    }
    this.currentStep = Math.max(this.currentStep, step);
    this.lastActivity = new Date();
    this.completionPercentage = (this.completedSteps.length / 4) * 100;
    return this.save();
  };

  schema.methods.updateValidationStatus = function (
    this: JobDraftDocument,
    step: number,
    isValid: boolean,
    errors: string[] = []
  ) {
    const stepKey = `step${step}` as keyof ValidationStatus;
    const stepStatus = this.validationStatus[stepKey];
    if (stepStatus) {
      stepStatus.isValid = isValid;
      stepStatus.errors = errors;
      stepStatus.lastChecked = new Date();
    }
    return this.save();
  };

  schema.methods.convertToJob = function (this: JobDraftDocument, jobId: string) {
    this.convertedToJob = true;
    this.convertedJobId = jobId;
    this.convertedAt = new Date();
    this.draftStatus = 'active';
    return this.save();
  };

  schema.methods.markAbandoned = function (this: JobDraftDocument) {
    this.draftStatus = 'abandoned';
    this.lastActivity = new Date();
    return this.save();
  };

  schema.methods.extendExpiry = function (this: JobDraftDocument, days = 7) {
    const newExpiry = new Date(this.expiresAt);
    newExpiry.setDate(newExpiry.getDate() + days);
    this.expiresAt = newExpiry;
    return this.save();
  };
}
