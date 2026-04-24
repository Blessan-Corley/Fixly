import { requireSession, respond, serverError } from '@/lib/api';
import { logger } from '@/lib/logger';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { rateLimit } from '@/utils/rateLimiting';

import {
  asTrimmedString,
  buildSearchQuery,
  getSort,
  normalizeRole,
  normalizeSkills,
  normalizeSortBy,
  normalizeUserResult,
  parseMinRating,
  parsePositiveInt,
  type SearchUser,
} from './helpers';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const rateLimitResult = await rateLimit(request, 'profile_search', 30, 60 * 1000);
    if (!rateLimitResult.success) return respond({ message: 'Too many requests. Please try again later.' }, 429);

    const auth = await requireSession();
    if ('error' in auth) return auth.error;

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

    const query = buildSearchQuery({ role, search, skills, location, minRating, availability, isPro });
    const sort = getSort(sortBy);
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find(query).select('-passwordHash -notifications -email -phone').sort(sort).skip(skip).limit(limit).lean(),
      User.countDocuments(query),
    ]);

    const enhancedUsers = (users as SearchUser[]).map(normalizeUserResult);

    return respond({
      users: enhancedUsers,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit), hasMore: skip + enhancedUsers.length < total },
      filters: { search, role, skills, location, minRating, availability, isPro, sortBy },
    });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    logger.error('Profile search error:', err);
    return serverError('Failed to search profiles');
  }
}
