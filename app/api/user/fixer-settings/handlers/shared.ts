import { Types } from 'mongoose';

import type { IUser } from '@/types/User';

export type UserDocument = IUser & {
  _id: Types.ObjectId;
  addNotification?: (
    type: string,
    title: string,
    message: string,
    data?: unknown
  ) => Promise<IUser>;
  save: () => Promise<unknown>;
};

export function toTrimmedString(value: unknown): string | null {
  return typeof value === 'string' ? value.trim() : null;
}

export function parseError(error: unknown): Error & { name?: string } {
  if (error instanceof Error) return error as Error & { name?: string };
  return new Error('Unknown error');
}
