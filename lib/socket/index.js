// lib/socket/index.js - Modular Socket.io Server Implementation
const { Server } = require('socket.io');
const { SOCKET_CONFIG } = require('./config');
const { setupRedisAdapter, shutdownRedisAdapter } = require('./redis-adapter');
const { createAuthMiddleware } = require('./auth-middleware');
const { ActivityManager } = require('./activity-manager');
const {
  setupConnectionHandlers,
  setupJobHandlers,
  setupMessagingHandlers,
  setupPresenceHandlers,
  setupNotificationHandlers,
  setupDisconnectHandlers
} = require('./event-handlers');

let io;
let activityManager;

// Export function to get socket instance
function getSocketInstance() {
  return io;
}

/**
 * Initialize Socket.io server with all features
 * @param {Object} server - HTTP server instance
 * @returns {Promise<Object>} Socket.io server instance
 */
async function initializeSocket(server) {
  if (!io) {
    console.log('🚀 Initializing Socket.io server...');
    
    // Create Socket.io server
    io = new Server(server, SOCKET_CONFIG);
    
    // Set up Redis adapter with error handling
    try {
      const redisSuccess = await setupRedisAdapter(io);
      if (redisSuccess) {
        console.log('✅ Redis adapter setup successful');
      } else {
        console.log('⚠️ Using memory adapter for Socket.io');
      }
    } catch (error) {
      console.warn('⚠️ Redis adapter setup failed, continuing with memory adapter:', error.message);
    }
    
    // Initialize activity manager
    activityManager = new ActivityManager(io);
    activityManager.initialize();
    
    // Add global error handling for Socket.io
    io.engine.on('connection_error', (err) => {
      console.error('❌ Socket.io connection error:', err.message);
      // Don't crash the server, just log the error
    });
    
    // Authentication middleware
    io.use(createAuthMiddleware());
    
    // Connection handling
    io.on('connection', (socket) => {
      try {
        // Setup all event handlers
        const updateActivity = setupConnectionHandlers(socket, activityManager);
        setupJobHandlers(socket, updateActivity);
        setupMessagingHandlers(socket, updateActivity);
        setupPresenceHandlers(socket, updateActivity);
        setupNotificationHandlers(socket, updateActivity);
        setupDisconnectHandlers(socket, activityManager);
        
      } catch (error) {
        console.error('❌ Error setting up socket handlers:', error);
        socket.disconnect(true);
      }
    });

    // Cleanup function for graceful shutdown
    io.cleanup = async () => {
      console.log('🧹 Starting Socket.io cleanup...');
      
      if (activityManager) {
        activityManager.shutdown();
      }
      
      await shutdownRedisAdapter(io);
      console.log('✅ Socket.io cleanup completed');
    };

    console.log('✅ Socket.io server initialized successfully');
  }

  return io;
}

// Helper functions for emitting events from API routes
function getSocket() {
  return io;
}

function emitToUser(userId, event, data) {
  if (io && userId) {
    io.to(`user:${userId}`).emit(event, data);
  }
}

function emitToJob(jobId, event, data) {
  if (io && jobId) {
    io.to(`job:${jobId}`).emit(event, data);
  }
}

function emitToMessages(jobId, event, data) {
  if (io && jobId) {
    io.to(`messages:${jobId}`).emit(event, data);
  }
}

function emitBroadcast(event, data) {
  if (io) {
    io.emit(event, data);
  }
}

/**
 * Get server statistics
 * @returns {Object} Server stats
 */
function getServerStats() {
  if (!io || !activityManager) {
    return { error: 'Server not initialized' };
  }

  return {
    connectedSockets: io.sockets.sockets.size,
    connectedUsers: Array.from(io.sockets.sockets.values()).map(s => s.userId).filter(Boolean).length,
    activityStats: activityManager.getStats(),
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage()
  };
}

module.exports = {
  initializeSocket,
  getSocketInstance,
  getSocket,
  emitToUser,
  emitToJob,
  emitToMessages,
  emitBroadcast,
  getServerStats
};