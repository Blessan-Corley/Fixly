import { z } from 'zod';

import { UsernameUpdateSchema } from './username';

const workingHoursSchema = z
  .object({
    start: z.string().optional(),
    end: z.string().optional(),
    timezone: z.string().optional(),
  })
  .optional();

export const UpdateProfileSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  bio: z.string().max(1000).optional(),
  website: z.string().url().optional(),
  skills: z.array(z.string().min(2).max(50)).max(50).optional(),
  experience: z.string().max(1000).optional(),
  hourlyRate: z.number().nonnegative().optional(),
  serviceRadius: z.number().int().nonnegative().optional(),
  availableNow: z.boolean().optional(),
  workingHours: workingHoursSchema,
});

export const UpdateSettingsSchema = z.object({
  notifications: z.record(z.string(), z.unknown()).optional(),
  privacy: z.record(z.string(), z.unknown()).optional(),
  preferences: z.record(z.string(), z.unknown()).optional(),
});

export const FixerSettingsSchema = z.object({
  autoApply: z.boolean().optional(),
  emergencyAvailable: z.boolean().optional(),
  minimumJobValue: z.number().nonnegative().optional(),
  maximumJobValue: z.number().nonnegative().optional(),
  responseTime: z.string().max(100).optional(),
});

export { UsernameUpdateSchema };
