import mongoose from 'mongoose';

import type { JobDraft, JobDraftAnalytics, JobDraftDocument, JobDraftModel, JobDraftMethods } from './types';

export function addJobDraftStatics(
  schema: mongoose.Schema<JobDraft, JobDraftModel, JobDraftMethods>
): void {
  schema.statics.findUserDrafts = function (
    this: JobDraftModel,
    userId: string,
    limit = 10
  ): Promise<JobDraftDocument[]> {
    return this.find({
      createdBy: userId,
      draftStatus: { $in: ['active', 'auto_saved', 'manually_saved'] },
      convertedToJob: false,
    })
      .sort({ lastActivity: -1 })
      .limit(limit)
      .exec();
  };

  schema.statics.findExpiredDrafts = function (this: JobDraftModel): Promise<JobDraftDocument[]> {
    return this.find({ expiresAt: { $lt: new Date() }, convertedToJob: false }).exec();
  };

  schema.statics.getDraftAnalytics = function (
    this: JobDraftModel,
    userId: string
  ): Promise<JobDraftAnalytics[]> {
    return this.aggregate<JobDraftAnalytics>([
      { $match: { createdBy: new mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: null,
          totalDrafts: { $sum: 1 },
          convertedDrafts: { $sum: { $cond: ['$convertedToJob', 1, 0] } },
          averageCompletionPercentage: { $avg: '$completionPercentage' },
          totalTimeSpent: { $sum: '$totalTimeSpent' },
          averageAutoSaves: { $avg: '$autoSaveCount' },
          averageManualSaves: { $avg: '$manualSaveCount' },
        },
      },
    ]);
  };
}
