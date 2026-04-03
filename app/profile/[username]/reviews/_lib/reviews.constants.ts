import type { PaginationState, ReviewFilters } from './reviews.types';

export const DEFAULT_REVIEW_FILTERS: ReviewFilters = {
  reviewType: 'all',
  rating: 'all',
  sortBy: 'createdAt',
  search: '',
};

export const DEFAULT_PAGINATION: PaginationState = {
  currentPage: 1,
  totalPages: 1,
  hasMore: false,
};
