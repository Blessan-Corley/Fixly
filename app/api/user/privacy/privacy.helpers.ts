import { z } from 'zod';

import { env } from '@/lib/env';

export type PrivacyInput = {
  profileVisibility?: unknown;
  showPhone?: unknown;
  showEmail?: unknown;
  showLocation?: unknown;
  showRating?: unknown;
  allowReviews?: unknown;
  allowMessages?: unknown;
  dataSharingConsent?: unknown;
};

export type PutBody = {
  privacy?: unknown;
};

export type DeleteBody = {
  confirmDelete?: unknown;
};

export const PrivacyBodySchema = z.object({
  privacy: z.unknown().optional(),
});

export const DeleteAccountSchema = z.object({
  confirmDelete: z.unknown().optional(),
});

export const VALID_VISIBILITY = new Set(['public', 'verified', 'private']);
export const NEXTAUTH_COOKIE_PREFIX = env.NODE_ENV === 'production' ? '__Secure-' : '';
export const AUTH_CONTEXT_COOKIE_NAME =
  env.NODE_ENV === 'production' ? '__Secure-fixly-auth-context' : 'fixly-auth-context';

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function asBooleanOrUndefined(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  return undefined;
}

export function asTrimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function toValidationErrors(privacy: PrivacyInput): string[] {
  const errors: string[] = [];

  if (
    privacy.profileVisibility !== undefined &&
    (typeof privacy.profileVisibility !== 'string' ||
      !VALID_VISIBILITY.has(privacy.profileVisibility))
  ) {
    errors.push('Invalid profile visibility setting');
  }

  const booleanLabels: Record<keyof Omit<PrivacyInput, 'profileVisibility'>, string> = {
    showPhone: 'Show phone number',
    showEmail: 'Show email address',
    showLocation: 'Show location',
    showRating: 'Show rating',
    allowReviews: 'Allow reviews',
    allowMessages: 'Allow messages',
    dataSharingConsent: 'Data sharing consent',
  };

  (Object.keys(booleanLabels) as Array<keyof typeof booleanLabels>).forEach((field) => {
    const value = privacy[field];
    if (value !== undefined && typeof value !== 'boolean') {
      errors.push(`${booleanLabels[field]} must be true or false`);
    }
  });

  return errors;
}
