import type { FieldErrors, FieldValues, Resolver } from 'react-hook-form';
import { z } from 'zod';

export type BudgetType = 'fixed' | 'negotiable';

export interface JobBudget {
  type?: BudgetType | string;
  amount?: number | string | null;
}

export interface RepostableJob {
  title?: string;
  budget?: JobBudget;
}

export interface RepostFormData {
  budgetType: BudgetType;
  budgetAmount: string;
  deadline: string;
  title: string;
}

export interface RepostSubmitData {
  budgetType: BudgetType;
  budgetAmount: number | null;
  deadline: string;
  title: string;
}

export const normalizeBudgetType = (value: JobBudget['type']): BudgetType =>
  value === 'negotiable' ? 'negotiable' : 'fixed';

export const toBudgetAmountString = (value: JobBudget['amount']): string => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : '';
  }
  if (typeof value === 'string') {
    return value;
  }
  return '';
};

export const buildInitialFormData = (job?: RepostableJob | null): RepostFormData => ({
  budgetType: normalizeBudgetType(job?.budget?.type),
  budgetAmount: toBudgetAmountString(job?.budget?.amount),
  deadline: '',
  title: job?.title ? `${job.title} (Reposted)` : '',
});

export const RepostFormSchema = z
  .object({
    title: z.string().trim().min(1, 'Job title is required'),
    budgetType: z.enum(['fixed', 'negotiable']),
    budgetAmount: z.string(),
    deadline: z.string().min(1, 'Deadline is required'),
  })
  .superRefine((values, context) => {
    if (values.budgetType === 'fixed') {
      const parsedBudget = Number(values.budgetAmount);
      if (!values.budgetAmount || Number.isNaN(parsedBudget) || parsedBudget <= 0) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['budgetAmount'],
          message: 'Please enter a valid budget amount',
        });
      }
    }

    if (values.deadline && new Date(values.deadline) <= new Date()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['deadline'],
        message: 'Deadline must be in the future',
      });
    }
  });

export function makeZodResolver<TFieldValues extends FieldValues>(
  schema: z.ZodTypeAny
): Resolver<TFieldValues> {
  return async (values) => {
    const result = schema.safeParse(values);

    if (result.success) {
      return {
        values: result.data as TFieldValues,
        errors: {},
      };
    }

    const errors: FieldErrors<TFieldValues> = {};
    const mutableErrors = errors as Record<string, unknown>;

    for (const issue of result.error.issues) {
      const key = String(issue.path[0] ?? 'root');
      if (mutableErrors[key]) {
        continue;
      }

      mutableErrors[key] = {
        type: issue.code,
        message: issue.message,
      };
    }

    return {
      values: {} as Record<string, never>,
      errors,
    };
  };
}
