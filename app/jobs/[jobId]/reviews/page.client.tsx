'use client';

import { ArrowLeft, Star, ThumbsUp } from 'lucide-react';
import Link from 'next/link';

import SmartAvatar from '@/components/ui/SmartAvatar';
import { useJobReviews } from '@/lib/queries/jobs';

type JobReviewsPageClientProps = {
  jobId: string;
  jobTitle: string;
};

type ReviewRecord = {
  _id: string;
  title?: string;
  comment?: string;
  createdAt?: string;
  reviewType?: string;
  wouldRecommend?: boolean;
  rating?: {
    overall?: number;
  };
  helpfulVotes?: {
    count?: number;
  };
  reviewer?: {
    _id?: string;
    name?: string;
    username?: string;
    photoURL?: string | null;
    profilePhoto?: {
      url?: string | null;
    } | null;
  };
};

type ReviewsResponse = {
  success?: boolean;
  data?: ReviewRecord[];
};

function formatReviewDate(value: string | undefined): string {
  if (!value) return 'Recently';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently';

  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function JobReviewsPageClient({
  jobId,
  jobTitle,
}: JobReviewsPageClientProps): React.JSX.Element {
  const { data, isLoading, isError } = useJobReviews(jobId, Boolean(jobId));

  const response = (data ?? {}) as ReviewsResponse;
  const reviews = Array.isArray(response.data) ? response.data : [];
  const totalReviews = reviews.length;
  const averageRating =
    totalReviews > 0
      ? reviews.reduce((total, review) => total + Number(review.rating?.overall ?? 0), 0) /
        totalReviews
      : 0;

  return (
    <div className="min-h-screen bg-fixly-bg py-10">
      <div className="mx-auto max-w-5xl px-4">
        <div className="mb-6">
          <Link
            href={`/jobs/${jobId}`}
            className="inline-flex items-center text-sm font-medium text-fixly-accent hover:text-fixly-accent/80"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to job
          </Link>
        </div>

        <div className="rounded-3xl border border-fixly-border bg-fixly-card p-8 shadow-sm">
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-wide text-fixly-text-muted">
                Job Reviews
              </p>
              <h1 className="mt-2 text-3xl font-bold text-fixly-text">{jobTitle}</h1>
            </div>

            <div className="rounded-2xl bg-fixly-bg px-5 py-4">
              <p className="text-sm text-fixly-text-muted">Average Rating</p>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-2xl font-semibold text-fixly-text">
                  {averageRating.toFixed(1)}
                </span>
                <span className="text-sm text-fixly-text-muted">from {totalReviews} reviews</span>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={`job-review-skeleton-${index}`}
                  className="animate-pulse rounded-2xl border border-fixly-border p-5"
                >
                  <div className="h-5 w-1/3 rounded bg-gray-200" />
                  <div className="mt-4 h-4 w-full rounded bg-gray-100" />
                  <div className="mt-2 h-4 w-4/5 rounded bg-gray-100" />
                </div>
              ))}
            </div>
          ) : isError ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-red-700">
              Failed to load reviews for this job.
            </div>
          ) : reviews.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-fixly-border px-6 py-12 text-center">
              <Star className="mx-auto h-10 w-10 text-fixly-text-muted" />
              <h2 className="mt-4 text-xl font-semibold text-fixly-text">No reviews yet</h2>
              <p className="mt-2 text-fixly-text-muted">
                Reviews will appear here once both job participants start leaving feedback.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {reviews.map((review) => {
                const rating = Number(review.rating?.overall ?? 0);
                const helpfulVotes = Number(review.helpfulVotes?.count ?? 0);
                const reviewerName = review.reviewer?.name || review.reviewer?.username || 'User';

                return (
                  <div
                    key={review._id}
                    className="rounded-2xl border border-fixly-border bg-white p-6"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div className="flex items-start gap-4">
                        <SmartAvatar
                          user={{
                            id: review.reviewer?._id,
                            name: review.reviewer?.name,
                            username: review.reviewer?.username,
                            photoURL: review.reviewer?.photoURL,
                            profilePhoto: review.reviewer?.profilePhoto,
                          }}
                          size="lg"
                          alt={`${reviewerName} profile photo`}
                        />
                        <div>
                          <h2 className="text-lg font-semibold text-fixly-text">
                            {review.title || 'Job Review'}
                          </h2>
                          <p className="text-sm text-fixly-text-muted">
                            {reviewerName} • {formatReviewDate(review.createdAt)}
                          </p>
                          <p className="mt-1 text-xs uppercase tracking-wide text-fixly-text-muted">
                            {review.reviewType === 'client_to_fixer' ? 'Client review' : 'Fixer review'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, index) => (
                          <Star
                            key={`${review._id}-star-${index}`}
                            className={`h-4 w-4 ${
                              index < Math.round(rating)
                                ? 'fill-current text-yellow-500'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                        <span className="ml-2 text-sm font-medium text-fixly-text">
                          {rating.toFixed(1)}
                        </span>
                      </div>
                    </div>

                    <p className="mt-4 leading-7 text-fixly-text-muted">{review.comment}</p>

                    <div className="mt-4 flex items-center justify-between text-sm text-fixly-text-muted">
                      <span>{review.wouldRecommend ? 'Recommended' : 'Not recommended'}</span>
                      <span className="inline-flex items-center gap-1">
                        <ThumbsUp className="h-4 w-4" />
                        {helpfulVotes} helpful
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
