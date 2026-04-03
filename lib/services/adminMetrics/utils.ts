import { logger } from '@/lib/logger';
import { checkAllServices } from '@/lib/resilience/serviceGuard';

import type {
  AverageResult,
  CountResult,
  GroupedDateResult,
  TimeRange,
  UserPlanAggregate,
} from './types';

export function startOfToday(): Date {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

export function startOfWeek(): Date {
  const date = startOfToday();
  date.setDate(date.getDate() - 7);
  return date;
}

export function startOfMonth(): Date {
  const date = new Date();
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function rangeToDays(timeRange: TimeRange): number {
  if (timeRange === '90d') return 90;
  if (timeRange === '30d') return 30;
  return 7;
}

export function toCount(result: PromiseSettledResult<number>, label: string): number {
  if (result.status === 'fulfilled') return result.value;
  logger.warn({ error: result.reason, label }, 'Admin metrics query failed');
  return 0;
}

export function toAggregateCount<T extends CountResult>(
  result: PromiseSettledResult<T[]>,
  label: string
): number {
  if (result.status === 'fulfilled') {
    return result.value[0]?.count ?? 0;
  }
  logger.warn({ error: result.reason, label }, 'Admin metrics aggregate failed');
  return 0;
}

export function toAverage<T extends AverageResult>(
  result: PromiseSettledResult<T[]>,
  label: string
): number {
  if (result.status === 'fulfilled') {
    return Number(result.value[0]?.average ?? 0);
  }
  logger.warn({ error: result.reason, label }, 'Admin metrics average failed');
  return 0;
}

export function toGroupedSeries(
  result: PromiseSettledResult<GroupedDateResult[]>,
  label: string
): Array<{ date: string; count: number }> {
  if (result.status === 'fulfilled') {
    return result.value.map((entry) => ({
      date: typeof entry._id === 'string' ? entry._id : '',
      count: entry.count ?? 0,
    }));
  }
  logger.warn({ error: result.reason, label }, 'Admin metrics timeseries failed');
  return [];
}

export async function getServiceHealthScore(): Promise<number> {
  const services = await checkAllServices();
  const total = Object.keys(services).length;
  const available = Object.values(services).filter((service) => service.available).length;
  return Math.round((available / total) * 100);
}

export function normalizeUserPlanRevenue(entries: UserPlanAggregate[]) {
  return entries.reduce(
    (acc, entry) => {
      const role = entry._id?.role;
      const type = entry._id?.type;
      const count = entry.count ?? 0;
      const totalAmount = entry.totalAmount ?? 0;

      acc.totalEstimated += totalAmount;
      acc.subscriptionsActive += count;

      if (role === 'fixer' && type === 'pro') {
        acc.fixerProCount += count;
      } else if (role === 'hirer' && type === 'pro') {
        acc.hirerProCount += count;
      } else if (role === 'fixer') {
        acc.fixerBasicCount += count;
      } else if (role === 'hirer') {
        acc.hirerBasicCount += count;
      }

      return acc;
    },
    {
      totalEstimated: 0,
      subscriptionsActive: 0,
      fixerProCount: 0,
      fixerBasicCount: 0,
      hirerProCount: 0,
      hirerBasicCount: 0,
    }
  );
}
