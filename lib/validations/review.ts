import { z } from 'zod';

export const CreateReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().min(1).max(150),
  comment: z.string().min(1).max(2000),
  pros: z.array(z.string().max(200)).optional(),
  cons: z.array(z.string().max(200)).optional(),
  wouldRecommend: z.boolean().optional(),
  wouldHireAgain: z.boolean().optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
});

export const ReviewHelpfulSchema = z.object({
  reviewId: z.string().min(1),
});
