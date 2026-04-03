import type { UserLocation } from '../../../utils/locationUtils';
import { filterJobsByRadius, sortJobsByDistance } from '../../../utils/locationUtils';

import type { BrowseFilters, BrowseJob, PaginationState } from './browse-jobs.types';
import { isRecord } from './browse-jobs.utils';

export function applyDeadlineFilter(jobs: BrowseJob[], filters: BrowseFilters): BrowseJob[] {
  if (!filters.deadlineFilter) return jobs;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);
  const nextMonth = new Date(today);
  nextMonth.setMonth(nextMonth.getMonth() + 1);

  return jobs.filter((job) => {
    const jobDeadline = new Date(job.deadline ?? '');
    if (Number.isNaN(jobDeadline.getTime())) return false;

    switch (filters.deadlineFilter) {
      case 'today':
        return jobDeadline >= today && jobDeadline < tomorrow;
      case 'tomorrow': {
        const dayAfterTomorrow = new Date(tomorrow);
        dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);
        return jobDeadline >= tomorrow && jobDeadline < dayAfterTomorrow;
      }
      case 'week':
        return jobDeadline >= today && jobDeadline <= nextWeek;
      case 'month':
        return jobDeadline >= today && jobDeadline <= nextMonth;
      case 'custom':
        if (filters.customDeadlineStart && filters.customDeadlineEnd) {
          const startDate = new Date(filters.customDeadlineStart);
          const endDate = new Date(filters.customDeadlineEnd);
          if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return true;
          return jobDeadline >= startDate && jobDeadline <= endDate;
        }
        return true;
      default:
        return true;
    }
  });
}

export function applyFiltersToJobs(
  rawJobs: BrowseJob[],
  filters: BrowseFilters,
  userLocation: UserLocation | null,
  locationEnabled: boolean
): BrowseJob[] {
  let result = rawJobs;

  if (userLocation && locationEnabled) {
    if (filters.maxDistance) {
      result = filterJobsByRadius(result, userLocation.lat, userLocation.lng, filters.maxDistance);
    }
    if (filters.sortBy === 'distance') {
      result = sortJobsByDistance(result, userLocation.lat, userLocation.lng);
    }
  }

  return applyDeadlineFilter(result, filters);
}

export function buildBrowseQueryFilters(
  filters: BrowseFilters
): Record<string, string | number> {
  const payload: Record<string, string | number> = {
    limit: 12,
    sortBy: filters.sortBy,
  };
  if (filters.search.trim()) payload.search = filters.search.trim();
  if (filters.location.trim()) payload.location = filters.location.trim();
  if (filters.urgency) payload.urgency = filters.urgency;
  if (filters.skills.length > 0) payload.skills = filters.skills.join(',');
  if (filters.budgetMin !== '') payload.budgetMin = filters.budgetMin;
  if (filters.budgetMax !== '') payload.budgetMax = filters.budgetMax;
  return payload;
}

export function buildPaginationState(
  data: unknown,
  hasNextPage: boolean | undefined,
  fallbackCount: number
): PaginationState {
  const pages = Array.isArray((data as { pages?: unknown })?.pages)
    ? (data as { pages: unknown[] }).pages
    : [];
  const lastPage = pages.length > 0 ? pages[pages.length - 1] : null;
  const paginationRecord =
    isRecord(lastPage) && isRecord(lastPage.pagination) ? lastPage.pagination : null;

  return {
    page: paginationRecord && typeof paginationRecord.page === 'number' ? paginationRecord.page : 1,
    hasMore: hasNextPage === true,
    total:
      paginationRecord && typeof paginationRecord.total === 'number'
        ? paginationRecord.total
        : fallbackCount,
  };
}
