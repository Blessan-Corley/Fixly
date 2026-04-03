import { getServerAbly } from '@/lib/ably';
import dbConnect from '@/lib/db';
import { logger } from '@/lib/logger';
import { getRedis } from '@/lib/redis';

export type ServiceStatus = {
  available: boolean;
  latencyMs?: number;
  error?: string;
};

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    promise
      .then((value) => {
        clearTimeout(timeoutId);
        resolve(value);
      })
      .catch((error: unknown) => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

export async function checkMongoHealth(): Promise<ServiceStatus> {
  const startedAt = Date.now();

  try {
    const connection = await withTimeout(dbConnect(), 3000, 'MongoDB connect');
    const database = connection.connection.db;
    if (!database) {
      throw new Error('MongoDB database handle unavailable');
    }

    await withTimeout(database.admin().ping(), 3000, 'MongoDB ping');

    return {
      available: true,
      latencyMs: Date.now() - startedAt,
    };
  } catch (error: unknown) {
    return {
      available: false,
      error: getErrorMessage(error),
    };
  }
}

export async function checkRedisHealth(): Promise<ServiceStatus> {
  const startedAt = Date.now();

  try {
    const redis = getRedis();
    if (!redis) {
      return {
        available: false,
        error: 'Redis client unavailable',
      };
    }

    const pong = await withTimeout(redis.ping(), 2000, 'Redis ping');
    if (pong !== 'PONG') {
      return {
        available: false,
        error: `Unexpected Redis ping response: ${pong}`,
      };
    }

    return {
      available: true,
      latencyMs: Date.now() - startedAt,
    };
  } catch (error: unknown) {
    return {
      available: false,
      error: getErrorMessage(error),
    };
  }
}

export async function checkAblyHealth(): Promise<ServiceStatus> {
  try {
    const ably = getServerAbly();
    if (!ably) {
      return {
        available: false,
        error: 'Ably client unavailable',
      };
    }

    const connection = (ably as unknown as { connection?: { state?: string; errorReason?: unknown } })
      .connection;
    if (connection) {
      const state = connection.state ?? 'unknown';
      if (state === 'failed' || state === 'suspended' || state === 'disconnected') {
        return {
          available: false,
          error:
            connection.errorReason instanceof Error
              ? connection.errorReason.message
              : `Ably connection state: ${state}`,
        };
      }
    }

    return {
      available: true,
    };
  } catch (error: unknown) {
    return {
      available: false,
      error: getErrorMessage(error),
    };
  }
}

export async function checkAllServices(): Promise<{
  mongo: ServiceStatus;
  redis: ServiceStatus;
  ably: ServiceStatus;
}> {
  const [mongo, redis, ably] = await Promise.all([
    checkMongoHealth(),
    checkRedisHealth(),
    checkAblyHealth(),
  ]);

  return { mongo, redis, ably };
}

export async function withServiceFallback<T>(
  fn: () => Promise<T>,
  fallback: T,
  serviceName: string
): Promise<T> {
  try {
    return await fn();
  } catch (error: unknown) {
    logger.warn(
      {
        event: 'service_fallback',
        serviceName,
        error: getErrorMessage(error),
      },
      `Using fallback for ${serviceName}`
    );
    return fallback;
  }
}
