import type mongoose from 'mongoose';

import type { Dispute, DisputeDocument, DisputeModel, DisputeMethods } from './types';

export function addDisputeHooks(
  schema: mongoose.Schema<Dispute, DisputeModel, DisputeMethods>
): void {
  schema.pre('save', async function (this: DisputeDocument, next) {
    if (this.isNew && !this.disputeId) {
      const year = new Date().getFullYear();
      const month = String(new Date().getMonth() + 1).padStart(2, '0');
      const day = String(new Date().getDate()).padStart(2, '0');
      const random = Math.random().toString(36).slice(2, 8).toUpperCase();
      this.disputeId = `DSP-${year}${month}${day}-${random}`;
    }

    if (this.isModified('status') && this.status === 'awaiting_response') {
      this.metadata.responseDeadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    }

    if (this.isModified('status') && this.status === 'in_mediation') {
      this.metadata.automaticEscalationDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    }

    next();
  });
}
