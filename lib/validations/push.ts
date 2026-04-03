import { z } from 'zod';

export const PushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string(),
  }),
  expirationTime: z.number().nullable().optional(),
});

export const PushPreferencesSchema = z.object({
  jobAlerts: z.boolean().optional(),
  messages: z.boolean().optional(),
  reviews: z.boolean().optional(),
  disputes: z.boolean().optional(),
});
