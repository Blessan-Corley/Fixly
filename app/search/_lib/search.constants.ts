import type { SearchFilters } from './search.types';

export const DEFAULT_FILTERS: SearchFilters = {
  budgetMin: '',
  budgetMax: '',
  budgetType: '',
  urgency: '',
  datePosted: '',
  sortBy: 'relevance',
};
