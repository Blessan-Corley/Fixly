'use client';

import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import {
  useMarkReviewHelpfulMutation,
  useUserReviewsQuery,
} from '@/hooks/query/reviews';

import { LoadMoreReviewsButton } from './_components/LoadMoreReviewsButton';
import { RatingOverviewSidebar } from './_components/RatingOverviewSidebar';
import { ReviewCard } from './_components/ReviewCard';
import { ReviewsEmptyState } from './_components/ReviewsEmptyState';
import { ReviewsFiltersBar } from './_components/ReviewsFiltersBar';
import { ReviewsLoadingState } from './_components/ReviewsLoadingState';
import { ReviewsUserNotFoundState } from './_components/ReviewsUserNotFoundState';
import { UserReviewsHeader } from './_components/UserReviewsHeader';
import { DEFAULT_PAGINATION, DEFAULT_REVIEW_FILTERS } from './_lib/reviews.constants';
import type {
  HelpfulVotePayload,
  PaginationState,
  ProfileApiPayload,
  ProfileUser,
  RatingStats,
  ReviewFilters,
  ReviewItem,
  ReviewsApiPayload,
  RouteParams,
} from './_lib/reviews.types';
import {
  isAbortError,
  toRatingFilter,
  toReviewTypeFilter,
  toSortByFilter,
} from './_lib/reviews.utils';

export default function UserReviewsPage(): React.JSX.Element {
  const params = useParams<RouteParams>();
  const usernameParam = params?.username;
  const username = Array.isArray(usernameParam) ? usernameParam[0] : (usernameParam ?? '');
  const router = useRouter();
  const { data: session } = useSession();
  const sessionUserId = session?.user?.id ?? '';

  const [user, setUser] = useState<ProfileUser | null>(null);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [ratingStats, setRatingStats] = useState<RatingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<ReviewFilters>(DEFAULT_REVIEW_FILTERS);
  const [pagination, setPagination] = useState<PaginationState>(DEFAULT_PAGINATION);
  const { data: reviewsResponse, isLoading: reviewsLoading, isFetching: reviewsFetching } =
    useUserReviewsQuery(
      username,
      {
        page: pagination.currentPage,
        limit: 10,
        sortBy: filters.sortBy,
        reviewType: filters.reviewType !== 'all' ? filters.reviewType : undefined,
        minRating: filters.rating !== 'all' ? filters.rating : undefined,
        search: filters.search || undefined,
      },
      {
        enabled: Boolean(username),
      }
    );
  const { mutateAsync: markHelpful } = useMarkReviewHelpfulMutation();
  const loadingMore = reviewsFetching && pagination.currentPage > 1;
  useEffect(() => {
    setLoading(reviewsLoading);
    const response = (reviewsResponse ?? {}) as ProfileApiPayload & ReviewsApiPayload;
    if (!response.success) {
      return;
    }
    if (response.user) {
      setUser(response.user);
    }
    if (Array.isArray(response.reviews)) {
      const nextReviews = response.reviews as ReviewItem[];
      if (pagination.currentPage === 1) {
        setReviews(nextReviews);
      } else {
        setReviews((previousReviews) => [...previousReviews, ...nextReviews]);
      }
    }
    setRatingStats(response.ratingStats ?? null);
    if (response.pagination) {
      setPagination(response.pagination);
    }
  }, [pagination.currentPage, reviewsLoading, reviewsResponse]);

  useEffect(() => {
    setPagination(DEFAULT_PAGINATION);
  }, [filters.rating, filters.reviewType, filters.search, filters.sortBy]);

  const loadMore = (): void => {
    if (pagination.hasMore && !loadingMore) {
      setPagination((prev) => ({ ...prev, currentPage: prev.currentPage + 1 }));
    }
  };

  const toggleHelpfulVote = async (reviewId: string): Promise<void> => {
    if (!sessionUserId) {
      toast.error('Please login to vote');
      return;
    }

    try {
      const data = (await markHelpful({ reviewId })) as HelpfulVotePayload;

      if (!data.success) {
        toast.error(data.message ?? 'Failed to update vote');
        return;
      }

      setReviews((previousReviews) =>
        previousReviews.map((review) =>
          review._id === reviewId
            ? {
                ...review,
                helpfulVotes: {
                  ...review.helpfulVotes,
                  count:
                    typeof data.helpfulCount === 'number'
                      ? data.helpfulCount
                      : review.helpfulVotes.count,
                  users:
                    data.action === 'added'
                      ? [...review.helpfulVotes.users, sessionUserId]
                      : review.helpfulVotes.users.filter((id) => id !== sessionUserId),
                },
              }
            : review
        )
      );
    } catch (error: unknown) {
      if (isAbortError(error)) {
        return;
      }

      console.error('Error toggling helpful vote:', error);
      toast.error('Failed to update vote');
    }
  };

  const updateSearchFilter = (search: string): void => {
    setFilters((previousFilters) => ({ ...previousFilters, search }));
  };

  const updateReviewTypeFilter = (value: string): void => {
    setFilters((previousFilters) => ({
      ...previousFilters,
      reviewType: toReviewTypeFilter(value),
    }));
  };

  const updateRatingFilter = (value: string): void => {
    setFilters((previousFilters) => ({ ...previousFilters, rating: toRatingFilter(value) }));
  };

  const updateSortByFilter = (value: string): void => {
    setFilters((previousFilters) => ({ ...previousFilters, sortBy: toSortByFilter(value) }));
  };

  if (loading) {
    return <ReviewsLoadingState />;
  }

  if (!user) {
    return <ReviewsUserNotFoundState />;
  }

  return (
    <div className="min-h-screen bg-fixly-bg py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <UserReviewsHeader user={user} ratingStats={ratingStats} onBack={() => router.back()} />

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <RatingOverviewSidebar ratingStats={ratingStats} />
          </div>

          <div className="lg:col-span-3">
            <ReviewsFiltersBar
              filters={filters}
              onSearchChange={updateSearchFilter}
              onReviewTypeChange={updateReviewTypeFilter}
              onRatingChange={updateRatingFilter}
              onSortByChange={updateSortByFilter}
            />

            <div className="space-y-6">
              {reviews.length === 0 ? (
                <ReviewsEmptyState filters={filters} />
              ) : (
                reviews.map((review, index) => (
                  <ReviewCard
                    key={review._id}
                    review={review}
                    index={index}
                    revieweeName={user.name}
                    sessionUserId={sessionUserId}
                    onToggleHelpfulVote={(targetReviewId) => {
                      void toggleHelpfulVote(targetReviewId);
                    }}
                  />
                ))
              )}
            </div>

            {pagination.hasMore && (
              <LoadMoreReviewsButton loadingMore={loadingMore} onClick={loadMore} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
