import { z } from 'zod';

export type AdminAnalyticsTimeRange = '7d' | '30d' | '90d' | 'all';

export type UserSignupByRole = {
  role: string;
  count: number;
};

export type AdminAnalyticsResponse = {
  success: true;
  filters: {
    timeRange: AdminAnalyticsTimeRange;
    eventType: string | null;
  };
  analytics: {
    userSignups: {
      total: number;
      byRole: UserSignupByRole[];
    };
    jobsPosted: number;
    jobsCompleted: number;
    applicationsSubmitted: number;
    reviewsSubmitted: number;
    averageRating: number;
    activeUsers: number;
    disputesRaised: number;
  };
};

export const adminAnalyticsQuerySchema = z.object({
  timeRange: z.enum(['7d', '30d', '90d', 'all']).optional(),
  eventType: z.string().trim().optional(),
});

export function parseTimeRange(value: string | null): AdminAnalyticsTimeRange {
  if (value === '7d' || value === '30d' || value === '90d' || value === 'all') return value;
  return '30d';
}

export function resolveRangeStart(timeRange: AdminAnalyticsTimeRange): Date | null {
  if (timeRange === 'all') return null;
  const days = timeRange === '7d' ? 7 : timeRange === '90d' ? 90 : 30;
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

export function buildCreatedAtFilter(startDate: Date | null): Record<string, unknown> {
  if (!startDate) return {};
  return { createdAt: { $gte: startDate } };
}

export function parseCachedAnalytics(value: unknown): AdminAnalyticsResponse | null {
  if (!value) return null;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as unknown;
      return parsed && typeof parsed === 'object' ? (parsed as AdminAnalyticsResponse) : null;
    } catch {
      return null;
    }
  }
  return typeof value === 'object' ? (value as AdminAnalyticsResponse) : null;
}
