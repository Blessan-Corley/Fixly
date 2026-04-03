import { z } from 'zod';

import { logger } from '@/lib/logger';
import User from '@/models/User';

export type SessionUser = {
  id?: string;
  role?: string;
  name?: string;
};

export type RatingBody = {
  rating?: unknown;
  review?: unknown;
  categories?: unknown;
  ratedBy?: unknown;
};

export type RatingField = 'fixerRating' | 'hirerRating';

export type JobCompletionRatingEntry = {
  rating?: number;
  review?: string;
  categories?: Record<string, number>;
  ratedBy?: unknown;
  ratedAt?: Date;
};

export type JobCompletionState = {
  fixerRating?: JobCompletionRatingEntry;
  hirerRating?: JobCompletionRatingEntry;
  [key: string]: unknown;
};

export type JobWithReviewStatusMethod = {
  completion?: JobCompletionState;
  updateReviewStatus?: () => void;
};

export const ratingBodySchema = z.object({
  rating: z.union([z.number(), z.string()]).optional(),
  review: z.unknown().optional(),
  categories: z.unknown().optional(),
  ratedBy: z.unknown().optional(),
});

export function toIdString(value: unknown): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null && '_id' in (value as Record<string, unknown>)) {
    return String((value as Record<string, unknown>)._id);
  }
  return String(value);
}

export function sanitizeString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function parseBoundedRating(value: unknown): number | null {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  if (numeric < 1 || numeric > 5) return null;
  return Number(numeric.toFixed(1));
}

export function normalizeCategories(value: unknown): {
  value: Record<string, number>;
  invalid: boolean;
} {
  if (value == null) {
    return { value: {}, invalid: false };
  }

  if (typeof value !== 'object') {
    return { value: {}, invalid: true };
  }

  const allowedKeys = [
    'communication',
    'quality',
    'timeliness',
    'professionalism',
    'clarity',
    'responsiveness',
    'paymentTimeliness',
    'workQuality',
    'punctuality',
  ];

  const categories: Record<string, number> = {};
  let invalid = false;

  for (const key of allowedKeys) {
    if (!(key in (value as Record<string, unknown>))) continue;

    const parsed = parseBoundedRating((value as Record<string, unknown>)[key]);
    if (parsed === null) {
      invalid = true;
      continue;
    }

    categories[key] = parsed;
  }

  return { value: categories, invalid };
}

export async function notifyUser(
  userId: unknown,
  rating: number,
  review: string,
  jobId: unknown,
  jobTitle: string,
  reviewerName: string,
  reviewerId: unknown
): Promise<void> {
  if (!userId) return;

  try {
    const recipient = await User.findById(userId);
    if (!recipient) return;

    const reviewPreview = review
      ? ` "${review.slice(0, 80)}${review.length > 80 ? '...' : ''}"`
      : '';
    await recipient.addNotification(
      'rating_received',
      `New ${rating}-Star Rating`,
      `${reviewerName} rated you ${rating} stars for "${jobTitle}".${reviewPreview}`,
      { jobId, rating, fromUser: reviewerId }
    );
  } catch (error) {
    logger.error('Failed to send rating notification:', error);
  }
}
