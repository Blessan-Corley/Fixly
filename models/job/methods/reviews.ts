import type { JobDocument, ObjectIdLike, ReviewInput } from '../types';

export function submitReview(this: JobDocument, reviewerId: ObjectIdLike, reviewData: ReviewInput) {
  const isHirer = this.createdBy.toString() === reviewerId.toString();
  const isFixer = this.assignedTo && this.assignedTo.toString() === reviewerId.toString();

  if (!isHirer && !isFixer) {
    throw new Error('Only job participants can submit reviews');
  }

  if (this.status !== 'completed') {
    throw new Error('Job must be completed before reviews can be submitted');
  }

  const now = new Date();

  if (isHirer) {
    this.completion.fixerRating = {
      rating: reviewData.overall,
      review: reviewData.comment,
      categories: {
        communication: reviewData.communication,
        quality: reviewData.quality,
        timeliness: reviewData.timeliness,
        professionalism: reviewData.professionalism,
      },
      ratedBy: reviewerId,
      ratedAt: now,
    };
  } else {
    this.completion.hirerRating = {
      rating: reviewData.overall,
      review: reviewData.comment,
      categories: {
        communication: reviewData.communication,
        quality: reviewData.quality,
        timeliness: reviewData.timeliness,
        professionalism: reviewData.professionalism,
      },
      ratedBy: reviewerId,
      ratedAt: now,
    };
  }

  this.updateReviewStatus();
  return this.save();
}

export function updateReviewStatus(this: JobDocument) {
  const fixerReviewExists = this.completion.fixerRating && this.completion.fixerRating.ratedAt;
  const hirerReviewExists = this.completion.hirerRating && this.completion.hirerRating.ratedAt;

  if (fixerReviewExists && hirerReviewExists) {
    this.completion.reviewStatus = 'completed';

    if (!this.completion.messagingClosed) {
      this.completion.messagingClosed = true;
      this.completion.messagingClosedAt = new Date();
    }
  } else if (fixerReviewExists || hirerReviewExists) {
    this.completion.reviewStatus = 'partial';
  } else {
    this.completion.reviewStatus = 'pending';
  }
}

export function getReviewStatusForUI(this: JobDocument, userId: ObjectIdLike) {
  const isHirer = this.createdBy.toString() === userId.toString();
  const isFixer = this.assignedTo && this.assignedTo.toString() === userId.toString();

  if (!isHirer && !isFixer) {
    return { canReview: false, hasReviewed: false };
  }

  let hasReviewed = false;
  let otherPartyReviewed = false;

  if (isHirer) {
    hasReviewed = !!(this.completion.fixerRating && this.completion.fixerRating.ratedAt);
    otherPartyReviewed = !!(this.completion.hirerRating && this.completion.hirerRating.ratedAt);
  } else {
    hasReviewed = !!(this.completion.hirerRating && this.completion.hirerRating.ratedAt);
    otherPartyReviewed = !!(this.completion.fixerRating && this.completion.fixerRating.ratedAt);
  }

  return {
    canReview: this.status === 'completed' && !hasReviewed,
    hasReviewed,
    otherPartyReviewed,
    bothReviewsComplete: hasReviewed && otherPartyReviewed,
    messagingClosed: this.completion.messagingClosed,
  };
}
