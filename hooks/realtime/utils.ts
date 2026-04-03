'use client';

import type { ApiResult, LikeEntry } from './types';

export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return 'Unknown error';
};

export const toFiniteCount = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, Math.floor(value));
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return Math.max(0, Math.floor(parsed));
    }
  }

  return null;
};

export const normalizeLikeEntries = (
  value: unknown,
  fallback: LikeEntry[] | undefined
): LikeEntry[] | undefined => {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const normalized = value.filter((entry): entry is LikeEntry => {
    if (typeof entry !== 'object' || entry === null) {
      return false;
    }

    const user = (entry as { user?: unknown }).user;
    const createdAt = (entry as { createdAt?: unknown }).createdAt;

    return (
      (user === undefined || typeof user === 'string') &&
      (createdAt === undefined || typeof createdAt === 'string')
    );
  });

  return normalized;
};

export const parseApiResult = async (response: Response): Promise<ApiResult> => {
  try {
    return (await response.json()) as ApiResult;
  } catch {
    return {};
  }
};

export const isValidIdentifier = (value: string | null | undefined): boolean =>
  Boolean(value && value !== 'null' && value !== 'undefined');
