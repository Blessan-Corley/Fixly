import {
  acceptApplicationOnJob,
  canApplyToJob,
  getApplicationByFixer,
} from '../workflow';
import type { JobDocument, ObjectIdLike } from '../types';

export function canApply(this: JobDocument, userId: ObjectIdLike) {
  return canApplyToJob(this, userId);
}

export function getApplicationForFixer(this: JobDocument, fixerId: ObjectIdLike) {
  return getApplicationByFixer(this, fixerId);
}

export function acceptApplication(this: JobDocument, applicationId: ObjectIdLike) {
  const result = acceptApplicationOnJob(this, applicationId);
  if (!result.ok) return false;
  return this.save();
}
