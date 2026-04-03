import type { FieldErrors, FieldValues, Resolver } from 'react-hook-form';
import { z } from 'zod';

import { CreateDisputeSchema } from '@/lib/validations/dispute';

export const EvidenceItemSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['image', 'document']),
  url: z.string().min(1),
  filename: z.string().min(1),
  description: z.string().max(500),
});

export const OptionalAmountSchema = z.preprocess(
  (value) => {
    if (value === '' || value === null || value === undefined) {
      return undefined;
    }

    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : undefined;
    }

    if (typeof value === 'string') {
      const parsed = Number.parseFloat(value);
      return Number.isFinite(parsed) ? parsed : undefined;
    }

    return undefined;
  },
  CreateDisputeSchema.shape.disputedAmount
);

export const DisputeFormSchema = CreateDisputeSchema.pick({
  category: true,
  subcategory: true,
  title: true,
  description: true,
  desiredOutcome: true,
  desiredOutcomeDetails: true,
}).extend({
  disputedAmount: OptionalAmountSchema,
  refundRequested: OptionalAmountSchema,
  additionalPaymentRequested: OptionalAmountSchema,
  evidence: z.array(EvidenceItemSchema),
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
      if (mutableErrors[key]) {
        continue;
      }
      mutableErrors[key] = { type: issue.code, message: issue.message };
    }

    return { values: {} as Record<string, never>, errors };
  };
}
