import * as Sentry from '@sentry/nextjs';
import type { Session } from 'next-auth';

type ErrorContext = {
  userId?: string;
  jobId?: string;
  orderId?: string;
  action?: string;
  extra?: Record<string, unknown>;
};

export function setSentryUser(session: Session | null): void {
  const userId = typeof session?.user?.id === 'string' ? session.user.id : undefined;

  if (userId) {
    Sentry.setUser({
      id: userId,
      email: session?.user?.email ?? undefined,
    });
    return;
  }

  Sentry.setUser(null);
}

export function captureError(error: unknown, context?: ErrorContext): void {
  Sentry.withScope((scope) => {
    if (context?.userId) scope.setTag('userId', context.userId);
    if (context?.jobId) scope.setTag('jobId', context.jobId);
    if (context?.orderId) scope.setTag('orderId', context.orderId);
    if (context?.action) scope.setTag('action', context.action);
    if (context?.extra) scope.setExtras(context.extra);
    Sentry.captureException(error);
  });
}
