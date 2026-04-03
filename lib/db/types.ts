import type { ConnectOptions, Mongoose } from 'mongoose';

import { env } from '@/lib/env';

export interface CachedMongoose {
  conn: Mongoose | null;
  promise: Promise<Mongoose> | null;
}

export interface ConnectionStats {
  totalConnections: number;
  failedConnections: number;
  lastConnectionTime: Date | null;
  lastError: unknown;
  isConnected: boolean;
}

export interface RetryConfig {
  maxRetries: number;
  retryDelay: number;
  maxRetryDelay: number;
  backoffMultiplier: number;
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: CachedMongoose | undefined;
  // eslint-disable-next-line no-var
  var fixlyMongooseCache: CachedMongoose | undefined;
  // eslint-disable-next-line no-var
  var fixlyMongooseHandlersRegistered: boolean | undefined;
  // eslint-disable-next-line no-var
  var fixlyMongooseConnectionStats: ConnectionStats | undefined;
}

export const connectionOptions: ConnectOptions = {
  bufferCommands: false,
  maxPoolSize: 20,
  // Serverless functions should not keep a warm minimum pool across invocations.
  minPoolSize: 0,
  serverSelectionTimeoutMS: 10_000,
  socketTimeoutMS: 45_000,
  family: 4,
  retryWrites: true,
  w: 'majority',
  monitorCommands: env.NODE_ENV === 'development',
  heartbeatFrequencyMS: 10_000,
  connectTimeoutMS: 10_000,
  maxIdleTimeMS: 30_000,
  readPreference: 'primaryPreferred',
  writeConcern: { w: 'majority', j: true },
};

export const retryConfig: RetryConfig = {
  maxRetries: 5,
  retryDelay: 1000,
  maxRetryDelay: 30_000,
  backoffMultiplier: 2,
};

export let cached: CachedMongoose =
  global.fixlyMongooseCache ?? global.mongooseCache ?? { conn: null, promise: null };

global.fixlyMongooseCache = cached;
global.mongooseCache = cached;

export function resetCached(value: CachedMongoose): void {
  cached = value;
  global.fixlyMongooseCache = value;
  global.mongooseCache = value;
}

export const connectionStats: ConnectionStats = global.fixlyMongooseConnectionStats ?? {
  totalConnections: 0,
  failedConnections: 0,
  lastConnectionTime: null,
  lastError: null,
  isConnected: false,
};

global.fixlyMongooseConnectionStats = connectionStats;
