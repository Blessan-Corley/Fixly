import type mongoose from 'mongoose';

import type { DraftAttachment, JobDraft, JobDraftDocument, JobDraftModel, JobDraftMethods } from './types';

export function addJobDraftHooks(
  schema: mongoose.Schema<JobDraft, JobDraftModel, JobDraftMethods>
): void {
  schema.pre('save', function (this: JobDraftDocument, next) {
    try {
      if (this.skillsRequired) {
        this.skillsRequired = this.skillsRequired.map((skill: string) =>
          skill.toLowerCase().trim()
        );
      }

      let completedFields = 0;
      const totalFields = 8;

      if (this.title && this.title.trim().length >= 10) completedFields++;
      if (this.description && this.description.trim().length >= 30) completedFields++;
      if (this.skillsRequired && this.skillsRequired.length > 0) completedFields++;
      if (
        this.budget?.type &&
        (this.budget.type === 'negotiable' ||
          (typeof this.budget.amount === 'number' && this.budget.amount > 0))
      )
        completedFields++;
      if (this.location?.address && this.location.city) completedFields++;
      if (this.deadline) completedFields++;
      if (this.urgency) completedFields++;
      if (
        (this.attachments ?? []).filter((a: DraftAttachment) => a.isImage).length > 0
      )
        completedFields++;

      this.completionPercentage = Math.round((completedFields / totalFields) * 100);
      next();
    } catch (error) {
      next(error as Error);
    }
  });
}
