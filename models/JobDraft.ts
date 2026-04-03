import mongoose from 'mongoose';

import { addJobDraftHooks } from './jobDraft/hooks';
import { addJobDraftIndexes } from './jobDraft/indexes';
import { addJobDraftMethods } from './jobDraft/methods';
import { jobDraftSchema } from './jobDraft/schema';
import { addJobDraftStatics } from './jobDraft/statics';
import type { JobDraft, JobDraftModel } from './jobDraft/types';
import { addJobDraftVirtuals } from './jobDraft/virtuals';

addJobDraftIndexes(jobDraftSchema);
addJobDraftVirtuals(jobDraftSchema);
addJobDraftMethods(jobDraftSchema);
addJobDraftStatics(jobDraftSchema);
addJobDraftHooks(jobDraftSchema);

export type {
  JobDraft,
  JobDraftDocument,
  JobDraftMethods,
  JobDraftModel,
  JobDraftAnalytics,
  DraftAttachment,
} from './jobDraft/types';

export default (mongoose.models.JobDraft as JobDraftModel) ||
  mongoose.model<JobDraft, JobDraftModel>('JobDraft', jobDraftSchema);
