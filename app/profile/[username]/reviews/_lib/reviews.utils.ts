import type { ReviewFilters } from './reviews.types';

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

export function formatDate(date: string | undefined): string {
  if (!date) {
    return 'Unknown date';
  }

  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function getTagColor(tag: string): string {
  const positiveClass = 'bg-green-100 text-green-800 border-green-200';
  const negativeClass = 'bg-red-100 text-red-800 border-red-200';

  const positiveTags = [
    'excellent_work',
    'on_time',
    'great_communication',
    'professional',
    'exceeded_expectations',
    'fair_price',
    'clean_work',
    'polite',
    'experienced',
    'reliable',
    'creative',
    'efficient',
  ];

  return positiveTags.includes(tag) ? positiveClass : negativeClass;
}

export function formatRatingValue(value: unknown): string {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value.toFixed(1);
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed.toFixed(1);
    }
  }

  return 'N/A';
}

export function toReviewTypeFilter(value: string): ReviewFilters['reviewType'] {
  if (value === 'client_to_fixer' || value === 'fixer_to_client') {
    return value;
  }

  return 'all';
}

export function toRatingFilter(value: string): ReviewFilters['rating'] {
  if (value === '1' || value === '2' || value === '3' || value === '4' || value === '5') {
    return value;
  }

  return 'all';
}

export function toSortByFilter(value: string): ReviewFilters['sortBy'] {
  if (value === 'rating.overall' || value === 'helpfulVotes.count') {
    return value;
  }

  return 'createdAt';
}
