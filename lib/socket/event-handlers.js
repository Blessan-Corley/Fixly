// lib/socket/event-handlers.js - Socket Event Handlers
const { hasPermission } = require('./auth-middleware');

/**
 * Sets up connection event handlers for a socket
 * @param {Object} socket - Socket instance
 * @param {Object} activityManager - Activity manager instance
 */
function setupConnectionHandlers(socket, activityManager) {
  const userId = socket.userId;
  
  // Track user activity
  activityManager.updateActivity(socket.id);
  
  // Join user-specific room
  socket.join(`user:${userId}`);
  console.log(`✅ User ${userId} joined room: user:${userId}`);

  // Activity tracking helper
  const updateActivity = () => {
    activityManager.updateActivity(socket.id);
  };

  // Handle user activity events
  socket.on('user:active', updateActivity);
  socket.on('heartbeat', updateActivity);

  return updateActivity;
}

/**
 * Sets up job-related event handlers
 * @param {Object} socket - Socket instance
 * @param {Function} updateActivity - Activity update function
 */
function setupJobHandlers(socket, updateActivity) {
  const userId = socket.userId;

  // Handle job-specific rooms
  socket.on('join:job', (jobId) => {
    if (!hasPermission(socket, 'join_job', { jobId })) {
      socket.emit('error', { message: 'Permission denied' });
      return;
    }
    
    updateActivity();
    socket.join(`job:${jobId}`);
    console.log(`📋 User ${userId} joined job room: job:${jobId}`);
  });

  socket.on('leave:job', (jobId) => {
    updateActivity();
    socket.leave(`job:${jobId}`);
    console.log(`📋 User ${userId} left job room: job:${jobId}`);
  });

  // Handle job updates
  socket.on('job:update', (data) => {
    updateActivity();
    const { jobId, update } = data;
    socket.to(`job:${jobId}`).emit('job:updated', {
      jobId,
      update,
      updatedBy: userId,
      timestamp: new Date()
    });
  });

  // Handle application updates
  socket.on('application:update', (data) => {
    updateActivity();
    const { jobId, applicationId, status, to } = data;
    
    // Notify job owner and applicant
    if (to) {
      socket.to(`user:${to}`).emit('application:updated', {
        jobId,
        applicationId,
        status,
        updatedBy: userId,
        timestamp: new Date()
      });
    }
  });
}

/**
 * Sets up messaging event handlers
 * @param {Object} socket - Socket instance
 * @param {Function} updateActivity - Activity update function
 */
function setupMessagingHandlers(socket, updateActivity) {
  const userId = socket.userId;

  // Handle messaging
  socket.on('join:messages', (jobId) => {
    updateActivity();
    socket.join(`messages:${jobId}`);
    console.log(`💬 User ${userId} joined messages: messages:${jobId}`);
  });

  socket.on('leave:messages', (jobId) => {
    updateActivity();
    socket.leave(`messages:${jobId}`);
    console.log(`💬 User ${userId} left messages: messages:${jobId}`);
  });

  // Handle new message
  socket.on('message:send', (data) => {
    if (!hasPermission(socket, 'send_message', data)) {
      socket.emit('error', { message: 'Permission denied' });
      return;
    }

    updateActivity();
    const { jobId, message, to } = data;
    
    // Broadcast to job participants
    socket.to(`messages:${jobId}`).emit('message:new', {
      jobId,
      message,
      from: userId,
      timestamp: new Date(),
      ...data
    });

    // Send to specific user if specified
    if (to) {
      socket.to(`user:${to}`).emit('message:new', {
        jobId,
        message,
        from: userId,
        timestamp: new Date(),
        ...data
      });
    }
  });

  // Handle typing indicators
  socket.on('typing:start', (data) => {
    updateActivity();
    const { jobId } = data;
    socket.to(`messages:${jobId}`).emit('typing:start', {
      userId,
      jobId,
      timestamp: new Date()
    });
  });

  socket.on('typing:stop', (data) => {
    updateActivity();
    const { jobId } = data;
    socket.to(`messages:${jobId}`).emit('typing:stop', {
      userId,
      jobId,
      timestamp: new Date()
    });
  });
}

/**
 * Sets up presence/status event handlers
 * @param {Object} socket - Socket instance
 * @param {Function} updateActivity - Activity update function
 */
function setupPresenceHandlers(socket, updateActivity) {
  const userId = socket.userId;

  // Handle presence/online status
  socket.on('user:online', () => {
    updateActivity();
    socket.broadcast.emit('user:status', {
      userId,
      status: 'online',
      timestamp: new Date()
    });
  });

  socket.on('user:away', () => {
    updateActivity();
    socket.broadcast.emit('user:status', {
      userId,
      status: 'away',
      timestamp: new Date()
    });
  });
}

/**
 * Sets up notification event handlers
 * @param {Object} socket - Socket instance
 * @param {Function} updateActivity - Activity update function
 */
function setupNotificationHandlers(socket, updateActivity) {
  const userId = socket.userId;

  // Handle notification events
  socket.on('notification:send', (data) => {
    updateActivity();
    const { to, notification } = data;
    socket.to(`user:${to}`).emit('notification:new', {
      ...notification,
      timestamp: new Date()
    });
  });
}

/**
 * Sets up disconnect event handlers
 * @param {Object} socket - Socket instance
 * @param {Object} activityManager - Activity manager instance
 */
function setupDisconnectHandlers(socket, activityManager) {
  const userId = socket.userId;

  // Handle disconnection
  socket.on('disconnect', (reason) => {
    console.log(`🔌 User ${userId} disconnected: ${reason}`);
    
    // Clean up activity tracking
    activityManager.removeUser(socket.id);
    
    // Notify others that user is offline
    socket.broadcast.emit('user:status', {
      userId,
      status: 'offline',
      timestamp: new Date()
    });
  });

  // Handle errors
  socket.on('error', (error) => {
    console.error(`Socket error for user ${userId}:`, error);
  });
}

module.exports = {
  setupConnectionHandlers,
  setupJobHandlers,
  setupMessagingHandlers,
  setupPresenceHandlers,
  setupNotificationHandlers,
  setupDisconnectHandlers
};