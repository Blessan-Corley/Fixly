import type mongoose from 'mongoose';

import { countActiveApplicationsOnJob } from './workflow';
import type { JobDocument } from './types';

export function addJobVirtuals(schema: mongoose.Schema): void {
  schema.virtual('applicationCount').get(function (this: JobDocument) {
    return countActiveApplicationsOnJob(this);
  });

  schema.virtual('timeRemaining').get(function (this: JobDocument) {
    if (!this.deadline) return 'No deadline';

    const now = Date.now();
    const deadline = new Date(this.deadline).getTime();
    const diff = deadline - now;

    if (diff <= 0) return 'Expired';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) return `${days} days`;
    return `${hours} hours`;
  });

  schema.virtual('isUrgent').get(function (this: JobDocument) {
    if (!this.deadline) return false;

    const now = Date.now();
    const deadline = new Date(this.deadline).getTime();
    const diff = deadline - now;
    return diff <= 24 * 60 * 60 * 1000;
  });

  schema.virtual('likeCount').get(function (this: JobDocument) {
    return this.likes.length;
  });
}
