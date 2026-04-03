export type TimeFilter = 'this_week' | 'this_month' | 'last_month' | 'this_year';
export type ChartMode = 'earnings' | 'jobs';

export type EarningsState = {
  total: number;
  thisMonth: number;
  lastMonth: number;
  thisWeek: number;
  pendingPayments: number;
  completedJobs: number;
  averageJobValue: number;
  topJobCategory: string;
  growth: {
    monthly: number;
    weekly: number;
  };
};

export type EarningsHistoryPoint = {
  month: string;
  earnings: number;
  jobs: number;
};

export type RecentJob = {
  _id: string;
  title: string;
  status: string;
  budget: {
    amount: number;
  };
  createdBy: {
    name: string;
  };
  location: {
    city: string;
  };
  progress: {
    completedAt: string;
  };
  completion: {
    rating?: number;
  };
};

export const PERIOD_MAP: Record<TimeFilter, string> = {
  this_week: 'week',
  this_month: 'month',
  last_month: 'month',
  this_year: 'year',
};

export const MONTHLY_GOAL = 20000;
