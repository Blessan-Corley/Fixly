import type { EarningsHistoryPoint, EarningsState, RecentJob } from './earnings.types';

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function asNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

export function calculateGrowth(current: number, previous: number): number {
  if (!previous) return 0;
  return Math.round(((current - previous) / previous) * 100);
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
  }).format(amount);
}

export function getUserRatingAverage(value: unknown): number {
  if (!isRecord(value) || !isRecord(value.rating)) {
    return 0;
  }
  return asNumber(value.rating.average, 0);
}

export function getUserPlanType(value: unknown): string {
  if (!isRecord(value) || !isRecord(value.plan)) {
    return '';
  }
  return asString(value.plan.type, '');
}

export function toRecentJob(value: unknown): RecentJob | null {
  if (!isRecord(value)) {
    return null;
  }

  // New /api/user/earnings?details=1 shape
  if ('amount' in value || 'counterpartName' in value || 'completedAt' in value) {
    return {
      _id: asString(value._id, ''),
      title: asString(value.title, 'Untitled Job'),
      status: asString(value.status, 'Unknown'),
      budget: { amount: asNumber(value.amount, 0) },
      createdBy: { name: asString(value.counterpartName, 'Unknown') },
      location: { city: asString(value.counterpartCity, 'Unknown') },
      progress: { completedAt: asString(value.completedAt, new Date().toISOString()) },
      completion: { rating: undefined },
    };
  }

  // Legacy recent-job shape
  const budget = isRecord(value.budget) ? value.budget : {};
  const createdBy = isRecord(value.createdBy) ? value.createdBy : {};
  const location = isRecord(value.location) ? value.location : {};
  const progress = isRecord(value.progress) ? value.progress : {};
  const completion = isRecord(value.completion) ? value.completion : {};

  return {
    _id: asString(value._id, ''),
    title: asString(value.title, 'Untitled Job'),
    status: asString(value.status, 'Unknown'),
    budget: { amount: asNumber(budget.amount, 0) },
    createdBy: { name: asString(createdBy.name, 'Unknown Client') },
    location: { city: asString(location.city, 'Unknown City') },
    progress: { completedAt: asString(progress.completedAt, new Date().toISOString()) },
    completion: {
      rating: typeof completion.rating === 'number' ? completion.rating : undefined,
    },
  };
}

export function toHistoryPoint(value: unknown): EarningsHistoryPoint | null {
  if (!isRecord(value)) {
    return null;
  }

  const month = asString(value.month, '');
  if (!month) {
    return null;
  }

  return {
    month,
    earnings: asNumber(value.earnings, 0),
    jobs: asNumber(value.jobs, 0),
  };
}

export function parseEarningsHistory(value: unknown): EarningsHistoryPoint[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => toHistoryPoint(item))
    .filter((item): item is EarningsHistoryPoint => item !== null);
}

export function parseEarningsState(payload: Record<string, unknown>): EarningsState {
  const earningsData = isRecord(payload.earnings) ? payload.earnings : {};
  const totalEarnings = asNumber(earningsData.total, 0);
  const monthlyEarnings = asNumber(earningsData.thisMonth, 0);
  const lastMonthEarnings = asNumber(earningsData.lastMonth, 0);
  const weeklyEarnings = asNumber(earningsData.thisWeek, 0);
  const jobsCompleted = asNumber(earningsData.completedJobs, 0);
  const averageJobValue = asNumber(
    earningsData.averageJobValue,
    jobsCompleted > 0 ? Math.round(totalEarnings / jobsCompleted) : 0
  );
  const growth = isRecord(earningsData.growth) ? earningsData.growth : {};

  return {
    total: totalEarnings,
    thisMonth: monthlyEarnings,
    lastMonth: lastMonthEarnings,
    thisWeek: weeklyEarnings,
    pendingPayments: 0,
    completedJobs: jobsCompleted,
    averageJobValue,
    topJobCategory: 'General',
    growth: {
      monthly: asNumber(growth.monthly, calculateGrowth(monthlyEarnings, lastMonthEarnings)),
      weekly: asNumber(growth.weekly, 0),
    },
  };
}
