import { z } from 'zod';

export type EarningsRole = 'hirer' | 'fixer';
export type CounterpartPath = 'assignedTo' | 'createdBy';
export type DatePath = 'completion.confirmedAt' | 'progress.completedAt';

export type SummaryAggregateRow = {
  total?: number;
  completedJobs?: number;
};

export type TotalAggregateRow = {
  total?: number;
};

export type HistoryAggregateRow = {
  _id?: {
    year?: number;
    month?: number;
  };
  total?: number;
  jobs?: number;
};

export type EarningsHistoryPoint = {
  year: number;
  monthNumber: number;
  month: string;
  earnings: number;
  jobs: number;
};

export type RecentEarningsJob = {
  _id: string;
  title: string;
  amount: number;
  status: string;
  completedAt: string | null;
  counterpartName: string;
  counterpartCity: string;
};

export type EarningsPayload = {
  earnings: {
    total: number;
    thisMonth: number;
    thisWeek: number;
    lastMonth: number;
    completedJobs: number;
    averageJobValue: number;
    growth: {
      monthly: number;
      weekly: number;
    };
    error?: string;
  };
  history?: EarningsHistoryPoint[];
  recentJobs?: RecentEarningsJob[];
  cached?: boolean;
  cacheTimestamp?: string;
};

export type CachedEarningsPayload = EarningsPayload & {
  _cacheTimestamp?: string;
};

export const SUMMARY_CACHE_TTL_SECONDS = 120;
export const DETAILS_CACHE_TTL_SECONDS = 60;

export const EarningsQuerySchema = z.object({
  period: z.enum(['week', 'month', 'year', 'all']).optional(),
  details: z
    .union([z.literal('1'), z.literal('true'), z.literal('0'), z.literal('false')])
    .optional(),
});
