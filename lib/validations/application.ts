import { z } from 'zod';

export const CreateApplicationSchema = z.object({
  coverLetter: z.string().max(3000),
  proposedRate: z.number().nonnegative().optional(),
  availability: z.string().max(200).optional(),
  experience: z.string().max(2000).optional(),
});

export const WithdrawApplicationSchema = z.object({
  reason: z.string().max(500).optional(),
});
