import { Types } from 'mongoose';
import { z } from 'zod';

import { env } from '@/lib/env';
import type { IUser } from '@/types/User';

export type SetupRequestBody = {
  setupKey?: unknown;
  adminData?: unknown;
};

export type AdminData = {
  name?: unknown;
  username?: unknown;
  email?: unknown;
  password?: unknown;
};

export type UserDocument = IUser & {
  _id: Types.ObjectId;
  save: () => Promise<unknown>;
};

export const SetupRequestBodySchema: z.ZodType<SetupRequestBody> = z.object({
  setupKey: z.unknown().optional(),
  adminData: z.unknown().optional(),
});

export const MIN_PASSWORD_LENGTH = 8;

export function toTrimmedString(value: unknown): string | null {
  return typeof value === 'string' ? value.trim() : null;
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object') return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

export function normalizeEmail(value: string): string {
  return value.toLowerCase();
}

export function normalizeUsername(value: string): string {
  return value.toLowerCase();
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function isValidUsername(value: string): boolean {
  return /^[a-z0-9_]{3,20}$/.test(value);
}

export function getAdminSetupKey(): string | null {
  return toTrimmedString(env.ADMIN_SETUP_KEY);
}

export function getRequestIp(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const forwardedIp = forwardedFor.split(',')[0]?.trim();
    if (forwardedIp) return forwardedIp;
  }
  return request.headers.get('x-real-ip')?.trim() || 'unknown';
}

export type ValidatedAdminFields =
  | { valid: false; error: string }
  | { valid: true; name: string; username: string; email: string; password: string };

export function validateAdminFields(adminData: AdminData): ValidatedAdminFields {
  const name = toTrimmedString(adminData.name);
  const usernameRaw = toTrimmedString(adminData.username);
  const emailRaw = toTrimmedString(adminData.email);
  const password = toTrimmedString(adminData.password);

  if (!name || !usernameRaw || !emailRaw || !password) {
    return { valid: false, error: 'All fields are required' };
  }

  const username = normalizeUsername(usernameRaw);
  const email = normalizeEmail(emailRaw);

  if (!isValidUsername(username)) {
    return { valid: false, error: 'Username must be 3-20 chars and contain only lowercase letters, numbers, and underscores' };
  }
  if (!isValidEmail(email)) {
    return { valid: false, error: 'Invalid email address' };
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { valid: false, error: 'Password must be at least 8 characters' };
  }

  return { valid: true, name, username, email, password };
}
