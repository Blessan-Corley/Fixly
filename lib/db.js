// lib/db.js - Enhanced with retry mechanism, connection pooling, and monitoring
import mongoose from 'mongoose';

// Global variable to cache the connection
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

// Connection monitoring
const connectionStats = {
  totalConnections: 0,
  failedConnections: 0,
  lastConnectionTime: null,
  lastError: null,
  isConnected: false
};

// Enhanced connection options
const connectionOptions = {
  bufferCommands: false,
  maxPoolSize: 20, // Increased for better performance
  minPoolSize: 5, // Minimum connections to maintain
  serverSelectionTimeoutMS: 10000, // Increased timeout
  socketTimeoutMS: 45000,
  family: 4,
  retryWrites: true,
  w: 'majority',
  // Connection monitoring
  monitorCommands: process.env.NODE_ENV === 'development',
  // Heartbeat settings
  heartbeatFrequencyMS: 10000,
  // Timeout settings
  connectTimeoutMS: 10000,
  // Read preferences
  readPreference: 'primaryPreferred',
  // Write concerns
  writeConcern: {
    w: 'majority',
    j: true
  }
};

// Retry mechanism configuration
const retryConfig = {
  maxRetries: 5,
  retryDelay: 1000, // Start with 1 second
  maxRetryDelay: 30000, // Max 30 seconds
  backoffMultiplier: 2
};

// Enhanced error handling
class DatabaseConnectionError extends Error {
  constructor(message, originalError = null) {
    super(message);
    this.name = 'DatabaseConnectionError';
    this.originalError = originalError;
    this.timestamp = new Date();
  }
}

// Retry function with exponential backoff
async function retryConnection(attempt = 1) {
  const MONGODB_URI = process.env.MONGODB_URI; // Resolve dynamically
  
  const delay = Math.min(
    retryConfig.retryDelay * Math.pow(retryConfig.backoffMultiplier, attempt - 1),
    retryConfig.maxRetryDelay
  );

  if (attempt > 1) {
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  try {
    const connection = await mongoose.connect(MONGODB_URI, connectionOptions);
    connectionStats.totalConnections++;
    connectionStats.lastConnectionTime = new Date();
    connectionStats.isConnected = true;
    connectionStats.lastError = null;
    
    // Only log on first successful connection
    if (attempt === 1) {
      console.log('✅ MongoDB connected successfully');
    }
    return connection;
  } catch (error) {
    connectionStats.failedConnections++;
    connectionStats.lastError = error;
    connectionStats.isConnected = false;
    
    if (attempt < retryConfig.maxRetries) {
      return retryConnection(attempt + 1);
    } else {
      console.error(`❌ Database connection failed after ${retryConfig.maxRetries} attempts`);
      throw new DatabaseConnectionError(
        `Failed to connect to MongoDB after ${retryConfig.maxRetries} attempts`,
        error
      );
    }
  }
}

// Connection event handlers
function setupConnectionHandlers(mongoose) {
  mongoose.connection.on('connected', () => {
    connectionStats.isConnected = true;
    connectionStats.lastConnectionTime = new Date();
  });

  mongoose.connection.on('error', (error) => {
    // Only log critical errors
    if (process.env.NODE_ENV === 'development') {
      console.error('🔴 MongoDB connection error:', error.message);
    }
    connectionStats.isConnected = false;
    connectionStats.lastError = error;
  });

  mongoose.connection.on('disconnected', () => {
    connectionStats.isConnected = false;
  });

  mongoose.connection.on('reconnected', () => {
    connectionStats.isConnected = true;
    connectionStats.lastConnectionTime = new Date();
  });

  // Graceful shutdown
  process.on('SIGINT', async () => {
    await mongoose.connection.close();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await mongoose.connection.close();
    process.exit(0);
  });
}

// Health check function
export function getDatabaseHealth() {
  return {
    isConnected: connectionStats.isConnected,
    totalConnections: connectionStats.totalConnections,
    failedConnections: connectionStats.failedConnections,
    lastConnectionTime: connectionStats.lastConnectionTime,
    lastError: connectionStats.lastError ? connectionStats.lastError.message : null,
    connectionPool: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
  };
}

// Enhanced connection function
async function connectDB() {
  try {
    const MONGODB_URI = process.env.MONGODB_URI; // Resolve dynamically

    // ✅ CRITICAL FIX: Check if MONGODB_URI is available
    if (!MONGODB_URI) {
      throw new Error('MONGODB_URI environment variable is not set. Please check your .env.local file.');
    }

    // Return existing connection if available
    if (cached.conn && mongoose.connection.readyState === 1) {
      return cached.conn;
    }

    // If there's a pending connection, wait for it
    if (cached.promise) {
      cached.conn = await cached.promise;
      return cached.conn;
    }
    
    // Create new connection with retry mechanism
    cached.promise = retryConnection();
    cached.conn = await cached.promise;
    
    // Setup connection event handlers
    setupConnectionHandlers(mongoose);
    
    return cached.conn;
  } catch (error) {
    // Reset cached promise on error
    cached.promise = null;
    
    console.error('❌ Database connection failed:', error);
    console.error('❌ Error name:', error.name);
    console.error('❌ Error message:', error.message);
    
    // Log detailed error information
    if (error instanceof DatabaseConnectionError) {
      console.error('Original error:', error.originalError);
    }
    
    // Provide helpful error message
    if (error.message.includes('MONGODB_URI')) {
      console.error('💡 To fix this:');
      console.error('1. Create a .env.local file in your project root');
      console.error('2. Add: MONGODB_URI=your-mongodb-connection-string');
      console.error('3. Restart your development server');
    }
    
    // Throw a user-friendly error
    throw new Error(`Database connection failed: ${error.message}`);
  }
}

// Export connection stats for monitoring
export { connectionStats };

export default connectDB;