import type mongoose from 'mongoose';

import type {
  Dispute,
  DisputeDocument,
  DisputeModel,
  DisputeMethods,
  DisputeSenderType,
  DisputeStatus,
} from './types';

export function addDisputeMethods(
  schema: mongoose.Schema<Dispute, DisputeModel, DisputeMethods>
): void {
  schema.methods.addTimelineEntry = function (
    this: DisputeDocument,
    action: string,
    performedBy: string,
    description: string,
    metadata: Record<string, unknown> = {}
  ) {
    this.timeline.push({ action, performedBy, description, metadata, timestamp: new Date() });
    return this.save();
  };

  schema.methods.addMessage = function (
    this: DisputeDocument,
    sender: string,
    senderType: DisputeSenderType,
    content: string,
    isPublic = true
  ) {
    this.messages.push({ sender, senderType, content, isPublic, timestamp: new Date() });
    this.metadata.totalMessages = this.messages.length;
    this.metadata.lastResponseDate = new Date();
    return this.save();
  };

  schema.methods.changeStatus = function (
    this: DisputeDocument,
    newStatus: DisputeStatus,
    performedBy: string,
    description?: string
  ) {
    const oldStatus = this.status;
    this.status = newStatus;
    this.addTimelineEntry(
      `status_changed_to_${newStatus}`,
      performedBy,
      description ?? `Status changed from ${oldStatus} to ${newStatus}`
    );
    return this.save();
  };

  schema.methods.isOverdue = function (this: DisputeDocument): boolean {
    if (this.status === 'awaiting_response' && this.metadata.responseDeadline) {
      return new Date() > this.metadata.responseDeadline;
    }
    if (this.status === 'in_mediation' && this.metadata.automaticEscalationDate) {
      return new Date() > this.metadata.automaticEscalationDate;
    }
    return false;
  };
}
