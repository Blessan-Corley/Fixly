import { NextResponse } from 'next/server';

import { ok, respond } from './response.helpers';
import type {
  ApiMeta,
  ApiSuccess,
  LegacyApiError,
  PaginatedData,
  StandardErrorResponse,
  StandardSuccessResponse,
} from './response.types';

type ApiSuccessOptions = {
  message?: string;
  meta?: ApiMeta;
  status?: number;
};

type ApiErrorOptions = {
  code?: string;
  details?: Record<string, string[]>;
  status?: number;
};

export function buildPaginationMeta(total: number, page: number, limit: number): ApiMeta {
  return { total, page, limit, hasMore: page * limit < total };
}

export function apiSuccess<T>(
  data: T,
  options?: ApiSuccessOptions | number
): NextResponse<ApiSuccess<T> | StandardSuccessResponse<T>> {
  if (typeof options === 'number' || options === undefined) {
    return ok(data, options);
  }
  return respond(
    { data, message: options.message, meta: options.meta },
    options.status ?? 200
  );
}

export function apiPaginated<T>(
  items: T[],
  total: number,
  page: number,
  limit: number,
  status = 200
): NextResponse<ApiSuccess<PaginatedData<T>>> {
  return respond(
    { success: true, data: { items, total, page, limit, hasMore: page * limit < total } },
    status
  );
}

export function apiError(
  error: string,
  options?: ApiErrorOptions
): NextResponse<StandardErrorResponse>;
export function apiError(
  code: string,
  message: string,
  status?: number,
  details?: unknown
): NextResponse<LegacyApiError>;
export function apiError(
  codeOrError: string,
  messageOrOptions?: string | ApiErrorOptions,
  status = 400,
  details?: unknown
): NextResponse<LegacyApiError | StandardErrorResponse> {
  if (typeof messageOrOptions !== 'string') {
    return respond(
      { error: codeOrError, code: messageOrOptions?.code, details: messageOrOptions?.details },
      messageOrOptions?.status ?? 500
    );
  }
  return respond(
    { success: false, error: { code: codeOrError, message: messageOrOptions, details } },
    status
  );
}

export function apiUnauthorized(
  message = 'Authentication required'
): NextResponse<LegacyApiError> {
  return apiError('UNAUTHORIZED', message, 401);
}

export function apiForbidden(message = 'Access denied'): NextResponse<LegacyApiError> {
  return apiError('FORBIDDEN', message, 403);
}

export function apiNotFound(resource = 'Resource'): NextResponse<LegacyApiError> {
  return apiError('NOT_FOUND', `${resource} not found`, 404);
}

export function apiValidationError(details: unknown): NextResponse<LegacyApiError> {
  return apiError('VALIDATION_ERROR', 'Invalid request data', 400, details);
}

export function apiInternalError(
  message = 'An unexpected error occurred'
): NextResponse<LegacyApiError> {
  return apiError('INTERNAL_ERROR', message, 500);
}

export function apiMethodNotAllowed(): NextResponse<LegacyApiError> {
  return apiError('METHOD_NOT_ALLOWED', 'Method not allowed', 405);
}

export const Errors = {
  unauthorized(): NextResponse<StandardErrorResponse> {
    return apiError('Unauthorised', { status: 401 });
  },
  forbidden(): NextResponse<StandardErrorResponse> {
    return apiError('Forbidden', { status: 403 });
  },
  notFound(resource = 'Resource'): NextResponse<StandardErrorResponse> {
    return apiError(`${resource} not found`, { status: 404 });
  },
  validation(details: Record<string, string[]>): NextResponse<StandardErrorResponse> {
    return apiError('Validation failed', { code: 'VALIDATION_ERROR', details, status: 422 });
  },
  internal(message = 'Internal server error'): NextResponse<StandardErrorResponse> {
    return apiError(message, { status: 500 });
  },
};
