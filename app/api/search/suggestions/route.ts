import { respond, serverError, tooManyRequests } from '@/lib/api';
import { logger } from '@/lib/logger';
import connectDB from '@/lib/mongodb';
import { withCache } from '@/lib/redisCache';
import Job from '@/models/Job';
import { rateLimit } from '@/utils/rateLimiting';

export const dynamic = 'force-dynamic';

const MIN_QUERY_LENGTH = 2;
const MAX_QUERY_LENGTH = 80;
const MAX_DB_SUGGESTIONS = 8;
const MAX_FINAL_SUGGESTIONS = 5;

const POPULAR_TERMS: string[] = [
  'plumbing repair',
  'electrical work',
  'home cleaning',
  'painting service',
  'carpentry work',
  'garden maintenance',
  'appliance repair',
  'furniture assembly',
];

type JobSuggestionSource = {
  title?: unknown;
  skillsRequired?: unknown;
};

function toTrimmedString(value: unknown): string | null {
  return typeof value === 'string' ? value.trim() : null;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => toTrimmedString(entry))
    .filter((entry): entry is string => Boolean(entry));
}

function rankSuggestions(list: string[], query: string): string[] {
  const normalizedQuery = query.toLowerCase();
  return list
    .filter((entry) => entry.toLowerCase().includes(normalizedQuery))
    .sort((a, b) => {
      const aStarts = a.toLowerCase().startsWith(normalizedQuery);
      const bStarts = b.toLowerCase().startsWith(normalizedQuery);
      if (aStarts !== bStarts) return aStarts ? -1 : 1;
      if (a.length !== b.length) return a.length - b.length;
      return a.localeCompare(b);
    });
}

const getSuggestionsCached = withCache(
  async (request: Request): Promise<Response> => {
    const { searchParams } = new URL(request.url);
    const queryRaw = toTrimmedString(searchParams.get('q'));
    if (!queryRaw || queryRaw.length < MIN_QUERY_LENGTH) {
      return respond<string[]>([]);
    }

    const query = queryRaw.slice(0, MAX_QUERY_LENGTH);

    await connectDB();

    const safeRegex = escapeRegex(query);
    const regex = new RegExp(safeRegex, 'i');

    const jobs = (await Job.find({
      status: 'open',
      $or: [{ title: regex }, { description: regex }, { skillsRequired: regex }],
    })
      .select('title skillsRequired')
      .limit(50)
      .lean()) as JobSuggestionSource[];

    const dbCandidates = new Set<string>();
    for (const job of jobs) {
      const title = toTrimmedString(job.title);
      if (title) dbCandidates.add(title);

      for (const skill of toStringArray(job.skillsRequired)) {
        dbCandidates.add(skill);
      }
    }

    const rankedDb = rankSuggestions(Array.from(dbCandidates), query).slice(0, MAX_DB_SUGGESTIONS);
    const rankedPopular = rankSuggestions(POPULAR_TERMS, query);
    const merged = rankedDb.concat(rankedPopular);
    const finalSuggestions = Array.from(new Set(merged)).slice(0, MAX_FINAL_SUGGESTIONS);

    return respond(finalSuggestions);
  },
  {
    ttl: 600,
    version: 'v2',
  }
);

export async function GET(request: Request) {
  try {
    const rateLimitResult = await rateLimit(request, 'search_suggestions', 120, 60 * 1000);
    if (!rateLimitResult.success) {
      return tooManyRequests('Too many requests. Please try again later.');
    }

    return getSuggestionsCached(request, {});
  } catch (error: unknown) {
    logger.error('Search suggestions error:', error);
    return serverError('Failed to get search suggestions');
  }
}
