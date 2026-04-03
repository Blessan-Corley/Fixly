export const ErrorTypes = {
  VALIDATION: 'VALIDATION_ERROR',
  AUTHENTICATION: 'AUTHENTICATION_ERROR',
  AUTHORIZATION: 'AUTHORIZATION_ERROR',
  NOT_FOUND: 'NOT_FOUND_ERROR',
  RATE_LIMIT: 'RATE_LIMIT_ERROR',
  DATABASE: 'DATABASE_ERROR',
  EXTERNAL_API: 'EXTERNAL_API_ERROR',
  FILE_UPLOAD: 'FILE_UPLOAD_ERROR',
  PAYMENT: 'PAYMENT_ERROR',
  INTERNAL: 'INTERNAL_ERROR',
} as const;

export const ErrorSeverity = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
} as const;

export type ErrorType = (typeof ErrorTypes)[keyof typeof ErrorTypes];
export type ErrorSeverityLevel = (typeof ErrorSeverity)[keyof typeof ErrorSeverity];

export interface RequestContext {
  userAgent?: string | null;
  ip?: string | null;
  url?: string;
  method?: string;
  userId?: string | null;
}

export interface ErrorLog {
  id: string;
  timestamp: Date;
  type: ErrorType | 'UNKNOWN';
  severity: ErrorSeverityLevel;
  message: string;
  stack?: string;
  statusCode: number;
  requestId: string | null;
  userAgent?: string | null;
  ip?: string | null;
  url?: string;
  method?: string;
  userId?: string | null;
  details?: unknown;
}

export interface AppErrorResponse {
  error: true;
  message: string;
  type: ErrorType | 'UNKNOWN';
  statusCode: number;
  timestamp: Date;
  requestId: string | null;
  details?: unknown;
  stack?: string;
}
