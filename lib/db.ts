import mongoose, { type Mongoose } from 'mongoose';

import { env } from '@/lib/env';
import { logger } from '@/lib/logger';

import { setupConnectionHandlers } from './db/handlers';
import { DatabaseConnectionError, retryConnection } from './db/retry';
import { cached, connectionStats, resetCached } from './db/types';

export { connectionStats } from './db/types';

export function getDatabaseHealth() {
  return {
    isConnected: connectionStats.isConnected,
    totalConnections: connectionStats.totalConnections,
    failedConnections: connectionStats.failedConnections,
    lastConnectionTime: connectionStats.lastConnectionTime,
    lastError:
      connectionStats.lastError instanceof Error
        ? connectionStats.lastError.message
        : connectionStats.lastError,
    connectionPool: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
  };
}

export async function connectDB(): Promise<Mongoose> {
  try {
    const mongoUri = env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error(
        'MONGODB_URI environment variable is not set. Please check your .env.local file.'
      );
    }

    if (cached?.conn && mongoose.connection.readyState === 1) {
      return cached.conn;
    }

    if (cached?.promise) {
      cached.conn = await cached.promise;
      return cached.conn;
    }

    if (!cached) {
      resetCached({ conn: null, promise: null });
    }

    cached.promise = retryConnection();
    cached.conn = await cached.promise;
    // Clear the in-flight promise after success so a future disconnect can reconnect cleanly.
    cached.promise = null;
    setupConnectionHandlers();

    return cached.conn;
  } catch (error) {
    if (cached) {
      cached.promise = null;
    }

    logger.error('Database connection failed:', error);

    if (error instanceof DatabaseConnectionError) {
      logger.error('Original error:', error.originalError);
    }

    if (error instanceof Error && error.message.includes('MONGODB_URI')) {
      logger.error('To fix this:');
      logger.error('1. Create a .env.local file in your project root');
      logger.error('2. Add: MONGODB_URI=your-mongodb-connection-string');
      logger.error('3. Restart your development server');
    }

    const message = error instanceof Error ? error.message : 'Unknown database error';
    throw new Error(`Database connection failed: ${message}`);
  }
}

export default connectDB;
