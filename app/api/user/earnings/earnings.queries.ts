import Job from '@/models/Job';

import type { CounterpartPath, DatePath, HistoryAggregateRow, SummaryAggregateRow, TotalAggregateRow } from './earnings.types';

export type DateRanges = {
  now: Date;
  startOfMonth: Date;
  startOfWeek: Date;
  startOfLastWeek: Date;
  startOfLastMonth: Date;
  endOfLastMonth: Date;
  startOfHistoryWindow: Date;
};

export function buildDateRanges(): DateRanges {
  const now = new Date();
  return {
    now,
    startOfMonth: new Date(now.getFullYear(), now.getMonth(), 1),
    startOfWeek: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
    startOfLastWeek: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
    startOfLastMonth: new Date(now.getFullYear(), now.getMonth() - 1, 1),
    endOfLastMonth: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999),
    startOfHistoryWindow: new Date(now.getFullYear(), now.getMonth() - 5, 1),
  };
}

export type EarningsAggregateResults = {
  summary: SummaryAggregateRow[];
  thisMonth: TotalAggregateRow[];
  thisWeek: TotalAggregateRow[];
  lastWeek: TotalAggregateRow[];
  lastMonth: TotalAggregateRow[];
  historyRows: HistoryAggregateRow[];
  recentRows: unknown[];
};

export async function fetchEarningsAggregates(
  userId: unknown,
  ownerPath: 'createdBy' | 'assignedTo',
  datePath: DatePath,
  counterpartPath: CounterpartPath,
  includeDetails: boolean,
  ranges: DateRanges
): Promise<EarningsAggregateResults> {
  const baseMatch: Record<string, unknown> = {
    [ownerPath]: userId,
    status: 'completed',
    [datePath]: { $exists: true },
  };

  const [summary, thisMonth, thisWeek, lastWeek, lastMonth, historyRows, recentRows] =
    await Promise.all([
      Job.aggregate([
        { $match: baseMatch },
        { $group: { _id: null, total: { $sum: '$budget.amount' }, completedJobs: { $sum: 1 } } },
      ]),
      Job.aggregate([
        { $match: { ...baseMatch, [datePath]: { $gte: ranges.startOfMonth } } },
        { $group: { _id: null, total: { $sum: '$budget.amount' } } },
      ]),
      Job.aggregate([
        { $match: { ...baseMatch, [datePath]: { $gte: ranges.startOfWeek } } },
        { $group: { _id: null, total: { $sum: '$budget.amount' } } },
      ]),
      Job.aggregate([
        { $match: { ...baseMatch, [datePath]: { $gte: ranges.startOfLastWeek, $lt: ranges.startOfWeek } } },
        { $group: { _id: null, total: { $sum: '$budget.amount' } } },
      ]),
      Job.aggregate([
        { $match: { ...baseMatch, [datePath]: { $gte: ranges.startOfLastMonth, $lte: ranges.endOfLastMonth } } },
        { $group: { _id: null, total: { $sum: '$budget.amount' } } },
      ]),
      includeDetails
        ? Job.aggregate([
            { $match: { ...baseMatch, [datePath]: { $gte: ranges.startOfHistoryWindow } } },
            {
              $group: {
                _id: { year: { $year: `$${datePath}` }, month: { $month: `$${datePath}` } },
                total: { $sum: '$budget.amount' },
                jobs: { $sum: 1 },
              },
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } },
          ])
        : Promise.resolve([]),
      includeDetails
        ? Job.find(baseMatch)
            .select(`title status budget.amount ${datePath} ${counterpartPath}`)
            .populate(counterpartPath, 'name username location')
            .sort({ [datePath]: -1 })
            .limit(10)
            .lean()
        : Promise.resolve([]),
    ]);

  return {
    summary: summary as SummaryAggregateRow[],
    thisMonth: thisMonth as TotalAggregateRow[],
    thisWeek: thisWeek as TotalAggregateRow[],
    lastWeek: lastWeek as TotalAggregateRow[],
    lastMonth: lastMonth as TotalAggregateRow[],
    historyRows: historyRows as HistoryAggregateRow[],
    recentRows: recentRows as unknown[],
  };
}
