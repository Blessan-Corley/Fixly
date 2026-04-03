import { MessageSquare } from 'lucide-react';

import type { ReviewFilters } from '../_lib/reviews.types';

type ReviewsEmptyStateProps = {
  filters: ReviewFilters;
};

export function ReviewsEmptyState({ filters }: ReviewsEmptyStateProps): React.JSX.Element {
  const hasActiveFilters =
    Boolean(filters.search) || filters.reviewType !== 'all' || filters.rating !== 'all';

  return (
    <div className="py-12 text-center">
      <MessageSquare className="mx-auto mb-4 h-12 w-12 text-fixly-text-light" />
      <h3 className="mb-2 text-lg font-medium text-fixly-text">No reviews found</h3>
      <p className="text-fixly-text-light">
        {hasActiveFilters
          ? 'Try adjusting your filters'
          : "This user hasn't received any reviews yet"}
      </p>
    </div>
  );
}
