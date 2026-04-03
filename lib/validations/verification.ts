import { z } from 'zod';

export const VerificationApplySchema = z.object({
  type: z.enum(['id', 'address', 'professional']),
  documents: z.array(z.string().url()).min(1).max(5),
  notes: z.string().max(500).optional(),
});
