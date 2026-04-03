'use client';

import { motion } from 'framer-motion';
import { Award, Edit, Loader, MessageSquare, Reply, Star, ThumbsUp, User } from 'lucide-react';
import Image from 'next/image';

import { formatDate } from '../_lib/jobDetails.formatters';
import type { ReviewItem } from '../_lib/jobDetails.types';

type JobReviewsCardProps = {
  reviews: ReviewItem[];
  loadingReviews: boolean;
  canWriteReview: boolean;
  hasUserReview: boolean;
  onWriteReview: () => void;
  onViewAllReviews: () => void;
};

export function JobReviewsCard({
  reviews,
  loadingReviews,
  canWriteReview,
  hasUserReview,
  onWriteReview,
  onViewAllReviews,
}: JobReviewsCardProps): React.JSX.Element {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="card"
    >
      <div className="mb-6 flex items-center justify-between">
        <h2 className="flex items-center text-xl font-bold text-fixly-text">
          <Star className="mr-2 h-5 w-5" />
          Reviews ({reviews.length})
        </h2>

        {canWriteReview && (
          <div className="flex space-x-2">
            {!hasUserReview && (
              <button
                type="button"
                onClick={onWriteReview}
                className="btn-secondary flex items-center"
              >
                <Edit className="mr-2 h-4 w-4" />
                Write Review
              </button>
            )}
            <button
              type="button"
              onClick={onViewAllReviews}
              className="btn-ghost flex items-center"
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              View All
            </button>
          </div>
        )}
      </div>

      {loadingReviews ? (
        <div className="py-8 text-center">
          <Loader className="mx-auto h-8 w-8 animate-spin text-fixly-accent" />
        </div>
      ) : reviews.length === 0 ? (
        <div className="py-8 text-center">
          <Star className="mx-auto mb-4 h-12 w-12 text-fixly-text-light" />
          <h3 className="mb-2 text-lg font-medium text-fixly-text">No reviews yet</h3>
          <p className="text-fixly-text-light">
            Reviews will appear here once this job is completed and reviewed.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.slice(0, 2).map((review) => (
            <div key={review._id} className="rounded-lg border border-fixly-border p-4">
              <div className="mb-3 flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-fixly-accent-light">
                    {review.reviewer.photoURL ? (
                      <Image
                        src={review.reviewer.photoURL}
                        alt={`${review.reviewer.name} profile photo`}
                        width={40}
                        height={40}
                        unoptimized
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      <User className="h-5 w-5 text-fixly-accent" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-semibold text-fixly-text">{review.reviewer.name}</h4>
                    <p className="text-sm text-fixly-text-light">
                      {review.reviewType === 'client_to_fixer' ? 'Client' : 'Service Provider'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Star
                      key={`${review._id}-star-${index}`}
                      className={`h-4 w-4 ${
                        index < Math.floor(review.ratingOverall)
                          ? 'fill-current text-yellow-500'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                  <span className="ml-2 text-sm font-medium text-fixly-text">
                    {review.ratingOverall}/5
                  </span>
                </div>
              </div>

              <h5 className="mb-2 font-medium text-fixly-text">{review.title}</h5>
              <p className="mb-3 line-clamp-3 text-sm text-fixly-text-light">{review.comment}</p>

              {review.tags.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-1">
                  {review.tags.slice(0, 3).map((tag) => (
                    <span
                      key={`${review._id}-${tag}`}
                      className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600"
                    >
                      {tag.replace(/_/g, ' ')}
                    </span>
                  ))}
                  {review.tags.length > 3 && (
                    <span className="text-xs text-fixly-text-light">
                      +{review.tags.length - 3} more
                    </span>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between text-sm text-fixly-text-light">
                <span>{formatDate(review.createdAt)}</span>
                <div className="flex items-center space-x-3">
                  <div className="flex items-center">
                    <ThumbsUp className="mr-1 h-3 w-3" />
                    <span>Helpful ({review.helpfulVotesCount})</span>
                  </div>
                  {review.wouldRecommend && (
                    <div className="flex items-center text-green-600">
                      <Award className="mr-1 h-3 w-3" />
                      <span>Recommended</span>
                    </div>
                  )}
                </div>
              </div>

              {review.response?.comment && (
                <div className="mt-3 rounded border-l-4 border-blue-400 bg-blue-50 p-3">
                  <div className="mb-1 flex items-center">
                    <Reply className="mr-1 h-3 w-3 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">Response</span>
                  </div>
                  <p className="text-sm text-blue-700">{review.response.comment}</p>
                </div>
              )}
            </div>
          ))}

          {reviews.length > 2 && (
            <div className="text-center">
              <button type="button" onClick={onViewAllReviews} className="btn-ghost text-sm">
                View all {reviews.length} reviews
              </button>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
