import type mongoose from 'mongoose';

import type { Dispute, DisputeModel, DisputeMethods, DisputeStatistics } from './types';

export function addDisputeStatics(
  schema: mongoose.Schema<Dispute, DisputeModel, DisputeMethods>
): void {
  schema.statics.getStatistics = async function (
    this: DisputeModel,
    filter: Record<string, unknown> = {}
  ): Promise<DisputeStatistics> {
    const pipeline = [
      { $match: filter },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          underReview: { $sum: { $cond: [{ $eq: ['$status', 'under_review'] }, 1, 0] } },
          inMediation: { $sum: { $cond: [{ $eq: ['$status', 'in_mediation'] }, 1, 0] } },
          resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
          escalated: { $sum: { $cond: [{ $eq: ['$status', 'escalated'] }, 1, 0] } },
          avgResolutionTime: {
            $avg: { $subtract: ['$resolution.implementedAt', '$createdAt'] },
          },
        },
      },
    ];

    const result = await this.aggregate<DisputeStatistics>(pipeline);
    return (
      result[0] ?? {
        total: 0,
        pending: 0,
        underReview: 0,
        inMediation: 0,
        resolved: 0,
        escalated: 0,
        avgResolutionTime: 0,
      }
    );
  };
}
