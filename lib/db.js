// lib/db.js - Enhanced with retry mechanism, connection pooling, and monitoring
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI environment variable is not set!');
  console.error('Please create a .env.local file with your MongoDB connection string.');
  console.error('Example: MONGODB_URI=mongodb+srv://YOUR_USERNAME:YOUR_PASSWORD@YOUR_CLUSTER.mongodb.net/YOUR_DATABASE');
  
  // In development, we can continue but warn about the missing connection
  if (process.env.NODE_ENV === 'development') {
    console.warn('⚠️ Running in development mode without database connection');
  } else {
    throw new Error('MONGODB_URI environment variable is required in production');
  }
}

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

// Create optimized database indexes for better performance
export const createDatabaseIndexes = async () => {
  try {
    const db = mongoose.connection.db;
    
    // Job collection indexes
    console.log('Creating Job collection indexes...');
    await db.collection('jobs').createIndex({ "location.coordinates": "2dsphere" }, { background: true, name: "location_2dsphere" });
    await db.collection('jobs').createIndex({ status: 1, createdAt: -1 }, { background: true, name: "status_created" });
    await db.collection('jobs').createIndex({ skillsRequired: 1, status: 1 }, { background: true, name: "skills_status" });
    await db.collection('jobs').createIndex({ createdBy: 1, status: 1 }, { background: true, name: "creator_status" });
    await db.collection('jobs').createIndex({ assignedTo: 1, status: 1 }, { background: true, name: "assigned_status" });
    await db.collection('jobs').createIndex({ "location.city": 1, status: 1 }, { background: true, name: "city_status" });
    await db.collection('jobs').createIndex({ "budget.amount": 1, status: 1 }, { background: true, name: "budget_status" });
    await db.collection('jobs').createIndex({ deadline: 1, status: 1 }, { background: true, name: "deadline_status" });
    await db.collection('jobs').createIndex({ featured: 1, featuredUntil: 1 }, { background: true, name: "featured_until" });
    await db.collection('jobs').createIndex({ urgency: 1, status: 1 }, { background: true, name: "urgency_status" });
    
    // User collection indexes
    console.log('Creating User collection indexes...');
    await db.collection('users').createIndex({ "location.coordinates": "2dsphere" }, { background: true, name: "user_location_2dsphere" });
    await db.collection('users').createIndex({ role: 1, isActive: 1, banned: 1 }, { background: true, name: "role_active_banned" });
    await db.collection('users').createIndex({ skills: 1, role: 1, availableNow: 1 }, { background: true, name: "skills_role_available" });
    await db.collection('users').createIndex({ "location.city": 1, role: 1 }, { background: true, name: "city_role" });
    await db.collection('users').createIndex({ "rating.average": -1, "rating.count": -1 }, { background: true, name: "rating_desc" });
    await db.collection('users').createIndex({ lastActivityAt: -1 }, { background: true, name: "last_activity_desc" });
    await db.collection('users').createIndex({ jobsCompleted: -1, "rating.average": -1 }, { background: true, name: "jobs_rating_desc" });
    await db.collection('users').createIndex({ "plan.type": 1, "plan.status": 1 }, { background: true, name: "plan_type_status" });
    
    // Compound indexes for complex queries
    console.log('Creating compound indexes...');
    await db.collection('jobs').createIndex(
      { "location.city": 1, skillsRequired: 1, status: 1 }, 
      { background: true, name: "location_skills_status" }
    );
    await db.collection('jobs').createIndex(
      { status: 1, featured: 1, createdAt: -1 }, 
      { background: true, name: "status_featured_created" }
    );
    await db.collection('users').createIndex(
      { "location.city": 1, skills: 1, role: 1, availableNow: 1 }, 
      { background: true, name: "location_skills_role_available" }
    );

    // Text search indexes
    console.log('Creating text search indexes...');
    await db.collection('jobs').createIndex(
      { 
        title: "text", 
        description: "text", 
        skillsRequired: "text",
        "location.address": "text" 
      },
      { 
        background: true, 
        name: "job_text_search",
        weights: {
          title: 10,
          skillsRequired: 8,
          description: 5,
          "location.address": 2
        }
      }
    );
    
    await db.collection('users').createIndex(
      { 
        username: "text", 
        name: "text", 
        skills: "text",
        bio: "text",
        "location.city": "text" 
      },
      { 
        background: true, 
        name: "user_text_search",
        weights: {
          username: 10,
          name: 8,
          skills: 5,
          "location.city": 3,
          bio: 2
        }
      }
    );

    console.log('✅ Database indexes created successfully');
    return { success: true, message: 'All indexes created successfully' };
  } catch (error) {
    console.error('❌ Error creating database indexes:', error);
    return { success: false, error: error.message };
  }
};

// Check if indexes exist and create them if needed
export const ensureIndexes = async () => {
  try {
    if (mongoose.connection.readyState === 1) {
      return await createDatabaseIndexes();
    } else {
      console.log('Database not connected. Indexes will be created when connection is established.');
      return { success: false, message: 'Database not connected' };
    }
  } catch (error) {
    console.error('Error ensuring indexes:', error);
    return { success: false, error: error.message };
  }
};

// Get index information for monitoring
export const getIndexInfo = async () => {
  try {
    const db = mongoose.connection.db;
    const jobIndexes = await db.collection('jobs').listIndexes().toArray();
    const userIndexes = await db.collection('users').listIndexes().toArray();
    
    return {
      success: true,
      indexes: {
        jobs: jobIndexes.map(idx => ({ name: idx.name, keys: idx.key })),
        users: userIndexes.map(idx => ({ name: idx.name, keys: idx.key }))
      }
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Export connection stats for monitoring
export { connectionStats };

export default connectDB;