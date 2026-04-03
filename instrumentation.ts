import * as Sentry from '@sentry/nextjs';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function redactSensitiveRequestData(event: Sentry.ErrorEvent): Sentry.ErrorEvent {
  const requestData = event.request?.data;
  if (!isRecord(requestData)) {
    return event;
  }

  const sensitiveFields = ['password', 'token', 'secret', 'card', 'cvv', 'ssn'];
  for (const field of sensitiveFields) {
    if (field in requestData) {
      requestData[field] = '[REDACTED]';
    }
  }

  return event;
}

function createServerSentryOptions(): Parameters<typeof Sentry.init>[0] {
  return {
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    enabled: process.env.NODE_ENV === 'production' && Boolean(process.env.SENTRY_DSN),
    beforeSend(event) {
      return redactSensitiveRequestData(event);
    },
  };
}

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    Sentry.init(createServerSentryOptions());
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV,
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      enabled: process.env.NODE_ENV === 'production' && Boolean(process.env.SENTRY_DSN),
    });
  }
}

// Required by Sentry ≥ 8.28 / Next.js 15 to capture errors from nested
// React Server Components, middleware, and edge proxies.
export const onRequestError = Sentry.captureRequestError;
