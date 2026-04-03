import { Types } from 'mongoose';

import type { FixerHistoryAggregateRow } from './types';

export const DASHBOARD_STATS_CACHE_TTL_SECONDS = 120;

export function aggregateNumber(result: unknown, key = 'total'): number {
  if (!Array.isArray(result) || result.length === 0) return 0;
  const first = result[0] as Record<string, unknown>;
  const raw = first[key];
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : 0;
}

export function parseCachedStats(value: unknown): Record<string, unknown> | null {
  if (!value) return null;

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as unknown;
      return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  }

  return typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

export function buildDashboardStatsCacheKey(userId: string): string {
  return `dashboard:stats:${userId}`;
}

export function toObjectId(value: string): Types.ObjectId | string {
  return Types.ObjectId.isValid(value) ? new Types.ObjectId(value) : value;
}

function monthLabel(date: Date): string {
  return date.toLocaleString('en-US', { month: 'short' });
}

export function buildFixerMonthlyHistory(
  rows: FixerHistoryAggregateRow[],
  now: Date
): Array<{ year: number; monthNumber: number; month: string; earnings: number; jobs: number }> {
  const historyMap = new Map<string, { earnings: number; jobs: number }>();

  rows.forEach((row) => {
    const year = row._id?.year;
    const month = row._id?.month;
    if (typeof year !== 'number' || typeof month !== 'number') return;

    const key = `${year}-${String(month).padStart(2, '0')}`;
    historyMap.set(key, {
      earnings: typeof row.earnings === 'number' ? row.earnings : 0,
      jobs: typeof row.jobs === 'number' ? row.jobs : 0,
    });
  });

  const points: Array<{
    year: number;
    monthNumber: number;
    month: string;
    earnings: number;
    jobs: number;
  }> = [];

  for (let offset = 5; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const year = date.getFullYear();
    const monthNumber = date.getMonth() + 1;
    const key = `${year}-${String(monthNumber).padStart(2, '0')}`;
    const values = historyMap.get(key);

    points.push({
      year,
      monthNumber,
      month: monthLabel(date),
      earnings: values?.earnings ?? 0,
      jobs: values?.jobs ?? 0,
    });
  }

  return points;
}
