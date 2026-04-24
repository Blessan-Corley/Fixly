export type RoleFilter = 'fixer' | 'hirer' | 'admin';
export type SortBy = 'rating' | 'reviews' | 'recent' | 'distance' | 'jobs';

export type SearchProfilePhoto = string | { url?: string } | null | undefined;

export type SearchUser = {
  profilePhoto?: SearchProfilePhoto;
  picture?: string | null;
  plan?: { type?: string; status?: string };
  responseTime?: string;
  availableNow?: boolean;
  createdAt?: Date | string;
  lastLoginAt?: Date | string;
  [key: string]: unknown;
};

export function asTrimmedString(value: string | null): string {
  return (value || '').trim();
}

export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function parsePositiveInt(value: string | null, fallback: number, min: number, max: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(parsed)));
}

export function parseMinRating(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(0, Math.min(5, parsed));
}

export function normalizeRole(value: string): RoleFilter {
  const normalized = value.toLowerCase();
  if (normalized === 'hirer' || normalized === 'admin') return normalized;
  return 'fixer';
}

export function normalizeSortBy(value: string): SortBy {
  switch (value) {
    case 'reviews':
    case 'recent':
    case 'distance':
    case 'jobs':
      return value;
    default:
      return 'rating';
  }
}

export function normalizeSkills(rawSkills: string): string[] {
  return rawSkills.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 20);
}

export function getSort(sortBy: SortBy): Record<string, 1 | -1> {
  switch (sortBy) {
    case 'rating': return { 'rating.average': -1, 'rating.count': -1 };
    case 'reviews': return { 'rating.count': -1, 'rating.average': -1 };
    case 'recent': return { lastLoginAt: -1, createdAt: -1 };
    case 'distance': return { createdAt: -1 };
    case 'jobs': return { jobsCompleted: -1 };
    default: return { 'rating.average': -1, createdAt: -1 };
  }
}

export function buildSearchQuery(params: {
  role: RoleFilter;
  search: string;
  skills: string[];
  location: string;
  minRating: number | null;
  availability: string;
  isPro: boolean;
}): Record<string, unknown> {
  const andConditions: Array<Record<string, unknown>> = [
    { role: params.role, isActive: true, banned: { $ne: true } },
  ];

  if (params.search) {
    const safe = escapeRegex(params.search);
    andConditions.push({
      $or: [
        { name: { $regex: safe, $options: 'i' } },
        { skills: { $in: [new RegExp(safe, 'i')] } },
        { bio: { $regex: safe, $options: 'i' } },
      ],
    });
  }

  if (params.skills.length > 0) andConditions.push({ skills: { $in: params.skills } });

  if (params.location) {
    const safe = escapeRegex(params.location);
    andConditions.push({
      $or: [
        { 'location.city': { $regex: safe, $options: 'i' } },
        { 'location.state': { $regex: safe, $options: 'i' } },
      ],
    });
  }

  if (params.minRating !== null) andConditions.push({ 'rating.average': { $gte: params.minRating } });
  if (params.availability === 'available') andConditions.push({ availableNow: true });
  if (params.isPro) andConditions.push({ 'plan.type': 'pro', 'plan.status': 'active' });

  return andConditions.length === 1 ? andConditions[0] : { $and: andConditions };
}

export function normalizeUserResult(user: SearchUser) {
  const normalizedProfilePhoto =
    typeof user.profilePhoto === 'string'
      ? user.profilePhoto
      : (user.profilePhoto as { url?: string } | null | undefined)?.url || user.picture || null;

  return {
    ...user,
    profilePhoto: normalizedProfilePhoto,
    photoURL: normalizedProfilePhoto,
    isPro: user.plan?.type === 'pro' && user.plan?.status === 'active',
    responseTime: user.responseTime || '2-4 hours',
    available: user.availableNow !== false,
    memberSince: user.createdAt,
    lastActive: user.lastLoginAt || user.createdAt,
  };
}
