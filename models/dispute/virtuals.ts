import type mongoose from 'mongoose';

import type { Dispute, DisputeDocument, DisputeModel, DisputeMethods } from './types';

export function addDisputeVirtuals(
  schema: mongoose.Schema<Dispute, DisputeModel, DisputeMethods>
): void {
  schema.virtual('otherParty').get(function (this: DisputeDocument) {
    return this.againstUser;
  });

  schema.virtual('ageInDays').get(function (this: DisputeDocument) {
    const createdAt = this.createdAt ? new Date(this.createdAt).getTime() : Date.now();
    return Math.floor((Date.now() - createdAt) / (1000 * 60 * 60 * 24));
  });
}
