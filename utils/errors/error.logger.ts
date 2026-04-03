import { logger } from '@/lib/logger';

import { ErrorSeverity } from './error.types';
import type { AppError } from './error.classes';
import type { ErrorLog, ErrorSeverityLevel, RequestContext } from './error.types';

class ErrorLogger {
  private logs: ErrorLog[] = [];
  private maxLogs = 1000;

  log(error: AppError, context: RequestContext = {}): ErrorLog {
    const errorLog: ErrorLog = {
      id: this.generateId(),
      timestamp: new Date(),
      type: error.type || 'UNKNOWN',
      severity: error.severity || ErrorSeverity.MEDIUM,
      message: error.message,
      stack: error.stack,
      statusCode: error.statusCode || 500,
      requestId: error.requestId,
      userAgent: context.userAgent,
      ip: context.ip,
      url: context.url,
      method: context.method,
      userId: context.userId,
      details: error.details,
    };

    this.logs.unshift(errorLog);
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }

    this.consoleLog(errorLog);
    return errorLog;
  }

  private generateId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }

  private consoleLog(errorLog: ErrorLog): void {
    const timestamp = errorLog.timestamp.toISOString();
    const prefix = `[${timestamp}] [${errorLog.severity}] [${errorLog.type}]`;

    switch (errorLog.severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.HIGH:
        logger.error(`${prefix} ${errorLog.message}`, errorLog);
        break;
      case ErrorSeverity.MEDIUM:
        logger.warn(`${prefix} ${errorLog.message}`, errorLog);
        break;
      case ErrorSeverity.LOW:
      default:
        logger.info(`${prefix} ${errorLog.message}`, errorLog);
        break;
    }
  }

  getLogs(limit = 100, severity: ErrorSeverityLevel | null = null): ErrorLog[] {
    const filtered = severity ? this.logs.filter((log) => log.severity === severity) : this.logs;
    return filtered.slice(0, limit);
  }

  getErrorStats(): {
    total: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
    recent: ErrorLog[];
  } {
    const stats = {
      total: this.logs.length,
      byType: {} as Record<string, number>,
      bySeverity: {} as Record<string, number>,
      recent: this.logs.slice(0, 10),
    };

    this.logs.forEach((log) => {
      stats.byType[log.type] = (stats.byType[log.type] ?? 0) + 1;
      stats.bySeverity[log.severity] = (stats.bySeverity[log.severity] ?? 0) + 1;
    });

    return stats;
  }

  clearLogs(): void {
    this.logs = [];
  }
}

export const errorLogger = new ErrorLogger();
