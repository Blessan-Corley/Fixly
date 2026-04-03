import type { JobDocument } from '../types';

export function closeMessaging(this: JobDocument) {
  this.completion.messagingClosed = true;
  this.completion.messagingClosedAt = new Date();
  return this.save();
}

export function isMessagingAllowed(this: JobDocument) {
  return !this.completion.messagingClosed;
}

export function getJobParticipants(this: JobDocument) {
  return {
    hirer: this.createdBy,
    fixer: this.assignedTo,
    isCompleted: this.status === 'completed',
    completedAt: this.completion.confirmedAt,
  };
}
