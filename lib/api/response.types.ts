export type ApiSuccess<T> = {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
};

export type ApiErrorEnvelope = {
  success: false;
  error: string;
  message?: string;
  details?: unknown;
  errors?: unknown;
};

export type LegacyApiError = {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export interface PaginatedResponse<T> {
  success: true;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export type ApiMeta = {
  total?: number;
  page?: number;
  limit?: number;
  hasMore?: boolean;
  [key: string]: unknown;
};

export type StandardSuccessResponse<T> = {
  data: T;
  message?: string;
  meta?: ApiMeta;
};

export type StandardErrorResponse = {
  error: string;
  code?: string;
  details?: Record<string, string[]>;
};

// Backward-compatible alias
export type ApiError = LegacyApiError;

export type PaginatedData<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
};
