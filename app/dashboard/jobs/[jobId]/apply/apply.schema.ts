import type { FieldErrors, FieldValues, Resolver } from 'react-hook-form';
import { z } from 'zod';

import { CreateApplicationSchema } from '@/lib/validations/application';

export const MaterialItemSchema = z.object({
  item: z.string().max(200),
  quantity: z.number().min(1),
  estimatedCost: z.number().nonnegative(),
});

export const ApplicationFormSchema = z.object({
  proposedAmount: z
    .string()
    .min(1, 'Please enter a valid proposed amount')
    .refine((value) => {
      const amount = Number.parseFloat(value);
      return Number.isFinite(amount) && amount > 0;
    }, 'Please enter a valid proposed amount')
    .refine((value) => {
      const amount = Number.parseFloat(value);
      return Number.isFinite(amount) && amount <= 1000000;
    }, 'Proposed amount exceeds allowed maximum'),
  description: CreateApplicationSchema.shape.coverLetter.min(20).max(600),
  requirements: CreateApplicationSchema.shape.availability.unwrap().max(500),
  specialNotes: CreateApplicationSchema.shape.experience.unwrap().max(300),
  timeEstimate: z.object({
    value: z.string(),
    unit: z.enum(['hours', 'days', 'weeks']),
  }),
  materialsIncluded: z.boolean(),
  materialsList: z.array(MaterialItemSchema).max(30),
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
