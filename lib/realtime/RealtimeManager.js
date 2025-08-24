// Production-grade real-time system using Server-Sent Events
import { EventEmitter } from 'events';

class RealtimeManager extends EventEmitter {
  constructor() {
    super();
    this.connections = new Map(); // userId -> Set of response objects
    this.userSessions = new Map(); // sessionId -> { userId, response, lastActivity }
    this.messageQueues = new Map(); // userId -> Array of queued messages
    this.userPresence = new Map(); // userId -> { status, lastSeen, metadata }
    this.rateLimits = new Map(); // userId -> { count, resetTime }
    
    // Cleanup inactive connections every 30 seconds
    setInterval(() => this.cleanupInactiveConnections(), 30000);
    
    // Process message queues every 5 seconds
    setInterval(() => this.processMessageQueues(), 5000);
    
    // Update presence status every 60 seconds
    setInterval(() => this.updatePresenceHeartbeat(), 60000);
  }
  
  // Add SSE connection for a user
  addConnection(userId, response, sessionId = null) {
    if (!userId || !response) {
      throw new Error('userId and response are required');
    }
    
    sessionId = sessionId || this.generateSessionId();
    
    // Initialize user connections set if not exists
    if (!this.connections.has(userId)) {
      this.connections.set(userId, new Set());
    }
    
    // Add connection to user's set
    this.connections.get(userId).add(response);
    
    // Store session information
    this.userSessions.set(sessionId, {
      userId,
      response,
      lastActivity: Date.now(),
      connectedAt: Date.now()
    });
    
    // Initialize message queue if not exists
    if (!this.messageQueues.has(userId)) {
      this.messageQueues.set(userId, []);
    }
    
    // Update user presence
    this.updateUserPresence(userId, 'online', {
      lastConnected: Date.now(),
      sessionId
    });
    
    console.log(`🔗 User ${userId} connected via SSE (session: ${sessionId})`);
    
    // Send connection confirmation
    this.sendToUserSession(sessionId, {
      type: 'connection',
      status: 'connected',
      sessionId,
      userId,
      timestamp: Date.now(),
      queuedMessages: this.messageQueues.get(userId).length
    });
    
    // Send any queued messages
    this.flushQueuedMessages(userId);
    
    // Emit connection event
    this.emit('userConnected', { userId, sessionId });
    
    return sessionId;
  }
  
  // Remove connection
  removeConnection(sessionId) {
    const session = this.userSessions.get(sessionId);
    if (!session) return;
    
    const { userId, response } = session;
    
    // Remove from user connections
    if (this.connections.has(userId)) {
      this.connections.get(userId).delete(response);
      
      // If no more connections for this user, update presence
      if (this.connections.get(userId).size === 0) {
        this.updateUserPresence(userId, 'offline', {
          lastDisconnected: Date.now()
        });
      }
    }
    
    // Remove session
    this.userSessions.delete(sessionId);
    
    console.log(`❌ User ${userId} disconnected (session: ${sessionId})`);
    
    // Emit disconnection event
    this.emit('userDisconnected', { userId, sessionId });
  }
  
  // Send message to specific user session
  sendToUserSession(sessionId, data) {
    const session = this.userSessions.get(sessionId);
    if (!session || !session.response) return false;
    
    try {
      // Check rate limiting
      if (!this.checkRateLimit(session.userId)) {
        console.warn(`Rate limit exceeded for user ${session.userId}`);
        return false;
      }
      
      const message = `data: ${JSON.stringify(data)}\n\n`;
      session.response.write(message);
      session.lastActivity = Date.now();
      
      return true;
    } catch (error) {
      console.error(`Failed to send to session ${sessionId}:`, error);
      this.removeConnection(sessionId);
      return false;
    }
  }
  
  // Send message to all sessions of a user
  sendToUser(userId, data) {
    const userConnections = this.connections.get(userId);
    if (!userConnections || userConnections.size === 0) {
      // Queue message if user not connected
      this.queueMessage(userId, data);
      return false;
    }
    
    let sentCount = 0;
    const failedSessions = [];
    
    // Find all sessions for this user
    for (const [sessionId, session] of this.userSessions) {
      if (session.userId === userId) {
        if (this.sendToUserSession(sessionId, data)) {
          sentCount++;
        } else {
          failedSessions.push(sessionId);
        }
      }
    }
    
    // Clean up failed sessions
    failedSessions.forEach(sessionId => this.removeConnection(sessionId));
    
    return sentCount > 0;
  }
  
