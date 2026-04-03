import mongoose from 'mongoose';

import { jobApplicationsField } from './job/schema.applications';
import { jobBaseDefinition } from './job/schema.base';
import { jobCommentsField } from './job/schema.comments';
import { addJobHooks } from './job/hooks';
import { addJobIndexes } from './job/indexes';
import { addJobMethods } from './job/methods';
import { jobMessagesField } from './job/schema.messages';
import {
  CancellationSchema,
  CompletionSchema,
  DisputeSchema,
  ProgressSchema,
} from './job/schema.workflow';
import { addJobStatics } from './job/statics';
import { addJobVirtuals } from './job/virtuals';

const jobSchema = new mongoose.Schema(
  {
    ...jobBaseDefinition,
    applications: jobApplicationsField,
    messages: jobMessagesField,
    comments: jobCommentsField,
    progress: ProgressSchema,
    dispute: DisputeSchema,
    completion: CompletionSchema,
    cancellation: CancellationSchema,
  },
  { timestamps: true }
);

addJobIndexes(jobSchema);
addJobVirtuals(jobSchema);
addJobMethods(jobSchema);
addJobStatics(jobSchema);
addJobHooks(jobSchema);

const Job = mongoose.models.Job || mongoose.model('Job', jobSchema);

export default Job;
