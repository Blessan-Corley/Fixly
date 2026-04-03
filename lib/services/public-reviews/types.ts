import { Types } from 'mongoose';

import type { CanonicalCompletionCategories } from '@/lib/reviews/job-review';
import { normalizeCompletionReviewCategories } from '@/lib/reviews/job-review';

export type PublicReviewsPagination = {
  page: number;
  limit: number;
};

export type PublicReviewsListResult = {
  items: Array<Record<string, unknown>>;
  total: number;
};

export type UserReviewStats = {
  averageRating: number;
  totalReviews: number;
  distribution: Record<number, number>;
};

export type UserReviewsListResult = PublicReviewsListResult & {
  stats: UserReviewStats;
};

export type CreateJobReviewInput = {
  jobId: string;
  reviewerId: string;
  rating: number;
  comment: string;
};

export function isValidObjectId(value: string): boolean {
  return Types.ObjectId.isValid(value);
}

export function toObjectId(value: string): Types.ObjectId {
  return new Types.ObjectId(value);
}

export function buildUniformCategories(overall: number): CanonicalCompletionCategories {
  return normalizeCompletionReviewCategories({
    overall,
    categories: {
      communication: overall,
      quality: overall,
      timeliness: overall,
      professionalism: overall,
      clarity: overall,
      responsiveness: overall,
      paymentTimeliness: overall,
      workQuality: overall,
      punctuality: overall,
    },
  });
}
