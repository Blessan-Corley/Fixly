import { Star } from 'lucide-react';
import type { ReactNode } from 'react';

import type { FixerProfile, SearchPagination, SearchResponse } from './find-fixers.types';

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object');
}

export function toStringSafe(value: unknown, fallback = ''): string {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : fallback;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  return fallback;
}

export function toNumberSafe(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

export function toId(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (isRecord(value)) {
    if (typeof value._id === 'string') return value._id;
    if (typeof value.id === 'string') return value.id;
    if (typeof value.toString === 'function') {
      const candidate = value.toString();
      if (candidate && candidate !== '[object Object]') return candidate;
    }
  }
  return '';
}

export function normalizeFixer(payload: unknown): FixerProfile | null {
  if (!isRecord(payload)) return null;

  const rating = isRecord(payload.rating) ? payload.rating : {};
  const location = isRecord(payload.location) ? payload.location : {};
  const reviewsRaw = Array.isArray(payload.recentReviews) ? payload.recentReviews : [];
  const skillsRaw = Array.isArray(payload.skills) ? payload.skills : [];

  return {
    _id: toId(payload._id),
    name: toStringSafe(payload.name, 'Unknown fixer'),
    username: toStringSafe(payload.username, ''),
    profilePhoto: toStringSafe(payload.profilePhoto, '/default-avatar.png'),
    skills: skillsRaw.map((skill) => toStringSafe(skill)).filter(Boolean),
    jobsCompleted: toNumberSafe(payload.jobsCompleted, 0),
    responseTime: toStringSafe(payload.responseTime, 'N/A'),
    isVerified: payload.isVerified === true,
    bio: toStringSafe(payload.bio, ''),
    location: {
      city: toStringSafe(location.city, ''),
      state: toStringSafe(location.state, 'India'),
    },
    rating: {
      average: toNumberSafe(rating.average, 0),
      count: toNumberSafe(rating.count, 0),
    },
    recentReviews: reviewsRaw
      .map((review) => {
        const reviewRecord = isRecord(review) ? review : {};
        return {
          rating: toNumberSafe(reviewRecord.rating, 0),
          comment: toStringSafe(reviewRecord.comment, ''),
          createdAt: toStringSafe(reviewRecord.createdAt, ''),
        };
      })
      .filter((review) => review.comment.length > 0),
  };
}

export function normalizePagination(payload: unknown, fallbackPage: number): SearchPagination {
  const source = isRecord(payload) ? payload : {};
  return {
    page: toNumberSafe(source.page, fallbackPage),
    totalPages: toNumberSafe(source.totalPages, 1),
    hasMore: source.hasMore === true,
  };
}

export function normalizeSearchResponse(
  payload: unknown,
  fallbackPage: number
): {
  users: FixerProfile[];
  pagination: SearchPagination;
  message: string;
} {
  const source = isRecord(payload) ? (payload as SearchResponse) : {};
  const usersRaw = Array.isArray(source.users) ? source.users : [];
  return {
    users: usersRaw
      .map(normalizeFixer)
      .filter((user): user is FixerProfile => Boolean(user && user._id)),
    pagination: normalizePagination(source.pagination, fallbackPage),
    message: toStringSafe(source.message, ''),
  };
}

export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

export function renderRatingStars(rating: number): ReactNode[] {
  const stars: ReactNode[] = [];
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 !== 0;

  for (let i = 0; i < fullStars; i += 1) {
    stars.push(<Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />);
  }

  if (hasHalfStar) {
    stars.push(<Star key="half" className="h-4 w-4 fill-yellow-400/50 text-yellow-400" />);
  }

  const emptyStars = Math.max(0, 5 - Math.ceil(rating));
  for (let i = 0; i < emptyStars; i += 1) {
    stars.push(<Star key={`empty-${i}`} className="h-4 w-4 text-gray-300" />);
  }

  return stars;
}
