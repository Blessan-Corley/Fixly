import { z } from 'zod';

export type LegacyReviewType =
  | 'hirer_to_fixer'
  | 'fixer_to_hirer'
  | 'client_to_fixer'
  | 'fixer_to_client';

export type ReviewRatingObject = {
  overall?: number;
  workQuality?: number;
  communication?: number;
  punctuality?: number;
  professionalism?: number;
  quality?: number;
  timeliness?: number;
  clarity?: number;
  responsiveness?: number;
  paymentTimeliness?: number;
};

export type ReviewBody = {
  rating?: number | ReviewRatingObject;
  review?: string;
  comment?: string;
  reviewType?: LegacyReviewType;
  categories?: {
    communication?: number;
    quality?: number;
    timeliness?: number;
    professionalism?: number;
    clarity?: number;
    responsiveness?: number;
    paymentTimeliness?: number;
    workQuality?: number;
    punctuality?: number;
  };
};

export type CompletionRating = {
  rating?: number;
  review?: string;
  ratedAt?: Date;
  ratedBy?: unknown;
  categories?: Record<string, number>;
};

export type CompletionState = {
  fixerRating?: CompletionRating;
  hirerRating?: CompletionRating;
  reviewStatus?: string;
};

export type JobReviewProjection = {
  completion?: CompletionState;
};

export const reviewRatingObjectSchema = z
  .object({
    overall: z.number().optional(),
    workQuality: z.number().optional(),
    communication: z.number().optional(),
    punctuality: z.number().optional(),
    professionalism: z.number().optional(),
    quality: z.number().optional(),
    timeliness: z.number().optional(),
    clarity: z.number().optional(),
    responsiveness: z.number().optional(),
    paymentTimeliness: z.number().optional(),
  })
  .partial();

export const reviewBodySchema = z.object({
  rating: z.union([z.number(), reviewRatingObjectSchema]).optional(),
  review: z.string().optional(),
  comment: z.string().optional(),
  reviewType: z
    .enum(['hirer_to_fixer', 'fixer_to_hirer', 'client_to_fixer', 'fixer_to_client'])
    .optional(),
  categories: z
    .object({
      communication: z.number().optional(),
      quality: z.number().optional(),
      timeliness: z.number().optional(),
      professionalism: z.number().optional(),
      clarity: z.number().optional(),
      responsiveness: z.number().optional(),
      paymentTimeliness: z.number().optional(),
      workQuality: z.number().optional(),
      punctuality: z.number().optional(),
    })
    .partial()
    .optional(),
});
