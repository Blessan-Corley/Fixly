export type DashboardStats = Record<string, unknown>;

export type AggregateCountResult = {
  total?: number;
  pending?: number;
  accepted?: number;
  rejected?: number;
  thisMonth?: number;
  avgDays?: number;
};

export type FixerHistoryAggregateRow = {
  _id?: {
    year?: number;
    month?: number;
  };
  earnings?: number;
  jobs?: number;
};
