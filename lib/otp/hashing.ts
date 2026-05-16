import crypto from 'crypto';

import { env } from '@/lib/env';

import type { OtpData } from './types';

const OTP_MAX_ATTEMPTS = 5;

export function getOtpSecret(): string {
  // AUTH_OTP_SECRET is the dedicated HMAC key for OTP hashing.
  // It must be separate from NEXTAUTH_SECRET to limit blast radius if one key is rotated.
  // Fallback to NEXTAUTH_SECRET only for backward-compatibility until AUTH_OTP_SECRET is set.
  const secret = env.AUTH_OTP_SECRET ?? env.NEXTAUTH_SECRET ?? env.AUTH_SECRET;
  if (!secret) {
    throw new Error(
      'OTP secret is not configured. Set AUTH_OTP_SECRET (recommended) or NEXTAUTH_SECRET.'
    );
  }
  return secret;
}

export function createOtpHash(
  identifier: string,
  purpose: string,
  otp: string,
  salt: string
): string {
  return crypto
    .createHash('sha256')
    .update(`${getOtpSecret()}:${identifier}:${purpose}:${salt}:${otp}`)
    .digest('hex');
}

export function createOtpRecord(
  identifier: string,
  purpose: string,
  otp: string,
  ttlSeconds: number
): OtpData {
  const salt = crypto.randomBytes(16).toString('hex');
  const now = Date.now();

  return {
    otpHash: createOtpHash(identifier, purpose, otp, salt),
    salt,
    createdAt: now,
    expiresAt: now + ttlSeconds * 1000,
    attempts: 0,
    maxAttempts: OTP_MAX_ATTEMPTS,
    lastAttemptAt: null,
  };
}

export function compareOtpHash(expectedHash: string, actualHash: string): boolean {
  const expected = Buffer.from(expectedHash, 'hex');
  const actual = Buffer.from(actualHash, 'hex');

  if (expected.length !== actual.length) {
    return false;
  }

  return crypto.timingSafeEqual(expected, actual);
}

export function generateOTP(): string {
  const randomNumber = crypto.randomInt(100000, 1_000_000);
  return String(randomNumber);
}
