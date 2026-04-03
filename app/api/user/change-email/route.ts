// Phase 2: Updated change-email mutations to validate CSRF against the authenticated session.
import { z } from 'zod';

import { badRequest, parseBody, requireSession, respond, unauthorized } from '@/lib/api';
import { logger } from '@/lib/logger';
import { csrfGuard } from '@/lib/security/csrf';
import {
  sendEmailChangeOtpForUser,
  verifyAndApplyEmailChangeForUser,
} from '@/services/auth/emailChangeService';
import { rateLimit } from '@/utils/rateLimiting';

type ChangeEmailBody = {
  newEmail?: unknown;
  otp?: unknown;
  step?: unknown;
};

const ChangeEmailSchema = z
  .object({
    newEmail: z.string().email().optional(),
    otp: z.string().min(4).optional(),
    step: z.enum(['send_otp', 'verify_and_change']),
  })
  .superRefine((value, ctx) => {
    if (!value.newEmail) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'newEmail is required',
        path: ['newEmail'],
      });
    }
    if (value.step === 'verify_and_change' && !value.otp) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'otp is required',
        path: ['otp'],
      });
    }
  });

function asTrimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export async function POST(request: Request) {
  try {
    const rateLimitResult = await rateLimit(request, 'change_email', 3, 60 * 60 * 1000, {
      requireRedis: true,
    });
    if (!rateLimitResult.success) {
      if (rateLimitResult.degraded) {
        return respond(
          {
            success: false,
            message: 'Email change is temporarily unavailable. Please try again shortly.',
          },
          503
        );
      }
      const retryAfter = Math.max(
        0,
        Math.ceil(((rateLimitResult.resetTime ?? Date.now() + 3600_000) - Date.now()) / 1000)
      );
      return respond(
        {
          success: false,
          message: 'Too many email change attempts. Please try again later.',
          retryAfter,
          resetTime: new Date(rateLimitResult.resetTime ?? Date.now() + retryAfter * 1000).toISOString(),
        },
        429,
        { headers: { 'Retry-After': String(retryAfter) } }
      );
    }

    const auth = await requireSession();
    if ('error' in auth) return auth.error;
    const userId = auth.session.user.id;
    if (!userId) return unauthorized();
    const csrfResult = csrfGuard(request, auth.session);
    if (csrfResult) return csrfResult;

    const parsed = await parseBody(request, ChangeEmailSchema);
    if ('error' in parsed) return parsed.error;

    const newEmail = parsed.data.newEmail;
    const otp = parsed.data.otp;
    const step = asTrimmedString(parsed.data.step);

    if (step === 'send_otp') {
      const result = await sendEmailChangeOtpForUser(userId, newEmail);
      return respond(
        {
          success: result.success,
          message: result.message,
          expiresAt: result.expiresAt,
        },
        result.status
      );
    }

    if (step === 'verify_and_change') {
      const result = await verifyAndApplyEmailChangeForUser({
        userId,
        rawNewEmail: newEmail,
        rawOtp: otp,
      });
      return respond(
        {
          success: result.success,
          message: result.message,
          user: result.user,
        },
        result.status
      );
    }

    return badRequest('Invalid step parameter');
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('Change email error:', err);
    return respond(
      {
        success: false,
        message: 'An error occurred while changing email address',
      },
      500
    );
  }
}
