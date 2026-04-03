'use client';

import { motion } from 'framer-motion';
import { CheckCircle, Flag, Reply, Star, ThumbsDown, ThumbsUp, User } from 'lucide-react';
import Image from 'next/image';

import type { ReviewItem } from '../_lib/reviews.types';
import { formatDate, getTagColor } from '../_lib/reviews.utils';

type ReviewCardProps = {
  review: ReviewItem;
  index: number;
  revieweeName: string;
  sessionUserId: string;
  onToggleHelpfulVote: (reviewId: string) => void;
};

export function ReviewCard({
  review,
  index,
  revieweeName,
  sessionUserId,
  onToggleHelpfulVote,
}: ReviewCardProps): React.JSX.Element {
  const hasVotedHelpful =
    Boolean(sessionUserId) && review.helpfulVotes.users.includes(sessionUserId);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="card"
    >
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-start space-x-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-fixly-accent-light">
            {review.reviewer.photoURL ? (
              <Image
                src={review.reviewer.photoURL}
                alt={review.reviewer.name}
                width={48}
                height={48}
                className="h-12 w-12 rounded-full object-cover"
              />
            ) : (
              <User className="h-6 w-6 text-fixly-accent" />
            )}
          </div>

          <div className="flex-1">
            <div className="mb-1 flex items-center space-x-2">
              <h4 className="font-semibold text-fixly-text">{review.reviewer.name}</h4>
              <span className="text-sm text-fixly-text-light">@{review.reviewer.username}</span>
              <span
                className={`rounded-full px-2 py-1 text-xs ${
                  review.reviewType === 'client_to_fixer'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-fixly-accent/20 text-fixly-primary'
                }`}
              >
                {review.reviewType === 'client_to_fixer'
                  ? 'Client Review'
                  : 'Service Provider Review'}
              </span>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                {Array.from({ length: 5 }).map((_, starIndex) => (
                  <Star
                    key={starIndex}
                    className={`h-4 w-4 ${
                      starIndex < Math.floor(review.rating.overall)
                        ? 'fill-current text-yellow-500'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
                <span className="ml-2 text-sm font-medium text-fixly-text">
                  {review.rating.overall}/5
                </span>
              </div>

              <span className="text-sm text-fixly-text-light">{formatDate(review.createdAt)}</span>
            </div>
          </div>
        </div>
      </div>

      {review.job && (
        <div className="mb-4 rounded-lg bg-fixly-bg p-3">
          <p className="text-sm text-fixly-text-light">
            Job: <span className="font-medium text-fixly-text">{review.job.title}</span>
          </p>
        </div>
      )}

      <div className="mb-4">
        <h5 className="mb-2 font-semibold text-fixly-text">{review.title}</h5>
        <p className="leading-relaxed text-fixly-text-light">{review.comment}</p>
      </div>

      {(review.pros.length > 0 || review.cons.length > 0) && (
        <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          {review.pros.length > 0 && (
            <div>
              <h6 className="mb-2 flex items-center text-sm font-medium text-green-600">
                <ThumbsUp className="mr-1 h-4 w-4" />
                Pros
              </h6>
              <ul className="space-y-1">
                {review.pros.map((pro) => (
                  <li key={`pro-${review._id}-${pro}`} className="text-sm text-fixly-text-light">
                    • {pro}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {review.cons.length > 0 && (
            <div>
              <h6 className="mb-2 flex items-center text-sm font-medium text-red-600">
                <ThumbsDown className="mr-1 h-4 w-4" />
                Cons
              </h6>
              <ul className="space-y-1">
                {review.cons.map((con) => (
                  <li key={`con-${review._id}-${con}`} className="text-sm text-fixly-text-light">
                    • {con}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {review.tags.length > 0 && (
        <div className="mb-4">
          <div className="flex flex-wrap gap-2">
            {review.tags.map((tag) => (
              <span
                key={tag}
                className={`rounded-full border px-2 py-1 text-xs ${getTagColor(tag)}`}
              >
                {tag.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        </div>
      )}

      {review.response?.comment && (
        <div className="mb-4 rounded-lg border-l-4 border-blue-400 bg-blue-50 p-4">
          <div className="mb-2 flex items-center">
            <Reply className="mr-2 h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-800">Response from {revieweeName}</span>
            <span className="ml-2 text-sm text-blue-600">
              {formatDate(review.response.respondedAt)}
            </span>
          </div>
          <p className="text-sm text-blue-700">{review.response.comment}</p>
        </div>
      )}

      <div className="flex items-center justify-between border-t border-fixly-border pt-4">
        <div className="flex items-center space-x-4">
          <button
            type="button"
            onClick={() => onToggleHelpfulVote(review._id)}
            className={`flex items-center space-x-1 text-sm transition-colors ${
              hasVotedHelpful
                ? 'text-fixly-accent'
                : 'text-fixly-text-light hover:text-fixly-accent'
            }`}
          >
            <ThumbsUp className="h-4 w-4" />
            <span>Helpful ({review.helpfulVotes.count})</span>
          </button>

          {review.wouldRecommend && (
            <div className="flex items-center space-x-1 text-sm text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span>Recommended</span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {sessionUserId && sessionUserId !== review.reviewer._id && (
            <button
              type="button"
              className="text-fixly-text-light transition-colors hover:text-red-500"
              aria-label="Report review"
            >
              <Flag className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
