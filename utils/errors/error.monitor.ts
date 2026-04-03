import { env } from '@/lib/env';
import { logger } from '@/lib/logger';

import { normalizeError } from './error.classes';
import { ErrorSeverity } from './error.types';
import type { RequestContext } from './error.types';

type CapturedError = {
  id: string;
  timestamp: Date;
  error: {
    name: string;
    message: string;
    stack?: string;
    type?: string;
    severity?: string;
    statusCode?: number;
  };
  context: RequestContext;
  userAgent?: string | null;
  ip?: string | null;
  url?: string;
  userId?: string | null;
};

class ErrorMonitor {
  private errors: CapturedError[] = [];
  private maxErrors = 100;

  captureError(error: Error, context: RequestContext = {}): CapturedError {
    const appError = normalizeError(error);

    const errorInfo: CapturedError = {
      id: this.generateId(),
      timestamp: new Date(),
      error: {
        name: appError.name,
        message: appError.message,
        stack: appError.stack,
        type: appError.type,
        severity: appError.severity,
        statusCode: appError.statusCode,
      },
      context,
      userAgent: context.userAgent,
      ip: context.ip,
      url: context.url,
      userId: context.userId,
    };

    this.errors.unshift(errorInfo);
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(0, this.maxErrors);
    }

    if (env.NODE_ENV === 'production') {
      this.sendToMonitoringService(errorInfo.id);
    }

    return errorInfo;
  }

  private generateId(): string {
    return `mon_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }

  private sendToMonitoringService(errorId: string): void {
    logger.info('Sending error to monitoring service:', errorId);
  }

  getErrorReport(): {
    totalErrors: number;
    recentErrors: CapturedError[];
    errorTypes: Record<string, number>;
    severityBreakdown: Record<string, number>;
  } {
    return {
      totalErrors: this.errors.length,
      recentErrors: this.errors.slice(0, 10),
      errorTypes: this.errors.reduce<Record<string, number>>((acc, error) => {
        const type = error.error.type ?? 'UNKNOWN';
        acc[type] = (acc[type] ?? 0) + 1;
        return acc;
      }, {}),
      severityBreakdown: this.errors.reduce<Record<string, number>>((acc, error) => {
        const severity = error.error.severity ?? ErrorSeverity.MEDIUM;
        acc[severity] = (acc[severity] ?? 0) + 1;
        return acc;
      }, {}),
    };
  }
}

export const errorMonitor = new ErrorMonitor();
