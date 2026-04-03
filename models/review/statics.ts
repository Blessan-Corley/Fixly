import mongoose from 'mongoose';

import { ReviewSchema } from './schema';
import type { ReviewModel, ReviewType } from './types';

ReviewSchema.statics.getAverageRating = async function (this: ReviewModel, userId: string) {
  const result = await this.aggregate<{
    averageOverall: number;
    totalReviews: number;
    ratingDistribution: number[];
  }>([
    {
      $match: {
        reviewee: new mongoose.Types.ObjectId(userId),
        status: 'published',
        isPublic: true,
      },
    },
    {
      $group: {
        _id: null,
        averageOverall: { $avg: '$rating.overall' },
        totalReviews: { $sum: 1 },
        ratingDistribution: { $push: '$rating.overall' },
      },
    },
  ]);

  if (result.length === 0) {
    return {
      average: 0,
      total: 0,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    };
  }

  const data = result[0];
  const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  data.ratingDistribution.forEach((rating: number) => {
    const roundedRating = Math.round(rating);
    distribution[roundedRating] = (distribution[roundedRating] ?? 0) + 1;
  });

  return {
    average: Math.round(data.averageOverall * 10) / 10,
    total: data.totalReviews,
    distribution,
  };
};

ReviewSchema.statics.getDetailedRatings = async function (
  this: ReviewModel,
  userId: string,
  reviewType: ReviewType = 'client_to_fixer'
) {
  const matchStage = {
    reviewee: new mongoose.Types.ObjectId(userId),
    reviewType,
    status: 'published',
    isPublic: true,
  };

  const groupStage =
    reviewType === 'client_to_fixer'
      ? {
          _id: null,
          workQuality: { $avg: '$rating.workQuality' },
          communication: { $avg: '$rating.communication' },
          punctuality: { $avg: '$rating.punctuality' },
          professionalism: { $avg: '$rating.professionalism' },
          totalReviews: { $sum: 1 },
        }
      : {
          _id: null,
          clarity: { $avg: '$rating.clarity' },
          responsiveness: { $avg: '$rating.responsiveness' },
          paymentTimeliness: { $avg: '$rating.paymentTimeliness' },
          totalReviews: { $sum: 1 },
        };

  const result = await this.aggregate([{ $match: matchStage }, { $group: groupStage }]);
  return result[0] ?? null;
};
