// In-memory OTP storage as fallback when Redis is unavailable.
// This is intentionally disabled in production because Vercel serverless
// functions do not share process memory across invocations. An OTP written
// during one invocation would be invisible to the verification request that
// lands on a different instance, causing silent auth failures.

import { env } from '@/lib/env';
import { logger } from '@/lib/logger';

type OtpPurpose = string;

export type FallbackOtpRecord = {
  otpHash: string;
  salt: string;
  createdAt: number;
  expiresAt: number;
  attempts: number;
  maxAttempts: number;
  lastAttemptAt: number | null;
};

type FallbackVerificationRecord = {
  identifier: string;
  purpose: OtpPurpose;
  verifiedAt: number;
  expiresAt: number;
};

type OtpVerifyResult = {
  success: boolean;
  message: string;
};

type OtpStats = {
  totalStored: number;
  totalVerifications: number;
  keys: string[];
};

const otpStore = new Map<string, FallbackOtpRecord>();
const verificationStore = new Map<string, FallbackVerificationRecord>();

const cleanupTimer =
  env.NODE_ENV !== 'production'
    ? setInterval(() => {
        const now = Date.now();

        otpStore.forEach((data, key) => {
          if (now > data.expiresAt) {
            otpStore.delete(key);
          }
        });

        verificationStore.forEach((data, key) => {
          if (now > data.expiresAt) {
            verificationStore.delete(key);
          }
        });
      }, 60_000)
    : null;

cleanupTimer?.unref?.();

function assertFallbackAvailable(): void {
  if (env.NODE_ENV === 'production') {
    throw new Error('In-memory OTP fallback is disabled in production. Redis is required.');
  }
}

function getChallengeKey(identifier: string, purpose: OtpPurpose): string {
  return `${identifier}:${purpose}`;
}

function getVerificationKey(identifier: string, purpose: OtpPurpose): string {
  return `${identifier}:${purpose}`;
}

export const fallbackOtpStorage = {
  async store(
    identifier: string,
    record: FallbackOtpRecord,
    purpose: OtpPurpose
  ): Promise<boolean> {
    assertFallbackAvailable();
    try {
      const key = getChallengeKey(identifier, purpose);
      otpStore.set(key, record);
      verificationStore.delete(getVerificationKey(identifier, purpose));
      return true;
    } catch (error: unknown) {
      logger.error({ error }, 'Fallback OTP store failed');
      return false;
    }
  },

  async get(identifier: string, purpose: OtpPurpose): Promise<FallbackOtpRecord | null> {
    assertFallbackAvailable();
    const key = getChallengeKey(identifier, purpose);
    const data = otpStore.get(key);

    if (!data) {
      return null;
    }

    if (Date.now() > data.expiresAt) {
      otpStore.delete(key);
      return null;
    }

    return data;
  },

  async update(
    identifier: string,
    purpose: OtpPurpose,
    record: FallbackOtpRecord
  ): Promise<boolean> {
    assertFallbackAvailable();
    const key = getChallengeKey(identifier, purpose);
    otpStore.set(key, record);
    return true;
  },

  async delete(identifier: string, purpose: OtpPurpose): Promise<boolean> {
    assertFallbackAvailable();
    otpStore.delete(getChallengeKey(identifier, purpose));
    return true;
  },

  async markVerified(
    identifier: string,
    purpose: OtpPurpose,
    ttlSeconds: number
  ): Promise<boolean> {
    assertFallbackAvailable();
    verificationStore.set(getVerificationKey(identifier, purpose), {
      identifier,
      purpose,
      verifiedAt: Date.now(),
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
    return true;
  },

  async consumeVerification(identifier: string, purpose: OtpPurpose): Promise<boolean> {
    assertFallbackAvailable();
    const key = getVerificationKey(identifier, purpose);
    const data = verificationStore.get(key);

    if (!data) {
      return false;
    }

    if (Date.now() > data.expiresAt) {
      verificationStore.delete(key);
      return false;
    }

    verificationStore.delete(key);
    return true;
  },

  async hasVerification(identifier: string, purpose: OtpPurpose): Promise<boolean> {
    assertFallbackAvailable();
    const key = getVerificationKey(identifier, purpose);
    const data = verificationStore.get(key);

    if (!data) {
      return false;
    }

    if (Date.now() > data.expiresAt) {
      verificationStore.delete(key);
      return false;
    }

    return true;
  },

  async verify(identifier: string, purpose: OtpPurpose): Promise<OtpVerifyResult> {
    assertFallbackAvailable();
    const exists = await this.consumeVerification(identifier, purpose);
    if (!exists) {
      return { success: false, message: 'Verification not found or expired' };
    }

    return { success: true, message: 'Verification found' };
  },

  async exists(identifier: string, purpose: OtpPurpose): Promise<boolean> {
    assertFallbackAvailable();
    const challenge = await this.get(identifier, purpose);
    return challenge !== null;
  },

  getStats(): OtpStats {
    assertFallbackAvailable();
    return {
      totalStored: otpStore.size,
      totalVerifications: verificationStore.size,
      keys: Array.from(otpStore.keys()),
    };
  },
};

export default fallbackOtpStorage;
