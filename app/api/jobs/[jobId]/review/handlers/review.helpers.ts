import { logger } from '@/lib/logger';
import User from '@/models/User';

import type { CompletionRating, ReviewRatingObject } from './review.types';

export function sanitizeString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function parseBoundedRating(value: unknown): number | null {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  if (numeric < 1 || numeric > 5) return null;
  return Number(numeric.toFixed(1));
}

export function resolveOverallRating(rating: unknown): number | null {
  if (typeof rating === 'number') {
    return parseBoundedRating(rating);
  }

  if (typeof rating === 'object' && rating !== null) {
    return parseBoundedRating((rating as ReviewRatingObject).overall);
  }

  return null;
}

export function mapLegacyReview(ratingEntry: CompletionRating | null | undefined): {
  rating: number | undefined;
  review: string;
  reviewedAt: Date;
  reviewedBy: unknown;
  categories: Record<string, number>;
} | null {
  if (!ratingEntry?.ratedAt) return null;

  return {
    rating: ratingEntry.rating,
    review: ratingEntry.review ?? '',
    reviewedAt: ratingEntry.ratedAt,
    reviewedBy: ratingEntry.ratedBy,
    categories: ratingEntry.categories ?? {},
  };
}

export async function notifyUser(
  userId: unknown,
  type: string,
  title: string,
  message: string,
  data: Record<string, unknown> = {}
): Promise<void> {
  if (!userId) return;

  try {
    const recipient = await User.findById(userId);
    if (!recipient) return;

    await recipient.addNotification(type, title, message, data);
  } catch (error) {
    logger.error('Failed to send review notification:', error);
  }
}
