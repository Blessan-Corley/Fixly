import mongoose from 'mongoose';

import { env } from '@/lib/env';
import { logger } from '@/lib/logger';

import { connectionStats } from './types';

export function setupConnectionHandlers(): void {
  if (global.fixlyMongooseHandlersRegistered) return;
  global.fixlyMongooseHandlersRegistered = true;

  mongoose.connection.on('connected', () => {
    connectionStats.isConnected = true;
    connectionStats.lastConnectionTime = new Date();
    logger.info(
      { event: 'mongo_event_connected', readyState: mongoose.connection.readyState },
      'MongoDB connection event: connected'
    );
  });

  mongoose.connection.on('error', (error) => {
    connectionStats.isConnected = false;
    connectionStats.lastError = error;
    logger.error(
      {
        event: 'mongo_event_error',
        error: error.message,
        readyState: mongoose.connection.readyState,
      },
      'MongoDB connection error'
    );
  });

  mongoose.connection.on('disconnected', () => {
    connectionStats.isConnected = false;
    logger.warn(
      { event: 'mongo_event_disconnected', readyState: mongoose.connection.readyState },
      'MongoDB connection event: disconnected'
    );
  });

  mongoose.connection.on('reconnected', () => {
    connectionStats.isConnected = true;
    connectionStats.lastConnectionTime = new Date();
    logger.info(
      { event: 'mongo_event_reconnected', readyState: mongoose.connection.readyState },
      'MongoDB connection event: reconnected'
    );
  });

  // Do not register process signal shutdown handlers in serverless runtimes.
  if (env.VERCEL) return;
}
