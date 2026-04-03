import { z } from 'zod';

export type SessionUser = {
  id?: string;
  role?: string;
};

export type SortBy = 'newest' | 'oldest' | 'name' | 'rating';
export type UserAction = 'ban' | 'unban' | 'verify' | 'unverify' | 'delete';

export type BulkActionBody = {
  action?: unknown;
  userIds?: unknown;
  userId?: unknown;
  reason?: unknown;
};

export type UserListQuery = {
  $or?: Array<Record<string, unknown>>;
  role?: 'hirer' | 'fixer' | 'admin';
  banned?: boolean;
  isVerified?: boolean;
};

export const AdminUsersActionSchema = z.object({
  action: z.enum(['ban', 'unban', 'verify', 'unverify', 'delete']),
  userIds: z.array(z.string()).optional(),
  userId: z.string().optional(),
  reason: z.string().optional(),
});

export function toTrimmedString(value: unknown): string | null {
  return typeof value === 'string' ? value.trim() : null;
}

export function parsePositiveInt(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function parseSort(sortBy: string | null): SortBy {
  const normalized = toTrimmedString(sortBy)?.toLowerCase();
  if (normalized === 'oldest') return 'oldest';
  if (normalized === 'name') return 'name';
  if (normalized === 'rating') return 'rating';
  return 'newest';
}

export const SORT_MAP: Record<SortBy, Record<string, 1 | -1>> = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  name: { name: 1 },
  rating: { 'rating.average': -1 },
};
