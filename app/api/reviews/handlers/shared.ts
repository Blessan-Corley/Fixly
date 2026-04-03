import { Types } from 'mongoose';
import { z } from 'zod';

export type RouteReviewType = 'client_to_fixer' | 'fixer_to_client';

export type ReviewRating = {
  overall: number;
  workQuality?: number;
  communication?: number;
  punctuality?: number;
  professionalism?: number;
  clarity?: number;
  responsiveness?: number;
  paymentTimeliness?: number;
};

export type CreateReviewBody = {
  jobId?: string;
  revieweeId?: string;
  reviewType?: RouteReviewType;
  rating?: ReviewRating;
  title?: string;
  comment?: string;
  pros?: string[];
  cons?: string[];
  tags?: string[];
  wouldRecommend?: boolean;
  wouldHireAgain?: boolean;
  attachments?: Array<{
    type?: 'image' | 'document';
    url?: string;
    filename?: string;
    description?: string;
  }>;
};

export type UpdateReviewBody = {
  reviewId?: string;
  responseComment?: string;
};

export const CreateReviewBodySchema: z.ZodType<CreateReviewBody> = z.object({
  jobId: z.string().optional(),
  revieweeId: z.string().optional(),
  reviewType: z.enum(['client_to_fixer', 'fixer_to_client']).optional(),
  rating: z
    .object({
      overall: z.number(),
      workQuality: z.number().optional(),
      communication: z.number().optional(),
      punctuality: z.number().optional(),
      professionalism: z.number().optional(),
      clarity: z.number().optional(),
      responsiveness: z.number().optional(),
      paymentTimeliness: z.number().optional(),
    })
    .optional(),
  title: z.string().optional(),
  comment: z.string().optional(),
  pros: z.array(z.string()).optional(),
  cons: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  wouldRecommend: z.boolean().optional(),
  wouldHireAgain: z.boolean().optional(),
  attachments: z
    .array(
      z.object({
        type: z.enum(['image', 'document']).optional(),
        url: z.string().optional(),
        filename: z.string().optional(),
        description: z.string().optional(),
      })
    )
    .optional(),
});

export const UpdateReviewBodySchema: z.ZodType<UpdateReviewBody> = z.object({
  reviewId: z.string().optional(),
  responseComment: z.string().optional(),
});

export const ALLOWED_SORT_FIELDS: Record<string, string> = {
  createdAt: 'createdAt',
  'rating.overall': 'rating.overall',
  'helpfulVotes.count': 'helpfulVotes.count',
};

export const ALLOWED_TAGS = new Set([
  'excellent_work',
  'on_time',
  'great_communication',
  'professional',
  'exceeded_expectations',
  'fair_price',
  'clean_work',
  'polite',
  'experienced',
  'reliable',
  'creative',
  'efficient',
  'poor_quality',
  'late',
  'unprofessional',
  'overpriced',
  'miscommunication',
  'incomplete',
  'rude',
  'inexperienced',
  'clear_requirements',
  'responsive',
  'fair_payment',
  'understanding',
  'flexible',
  'prompt_payment',
  'good_communication',
  'unclear_requirements',
  'unresponsive',
  'payment_issues',
  'unrealistic_expectations',
  'poor_communication',
  'changed_requirements',
  'delayed_payment',
]);

export function parsePositiveInt(
  value: string | null,
  fallback: number,
  min: number,
  max: number
): number {
  const parsed = Number.parseInt(value || '', 10);
  if (Number.isNaN(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

export function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function isValidObjectId(value?: string | null): value is string {
  return !!value && Types.ObjectId.isValid(value);
}

export function sanitizeTextList(values: unknown, maxItems: number, maxLength: number): string[] {
  if (!Array.isArray(values)) return [];
  return values
    .slice(0, maxItems)
    .map((value) => (typeof value === 'string' ? value.trim() : ''))
    .filter((value) => value.length > 0)
    .map((value) => value.slice(0, maxLength));
}

export function sanitizeTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return [];
  return tags.slice(0, 12).filter((tag) => typeof tag === 'string' && ALLOWED_TAGS.has(tag));
}

export function getRequiredRatingsForType(reviewType: RouteReviewType): Array<keyof ReviewRating> {
  if (reviewType === 'client_to_fixer') {
    return ['workQuality', 'communication', 'punctuality', 'professionalism'];
  }
  return ['clarity', 'responsiveness', 'paymentTimeliness'];
}
