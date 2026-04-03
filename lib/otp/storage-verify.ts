import { logger } from '@/lib/logger';
import { redisUtils } from '@/lib/redis';

import type { FallbackOtpRecord } from '../otpFallback';
import { fallbackOtpStorage } from '../otpFallback';

import { compareOtpHash, createOtpHash, createOtpRecord } from './hashing';
import {
  OTP_SERVICE_UNAVAILABLE_MESSAGE,
  OTP_VERIFICATION_RECEIPT_TTL_SECONDS,
  buildChallengeKey,
  buildVerificationKey,
  canUseInMemoryFallback,
  createOtpServiceUnavailableError,
} from './storage-constants';
import type { OtpData, OtpVerificationReceipt, VerifyOtpResponse } from './types';

export type MutableRedisState = { useRedis: boolean };

export async function verifyOtp(
  identifier: string,
  inputOtp: string,
  purpose: string,
  state: MutableRedisState
): Promise<VerifyOtpResponse> {
  const providedOtp = String(inputOtp);

  if (state.useRedis) {
    try {
      const challengeKey = buildChallengeKey(identifier, purpose);
      const verificationKey = buildVerificationKey(identifier, purpose);
      const data = await redisUtils.get<OtpData>(challengeKey);

      if (!data) {
        // Perform a dummy hash to equalise response time regardless of whether the
        // identifier is registered, preventing timing-based user enumeration.
        const dummy = createOtpRecord(identifier, purpose, providedOtp, 300);
        const dummyHash = createOtpHash(identifier, purpose, providedOtp, dummy.salt);
        compareOtpHash(dummy.otpHash, dummyHash);
        return { success: false, message: 'OTP not found or expired' };
      }

      if (Date.now() > data.expiresAt) {
        await redisUtils.del(challengeKey);
        return { success: false, message: 'OTP has expired' };
      }

      if (data.attempts >= data.maxAttempts) {
        await redisUtils.del(challengeKey);
        return {
          success: false,
          message: 'Too many invalid attempts. Please request a new code.',
        };
      }

      const expectedHash = createOtpHash(identifier, purpose, providedOtp, data.salt);
      if (compareOtpHash(data.otpHash, expectedHash)) {
        const receipt: OtpVerificationReceipt = {
          identifier,
          purpose,
          verifiedAt: Date.now(),
        };

        await Promise.allSettled([
          redisUtils.del(challengeKey),
          redisUtils.set(verificationKey, receipt, OTP_VERIFICATION_RECEIPT_TTL_SECONDS),
        ]);

        return { success: true, message: 'OTP verified successfully' };
      }

      const updatedRecord: OtpData = {
        ...data,
        attempts: data.attempts + 1,
        lastAttemptAt: Date.now(),
      };

      if (updatedRecord.attempts >= updatedRecord.maxAttempts) {
        await redisUtils.del(challengeKey);
        return {
          success: false,
          message: 'Too many invalid attempts. Please request a new code.',
        };
      }

      const ttlSeconds = Math.max(1, Math.ceil((data.expiresAt - Date.now()) / 1000));
      await redisUtils.set(challengeKey, updatedRecord, ttlSeconds);

      return { success: false, message: 'Invalid OTP' };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('[OTP] Redis verify failed:', message);
      state.useRedis = false;
      if (!canUseInMemoryFallback()) {
        throw createOtpServiceUnavailableError(error);
      }
    }
  }

  if (!canUseInMemoryFallback()) {
    return { success: false, message: OTP_SERVICE_UNAVAILABLE_MESSAGE };
  }

  const data = await fallbackOtpStorage.get(identifier, purpose);
  if (!data) {
    return { success: false, message: 'OTP not found or expired' };
  }

  if (Date.now() > data.expiresAt) {
    await fallbackOtpStorage.delete(identifier, purpose);
    return { success: false, message: 'OTP has expired' };
  }

  if (data.attempts >= data.maxAttempts) {
    await fallbackOtpStorage.delete(identifier, purpose);
    return { success: false, message: 'Too many invalid attempts. Please request a new code.' };
  }

  const expectedHash = createOtpHash(identifier, purpose, providedOtp, data.salt);
  if (compareOtpHash(data.otpHash, expectedHash)) {
    await fallbackOtpStorage.delete(identifier, purpose);
    await fallbackOtpStorage.markVerified(
      identifier,
      purpose,
      OTP_VERIFICATION_RECEIPT_TTL_SECONDS
    );
    return { success: true, message: 'OTP verified successfully' };
  }

  const updatedRecord: FallbackOtpRecord = {
    ...data,
    attempts: data.attempts + 1,
    lastAttemptAt: Date.now(),
  };

  if (updatedRecord.attempts >= updatedRecord.maxAttempts) {
    await fallbackOtpStorage.delete(identifier, purpose);
    return { success: false, message: 'Too many invalid attempts. Please request a new code.' };
  }

  await fallbackOtpStorage.update(identifier, purpose, updatedRecord);
  return { success: false, message: 'Invalid OTP' };
}
