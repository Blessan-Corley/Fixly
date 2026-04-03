import { Types } from 'mongoose';
import { NextResponse } from 'next/server';

import { badRequest } from '@/lib/api';

export type JobRouteParams = {
  jobId: string;
};

export type JobRouteContext = {
  params: Promise<JobRouteParams>;
};

type ErrorKey = 'message' | 'error';

type JobIdResult = { ok: true; jobId: string } | { ok: false; response: NextResponse };

export const CACHE_HEADERS = {
  PRIVATE_NO_STORE: 'private, no-store, no-cache, max-age=0, must-revalidate',
  PRIVATE_SHORT: 'private, max-age=5, stale-while-revalidate=15',
} as const;

export function isValidObjectId(value?: string | null): value is string {
  if (!value) {
    return false;
  }

  return Types.ObjectId.isValid(value);
}

export function getValidatedJobId(
  params: Partial<JobRouteParams> | undefined,
  errorKey: ErrorKey = 'message'
): JobIdResult {
  const jobId = params?.jobId;
  if (!jobId) {
    return {
      ok: false,
      response: badRequest('Job ID is required'),
    };
  }

  if (!isValidObjectId(jobId)) {
    return {
      ok: false,
      response: badRequest('Invalid job ID'),
    };
  }

  return { ok: true, jobId };
}

export function withCacheControl<TResponse extends NextResponse>(
  response: TResponse,
  cacheControl: string
): TResponse {
  response.headers.set('Cache-Control', cacheControl);
  return response;
}
