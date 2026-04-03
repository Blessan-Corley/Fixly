import { z } from 'zod';

export const HelpFeedbackSchema = z.object({
  category: z.string().min(1, 'Category is required').max(100, 'Category is too long'),
  message: z
    .string()
    .min(10, 'Feedback message must be at least 10 characters')
    .max(2000, 'Feedback message is too long'),
  email: z.string().email('Please enter a valid email address').optional(),
  articleId: z.string().optional(),
  rating: z.number().min(1, 'Rating must be at least 1').max(5, 'Rating must be at most 5').optional(),
});
