import type { FieldErrors, Resolver } from 'react-hook-form';
import { z } from 'zod';

import { emailSchema, passwordSchema } from '@/lib/validations/auth';

import type { ForgotPasswordFormData } from './forgot-password.types';

export const forgotPasswordEmailSchema = z.object({
  email: emailSchema,
});

export const forgotPasswordOtpSchema = z.object({
  otp: z.string().length(6, 'Enter the 6-digit verification code.'),
});

export const forgotPasswordResetSchema = z
  .object({
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

export function forgotPasswordResolver(
  schema: z.ZodType<unknown>
): Resolver<ForgotPasswordFormData> {
  return async (values) => {
    const parsed = schema.safeParse(values);
    if (parsed.success) {
      return { values: parsed.data as ForgotPasswordFormData, errors: {} };
    }

    const fieldErrors: FieldErrors<ForgotPasswordFormData> = {};

    parsed.error.issues.forEach((issue) => {
      const path = issue.path[0];
      if (typeof path !== 'string') return;

      const field = path as keyof ForgotPasswordFormData;
      fieldErrors[field] = { type: issue.code, message: issue.message };
    });

    return { values: {} as Record<string, never>, errors: fieldErrors };
  };
}
