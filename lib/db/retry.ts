import mongoose, { type Mongoose } from 'mongoose';

import { env } from '@/lib/env';
import { logger } from '@/lib/logger';

import { connectionOptions, connectionStats, retryConfig } from './types';

export class DatabaseConnectionError extends Error {
  public originalError: unknown;
  public timestamp: Date;

  constructor(message: string, originalError: unknown = null) {
    super(message);
    this.name = 'DatabaseConnectionError';
    this.originalError = originalError;
    this.timestamp = new Date();
  }
}

export async function retryConnection(attempt = 1): Promise<Mongoose> {
  const mongoUri = env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI environment variable is not set');
  }

  const delay = Math.min(
    retryConfig.retryDelay * Math.pow(retryConfig.backoffMultiplier, attempt - 1),
    retryConfig.maxRetryDelay
  );

  if (attempt > 1) {
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  try {
    const connection = await mongoose.connect(mongoUri, connectionOptions);
    connectionStats.totalConnections += 1;
    connectionStats.lastConnectionTime = new Date();
    connectionStats.isConnected = true;
    connectionStats.lastError = null;

    logger.info(
      { event: 'mongo_connected', attempt, readyState: connection.connection.readyState },
      'MongoDB connected successfully'
    );

    return connection;
  } catch (error) {
    connectionStats.failedConnections += 1;
    connectionStats.lastError = error;
    connectionStats.isConnected = false;

    if (attempt < retryConfig.maxRetries) {
      return retryConnection(attempt + 1);
    }

    logger.error(
      {
        event: 'mongo_connection_failed',
        attempts: retryConfig.maxRetries,
        error: error instanceof Error ? error.message : 'Unknown database connection error',
      },
      `Database connection failed after ${retryConfig.maxRetries} attempts`
    );

    throw new DatabaseConnectionError(
      `Failed to connect to MongoDB after ${retryConfig.maxRetries} attempts`,
      error
    );
  }
}
