import type {
  CachedEarningsPayload,
  CounterpartPath,
  DatePath,
  EarningsHistoryPoint,
  EarningsRole,
  HistoryAggregateRow,
  RecentEarningsJob,
} from './earnings.types';

export function toTrimmedString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function aggregateNumber(result: unknown, key = 'total'): number {
  if (!Array.isArray(result) || result.length === 0) {
    return 0;
  }
  const first = result[0] as Record<string, unknown>;
  const raw = first[key];
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : 0;
}

export function parseCachedPayload(value: unknown): CachedEarningsPayload | null {
  if (!value) {
    return null;
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (parsed && typeof parsed === 'object') {
        return parsed as CachedEarningsPayload;
      }
      return null;
    } catch {
      return null;
    }
  }

  if (typeof value === 'object') {
    return value as CachedEarningsPayload;
  }

  return null;
}

export function asNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

export function asRole(value: unknown): EarningsRole | null {
  if (value === 'hirer' || value === 'fixer') {
    return value;
  }
  return null;
}

export function monthLabel(date: Date): string {
  return date.toLocaleString('en-US', { month: 'short' });
}

export function growthPercent(current: number, previous: number): number {
  if (!previous) {
    return 0;
  }
  return Math.round(((current - previous) / previous) * 100);
}

export function toObjectRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null;
}

export function getPathValue(record: unknown, path: string): unknown {
  if (!path) {
    return undefined;
  }

  return path.split('.').reduce<unknown>((current, part) => {
    if (
      typeof current === 'object' &&
      current !== null &&
      part in (current as Record<string, unknown>)
    ) {
      return (current as Record<string, unknown>)[part];
    }
    return undefined;
  }, record);
}

export function toIsoDate(value: unknown): string | null {
  if (!value) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value as string | number | Date);
  const ms = date.getTime();
  if (!Number.isFinite(ms)) {
    return null;
  }
  return date.toISOString();
}

export function buildHistory(rows: HistoryAggregateRow[], now: Date): EarningsHistoryPoint[] {
  const historyMap = new Map<string, { earnings: number; jobs: number }>();

  rows.forEach((row) => {
    const year = row._id?.year;
    const month = row._id?.month;
    if (typeof year !== 'number' || typeof month !== 'number') {
      return;
    }

    const key = `${year}-${String(month).padStart(2, '0')}`;
    historyMap.set(key, {
      earnings: asNumber(row.total, 0),
      jobs: asNumber(row.jobs, 0),
    });
  });

  const output: EarningsHistoryPoint[] = [];
  for (let offset = 5; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const year = date.getFullYear();
    const monthNumber = date.getMonth() + 1;
    const key = `${year}-${String(monthNumber).padStart(2, '0')}`;
    const values = historyMap.get(key);

    output.push({
      year,
      monthNumber,
      month: monthLabel(date),
      earnings: values?.earnings ?? 0,
      jobs: values?.jobs ?? 0,
    });
  }

  return output;
}

export function toRecentEarningsJob(
  rawJob: unknown,
  counterpartPath: CounterpartPath,
  datePath: DatePath
): RecentEarningsJob | null {
  const job = toObjectRecord(rawJob);
  if (!job) {
    return null;
  }

  const budget = toObjectRecord(job.budget) ?? {};
  const counterpart = toObjectRecord(job[counterpartPath]) ?? {};
  const counterpartLocation = toObjectRecord(counterpart.location) ?? {};

  return {
    _id: asString(job._id, ''),
    title: asString(job.title, 'Untitled Job'),
    amount: asNumber(budget.amount, 0),
    status: asString(job.status, 'unknown'),
    completedAt: toIsoDate(getPathValue(job, datePath)),
    counterpartName: asString(counterpart.name, asString(counterpart.username, 'Unknown')),
    counterpartCity: asString(counterpartLocation.city, 'Unknown'),
  };
}
