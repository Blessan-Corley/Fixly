import { Types } from 'mongoose';
import { z } from 'zod';

export type ValidatedReviewData = {
  jobId: string;
  rating: number;
  comment: string;
  title?: string;
  categories: Record<string, number>;
  pros?: string[];
  cons?: string[];
  wouldRecommend?: boolean;
  wouldHireAgain?: boolean;
  tags?: string[];
};

export type ReviewParty = {
  _id?: unknown;
  name?: string;
};

export type ReviewPartyRef = ReviewParty | string | Types.ObjectId | null | undefined;

export class RouteError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = 'RouteError';
    this.status = status;
  }
}

export const ALLOWED_TAGS = new Set([
  'excellent_work', 'on_time', 'great_communication', 'professional', 'exceeded_expectations',
  'fair_price', 'clean_work', 'polite', 'experienced', 'reliable', 'creative', 'efficient',
  'poor_quality', 'late', 'unprofessional', 'overpriced', 'miscommunication', 'incomplete',
  'rude', 'inexperienced', 'clear_requirements', 'responsive', 'fair_payment', 'understanding',
  'flexible', 'prompt_payment', 'good_communication', 'unclear_requirements', 'unresponsive',
  'payment_issues', 'unrealistic_expectations', 'poor_communication', 'changed_requirements',
  'delayed_payment',
]);

export const REVIEW_TITLE_MIN_LENGTH = 10;
export const REVIEW_TITLE_MAX_LENGTH = 100;
export const REVIEW_COMMENT_MIN_LENGTH = 5;
export const REVIEW_COMMENT_MAX_LENGTH = 500;
export const REVIEW_LIST_ITEM_MAX_LENGTH = 200;
export const REVIEW_LIST_MAX_ITEMS = 5;
export const REVIEW_TAGS_MAX_ITEMS = 10;
export const REVIEW_CATEGORIES_MAX_ITEMS = 20;

export const ReviewSubmitBodySchema = z.object({
  jobId: z.unknown().optional(),
  rating: z.unknown().optional(),
  comment: z.unknown().optional(),
  title: z.unknown().optional(),
  categories: z.unknown().optional(),
  pros: z.unknown().optional(),
  cons: z.unknown().optional(),
  wouldRecommend: z.unknown().optional(),
  wouldHireAgain: z.unknown().optional(),
  tags: z.unknown().optional(),
});
