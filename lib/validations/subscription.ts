import { z } from 'zod';

export const CreateOrderSchema = z.object({
  planId: z.string().optional(),
  role: z.enum(['hirer', 'fixer']).optional(),
  plan: z.enum(['monthly', 'yearly']).optional(),
});

export const VerifyPaymentSchema = z.object({
  orderId: z.string().optional(),
  paymentId: z.string().optional(),
  signature: z.string().optional(),
  sessionId: z.string().optional(),
});
