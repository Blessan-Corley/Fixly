import { z } from 'zod';

export const CreateOrderSchema = z.object({
  planId: z.string().optional(),
  role: z.enum(['hirer', 'fixer']).optional(),
  plan: z.enum(['monthly', 'yearly']).optional(),
});

export const VerifyPaymentSchema = z.object({
  razorpay_order_id: z.string().trim().min(1).optional(),
  razorpay_payment_id: z.string().trim().min(1).optional(),
  razorpay_signature: z.string().trim().min(1).optional(),
});
