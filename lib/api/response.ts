// Phase 2: Added standard API success/error envelopes while preserving legacy helpers.
export {
  badRequest,
  conflict,
  created,
  forbidden,
  methodNotAllowed,
  noContent,
  notFound,
  ok,
  paginated,
  paymentRequired,
  respond,
  serverError,
  tooManyRequests,
  unauthorized,
} from './response.helpers';

export {
  apiForbidden,
  apiError,
  apiInternalError,
  apiMethodNotAllowed,
  apiNotFound,
  apiPaginated,
  apiSuccess,
  apiUnauthorized,
  apiValidationError,
  buildPaginationMeta,
  Errors,
} from './response.legacy';

export type {
  ApiError,
  ApiErrorEnvelope,
  ApiMeta,
  ApiSuccess,
  LegacyApiError,
  PaginatedData,
  PaginatedResponse,
  StandardErrorResponse,
  StandardSuccessResponse,
} from './response.types';