  // Queue message for offline users
  queueMessage(userId, data) {
    if (!this.messageQueues.has(userId)) {
      this.messageQueues.set(userId, []);
    }
    
    const queue = this.messageQueues.get(userId);
    const queuedMessage = {
      ...data,
      queued: true,
      queuedAt: Date.now()
    };
    
    queue.push(queuedMessage);
    
    // Keep only last 100 messages per user
    if (queue.length > 100) {
      queue.splice(0, queue.length - 100);
    }
    
    console.log(`📮 Message queued for user ${userId} (queue size: ${queue.length})`);
  }
  
  // Send queued messages when user connects
  flushQueuedMessages(userId) {
    const queue = this.messageQueues.get(userId);
    if (!queue || queue.length === 0) return;
    
    console.log(`📬 Flushing ${queue.length} queued messages for user ${userId}`);
    
    queue.forEach(message => {
      this.sendToUser(userId, {
        ...message,
        delivered: true,
        deliveredAt: Date.now()
      });
    });
    
    // Clear queue
    this.messageQueues.set(userId, []);
  }
  
  // Broadcast to all connected users
  broadcast(data, excludeUserId = null) {
    let sentCount = 0;
    
    for (const userId of this.connections.keys()) {
      if (userId !== excludeUserId) {
        if (this.sendToUser(userId, data)) {
          sentCount++;
        }
      }
    }
    
    console.log(`📢 Broadcast sent to ${sentCount} users`);
    return sentCount;
  }
  
  // Update user presence
  updateUserPresence(userId, status, metadata = {}) {
    this.userPresence.set(userId, {
      status,
      lastSeen: Date.now(),
      metadata: {
        ...this.userPresence.get(userId)?.metadata,
        ...metadata
      }
    });
    
    // Broadcast presence update to relevant users
    this.emit('presenceUpdate', { userId, status, metadata });
  }
  
  // Get user presence
  getUserPresence(userId) {
    return this.userPresence.get(userId) || {
      status: 'offline',
      lastSeen: null,
      metadata: {}
    };
  }
  
  // Get online users
  getOnlineUsers() {
    const onlineUsers = [];
    for (const [userId, presence] of this.userPresence) {
      if (presence.status === 'online' && this.connections.has(userId)) {
        onlineUsers.push({
          userId,
          ...presence
        });
      }
    }
    return onlineUsers;
  }
  
  // Rate limiting
  checkRateLimit(userId, limit = 100, windowMs = 60000) {
    const now = Date.now();
    const userLimit = this.rateLimits.get(userId);
    
    if (!userLimit || now > userLimit.resetTime) {
      this.rateLimits.set(userId, {
        count: 1,
        resetTime: now + windowMs
      });
      return true;
    }
    
    if (userLimit.count >= limit) {
      return false;
    }
    
    userLimit.count++;
    return true;
  }
  
  // Generate unique session ID
  generateSessionId() {
    return `sse_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  // Clean up inactive connections
  cleanupInactiveConnections() {
    const now = Date.now();
    const timeout = 5 * 60 * 1000; // 5 minutes
    const inactiveSessions = [];
    
    for (const [sessionId, session] of this.userSessions) {
      if (now - session.lastActivity > timeout) {
        inactiveSessions.push(sessionId);
      }
    }
    
    inactiveSessions.forEach(sessionId => {
      console.log(`🧹 Cleaning up inactive session: ${sessionId}`);
      this.removeConnection(sessionId);
    });
    
    if (inactiveSessions.length > 0) {
      console.log(`🧹 Cleaned up ${inactiveSessions.length} inactive connections`);
    }
  }
  
  // Process queued messages for reconnected users
  processMessageQueues() {
    for (const [userId, queue] of this.messageQueues) {
      if (queue.length > 0 && this.connections.has(userId) && this.connections.get(userId).size > 0) {
        this.flushQueuedMessages(userId);
      }
    }
  }
  
  // Update presence heartbeat
  updatePresenceHeartbeat() {
    for (const userId of this.connections.keys()) {
      if (this.connections.get(userId).size > 0) {
        this.updateUserPresence(userId, 'online');
      }
    }
  }
  
  // Get system statistics
  getStats() {
    return {
      totalConnections: Array.from(this.connections.values()).reduce((sum, set) => sum + set.size, 0),
      uniqueUsers: this.connections.size,
      activeSessions: this.userSessions.size,
      queuedMessages: Array.from(this.messageQueues.values()).reduce((sum, queue) => sum + queue.length, 0),
      onlineUsers: this.getOnlineUsers().length,
      timestamp: Date.now()
    };
  }
}

// Export singleton instance
const realtimeManager = new RealtimeManager();
export default realtimeManager;