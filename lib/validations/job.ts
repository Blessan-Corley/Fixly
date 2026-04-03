import { z } from 'zod';

const jobTypeSchema = z.enum(['one-time', 'recurring', 'contract', 'project']);
const urgencySchema = z.enum(['asap', 'flexible', 'scheduled']);
const budgetTypeSchema = z.enum(['fixed', 'negotiable', 'hourly']);
const jobStatusSchema = z.enum([
  'open',
  'in_progress',
  'completed',
  'cancelled',
  'disputed',
  'expired',
]);

const locationSchema = z.object({
  address: z.string().min(1).max(300),
  city: z.string().min(1).max(100),
  state: z.string().min(1).max(100),
  pincode: z
    .string()
    .regex(/^\d{6}$/)
    .optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
});

const budgetSchema = z.object({
  type: budgetTypeSchema,
  amount: z.number().nonnegative(),
  materialsIncluded: z.boolean().optional(),
});

export const CreateJobSchema = z.object({
  title: z.string().min(10).max(80),
  description: z.string().min(30).max(5000),
  type: jobTypeSchema,
  urgency: urgencySchema,
  skillsRequired: z.array(z.string().min(2).max(50)).max(30).default([]),
  budget: budgetSchema,
  location: locationSchema,
  deadline: z.coerce.date().optional(),
  scheduledDate: z.coerce.date().optional(),
});

export const UpdateJobSchema = CreateJobSchema.partial();

export const JobSearchParamsSchema = z.object({
  q: z.string().optional(),
  location: z.string().optional(),
  skills: z.array(z.string()).optional(),
  budgetMin: z.coerce.number().nonnegative().optional(),
  budgetMax: z.coerce.number().nonnegative().optional(),
  budgetType: budgetTypeSchema.optional(),
  urgency: urgencySchema.optional(),
  datePosted: z.string().optional(),
  sortBy: z
    .enum(['relevance', 'newest', 'deadline', 'budget_high', 'budget_low', 'popular', 'distance'])
    .optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(12),
});

export const JobStatusUpdateSchema = z.object({
  status: jobStatusSchema,
});

export const JobDraftSchema = CreateJobSchema.partial();
