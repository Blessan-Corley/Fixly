jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}));

import {
  AppError,
  AuthenticationError,
  AuthorizationError,
  DatabaseError,
  ErrorSeverity,
  ErrorTypes,
  ExternalAPIError,
  NotFoundError,
  RateLimitError,
  ValidationError,
  errorLogger,
  formatErrorResponse,
  handleAuthError,
  handleDatabaseError,
  handleFileUploadError,
  handlePaymentError,
  withErrorHandling,
} from '@/utils/errorHandling';

// ─── AppError ─────────────────────────────────────────────────────────────────

describe('AppError', () => {
  it('creates error with correct properties', () => {
    const err = new AppError('Something failed', ErrorTypes.INTERNAL, ErrorSeverity.HIGH, 500);
    expect(err.message).toBe('Something failed');
    expect(err.type).toBe(ErrorTypes.INTERNAL);
    expect(err.severity).toBe(ErrorSeverity.HIGH);
    expect(err.statusCode).toBe(500);
    expect(err.name).toBe('AppError');
    expect(err.timestamp).toBeInstanceOf(Date);
    expect(err.requestId).toBeNull();
  });

  it('defaults to MEDIUM severity and 500 status', () => {
    const err = new AppError('Oops', ErrorTypes.INTERNAL);
    expect(err.severity).toBe(ErrorSeverity.MEDIUM);
    expect(err.statusCode).toBe(500);
  });

  it('is an instance of Error', () => {
    expect(new AppError('x', ErrorTypes.INTERNAL)).toBeInstanceOf(Error);
  });
});

// ─── Sub-error classes ────────────────────────────────────────────────────────

describe('ValidationError', () => {
  it('has 400 status and LOW severity', () => {
    const err = new ValidationError('Invalid input');
    expect(err.statusCode).toBe(400);
    expect(err.severity).toBe(ErrorSeverity.LOW);
    expect(err.type).toBe(ErrorTypes.VALIDATION);
    expect(err.name).toBe('ValidationError');
  });
});

describe('AuthenticationError', () => {
  it('has 401 status and default message', () => {
    const err = new AuthenticationError();
    expect(err.statusCode).toBe(401);
    expect(err.message).toBe('Authentication required');
    expect(err.name).toBe('AuthenticationError');
  });

  it('accepts custom message', () => {
    const err = new AuthenticationError('Token expired');
    expect(err.message).toBe('Token expired');
  });
});

describe('AuthorizationError', () => {
  it('has 403 status', () => {
    const err = new AuthorizationError();
    expect(err.statusCode).toBe(403);
    expect(err.message).toBe('Access denied');
  });
});

describe('NotFoundError', () => {
  it('has 404 status', () => {
    const err = new NotFoundError();
    expect(err.statusCode).toBe(404);
  });
});

describe('RateLimitError', () => {
  it('has 429 status', () => {
    const err = new RateLimitError();
    expect(err.statusCode).toBe(429);
    expect(err.type).toBe(ErrorTypes.RATE_LIMIT);
  });

  it('stores remaining time in details', () => {
    const err = new RateLimitError('Too fast', 30);
    expect((err.details as { remainingTime: number }).remainingTime).toBe(30);
  });
});

describe('DatabaseError', () => {
  it('has 500 status and HIGH severity', () => {
    const err = new DatabaseError();
    expect(err.statusCode).toBe(500);
    expect(err.severity).toBe(ErrorSeverity.HIGH);
  });
});

describe('ExternalAPIError', () => {
  it('has 502 status', () => {
    const err = new ExternalAPIError();
    expect(err.statusCode).toBe(502);
  });
});

// ─── formatErrorResponse ──────────────────────────────────────────────────────

describe('formatErrorResponse', () => {
  it('includes core fields', () => {
    const err = new ValidationError('Bad input');
    const response = formatErrorResponse(err);
    expect(response.error).toBe(true);
    expect(response.message).toBe('Bad input');
    expect(response.type).toBe(ErrorTypes.VALIDATION);
    expect(response.statusCode).toBe(400);
    expect(response.timestamp).toBeInstanceOf(Date);
    expect(response.requestId).toBeNull();
  });

  it('omits details by default', () => {
    const err = new ValidationError('Bad input', { field: 'email' });
    const response = formatErrorResponse(err);
    expect(response.details).toBeUndefined();
  });

  it('includes details when includeDetails is true', () => {
    const err = new ValidationError('Bad input', { field: 'email' });
    const response = formatErrorResponse(err, true);
    expect(response.details).toEqual({ field: 'email' });
  });
});

// ─── handleDatabaseError ──────────────────────────────────────────────────────

describe('handleDatabaseError', () => {
  it('converts Mongoose ValidationError to ValidationError', () => {
    const mongooseErr = { name: 'ValidationError', message: 'Validation failed' };
    const result = handleDatabaseError(mongooseErr);
    expect(result).toBeInstanceOf(ValidationError);
  });

  it('converts CastError to ValidationError', () => {
    const castErr = { name: 'CastError', message: 'Cast to ObjectId failed' };
    const result = handleDatabaseError(castErr);
    expect(result).toBeInstanceOf(ValidationError);
    expect(result.message).toBe('Invalid data format');
  });

  it('converts duplicate key error (code 11000) to ValidationError', () => {
    const dupErr = { code: 11000, message: 'Duplicate key' };
    const result = handleDatabaseError(dupErr);
    expect(result).toBeInstanceOf(ValidationError);
    expect(result.message).toBe('Duplicate entry found');
  });

  it('converts MongoNetworkError to DatabaseError', () => {
    const netErr = { name: 'MongoNetworkError', message: 'Network timeout' };
    const result = handleDatabaseError(netErr);
    expect(result).toBeInstanceOf(DatabaseError);
    expect(result.message).toBe('Database connection failed');
  });

  it('defaults to generic DatabaseError for unknown errors', () => {
    const result = handleDatabaseError(new Error('Unknown DB error'));
    expect(result).toBeInstanceOf(DatabaseError);
  });
});

