import type mongoose from 'mongoose';

import type { Dispute, DisputeModel, DisputeMethods } from './types';

export function addDisputeIndexes(
  schema: mongoose.Schema<Dispute, DisputeModel, DisputeMethods>
): void {
  schema.index({ job: 1 });
  schema.index({ initiatedBy: 1 });
  schema.index({ againstUser: 1 });
  // { status: 1 } removed — covered as prefix of { status: 1, createdAt: -1 } below
  schema.index({ assignedModerator: 1 });
  schema.index({ category: 1 });
  schema.index({ createdAt: -1 });
  schema.index({ 'resolution.implementedAt': -1 });
  schema.index({ status: 1, createdAt: -1 });
  schema.index({ isActive: 1, status: 1, createdAt: -1 });
}
