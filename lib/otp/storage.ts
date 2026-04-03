import { logger } from '@/lib/logger';
import { getRedis, initRedis, redisUtils } from '@/lib/redis';

import type { FallbackOtpRecord } from '../otpFallback';
import { fallbackOtpStorage } from '../otpFallback';

import { createOtpRecord } from './hashing';
import {
  buildChallengeKey,
  buildVerificationKey,
  canUseInMemoryFallback,
  createOtpServiceUnavailableError,
} from './storage-constants';
import { verifyOtp } from './storage-verify';
import type { OtpStatusResponse, OtpVerificationReceipt, VerifyOtpResponse } from './types';

export {
  OTP_EXPIRY_TIME_SECONDS,
  OTP_VERIFICATION_RECEIPT_TTL_SECONDS,
  OTP_SERVICE_UNAVAILABLE_MESSAGE,
  canUseInMemoryFallback,
  createOtpServiceUnavailableError,
  buildChallengeKey,
  buildVerificationKey,
} from './storage-constants';

const redisClient = initRedis();
const redisState = { useRedis: Boolean(redisClient) };

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

function canUseRedis(): boolean {
  if (redisState.useRedis) {
    return true;
  }

  const client = getRedis();
  redisState.useRedis = Boolean(client);
  return redisState.useRedis;
}

export const otpStorage = {
  async store(
    identifier: string,
    otp: string,
    purpose: string,
    ttlSeconds: number
  ): Promise<boolean> {
    const record = createOtpRecord(identifier, purpose, String(otp), ttlSeconds);

    if (canUseRedis()) {
      try {
        const challengeKey = buildChallengeKey(identifier, purpose);
        const verificationKey = buildVerificationKey(identifier, purpose);

        const success = await redisUtils.set(challengeKey, record, ttlSeconds);
        if (success) {
          await redisUtils.del(verificationKey);
          return true;
        }

        redisState.useRedis = false;
      } catch (error: unknown) {
        logger.error('[OTP] Redis store failed:', getErrorMessage(error));
        redisState.useRedis = false;
        if (!canUseInMemoryFallback()) {
          throw createOtpServiceUnavailableError(error);
        }
      }
    }

    if (!canUseInMemoryFallback()) {
      return false;
    }

    return fallbackOtpStorage.store(identifier, record as FallbackOtpRecord, purpose);
  },

  verify(identifier: string, inputOtp: string, purpose: string): Promise<VerifyOtpResponse> {
    return verifyOtp(identifier, inputOtp, purpose, redisState);
  },

  async checkStatus(identifier: string, purpose: string): Promise<OtpStatusResponse> {
    if (canUseRedis()) {
      try {
        const key = buildChallengeKey(identifier, purpose);
        const exists = await redisUtils.exists(key);
        return { exists, expired: !exists };
      } catch (error: unknown) {
        logger.error('[OTP] Redis status check failed:', getErrorMessage(error));
        redisState.useRedis = false;
        if (!canUseInMemoryFallback()) {
          throw createOtpServiceUnavailableError(error);
        }
      }
    }

    if (!canUseInMemoryFallback()) {
      return { exists: false, expired: false };
    }

    const exists = await fallbackOtpStorage.exists(identifier, purpose);
    return { exists, expired: !exists };
  },

  async consumeVerification(identifier: string, purpose: string): Promise<boolean> {
    if (canUseRedis()) {
      try {
        const verificationKey = buildVerificationKey(identifier, purpose);
        const exists = await redisUtils.get<OtpVerificationReceipt>(verificationKey);
        if (!exists) {
          return false;
        }

        await redisUtils.del(verificationKey);
        return true;
      } catch (error: unknown) {
        logger.error('[OTP] Redis verification receipt failed:', getErrorMessage(error));
        redisState.useRedis = false;
        if (!canUseInMemoryFallback()) {
          throw createOtpServiceUnavailableError(error);
        }
      }
    }

    if (!canUseInMemoryFallback()) {
      return false;
    }

    return fallbackOtpStorage.consumeVerification(identifier, purpose);
  },

  async hasVerification(identifier: string, purpose: string): Promise<boolean> {
    if (canUseRedis()) {
      try {
        const verificationKey = buildVerificationKey(identifier, purpose);
        const exists = await redisUtils.get<OtpVerificationReceipt>(verificationKey);
        return Boolean(exists);
      } catch (error: unknown) {
        logger.error('[OTP] Redis verification receipt lookup failed:', getErrorMessage(error));
        redisState.useRedis = false;
        if (!canUseInMemoryFallback()) {
          throw createOtpServiceUnavailableError(error);
        }
      }
    }

    if (!canUseInMemoryFallback()) {
      return false;
    }

    return fallbackOtpStorage.hasVerification(identifier, purpose);
  },
};
