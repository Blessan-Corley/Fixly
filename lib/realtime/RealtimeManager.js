// Comprehensive Real-time Manager for Fixly
import { EventEmitter } from 'events';

class RealtimeManager extends EventEmitter {
  constructor() {
    super();
    this.connections = new Map(); // userId -> connection info
    this.rooms = new Map(); // roomId -> Set of userIds
    this.userRooms = new Map(); // userId -> Set of roomIds
    this.messageQueue = new Map(); // userId -> array of pending messages
    this.deliveryBatch = new Map(); // userId -> batch info
    this.batchTimeouts = new Map(); // userId -> timeout ID
    this.onlineUsers = new Set();
    this.userActivity = new Map(); // userId -> last activity timestamp
    
    // Auto cleanup inactive connections every 30 seconds
    setInterval(() => this.cleanupInactiveConnections(), 30000);
    
    // Process delivery batches every 5 seconds
    setInterval(() => this.processBatches(), 5000);
  }

  // Connection Management
  addConnection(userId, connection) {
    this.connections.set(userId, {
      connection,
      connectedAt: Date.now(),
      lastActivity: Date.now(),
      rooms: new Set()
    });
    
    this.onlineUsers.add(userId);
    this.userActivity.set(userId, Date.now());
    
    // Send any queued messages
    this.deliverQueuedMessages(userId);
    
    this.emit('user:online', { userId, timestamp: Date.now() });
    console.log(`🟢 User ${userId} connected - Total online: ${this.onlineUsers.size}`);
  }

  removeConnection(userId) {
    const connectionInfo = this.connections.get(userId);
    if (connectionInfo) {
      // Leave all rooms
      connectionInfo.rooms.forEach(roomId => {
        this.leaveRoom(userId, roomId);
      });
      
      this.connections.delete(userId);
      this.onlineUsers.delete(userId);
      
      // Clear any batch timeouts
      const timeoutId = this.batchTimeouts.get(userId);
      if (timeoutId) {
        clearTimeout(timeoutId);
        this.batchTimeouts.delete(timeoutId);
      }
      
      this.emit('user:offline', { userId, timestamp: Date.now() });
      console.log(`🔴 User ${userId} disconnected - Total online: ${this.onlineUsers.size}`);
    }
  }

  updateUserActivity(userId) {
    if (this.connections.has(userId)) {
      this.connections.get(userId).lastActivity = Date.now();
      this.userActivity.set(userId, Date.now());
    }
  }

