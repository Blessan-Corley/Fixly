import type {
  DashboardStats,
  DashboardUser,
  RecentJob,
  JobStatus,
} from './dashboard.types';

export { getQuickActions, getNextSteps } from './dashboard.navigation';

export const DEFAULT_STATS: DashboardStats = {
  totalJobs: 0,
  completedJobs: 0,
  activeJobs: 0,
  totalSpent: 0,
  totalApplications: 0,
  totalUsers: 0,
  activeUsers: 0,
  revenue: 0,
};

export const NUMBER_FORMATTER = new Intl.NumberFormat('en-IN');

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function toFiniteNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return 0;
}

export function toStringValue(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

export function asStatus(value: unknown): JobStatus {
  if (
    value === 'open' ||
    value === 'in_progress' ||
    value === 'completed' ||
    value === 'cancelled' ||
    value === 'draft'
  ) {
    return value;
  }

  return 'open';
}

export function formatCurrency(value: number): string {
  return `INR ${NUMBER_FORMATTER.format(Math.max(0, value))}`;
}

export function getCreditsUsed(user: DashboardUser | null): number {
  return toFiniteNumber(user?.plan?.creditsUsed);
}

export function getJobsPosted(user: DashboardUser | null): number {
  return toFiniteNumber(user?.jobsPosted);
}

export function getJobsCompleted(user: DashboardUser | null): number {
  return toFiniteNumber(user?.jobsCompleted);
}

export function getTotalEarnings(user: DashboardUser | null): number {
  return toFiniteNumber(user?.totalEarnings);
}

export function parseDashboardStats(payload: unknown): DashboardStats {
  if (!isRecord(payload)) {
    return DEFAULT_STATS;
  }

  const users = isRecord(payload.users) ? payload.users : null;
  const revenue = isRecord(payload.revenue) ? payload.revenue : null;

  return {
    totalJobs: toFiniteNumber(payload.totalJobs),
    completedJobs: toFiniteNumber(payload.completedJobs),
    activeJobs: toFiniteNumber(payload.activeJobs),
    totalSpent: toFiniteNumber(payload.totalSpent),
    totalApplications: toFiniteNumber(payload.totalApplications),
    totalUsers: users ? toFiniteNumber(users.total) : toFiniteNumber(payload.totalUsers),
    activeUsers: users ? toFiniteNumber(users.active) : toFiniteNumber(payload.activeUsers),
    revenue: revenue ? toFiniteNumber(revenue.total) : toFiniteNumber(payload.revenue),
  };
}

export function parseRecentJobs(payload: unknown): RecentJob[] {
  if (!isRecord(payload) || !Array.isArray(payload.jobs)) {
    return [];
  }

  return payload.jobs
    .map((job): RecentJob | null => {
      if (!isRecord(job)) {
        return null;
      }

      const location = isRecord(job.location) ? job.location : null;
      const budget = isRecord(job.budget) ? job.budget : null;

      return {
        _id: String(job._id ?? ''),
        title: toStringValue(job.title, 'Untitled Job'),
        description: toStringValue(job.description),
        createdAt: toStringValue(job.createdAt, new Date().toISOString()),
        status: asStatus(job.status),
        location: {
          city: toStringValue(location?.city, 'Unknown'),
        },
        budget: budget
          ? {
              amount: toFiniteNumber(budget.amount),
            }
          : null,
      };
    })
    .filter((job): job is RecentJob => job !== null && job._id.length > 0);
}

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

