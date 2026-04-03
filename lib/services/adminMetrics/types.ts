export type TimeRange = '7d' | '30d' | '90d';

export type AdminMetrics = {
  users: {
    total: number;
    hirers: number;
    fixers: number;
    newToday: number;
    newThisWeek: number;
    newThisMonth: number;
    activeToday: number;
    banned: number;
  };
  jobs: {
    total: number;
    active: number;
    completed: number;
    cancelled: number;
    disputed: number;
    postedToday: number;
    postedThisWeek: number;
  };
  applications: {
    total: number;
    pending: number;
    accepted: number;
    rejected: number;
    withdrawnThisWeek: number;
  };
  reviews: {
    total: number;
    averageRating: number;
    flagged: number;
  };
  disputes: {
    total: number;
    open: number;
    resolved: number;
    escalated: number;
    avgResolutionDays: number;
  };
  revenue: {
    totalEstimated: number;
    subscriptionsActive: number;
    fixerProCount: number;
    fixerBasicCount: number;
    hirerProCount: number;
    hirerBasicCount: number;
  };
  platform: {
    healthScore: number;
    lastUpdated: string;
  };
};

export type TimeRangeMetrics = {
  range: TimeRange;
  userSignups: Array<{ date: string; count: number }>;
  jobsPosted: Array<{ date: string; count: number }>;
  applications: Array<{ date: string; count: number }>;
};

export type CountResult = { count?: number };
export type AverageResult = { average?: number };
export type GroupedDateResult = { _id?: string; count?: number };
export type UserPlanAggregate = {
  _id?: {
    role?: string;
    type?: string;
  };
  count?: number;
  totalAmount?: number;
};
export type DisputedJobAggregate = { _id?: unknown; count?: number };
export type DisputeAverageAggregate = { avgMs?: number };
