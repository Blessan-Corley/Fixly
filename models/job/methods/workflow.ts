import {
  cancelJobOnJob,
  confirmCompletionOnJob,
  markDoneOnJob,
  raiseDisputeOnJob,
} from '../workflow';
import type { JobDocument, ObjectIdLike } from '../types';

export function markDone(
  this: JobDocument,
  fixerId: ObjectIdLike,
  notes: string = '',
  afterImages: string[] = []
) {
  const result = markDoneOnJob(this, fixerId, notes, afterImages);
  if (!result.ok) return false;
  return this.save();
}

export function confirmCompletion(
  this: JobDocument,
  hirerId: ObjectIdLike,
  rating: number,
  review: string = ''
) {
  const result = confirmCompletionOnJob(this, hirerId, rating, review);
  if (!result.ok) return false;
  return this.save();
}

export function raiseDispute(
  this: JobDocument,
  userId: ObjectIdLike,
  reason: string,
  description: string,
  evidence: string[] = []
) {
  const result = raiseDisputeOnJob(this, userId, reason, description, evidence);
  if (!result.ok) return false;
  return this.save();
}

export function cancelJob(this: JobDocument, userId: ObjectIdLike, reason: string) {
  const result = cancelJobOnJob(this, userId, reason, true);
  if (!result.ok) return false;
  return this.save();
}
