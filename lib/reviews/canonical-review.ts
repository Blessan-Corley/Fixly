import Review from '@/models/Review';
import User from '@/models/User';

import type { CanonicalCompletionCategories } from './job-review';

type PublicReviewType = 'client_to_fixer' | 'fixer_to_client';

type CanonicalReviewInput = {
  jobId: string;
  reviewerId: string;
  revieweeId: string;
  reviewType: PublicReviewType;
  overall: number;
  comment: string;
  title?: string;
  pros?: string[];
  cons?: string[];
  wouldRecommend?: boolean;
  wouldHireAgain?: boolean;
  tags?: string[];
  attachments?: Array<{
    type?: 'image' | 'document';
    url?: string;
    filename?: string;
    description?: string;
  }>;
  categories: CanonicalCompletionCategories;
};

type CanonicalReviewCreateResult = {
  reviewId: string;
};

export function buildCanonicalReviewRating(
  reviewType: PublicReviewType,
  overall: number,
  categories: CanonicalCompletionCategories
): Record<string, number> {
  if (reviewType === 'client_to_fixer') {
    return {
      overall,
      workQuality: categories.quality,
      communication: categories.communication,
      punctuality: categories.timeliness,
      professionalism: categories.professionalism,
    };
  }

  return {
    overall,
    clarity: categories.quality,
    responsiveness: categories.communication,
    paymentTimeliness: categories.timeliness,
  };
}

export async function hasCanonicalReviewForJob(
  jobId: string,
  reviewerId: string,
  reviewType: PublicReviewType
): Promise<boolean> {
  const existingReview = await Review.findOne({
    job: jobId,
    reviewer: reviewerId,
    reviewType,
  })
    .select('_id')
    .lean();

  return Boolean(existingReview);
}

export async function createCanonicalReview(
  input: CanonicalReviewInput
): Promise<CanonicalReviewCreateResult> {
  const review = new Review({
    job: input.jobId,
    reviewer: input.reviewerId,
    reviewee: input.revieweeId,
    reviewType: input.reviewType,
    rating: buildCanonicalReviewRating(input.reviewType, input.overall, input.categories),
    title: input.title || 'Job Review',
    comment: input.comment,
    pros: input.pros || [],
    cons: input.cons || [],
    wouldRecommend: input.wouldRecommend ?? true,
    wouldHireAgain: input.reviewType === 'client_to_fixer' ? input.wouldHireAgain : undefined,
    tags: input.tags || [],
    attachments: input.attachments || [],
    status: 'published',
    publishedAt: new Date(),
    isVerified: true,
  });

  await review.save();

  return {
    reviewId: String(review._id),
  };
}

export async function refreshRevieweeAggregateRating(revieweeId: string): Promise<void> {
  const ratings = await Review.getAverageRating(revieweeId);
  await User.findByIdAndUpdate(revieweeId, {
    'rating.average': ratings.average,
    'rating.count': ratings.total,
    'rating.distribution': ratings.distribution,
  });
}
