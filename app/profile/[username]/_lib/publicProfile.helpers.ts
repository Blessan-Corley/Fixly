import type { PublicProfileRecord, UserReviewRecord } from './publicProfile.types';

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function normalizeProfile(value: unknown): PublicProfileRecord | null {
  if (!isRecord(value)) return null;

  const userSource = isRecord(value.user) ? value.user : value;
  if (typeof userSource._id !== 'string') return null;

  return userSource as unknown as PublicProfileRecord;
}

export function normalizeReviews(value: unknown): UserReviewRecord[] {
  if (!isRecord(value) || !Array.isArray(value.data)) return [];

  return value.data.filter((item): item is UserReviewRecord => {
    return isRecord(item) && typeof item._id === 'string';
  });
}

export function formatMemberSince(value: string | undefined): string {
  if (!value) return 'Recently joined';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently joined';
  return date.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

export function formatRole(role: string | undefined): string {
  if (!role) return 'Member';
  return role.charAt(0).toUpperCase() + role.slice(1);
}
