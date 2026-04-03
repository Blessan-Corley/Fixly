import type mongoose from 'mongoose';

import type { JobDraft, JobDraftModel, JobDraftMethods } from './types';

export function addJobDraftIndexes(
  schema: mongoose.Schema<JobDraft, JobDraftModel, JobDraftMethods>
): void {
  schema.index({ createdBy: 1, draftStatus: 1 });
  schema.index({ lastActivity: -1 });
  schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  schema.index({ convertedToJob: 1 });
  schema.index({ createdBy: 1, createdAt: -1 });
  schema.index({ draftStatus: 1, lastActivity: -1 });
}
