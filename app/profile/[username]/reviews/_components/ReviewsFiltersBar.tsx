import { Search } from 'lucide-react';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/primitives/Select';

import type { ReviewFilters } from '../_lib/reviews.types';

type ReviewsFiltersBarProps = {
  filters: ReviewFilters;
  onSearchChange: (value: string) => void;
  onReviewTypeChange: (value: string) => void;
  onRatingChange: (value: string) => void;
  onSortByChange: (value: string) => void;
};

export function ReviewsFiltersBar({
  filters,
  onSearchChange,
  onReviewTypeChange,
  onRatingChange,
  onSortByChange,
}: ReviewsFiltersBarProps): React.JSX.Element {
  return (
    <div className="card mb-8">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 transform text-fixly-text-muted" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search reviews..."
            className="input-field pl-10"
          />
        </div>

        <Select
          value={filters.reviewType}
          onValueChange={onReviewTypeChange}
        >
          <SelectTrigger className="select-field" aria-label="Review type">
            <SelectValue placeholder="All Reviews" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Reviews</SelectItem>
            <SelectItem value="client_to_fixer">As Service Provider</SelectItem>
            <SelectItem value="fixer_to_client">As Client</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.rating}
          onValueChange={onRatingChange}
        >
          <SelectTrigger className="select-field" aria-label="Rating filter">
            <SelectValue placeholder="All Ratings" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Ratings</SelectItem>
            <SelectItem value="5">5 Stars</SelectItem>
            <SelectItem value="4">4+ Stars</SelectItem>
            <SelectItem value="3">3+ Stars</SelectItem>
            <SelectItem value="2">2+ Stars</SelectItem>
            <SelectItem value="1">1+ Stars</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.sortBy}
          onValueChange={onSortByChange}
        >
          <SelectTrigger className="select-field" aria-label="Sort reviews">
            <SelectValue placeholder="Most Recent" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="createdAt">Most Recent</SelectItem>
            <SelectItem value="rating.overall">Highest Rated</SelectItem>
            <SelectItem value="helpfulVotes.count">Most Helpful</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