// ─── handleAuthError ─────────────────────────────────────────────────────────

describe('handleAuthError', () => {
  it('returns AuthenticationError for password-related errors', () => {
    const result = handleAuthError(new Error('Invalid password'));
    expect(result).toBeInstanceOf(AuthenticationError);
    expect(result.message).toBe('Invalid credentials');
  });

  it('returns AuthorizationError for banned accounts', () => {
    const result = handleAuthError(new Error('Account is banned'));
    expect(result).toBeInstanceOf(AuthorizationError);
    expect(result.message).toBe('Account suspended');
  });

  it('returns AuthorizationError for inactive accounts', () => {
    const result = handleAuthError(new Error('Account is inactive'));
    expect(result).toBeInstanceOf(AuthorizationError);
    expect(result.message).toBe('Account inactive');
  });

  it('returns generic AuthenticationError for unknown errors', () => {
    const result = handleAuthError(new Error('Unknown auth error'));
    expect(result).toBeInstanceOf(AuthenticationError);
    expect(result.message).toBe('Authentication failed');
  });
});

// ─── handleFileUploadError ────────────────────────────────────────────────────

describe('handleFileUploadError', () => {
  it('returns ValidationError for file size errors', () => {
    const result = handleFileUploadError(new Error('File size too large'));
    expect(result).toBeInstanceOf(ValidationError);
    expect(result.message).toBe('File too large');
  });

  it('returns ValidationError for file type errors', () => {
    const result = handleFileUploadError(new Error('Invalid file type'));
    expect(result).toBeInstanceOf(ValidationError);
    expect(result.message).toBe('Invalid file type');
  });

  it('returns generic AppError for unknown upload errors', () => {
    const result = handleFileUploadError(new Error('Upload failed'));
    expect(result).toBeInstanceOf(AppError);
    expect(result.statusCode).toBe(400);
  });
});

// ─── handlePaymentError ───────────────────────────────────────────────────────

describe('handlePaymentError', () => {
  it('returns ValidationError for insufficient funds', () => {
    const result = handlePaymentError(new Error('insufficient funds in account'));
    expect(result).toBeInstanceOf(ValidationError);
    expect(result.message).toBe('Insufficient funds');
  });

  it('returns ValidationError for expired payment method', () => {
    const result = handlePaymentError(new Error('Card expired'));
    expect(result).toBeInstanceOf(ValidationError);
    expect(result.message).toBe('Payment method expired');
  });

  it('returns AppError for unknown payment errors', () => {
    const result = handlePaymentError(new Error('Payment gateway timeout'));
    expect(result).toBeInstanceOf(AppError);
    expect(result.statusCode).toBe(400);
  });
});

// ─── withErrorHandling ────────────────────────────────────────────────────────

describe('withErrorHandling', () => {
  it('returns response from handler on success', async () => {
    const handler = jest.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    const wrapped = withErrorHandling(handler);
    const response = await wrapped(new Request('http://localhost/api/test'), undefined);
    expect(response.status).toBe(200);
  });

  it('returns JSON error response when handler throws AppError', async () => {
    const handler = jest.fn().mockRejectedValue(new ValidationError('Bad input'));
    const wrapped = withErrorHandling(handler);
    const response = await wrapped(new Request('http://localhost/api/test'), undefined);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe(true);
    expect(body.message).toBe('Bad input');
  });

  it('returns 500 for generic Error', async () => {
    const handler = jest.fn().mockRejectedValue(new Error('Something broke'));
    const wrapped = withErrorHandling(handler);
    const response = await wrapped(new Request('http://localhost/api/test'), undefined);
    expect(response.status).toBe(500);
  });
});

// ─── errorLogger ─────────────────────────────────────────────────────────────

describe('errorLogger', () => {
  beforeEach(() => {
    errorLogger.clearLogs();
  });

  it('logs errors and returns an ErrorLog', () => {
    const err = new ValidationError('Test error');
    const log = errorLogger.log(err);
    expect(log.id).toMatch(/^err_/);
    expect(log.message).toBe('Test error');
    expect(log.statusCode).toBe(400);
    expect(log.type).toBe(ErrorTypes.VALIDATION);
  });

  it('retrieves logs with getLogs', () => {
    errorLogger.log(new ValidationError('Error 1'));
    errorLogger.log(new ValidationError('Error 2'));
    const logs = errorLogger.getLogs();
    expect(logs.length).toBe(2);
  });

  it('filters logs by severity', () => {
    errorLogger.log(new ValidationError('Low severity'));
    errorLogger.log(new DatabaseError('High severity'));
    const highLogs = errorLogger.getLogs(100, ErrorSeverity.HIGH);
    expect(highLogs.length).toBe(1);
    expect(highLogs[0].severity).toBe(ErrorSeverity.HIGH);
  });

  it('clears logs', () => {
    errorLogger.log(new ValidationError('Error'));
    errorLogger.clearLogs();
    expect(errorLogger.getLogs()).toHaveLength(0);
  });

  it('returns stats from getErrorStats', () => {
    errorLogger.log(new ValidationError('V1'));
    errorLogger.log(new ValidationError('V2'));
    errorLogger.log(new DatabaseError('D1'));
    const stats = errorLogger.getErrorStats();
    expect(stats.total).toBe(3);
    expect(stats.byType[ErrorTypes.VALIDATION]).toBe(2);
    expect(stats.byType[ErrorTypes.DATABASE]).toBe(1);
  });
});
