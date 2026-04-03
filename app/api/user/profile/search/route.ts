import { requireSession, respond, serverError } from '@/lib/api';
import { logger } from '@/lib/logger';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { rateLimit } from '@/utils/rateLimiting';

export const dynamic = 'force-dynamic';

type RoleFilter = 'fixer' | 'hirer' | 'admin';
type SortBy = 'rating' | 'reviews' | 'recent' | 'distance' | 'jobs';

type SearchProfilePhoto = string | { url?: string } | null | undefined;

type SearchUser = {
  profilePhoto?: SearchProfilePhoto;
  picture?: string | null;
  plan?: {
    type?: string;
    status?: string;
  };
  responseTime?: string;
  availableNow?: boolean;
  createdAt?: Date | string;
  lastLoginAt?: Date | string;
  [key: string]: unknown;
};

function asTrimmedString(value: string | null): string {
  return (value || '').trim();
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parsePositiveInt(
  value: string | null,
  fallback: number,
  min: number,
  max: number
): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(parsed)));
}

function parseMinRating(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(0, Math.min(5, parsed));
}

function normalizeRole(value: string): RoleFilter {
  const normalized = value.toLowerCase();
  if (normalized === 'hirer' || normalized === 'admin') {
    return normalized;
  }
  return 'fixer';
}

function normalizeSortBy(value: string): SortBy {
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

function normalizeSkills(rawSkills: string): string[] {
  return rawSkills
    .split(',')
    .map((skill) => skill.trim())
    .filter(Boolean)
    .slice(0, 20);
}

function getSort(sortBy: SortBy): Record<string, 1 | -1> {
  switch (sortBy) {
    case 'rating':
      return { 'rating.average': -1, 'rating.count': -1 };
    case 'reviews':
      return { 'rating.count': -1, 'rating.average': -1 };
    case 'recent':
      return { lastLoginAt: -1, createdAt: -1 };
    case 'distance':
      return { createdAt: -1 };
    case 'jobs':
      return { jobsCompleted: -1 };
    default:
      return { 'rating.average': -1, createdAt: -1 };
  }
}

export async function GET(request: Request) {
  try {
    const rateLimitResult = await rateLimit(request, 'profile_search', 30, 60 * 1000);
    if (!rateLimitResult.success) {
      return respond(
        { message: 'Too many requests. Please try again later.' },
        429
      );
    }

    const auth = await requireSession();
    if ('error' in auth) {
      return auth.error;
    }

    await connectDB();

    const searchParams = new URL(request.url).searchParams;
    const page = parsePositiveInt(searchParams.get('page'), 1, 1, 10_000);
    const limit = parsePositiveInt(searchParams.get('limit'), 12, 1, 50);
    const search = asTrimmedString(searchParams.get('search')).slice(0, 100);
    const role = normalizeRole(asTrimmedString(searchParams.get('role')) || 'fixer');
    const skills = normalizeSkills(asTrimmedString(searchParams.get('skills')));
    const location = asTrimmedString(searchParams.get('location')).slice(0, 100);
    const minRating = parseMinRating(searchParams.get('minRating'));
    const availability = asTrimmedString(searchParams.get('availability')).toLowerCase();
    const isPro = searchParams.get('isPro') === 'true';
    const sortBy = normalizeSortBy(asTrimmedString(searchParams.get('sortBy')));

    const andConditions: Array<Record<string, unknown>> = [
      {
        role,
        isActive: true,
        banned: { $ne: true },
      },
    ];

    if (search) {
      const sanitizedSearch = escapeRegex(search);
      andConditions.push({
        $or: [
          { name: { $regex: sanitizedSearch, $options: 'i' } },
          { skills: { $in: [new RegExp(sanitizedSearch, 'i')] } },
          { bio: { $regex: sanitizedSearch, $options: 'i' } },
        ],
      });
    }

    if (skills.length > 0) {
      andConditions.push({ skills: { $in: skills } });
    }

    if (location) {
      const sanitizedLocation = escapeRegex(location);
      andConditions.push({
        $or: [
          { 'location.city': { $regex: sanitizedLocation, $options: 'i' } },
          { 'location.state': { $regex: sanitizedLocation, $options: 'i' } },
        ],
      });
    }

    if (minRating !== null) {
      andConditions.push({ 'rating.average': { $gte: minRating } });
    }

    if (availability === 'available') {
      andConditions.push({ availableNow: true });
    }

    if (isPro) {
      andConditions.push({ 'plan.type': 'pro', 'plan.status': 'active' });
    }

    const query = andConditions.length === 1 ? andConditions[0] : { $and: andConditions };
    const sort = getSort(sortBy);
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find(query)
        .select('-passwordHash -notifications -email -phone')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(query),
    ]);

    const enhancedUsers = (users as SearchUser[]).map((user) => {
      const normalizedProfilePhoto =
        typeof user.profilePhoto === 'string'
          ? user.profilePhoto
          : user.profilePhoto?.url || user.picture || null;

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
    });

    return respond({
      users: enhancedUsers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + enhancedUsers.length < total,
      },
      filters: {
        search,
        role,
        skills,
        location,
        minRating,
        availability,
        isPro,
        sortBy,
      },
    });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    logger.error('Profile search error:', err);
    return serverError('Failed to search profiles');
  }
}
