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

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  replaysSessionSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0,
  replaysOnErrorSampleRate: 1.0,
  integrations: [Sentry.replayIntegration()],
  enabled:
    process.env.NODE_ENV === 'production' && Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
  beforeSend(event) {
    return redactSensitiveRequestData(event);
  },
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
