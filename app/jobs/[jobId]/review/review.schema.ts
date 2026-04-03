import type { FieldErrors, FieldValues, Resolver } from 'react-hook-form';
import { z } from 'zod';

import { CreateReviewSchema } from '@/lib/validations/review';

const OptionalRatingSchema = z.preprocess(
  (value) => {
    if (typeof value === 'number' && value <= 0) return undefined;
    return value;
  },
  z.number().int().min(1).max(5).optional()
);

export const ReviewFormSchema = CreateReviewSchema.omit({
  rating: true,
  title: true,
  comment: true,
  pros: true,
  cons: true,
  tags: true,
}).extend({
  rating: z.object({
    overall: z.number().int().min(1).max(5),
    workQuality: OptionalRatingSchema,
    communication: OptionalRatingSchema,
    punctuality: OptionalRatingSchema,
    professionalism: OptionalRatingSchema,
    clarity: OptionalRatingSchema,
    responsiveness: OptionalRatingSchema,
    paymentTimeliness: OptionalRatingSchema,
  }),
  title: CreateReviewSchema.shape.title.max(100),
  comment: CreateReviewSchema.shape.comment.max(1000),
  pros: z.array(z.string().max(200)).max(10),
  cons: z.array(z.string().max(200)).max(10),
  tags: z.array(z.string().max(50)).max(12),
});

export function zodResolver<TFieldValues extends FieldValues>(
  schema: z.ZodTypeAny
): Resolver<TFieldValues> {
  return async (values) => {
    const result = schema.safeParse(values);
    if (result.success) {
      return { values: result.data as TFieldValues, errors: {} };
    }

    const errors: FieldErrors<TFieldValues> = {};
    const mutableErrors = errors as Record<string, unknown>;

    for (const issue of result.error.issues) {
      const key = String(issue.path[0] ?? 'root');
      if (mutableErrors[key]) continue;
      mutableErrors[key] = { type: issue.code, message: issue.message };
    }

    return { values: {} as Record<string, never>, errors };
  };
}