  // Room Management
  joinRoom(userId, roomId) {
    if (!this.connections.has(userId)) return false;

    // Add user to room
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new Set());
    }
    this.rooms.get(roomId).add(userId);
    
    // Add room to user's rooms
    if (!this.userRooms.has(userId)) {
      this.userRooms.set(userId, new Set());
    }
    this.userRooms.get(userId).add(roomId);
    
    // Update connection info
    this.connections.get(userId).rooms.add(roomId);
    
    // Notify room about new member
    this.broadcastToRoom(roomId, {
      type: 'room:user_joined',
      roomId,
      userId,
      timestamp: Date.now()
    }, [userId]); // Exclude the joining user

    console.log(`👥 User ${userId} joined room ${roomId}`);
    return true;
  }

  leaveRoom(userId, roomId) {
    const room = this.rooms.get(roomId);
    if (room) {
      room.delete(userId);
      if (room.size === 0) {
        this.rooms.delete(roomId);
      }
    }
    
    const userRooms = this.userRooms.get(userId);
    if (userRooms) {
      userRooms.delete(roomId);
      if (userRooms.size === 0) {
        this.userRooms.delete(userId);
      }
    }
    
    const connectionInfo = this.connections.get(userId);
    if (connectionInfo) {
      connectionInfo.rooms.delete(roomId);
    }
    
    // Notify room about member leaving
    this.broadcastToRoom(roomId, {
      type: 'room:user_left',
      roomId,
      userId,
      timestamp: Date.now()
    });

    console.log(`👋 User ${userId} left room ${roomId}`);
  }

  // Message Delivery
  sendToUser(userId, message, options = {}) {
    const { 
      priority = 'normal', 
      batch = false,
      batchDelay = 2000,
      requireDelivery = false 
    } = options;

    const enhancedMessage = {
      ...message,
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      priority,
      userId
    };

    if (this.connections.has(userId)) {
      if (batch && priority !== 'high') {
        this.addToBatch(userId, enhancedMessage, batchDelay);
      } else {
        this.deliverMessage(userId, enhancedMessage);
      }
    } else {
      // User offline - queue message
      if (!this.messageQueue.has(userId)) {
        this.messageQueue.set(userId, []);
      }
      
      const queue = this.messageQueue.get(userId);
      queue.push(enhancedMessage);
      
      // Limit queue size
      if (queue.length > 100) {
        queue.shift(); // Remove oldest message
      }
      
      console.log(`📬 Queued message for offline user ${userId}`);
    }

    return enhancedMessage.id;
  }

  broadcastToRoom(roomId, message, excludeUsers = []) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const excludeSet = new Set(excludeUsers);
    let deliveredCount = 0;
    let queuedCount = 0;

    room.forEach(userId => {
      if (!excludeSet.has(userId)) {
        const messageId = this.sendToUser(userId, {
          ...message,
          roomId
        }, { batch: true, batchDelay: 1000 });
        
        if (this.connections.has(userId)) {
          deliveredCount++;
        } else {
          queuedCount++;
        }
      }
    });

    console.log(`📡 Broadcast to room ${roomId}: ${deliveredCount} delivered, ${queuedCount} queued`);
  }

  // Batch Processing
  addToBatch(userId, message, delay) {
    if (!this.deliveryBatch.has(userId)) {
      this.deliveryBatch.set(userId, {
        messages: [],
        createdAt: Date.now()
      });
    }

    const batch = this.deliveryBatch.get(userId);
    batch.messages.push(message);

    // Clear existing timeout and set new one
    const existingTimeout = this.batchTimeouts.get(userId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    const timeoutId = setTimeout(() => {
      this.flushBatch(userId);
    }, delay);

    this.batchTimeouts.set(userId, timeoutId);

    // Auto flush if batch gets too large
    if (batch.messages.length >= 10) {
      this.flushBatch(userId);
    }
  }

  flushBatch(userId) {
    const batch = this.deliveryBatch.get(userId);
    if (!batch || batch.messages.length === 0) return;

    // Clear timeout
    const timeoutId = this.batchTimeouts.get(userId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.batchTimeouts.delete(userId);
    }

    // Send batch
    this.deliverMessage(userId, {
      type: 'batch',
      messages: batch.messages,
      timestamp: Date.now(),
      batchId: `batch_${Date.now()}_${userId}`
    });

    // Clear batch
    this.deliveryBatch.delete(userId);
    console.log(`📦 Flushed batch for user ${userId}: ${batch.messages.length} messages`);
  }

  processBatches() {
    const now = Date.now();
    const maxAge = 5000; // 5 seconds

    for (const [userId, batch] of this.deliveryBatch.entries()) {
      if (now - batch.createdAt > maxAge) {
        this.flushBatch(userId);
      }
    }
  }

  // Core message delivery
  deliverMessage(userId, message) {
    const connectionInfo = this.connections.get(userId);
    if (!connectionInfo) return false;

    try {
      const connection = connectionInfo.connection;
      
      // Check if connection is still valid (SSE)
      if (connection.controller && !connection.controller.desiredSize === null) {
        const data = `data: ${JSON.stringify(message)}\n\n`;
        connection.controller.enqueue(data);
        
        this.updateUserActivity(userId);
        return true;
      }
    } catch (error) {
      console.error(`❌ Failed to deliver message to ${userId}:`, error);
      this.removeConnection(userId);
    }
    
    return false;
  }

  deliverQueuedMessages(userId) {
    const queue = this.messageQueue.get(userId);
    if (!queue || queue.length === 0) return;

    console.log(`📬 Delivering ${queue.length} queued messages to user ${userId}`);

    // Send messages in batches to avoid overwhelming
    const batchSize = 5;
    const batches = [];
    
    for (let i = 0; i < queue.length; i += batchSize) {
      batches.push(queue.slice(i, i + batchSize));
    }

    batches.forEach((batch, index) => {
      setTimeout(() => {
        this.deliverMessage(userId, {
          type: 'queued_batch',
          messages: batch,
          batchIndex: index + 1,
          totalBatches: batches.length,
          timestamp: Date.now()
        });
      }, index * 500); // Stagger delivery
    });

    // Clear queue
    this.messageQueue.delete(userId);
  }

  // Cleanup
  cleanupInactiveConnections() {
    const now = Date.now();
    const inactiveThreshold = 5 * 60 * 1000; // 5 minutes
    const inactiveUsers = [];

    for (const [userId, connectionInfo] of this.connections.entries()) {
      if (now - connectionInfo.lastActivity > inactiveThreshold) {
        inactiveUsers.push(userId);
      }
    }

    inactiveUsers.forEach(userId => {
      console.log(`🧹 Cleaning up inactive connection for user ${userId}`);
      this.removeConnection(userId);
    });
  }

  // Analytics & Monitoring
  getStats() {
    return {
      onlineUsers: this.onlineUsers.size,
      totalConnections: this.connections.size,
      totalRooms: this.rooms.size,
      queuedMessages: Array.from(this.messageQueue.values()).reduce((sum, queue) => sum + queue.length, 0),
      pendingBatches: this.deliveryBatch.size,
      averageRoomSize: this.rooms.size > 0 ? 
        Array.from(this.rooms.values()).reduce((sum, room) => sum + room.size, 0) / this.rooms.size : 0
    };
  }

  // Real-time Events for Different Features
  
  // Job Comments
  notifyJobComment(jobId, comment) {
    this.broadcastToRoom(`job_${jobId}`, {
      type: 'job:comment:new',
      jobId,
      comment,
      timestamp: Date.now()
    });
  }

  notifyJobCommentReply(jobId, commentId, reply) {
    this.broadcastToRoom(`job_${jobId}`, {
      type: 'job:comment:reply',
      jobId,
      commentId,
      reply,
      timestamp: Date.now()
    });
  }

  // Job Applications
  notifyJobApplication(jobId, application, hirerId) {
    this.sendToUser(hirerId, {
      type: 'job:application:new',
      jobId,
      application,
      timestamp: Date.now()
    }, { priority: 'high' });
  }

  notifyApplicationStatusChange(applicationId, newStatus, fixerId) {
    this.sendToUser(fixerId, {
      type: 'job:application:status_changed',
      applicationId,
      status: newStatus,
      timestamp: Date.now()
    }, { priority: 'high' });
  }

  // Job Views
  notifyJobView(jobId, viewerId, jobOwnerId) {
    if (viewerId !== jobOwnerId) {
      this.sendToUser(jobOwnerId, {
        type: 'job:viewed',
        jobId,
        viewerId,
        timestamp: Date.now()
      }, { batch: true });
    }
  }

  // Reviews
  notifyNewReview(userId, review) {
    this.sendToUser(userId, {
      type: 'review:new',
      review,
      timestamp: Date.now()
    }, { priority: 'high' });
  }

  // Private Messaging
  notifyPrivateMessage(senderId, recipientId, message) {
    this.sendToUser(recipientId, {
      type: 'message:private',
      senderId,
      message,
      timestamp: Date.now()
    }, { priority: 'high' });
  }

  // System Notifications
  sendNotification(userId, notification) {
    this.sendToUser(userId, {
      type: 'notification',
      ...notification,
      timestamp: Date.now()
    }, { 
      priority: notification.priority || 'normal',
      batch: notification.batch !== false 
    });
  }

  // Bulk notifications
  broadcastNotification(userIds, notification) {
    userIds.forEach(userId => {
      this.sendNotification(userId, notification);
    });
  }
}

// Singleton instance
const realtimeManager = new RealtimeManager();

export default realtimeManager;