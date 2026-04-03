import { z } from 'zod';

export type TimeEstimateInput = {
  value?: number | string;
  unit?: 'hours' | 'days' | 'weeks' | string;
};

export type MaterialInput = {
  item?: string;
  quantity?: number | string;
  estimatedCost?: number | string;
};

export type ApplyBody = {
  proposedAmount?: number | string;
  timeEstimate?: TimeEstimateInput;
  estimatedTime?: string;
  materialsList?: MaterialInput[];
  description?: string;
  message?: string;
  coverLetter?: string;
  workPlan?: string;
  materialsIncluded?: boolean;
  requirements?: string;
  specialNotes?: string;
  negotiationNotes?: string;
};

export const timeEstimateSchema = z
  .object({
    value: z.union([z.number(), z.string()]).optional(),
    unit: z.string().optional(),
  })
  .partial();

export const materialSchema = z
  .object({
    item: z.string().optional(),
    quantity: z.union([z.number(), z.string()]).optional(),
    estimatedCost: z.union([z.number(), z.string()]).optional(),
  })
  .partial();

export const applyBodySchema = z.object({
  proposedAmount: z.union([z.number(), z.string()]).optional(),
  timeEstimate: timeEstimateSchema.optional(),
  estimatedTime: z.string().optional(),
  materialsList: z.array(materialSchema).optional(),
  description: z.string().optional(),
  message: z.string().optional(),
  coverLetter: z.string().optional(),
  workPlan: z.string().optional(),
  materialsIncluded: z.boolean().optional(),
  requirements: z.string().optional(),
  specialNotes: z.string().optional(),
  negotiationNotes: z.string().optional(),
});
