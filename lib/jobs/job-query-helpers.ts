import type { SortOrder } from 'mongoose';

import type { JobFilters, JobUserRole } from '../../types/jobs/query';

export const JOB_CARD_POPULATE_FIELDS = 'name username profilePhoto picture rating location';

export function escapeRegexLiteral(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function buildOpenJobsFiltersQuery(filters: JobFilters = {}): Record<string, unknown> {
  const query: Record<string, unknown> = { status: 'open' };

  if (filters.city) {
    query['location.city'] = new RegExp(escapeRegexLiteral(filters.city), 'i');
  }

  if (filters.state) {
    query['location.state'] = new RegExp(escapeRegexLiteral(filters.state), 'i');
  }

  if (filters.skills && filters.skills.length > 0) {
    query.skillsRequired = { $in: filters.skills.map((skill) => skill.toLowerCase()) };
  }

  if (filters.budget) {
    const budgetAmount: { $gte?: number; $lte?: number } = {};
    if (typeof filters.budget.min === 'number') {
      budgetAmount.$gte = filters.budget.min;
    }
    if (typeof filters.budget.max === 'number') {
      budgetAmount.$lte = filters.budget.max;
    }
    if (Object.keys(budgetAmount).length > 0) {
      query['budget.amount'] = budgetAmount;
    }
  }

  if (filters.urgency) {
    query.urgency = filters.urgency;
  }

  if (filters.type) {
    query.type = filters.type;
  }

  if (filters.experienceLevel) {
    query.experienceLevel = filters.experienceLevel;
  }

  if (filters.budgetType) {
    query['budget.type'] = filters.budgetType;
  }

  return query;
}

export function buildJobsSort(filters: JobFilters = {}): Record<string, SortOrder> {
  const sort: Record<string, SortOrder> = {};

  if (filters.sortBy) {
    switch (filters.sortBy) {
      case 'newest':
        sort.createdAt = -1;
        break;
      case 'deadline':
        sort.deadline = 1;
        break;
      case 'budget_high':
        sort['budget.amount'] = -1;
        break;
      case 'budget_low':
        sort['budget.amount'] = 1;
        break;
      case 'popular':
        sort['views.count'] = -1;
        break;
      default:
        sort.createdAt = -1;
        break;
    }
  } else {
    sort.featured = -1;
    sort.createdAt = -1;
  }

  return sort;
}

export function buildUrgentJobsQuery(now: Date = new Date()): Record<string, unknown> {
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  return {
    status: 'open',
    deadline: { $gte: now, $lte: tomorrow },
  };
}

export function buildJobsByUserQuery(
  userId: unknown,
  role: JobUserRole = 'created'
): Record<string, unknown> {
  return role === 'created' ? { createdBy: userId } : { assignedTo: userId };
}
