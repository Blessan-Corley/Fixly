import { redisUtils } from './redis';

const INDIAN_PHONE_REGEX = /^[6-9]\d{9}$/;

export function normalizeEmail(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

export function normalizeIndianPhone(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const digits = value.replace(/\D/g, '');

  if (digits.length === 10 && INDIAN_PHONE_REGEX.test(digits)) {
    return `+91${digits}`;
  }

  if (digits.length === 12 && digits.startsWith('91')) {
    const nationalNumber = digits.slice(2);
    if (INDIAN_PHONE_REGEX.test(nationalNumber)) {
      return `+91${nationalNumber}`;
    }
  }

  if (digits.length === 13 && digits.startsWith('091')) {
    const nationalNumber = digits.slice(3);
    if (INDIAN_PHONE_REGEX.test(nationalNumber)) {
      return `+91${nationalNumber}`;
    }
  }

  return null;
}

export function toPhoneOtpIdentifier(value: unknown): string | null {
  return normalizeIndianPhone(value);
}

export function buildPhoneLookupValues(normalizedPhone: string): string[] {
  const digits = normalizedPhone.replace(/\D/g, '');
  const nationalNumber = digits.startsWith('91') ? digits.slice(2) : digits;

  return Array.from(
    new Set([
      normalizedPhone,
      nationalNumber,
      `91${nationalNumber}`,
      `+${digits}`,
      `0${nationalNumber}`,
    ])
  );
}

export function isValidObjectId(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length === 24 &&
    /^[a-fA-F0-9]{24}$/.test(value) &&
    Number.parseInt(value.substring(0, 8), 16) > 0
  );
}

export function computeIsFullyVerified(
  emailVerified: boolean | null | undefined,
  phoneVerified: boolean | null | undefined
): boolean {
  return Boolean(emailVerified && phoneVerified);
}

export async function invalidateAuthCache(userId: string): Promise<void> {
  // Delete all three cache layers in a single round-trip.
  // user_session   — JWT callback cache (lib/auth/callbacks/jwt.ts)
  // user_data      — session callback fallback cache (lib/auth/callbacks/session.ts)
  // auth_status    — middleware live-auth endpoint cache (app/api/auth/status/route.ts)
  await redisUtils.del(
    `user_session:${userId}`,
    `user_data:${userId}`,
    `auth_status:${userId}`
  );
}
