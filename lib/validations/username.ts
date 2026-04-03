import { z } from 'zod';

const RESERVED_USERNAME_VALUES = [
  'admin',
  'administrator',
  'root',
  'system',
  'support',
  'help',
  'api',
  'www',
  'mail',
  'email',
  'fixly',
  'user',
  'users',
  'profile',
  'dashboard',
  'settings',
  'auth',
  'login',
  'signup',
  'test',
  'demo',
  'temp',
  'sample',
  'null',
  'undefined',
] as const;

export const RESERVED_USERNAMES = new Set<string>(RESERVED_USERNAME_VALUES);

export const UsernameUpdateSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be at most 20 characters')
    .regex(/^[a-z0-9_]+$/, 'Only lowercase letters, numbers, and underscores allowed')
    .regex(/^(?!_)(?!.*_$)/, 'Cannot start or end with underscore')
    .regex(/^(?!.*__)/, 'Cannot contain consecutive underscores')
    .refine((val) => !/^\d+$/.test(val), 'Username cannot be only numbers')
    .refine((val) => !RESERVED_USERNAMES.has(val), 'This username is reserved'),
});

export function normalizeUsername(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

export function validateUsernameFormat(username: string): string | null {
  if (!username) return 'Username is required';
  if (username.length < 3 || username.length > 20) {
    return 'Username must be between 3 and 20 characters';
  }
  if (!/^[a-z0-9_]+$/.test(username)) {
    return 'Username can only contain lowercase letters, numbers, and underscores';
  }
  if (username.startsWith('_') || username.endsWith('_') || username.includes('__')) {
    return 'Username cannot start/end with underscore or contain consecutive underscores';
  }
  if (/^\d+$/.test(username)) {
    return 'Username cannot contain only numbers';
  }
  if (RESERVED_USERNAMES.has(username)) {
    return 'This username is reserved';
  }
  return null;
}
