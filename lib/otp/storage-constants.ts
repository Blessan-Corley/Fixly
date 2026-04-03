import { AppError } from '@/lib/api/errors';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import { shouldAllowInMemoryAuthFallback } from '@/lib/redis';

export const OTP_EXPIRY_TIME_SECONDS = 5 * 60;
export const OTP_VERIFICATION_RECEIPT_TTL_SECONDS = 5 * 60;
export const OTP_SERVICE_UNAVAILABLE_MESSAGE =
  'Verification service temporarily unavailable. Please try again shortly.';

export function canUseInMemoryFallback(): boolean {
  return shouldAllowInMemoryAuthFallback();
}

export function createOtpServiceUnavailableError(error: unknown): AppError {
  const message = error instanceof Error ? error.message : 'Unknown error';
  logger.error(
    {
      event: 'otp_redis_unavailable',
      error: message,
      nodeEnv: env.NODE_ENV,
    },
    'Redis unavailable for OTP flow'
  );

  return new AppError(
    'SERVICE_UNAVAILABLE',
    'OTP service is temporarily unavailable. Please try again in a moment.',
    503
  );
}

export function buildChallengeKey(identifier: string, purpose: string): string {
  return `otp:${purpose}:${identifier}`;
}

export function buildVerificationKey(identifier: string, purpose: string): string {
  return `otp_verified:${purpose}:${identifier}`;
}
