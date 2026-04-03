import { z } from 'zod';

export const ContactFormSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  subject: z.string().max(120).optional(),
  message: z.string().min(10).max(2000),
  phone: z.string().max(20).optional(),
  category: z.string().max(50).optional(),
});
