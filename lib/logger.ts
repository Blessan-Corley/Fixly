import pino, { type Logger as PinoLogger, type LoggerOptions } from 'pino';

import { env } from '@/lib/env';

type RequestLoggerContext = {
  requestId?: string;
  userId?: string;
  route?: string;
};

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type AppLogger = {
  debug: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
};

const options: LoggerOptions = {
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  base: undefined,
  timestamp: pino.stdTimeFunctions.isoTime,
  ...(env.NODE_ENV === 'production'
    ? {}
    : {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            singleLine: true,
          },
        },
      }),
};

const baseLogger: PinoLogger = pino(options);

const writeLog = (instance: PinoLogger, level: LogLevel, args: unknown[]): void => {
  const target = instance as unknown as Record<LogLevel, (...args: unknown[]) => void>;

  if (args.length === 0) {
    return;
  }

  if (args.length === 1) {
    target[level](args[0]);
    return;
  }

  const [first, ...rest] = args;

  if (typeof first === 'string') {
    if (rest.length === 1 && rest[0] instanceof Error) {
      target[level]({ err: rest[0] }, first);
      return;
    }

    if (rest.length === 1 && typeof rest[0] === 'object' && rest[0] !== null) {
      target[level](rest[0], first);
      return;
    }

    target[level]({ args: rest }, first);
    return;
  }

  target[level]({ args });
};

const wrapLogger = (instance: PinoLogger): AppLogger => ({
  debug: (...args: unknown[]) => writeLog(instance, 'debug', args),
  info: (...args: unknown[]) => writeLog(instance, 'info', args),
  warn: (...args: unknown[]) => writeLog(instance, 'warn', args),
  error: (...args: unknown[]) => writeLog(instance, 'error', args),
});

export const logger: AppLogger = wrapLogger(baseLogger);

export const createRequestLogger = (
  requestId?: string,
  userId?: string,
  route?: string
): AppLogger => {
  const context: RequestLoggerContext = { requestId, userId, route };
  return wrapLogger(baseLogger.child(context));
};
