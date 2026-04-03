import type mongoose from 'mongoose';

import type { DraftAttachment, JobDraft, JobDraftDocument, JobDraftModel, JobDraftMethods } from './types';

export function addJobDraftVirtuals(
  schema: mongoose.Schema<JobDraft, JobDraftModel, JobDraftMethods>
): void {
  schema.virtual('ageInHours').get(function (this: JobDraftDocument) {
    const now = Date.now();
    const created = this.createdAt ? new Date(this.createdAt).getTime() : now;
    return Math.floor((now - created) / (1000 * 60 * 60));
  });

  schema.virtual('hoursUntilExpiry').get(function (this: JobDraftDocument) {
    const now = Date.now();
    const expires = new Date(this.expiresAt).getTime();
    return Math.max(0, Math.floor((expires - now) / (1000 * 60 * 60)));
  });

  schema.virtual('isExpired').get(function (this: JobDraftDocument) {
    return Date.now() > new Date(this.expiresAt).getTime();
  });

  schema.virtual('photoCount').get(function (this: JobDraftDocument) {
    return (this.attachments ?? []).filter((a: DraftAttachment) => a.isImage).length;
  });

  schema.virtual('videoCount').get(function (this: JobDraftDocument) {
    return (this.attachments ?? []).filter((a: DraftAttachment) => a.isVideo).length;
  });
}
