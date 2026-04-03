import { NextResponse } from 'next/server';

import type { ApiErrorEnvelope, ApiSuccess, PaginatedResponse } from './response.types';

function normalizeDetails(errors: unknown): unknown {
  if (!errors || typeof errors !== 'object' || Array.isArray(errors)) {
    return errors;
  }
  const candidate = errors as Record<string, unknown>;
  if ('fieldErrors' in candidate) return errors;
  return { fieldErrors: candidate };
}

export function respond<T>(
  body: T,
  status = 200,
  init?: { headers?: HeadersInit }
): NextResponse<T> {
  return NextResponse.json(body, { status, headers: init?.headers });
}

export function ok<T>(data: T, status = 200): NextResponse<ApiSuccess<T>> {
  return respond({ success: true, data }, status);
}

export function created<T>(data: T): NextResponse<ApiSuccess<T>> {
  return respond({ success: true, data }, 201);
}

export function noContent(): NextResponse {
  return new NextResponse(null, { status: 204 });
}

export function badRequest(message: string, errors?: unknown): NextResponse<ApiErrorEnvelope> {
  return respond(
    {
      success: false,
      error: message,
      message,
      ...(errors ? { errors, details: normalizeDetails(errors) } : {}),
    },
    400
  );
}

export function unauthorized(
  message = 'Authentication required'
): NextResponse<ApiErrorEnvelope> {
  return respond({ success: false, error: message, message }, 401);
}

export function forbidden(message = 'Insufficient permissions'): NextResponse<ApiErrorEnvelope> {
  return respond({ success: false, error: message, message }, 403);
}

export function notFound(resource = 'Resource'): NextResponse<ApiErrorEnvelope> {
  return respond(
    { success: false, error: `${resource} not found`, message: `${resource} not found` },
    404
  );
}

export function conflict(message: string): NextResponse<ApiErrorEnvelope> {
  return respond({ success: false, error: message, message }, 409);
}

export function paymentRequired(
  message = 'Payment required',
  errors?: unknown
): NextResponse<ApiErrorEnvelope> {
  return respond(
    {
      success: false,
      error: message,
      message,
      ...(errors ? { errors, details: normalizeDetails(errors) } : {}),
    },
    402
  );
}

export function tooManyRequests(message = 'Too many requests'): NextResponse<ApiErrorEnvelope> {
  return respond({ success: false, error: message, message }, 429);
}

export function serverError(message = 'Internal server error'): NextResponse<ApiErrorEnvelope> {
  return respond({ success: false, error: message, message }, 500);
}

export function methodNotAllowed(message = 'Method not allowed'): NextResponse<ApiErrorEnvelope> {
  return respond({ success: false, error: message, message }, 405);
}

export function paginated<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
): NextResponse<PaginatedResponse<T>> {
  const totalPages = Math.ceil(total / limit);
  return respond({
    success: true,
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  } satisfies PaginatedResponse<T>);
}
