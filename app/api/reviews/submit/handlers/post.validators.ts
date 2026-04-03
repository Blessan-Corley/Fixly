import { Types } from 'mongoose';

import { parseBody } from '@/lib/api/parse';
import { moderateUserGeneratedContent } from '@/lib/validations/content-policy';
import { rateLimit } from '@/utils/rateLimiting';

import {
  ALLOWED_TAGS,
  REVIEW_CATEGORIES_MAX_ITEMS,
  REVIEW_COMMENT_MAX_LENGTH,
  REVIEW_COMMENT_MIN_LENGTH,
  REVIEW_LIST_ITEM_MAX_LENGTH,
  REVIEW_LIST_MAX_ITEMS,
  REVIEW_TAGS_MAX_ITEMS,
  REVIEW_TITLE_MAX_LENGTH,
  REVIEW_TITLE_MIN_LENGTH,
  ReviewSubmitBodySchema,
  RouteError,
  type ValidatedReviewData,
} from './post.types';

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object') return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

export function isValidObjectId(value: string): boolean {
  return Types.ObjectId.isValid(value);
}

export function toSafeErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'Unexpected error';
}

export function sanitizeTextField(
  value: unknown,
  fieldName: string,
  options: { minLength?: number; maxLength: number; defaultValue?: string }
): string {
  if (value === undefined || value === null) {
    if (options.defaultValue !== undefined) return options.defaultValue;
    throw new RouteError(`${fieldName} is required`, 400);
  }

  if (typeof value !== 'string') {
    if (options.defaultValue !== undefined) return options.defaultValue;
    throw new RouteError(`${fieldName} must be a string`, 400);
  }

  const sanitized = value.replace(/\0/g, '').trim();
  if (!sanitized) {
    if (options.defaultValue !== undefined) return options.defaultValue;
    throw new RouteError(`${fieldName} cannot be empty`, 400);
  }

  if (options.minLength !== undefined && sanitized.length < options.minLength) {
    throw new RouteError(`${fieldName} must be at least ${options.minLength} characters`, 400);
  }

  if (sanitized.length > options.maxLength) {
    throw new RouteError(`${fieldName} must be ${options.maxLength} characters or fewer`, 400);
  }

  return sanitized;
}

export function parseAmountLike(value: unknown, fieldName: string): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) throw new RouteError(`${fieldName} must be a valid number`, 400);
  if (numeric < 0) throw new RouteError(`${fieldName} cannot be negative`, 400);
  if (numeric > 10_000_000) throw new RouteError(`${fieldName} exceeds maximum limit`, 400);
  return Math.round(numeric * 100) / 100;
}

export function parseReviewRating(value: unknown, fieldName: string): number {
  const rating = parseAmountLike(value, fieldName);
  if (rating < 1 || rating > 5) throw new RouteError(`${fieldName} must be between 1 and 5`, 400);
  return rating;
}

export function parseCategoryRatings(value: unknown): Record<string, number> {
  if (!isPlainObject(value)) throw new RouteError('Categories must be an object', 400);

  const entries = Object.entries(value);
  if (entries.length > REVIEW_CATEGORIES_MAX_ITEMS) {
    throw new RouteError(`Categories cannot exceed ${REVIEW_CATEGORIES_MAX_ITEMS} entries`, 400);
  }

  const categories: Record<string, number> = {};
  for (const [key, rawValue] of entries) {
    const normalizedKey = key.trim();
    if (!normalizedKey) continue;
    categories[normalizedKey] = parseReviewRating(rawValue, `Category rating "${normalizedKey}"`);
  }
  return categories;
}

export function parseReviewList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, REVIEW_LIST_MAX_ITEMS)
    .map((item) =>
      typeof item === 'string'
        ? item.replace(/\0/g, '').trim().slice(0, REVIEW_LIST_ITEM_MAX_LENGTH)
        : ''
    )
    .filter((item) => item.length > 0);
}

export function parseBooleanLike(value: unknown, fieldName: string): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes'].includes(normalized)) return true;
    if (['false', '0', 'no'].includes(normalized)) return false;
  }
  if (typeof value === 'number') {
    if (value === 1) return true;
    if (value === 0) return false;
  }
  throw new RouteError(`${fieldName} must be a boolean`, 400);
}

export function parseOptionalBooleanLike(value: unknown, fieldName: string): boolean | undefined {
  if (value === undefined || value === null) return undefined;
  return parseBooleanLike(value, fieldName);
}

export function parseTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const uniqueTags = new Set<string>();
  for (const tag of value) {
    if (typeof tag !== 'string' || !ALLOWED_TAGS.has(tag)) continue;
    uniqueTags.add(tag);
    if (uniqueTags.size >= REVIEW_TAGS_MAX_ITEMS) break;
  }
  return Array.from(uniqueTags);
}

export async function assertContentAllowed(
  value: string,
  fieldName: string,
  userId: string
): Promise<void> {
  const moderation = await moderateUserGeneratedContent(value, {
    context: 'review',
    fieldLabel: fieldName,
    userId,
  });
  if (!moderation.allowed) {
    throw new RouteError(moderation.message ?? `${fieldName} contains prohibited content`, 400);
  }
}

async function validateReviewTextContent(
  data: ValidatedReviewData,
  userId: string
): Promise<void> {
  await assertContentAllowed(data.comment, 'Comment', userId);
  await assertContentAllowed(data.title ?? 'Job Review', 'Title', userId);
  for (const pro of data.pros ?? []) await assertContentAllowed(pro, 'Pros', userId);
  for (const con of data.cons ?? []) await assertContentAllowed(con, 'Cons', userId);
}

export async function parseAndValidateReviewRequest(
  request: Request,
  userId: string
): Promise<ValidatedReviewData> {
  const rateLimitResult = await rateLimit(request, 'reviews', 5, 60 * 60 * 1000);
  if (!rateLimitResult.success) {
    throw new RouteError(rateLimitResult.message ?? 'Rate limit exceeded', 429);
  }

  const parsedBody = await parseBody(request, ReviewSubmitBodySchema);
  if ('error' in parsedBody) throw new RouteError('Invalid request body', 400);

  const requestBody = parsedBody.data;
  const jobId = sanitizeTextField(requestBody.jobId, 'jobId', { maxLength: 100 });
  const rating = parseReviewRating(requestBody.rating, 'Rating');
  const comment = sanitizeTextField(requestBody.comment, 'Comment', {
    minLength: REVIEW_COMMENT_MIN_LENGTH,
    maxLength: REVIEW_COMMENT_MAX_LENGTH,
  });
  const title = sanitizeTextField(requestBody.title, 'Title', {
    minLength: REVIEW_TITLE_MIN_LENGTH,
    maxLength: REVIEW_TITLE_MAX_LENGTH,
    defaultValue: 'Job Review',
  });
  const categories = parseCategoryRatings(requestBody.categories);
  const pros = parseReviewList(requestBody.pros);
  const cons = parseReviewList(requestBody.cons);
  const wouldRecommend =
    requestBody.wouldRecommend === undefined
      ? true
      : parseBooleanLike(requestBody.wouldRecommend, 'wouldRecommend');
  const wouldHireAgain = parseOptionalBooleanLike(requestBody.wouldHireAgain, 'wouldHireAgain');
  const tags = parseTags(requestBody.tags);

  const validatedData: ValidatedReviewData = {
    jobId, rating, comment, title, categories, pros, cons, wouldRecommend, wouldHireAgain, tags,
  };

  await validateReviewTextContent(validatedData, userId);
  return validatedData;
}
