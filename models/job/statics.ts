import mongoose from 'mongoose';

import {
  buildJobsByUserQuery,
  buildJobsSort,
  buildOpenJobsFiltersQuery,
  buildUrgentJobsQuery,
  JOB_CARD_POPULATE_FIELDS,
} from '../../lib/jobs/job-query-helpers';
import type { JobFilters, JobUserRole } from '../../types/jobs/query';

import type { ObjectIdLike } from './types';

function findWithFilters(this: mongoose.Model<unknown>, filters: JobFilters = {}) {
  return this.find(buildOpenJobsFiltersQuery(filters))
    .populate('createdBy', JOB_CARD_POPULATE_FIELDS)
    .sort(buildJobsSort(filters));
}

function findUrgentJobs(this: mongoose.Model<unknown>) {
  return this.find(buildUrgentJobsQuery()).populate('createdBy', JOB_CARD_POPULATE_FIELDS);
}

function findByUser(
  this: mongoose.Model<unknown>,
  userId: ObjectIdLike,
  role: JobUserRole = 'created'
) {
  return this.find(buildJobsByUserQuery(userId, role))
    .populate('createdBy', JOB_CARD_POPULATE_FIELDS)
    .populate('assignedTo', JOB_CARD_POPULATE_FIELDS)
    .sort({ createdAt: -1 });
}

export function addJobStatics(schema: mongoose.Schema): void {
  schema.statics.findWithFilters = findWithFilters;
  schema.statics.findUrgentJobs = findUrgentJobs;
  schema.statics.findByUser = findByUser;
}
