import { Types } from 'mongoose';
import { z } from 'zod';

import type { AuthMethod, IUser } from '@/types/User';

export const VerifyPhoneFirebaseSchema = z.object({
  idToken: z.string().min(1),
  phoneNumber: z.string().optional(),
});

export type UserDocument = IUser & {
  _id: Types.ObjectId;
  addNotification?: (type: string, title: string, message: string, data?: unknown) => Promise<IUser>;
  save: () => Promise<unknown>;
};

export type DecodedFirebaseToken = {
  uid?: string;
  phone_number?: string;
};

export type PhoneVerificationUserFields = Pick<IUser, 'banned' | 'isActive' | 'deletedAt' | 'phoneVerified' | 'emailVerified' | 'authMethod'>;

export function toTrimmedString(value: unknown): string | null {
  return typeof value === 'string' ? value.trim() : null;
}

export function normalizeIndianNumber(value: string | null): string | null {
  if (!value) return null;
  const digits = value.replace(/\D/g, '');
  if (digits.length === 10) return digits;
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  return null;
}

export function isAccountBlocked(user: Pick<IUser, 'banned' | 'isActive' | 'deletedAt'>): boolean {
  return Boolean(user.banned || user.isActive === false || user.deletedAt);
}

export function buildProvidersSet(existing: AuthMethod[] | undefined): AuthMethod[] {
  return Array.from(new Set<AuthMethod>([...(existing || []), 'phone']));
}
