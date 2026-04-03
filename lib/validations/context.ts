import { z } from 'zod';

export const SetContextSchema = z
  .object({
    context: z.enum(['signup', 'signin']).optional(),
    role: z.enum(['hirer', 'fixer']).optional(),
    step: z.string().optional(),
  })
  .refine((value) => Boolean(value.context || value.role), {
    message: 'Context or role is required',
  });

export const ContextResponseSchema = z.object({
  context: z.enum(['signup', 'signin']).nullable(),
});
