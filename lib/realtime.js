// Complete real-time system using Server-Sent Events
class RealtimeManager {
  constructor() {
    this.connections = new Map(); // userId -> response objects
    this.userActivities = new Map(); // userId -> last activity
    this.messageQueues = new Map(); // userId -> message queue
  }
  
  // Add SSE connection for a user
  addConnection(userId, response) {
    // Store the connection
    this.connections.set(userId, response);
    this.userActivities.set(userId, Date.now());
    
    // Initialize message queue if not exists
    if (!this.messageQueues.has(userId)) {
      this.messageQueues.set(userId, []);
    }
    
    console.log(`🔗 User ${userId} connected via SSE`);
    
    // Send welcome message
    this.sendToUser(userId, {
      type: 'connected',
      message: 'Real-time connected',
      timestamp: Date.now()
    });
    
    // Send any queued messages
    this.flushQueuedMessages(userId);
  }
  
  // Remove connection
  removeConnection(userId) {
    this.connections.delete(userId);
    console.log(`❌ User ${userId} disconnected`);
  }
  
  // Send message to specific user
  sendToUser(userId, data) {
    const connection = this.connections.get(userId);
    
    if (connection && !connection.destroyed) {
      try {
        connection.write(`data: ${JSON.stringify(data)}\n\n`);
        this.userActivities.set(userId, Date.now());
      } catch (error) {
        console.error(`Failed to send to user ${userId}:`, error);
        this.removeConnection(userId);
      }
    } else {
      // Queue message if user not connected
      this.queueMessage(userId, data);
    }
  }
  
  // Queue message for offline users
  queueMessage(userId, data) {
    if (!this.messageQueues.has(userId)) {
      this.messageQueues.set(userId, []);
    }
    
    const queue = this.messageQueues.get(userId);
    queue.push({ ...data, queued: true });
    
    // Keep only last 50 messages
    if (queue.length > 50) {
      queue.shift();
    }
  }
  
  // Send queued messages when user connects
  flushQueuedMessages(userId) {
    const queue = this.messageQueues.get(userId);
    if (queue && queue.length > 0) {
      queue.forEach(message => {
        this.sendToUser(userId, message);
      });
      this.messageQueues.set(userId, []); // Clear queue
    }
  }
  
  // Broadcast to all connected users
  broadcast(data, excludeUserId = null) {
    for (const [userId, connection] of this.connections) {
      if (userId !== excludeUserId && connection && !connection.destroyed) {
        this.sendToUser(userId, data);
      }
    }
  }
  
  // Send notification
  sendNotification(userId, notification) {
    this.sendToUser(userId, {
      type: 'notification',
      data: {
        id: Date.now(),
        title: notification.title,
        message: notification.message,
        type: notification.type || 'info',
        timestamp: Date.now()
      }
    });
  }
  
  // Send new message alert
  sendMessageAlert(userId, message) {
    this.sendToUser(userId, {
      type: 'message',
      data: {
        id: message.id,
        from: message.from,
        content: message.content,
        timestamp: Date.now()
      }
    });
  }
  
  // Send comment update
  sendCommentUpdate(userId, comment) {
    this.sendToUser(userId, {
      type: 'comment',
      data: {
        id: comment.id,
        jobId: comment.jobId,
        author: comment.author,
        content: comment.content,
        timestamp: Date.now()
      }
    });
  }
  
  // Send job application update
  sendJobUpdate(userId, update) {
    this.sendToUser(userId, {
      type: 'job_update',
      data: {
        jobId: update.jobId,
        status: update.status,
        applicant: update.applicant,
        timestamp: Date.now()
      }
    });
  }
  
  // Get online users count
  getOnlineUsersCount() {
    return this.connections.size;
  }
  
  // Get online users list
  getOnlineUsers() {
    return Array.from(this.connections.keys());
  }
  
  // Clean up inactive connections
  cleanupInactiveConnections() {
    const now = Date.now();
    const timeout = 5 * 60 * 1000; // 5 minutes
    
    for (const [userId, lastActivity] of this.userActivities) {
      if (now - lastActivity > timeout) {
        this.removeConnection(userId);
        this.userActivities.delete(userId);
      }
    }
  }
}

// Export singleton instance
const realtimeManager = new RealtimeManager();

// Cleanup inactive connections every 2 minutes
setInterval(() => {
  realtimeManager.cleanupInactiveConnections();
}, 2 * 60 * 1000);

module.exports = realtimeManager;