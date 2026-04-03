'use client';

import { Star } from 'lucide-react';
import Link from 'next/link';

import type { UserReviewRecord } from './_lib/publicProfile.types';

type PublicProfileReviewsProps = {
  reviews: UserReviewRecord[];
  username: string | undefined;
};

export default function PublicProfileReviews({
  reviews,
  username,
}: PublicProfileReviewsProps): React.JSX.Element | null {
  if (reviews.length === 0) return null;

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-fixly-text">Recent Reviews</h2>
        <Link
          href={`/profile/${username}/reviews`}
          className="text-sm font-medium text-fixly-accent hover:text-fixly-accent/80"
        >
          View all
        </Link>
      </div>
      <div className="mt-4 space-y-4">
        {reviews.map((review) => (
          <div
            key={review._id}
            className="rounded-2xl border border-fixly-border bg-white p-5"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-medium text-fixly-text">
                  {review.reviewer?.name ?? review.reviewer?.username ?? 'Reviewer'}
                </p>
                <p className="text-sm text-fixly-text-muted">
                  {review.createdAt
                    ? new Date(review.createdAt).toLocaleDateString('en-IN')
                    : 'Recently'}
                </p>
              </div>
              <div className="flex items-center gap-1 text-yellow-500">
                <Star className="h-4 w-4 fill-current" />
                <span className="text-sm font-medium text-fixly-text">
                  {typeof review.rating?.overall === 'number'
                    ? review.rating.overall.toFixed(1)
                    : '5.0'}
                </span>
              </div>
            </div>
            {review.title ? (
              <h3 className="mt-4 text-base font-semibold text-fixly-text">{review.title}</h3>
            ) : null}
            {review.comment ? (
              <p className="mt-2 leading-7 text-fixly-text-muted">{review.comment}</p>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
