import { Types } from 'mongoose';
import { z } from 'zod';

import type { IUser, VerificationStatus } from '@/types/User';

export type SessionUser = {
  id?: string;
  role?: string;
};

export type UserDocument = IUser & {
  _id: Types.ObjectId;
  addNotification?: (type: string, title: string, message: string, data?: unknown) => Promise<IUser>;
  save: () => Promise<unknown>;
};

export const VerificationActionSchema = z.object({
  userId: z.string().min(1),
  action: z.enum(['approve', 'reject']),
  rejectionReason: z.string().optional(),
});

export const VALID_VERIFICATION_STATUSES = new Set<VerificationStatus>([
  'none',
  'pending',
  'approved',
  'rejected',
]);

export const VALID_ACTIONS = new Set(['approve', 'reject']);
export const MAX_PAGINATION_LIMIT = 50;
export const MAX_REJECTION_REASON_LENGTH = 500;

export function toTrimmedString(value: unknown): string | null {
  return typeof value === 'string' ? value.trim() : null;
}

export function parseError(error: unknown): Error {
  if (error instanceof Error) return error;
  return new Error('Unknown error');
}

export function parsePageParam(value: string | null, defaultValue: number): number {
  if (!value) return defaultValue;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return defaultValue;
  return parsed;
}

export function parseLimitParam(value: string | null, defaultValue: number): number {
  if (!value) return defaultValue;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return defaultValue;
  return Math.min(parsed, MAX_PAGINATION_LIMIT);
}

export function transformApplication(user: UserDocument) {
  return {
    id: user._id,
    applicationId: user.verification?.applicationId,
    userName: user.name,
    userEmail: user.email,
    userPhone: user.phone,
    documentType: user.verification?.documentType,
    status: user.verification?.status,
    submittedAt: user.verification?.submittedAt,
    additionalInfo: user.verification?.additionalInfo,
    documents: user.verification?.documents,
    rejectionReason: user.verification?.rejectionReason,
    reviewedAt: user.verification?.reviewedAt,
    reviewedBy: user.verification?.reviewedBy,
  };
}
