// Real-time presence management system
import { EventEmitter } from 'events';

class PresenceManager extends EventEmitter {
  constructor() {
    super();
    this.userPresence = new Map(); // userId -> presence data
    this.userConnections = new Map(); // userId -> Set of connection IDs
    this.activityTimeouts = new Map(); // userId -> timeout ID
    this.presenceUpdateInterval = 30000; // 30 seconds
    this.offlineThreshold = 2 * 60 * 1000; // 2 minutes
    this.awayThreshold = 5 * 60 * 1000; // 5 minutes
    
    // Start periodic cleanup and updates
    setInterval(() => this.updatePresenceStates(), this.presenceUpdateInterval);
    setInterval(() => this.cleanupStalePresence(), 5 * 60 * 1000); // Every 5 minutes
  }

  // Add user connection
  addUserConnection(userId, connectionId, metadata = {}) {
    // Add connection to user's connection set
    if (!this.userConnections.has(userId)) {
      this.userConnections.set(userId, new Set());
    }
    this.userConnections.get(userId).add(connectionId);

    // Update presence
    const currentPresence = this.userPresence.get(userId);
    const now = Date.now();
    
    const presence = {
      userId,
      status: 'online',
      lastSeen: now,
      lastActivity: now,
      connections: this.userConnections.get(userId).size,
      platform: metadata.platform || 'web',
      userAgent: metadata.userAgent || '',
      ipAddress: metadata.ipAddress || '',
      location: metadata.location || null,
      firstConnected: currentPresence?.firstConnected || now,
      totalOnlineTime: currentPresence?.totalOnlineTime || 0,
      sessionStart: now
    };

    this.userPresence.set(userId, presence);

    // Clear any existing offline timeout
    if (this.activityTimeouts.has(userId)) {
      clearTimeout(this.activityTimeouts.get(userId));
      this.activityTimeouts.delete(userId);
    }

    // Emit presence update
    this.emit('presence:online', presence);
    this.broadcastPresenceUpdate(userId, presence);

    console.log(`🟢 User ${userId} online - ${presence.connections} connection(s)`);
    return presence;
  }

  // Remove user connection
  removeUserConnection(userId, connectionId) {
    const connections = this.userConnections.get(userId);
    if (!connections) return;

    connections.delete(connectionId);

    if (connections.size === 0) {
      // No more connections - user going offline
      this.userConnections.delete(userId);
      this.setUserOffline(userId);
    } else {
      // Still has other connections - just update count
      const presence = this.userPresence.get(userId);
      if (presence) {
        presence.connections = connections.size;
        this.userPresence.set(userId, presence);
        this.broadcastPresenceUpdate(userId, presence);
      }
    }

    console.log(`🔴 User ${userId} connection removed - ${connections.size} remaining`);
  }

  // Update user activity
  updateUserActivity(userId, activity = {}) {
    const presence = this.userPresence.get(userId);
    if (!presence) return;

    const now = Date.now();
    
    // Update activity timestamp
    presence.lastActivity = now;
    presence.lastSeen = now;
    
    // Update activity-specific data
    if (activity.typing) {
      presence.isTyping = activity.typing;
      presence.typingIn = activity.conversationId;
    }
    
    if (activity.viewing) {
      presence.currentPage = activity.page;
      presence.currentJob = activity.jobId;
    }
    
    if (activity.location) {
      presence.location = activity.location;
    }

    // Update status based on activity
    if (presence.status === 'away' || presence.status === 'idle') {
      presence.status = 'online';
    }

    this.userPresence.set(userId, presence);

    // Reset offline timeout
    if (this.activityTimeouts.has(userId)) {
      clearTimeout(this.activityTimeouts.get(userId));
    }

    // Set timeout for offline status
    const timeoutId = setTimeout(() => {
      this.setUserOffline(userId);
    }, this.offlineThreshold);
    
    this.activityTimeouts.set(userId, timeoutId);

    // Emit activity update (throttled)
    this.emit('presence:activity', { userId, activity: presence });
  }

  // Set user offline
  setUserOffline(userId) {
    const presence = this.userPresence.get(userId);
    if (!presence) return;

    const now = Date.now();
    const sessionDuration = now - (presence.sessionStart || now);
    
    presence.status = 'offline';
    presence.lastSeen = now;
    presence.connections = 0;
    presence.totalOnlineTime = (presence.totalOnlineTime || 0) + sessionDuration;
    presence.isTyping = false;
    presence.typingIn = null;

    this.userPresence.set(userId, presence);

    // Clear timeout
    if (this.activityTimeouts.has(userId)) {
      clearTimeout(this.activityTimeouts.get(userId));
      this.activityTimeouts.delete(userId);
    }

    // Emit presence update
    this.emit('presence:offline', presence);
    this.broadcastPresenceUpdate(userId, presence);

    console.log(`⚫ User ${userId} went offline after ${Math.round(sessionDuration / 1000)}s`);
  }

  // Get user presence
  getUserPresence(userId) {
    const presence = this.userPresence.get(userId);
    if (!presence) {
      return {
        userId,
        status: 'offline',
        lastSeen: null,
        isOnline: false,
        connections: 0
      };
    }

    return {
      ...presence,
      isOnline: presence.status === 'online',
      timeAgo: this.getTimeAgo(presence.lastSeen)
    };
  }

  // Get multiple user presences
  getUserPresences(userIds) {
    const presences = {};
    userIds.forEach(userId => {
      presences[userId] = this.getUserPresence(userId);
    });
    return presences;
  }

  // Get online users
  getOnlineUsers() {
    const online = [];
    for (const [userId, presence] of this.userPresence.entries()) {
      if (presence.status === 'online') {
        online.push({
          ...presence,
          isOnline: true,
          timeAgo: this.getTimeAgo(presence.lastActivity)
        });
      }
    }
    return online.sort((a, b) => b.lastActivity - a.lastActivity);
  }

  // Update presence states based on activity
  updatePresenceStates() {
    const now = Date.now();
    let updatedCount = 0;

    for (const [userId, presence] of this.userPresence.entries()) {
      if (presence.status !== 'online') continue;

      const timeSinceActivity = now - presence.lastActivity;
      let newStatus = presence.status;

      // Determine new status based on inactivity
      if (timeSinceActivity > this.offlineThreshold) {
        newStatus = 'offline';
      } else if (timeSinceActivity > this.awayThreshold) {
        newStatus = 'away';
      } else if (timeSinceActivity > 2 * 60 * 1000) { // 2 minutes
        newStatus = 'idle';
      }

      if (newStatus !== presence.status) {
        presence.status = newStatus;
        presence.lastSeen = now;
        
        if (newStatus === 'offline') {
          presence.connections = 0;
          presence.isTyping = false;
          presence.typingIn = null;
        }

        this.userPresence.set(userId, presence);
        this.broadcastPresenceUpdate(userId, presence);
        updatedCount++;

        console.log(`📊 User ${userId} status: ${presence.status}`);
      }
    }

    if (updatedCount > 0) {
      console.log(`🔄 Updated ${updatedCount} presence states`);
    }
  }

  // Cleanup stale presence data
  cleanupStalePresence() {
    const now = Date.now();
    const staleThreshold = 24 * 60 * 60 * 1000; // 24 hours
    let cleanedCount = 0;

    for (const [userId, presence] of this.userPresence.entries()) {
      if (presence.status === 'offline' && 
          (now - presence.lastSeen) > staleThreshold) {
        this.userPresence.delete(userId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} stale presence entries`);
    }
  }

  // Broadcast presence update to relevant users
  broadcastPresenceUpdate(userId, presence) {
    // This would typically broadcast to users who should see this presence
    // For now, we'll emit an event that can be handled by the realtime manager
    this.emit('presence:broadcast', {
      userId,
      presence: {
        userId,
        status: presence.status,
        lastSeen: presence.lastSeen,
        isOnline: presence.status === 'online',
        isTyping: presence.isTyping || false,
        typingIn: presence.typingIn || null
      }
    });
  }

  // Set typing status
  setTypingStatus(userId, conversationId, isTyping = true) {
    const presence = this.userPresence.get(userId);
    if (!presence) return;

    presence.isTyping = isTyping;
    presence.typingIn = isTyping ? conversationId : null;
    presence.lastActivity = Date.now();

    this.userPresence.set(userId, presence);

    // Broadcast typing status
    this.emit('typing:update', {
      userId,
      conversationId,
      isTyping,
      timestamp: Date.now()
    });
  }

  // Get typing users in conversation
  getTypingUsers(conversationId) {
    const typing = [];
    for (const [userId, presence] of this.userPresence.entries()) {
      if (presence.isTyping && presence.typingIn === conversationId) {
        typing.push({
          userId,
          timestamp: presence.lastActivity
        });
      }
    }
    return typing;
  }

  // Utility function to get human-readable time ago
  getTimeAgo(timestamp) {
    if (!timestamp) return null;
    
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
    return `${Math.floor(diff / 604800000)}w ago`;
  }

  // Get presence statistics
  getPresenceStats() {
    const stats = {
      totalUsers: this.userPresence.size,
      onlineUsers: 0,
      awayUsers: 0,
      idleUsers: 0,
      offlineUsers: 0,
      totalConnections: 0,
      typingUsers: 0
    };

    for (const presence of this.userPresence.values()) {
      stats.totalConnections += presence.connections || 0;
      
      switch (presence.status) {
        case 'online':
          stats.onlineUsers++;
          break;
        case 'away':
          stats.awayUsers++;
          break;
        case 'idle':
          stats.idleUsers++;
          break;
        case 'offline':
          stats.offlineUsers++;
          break;
      }
      
      if (presence.isTyping) {
        stats.typingUsers++;
      }
    }

    return stats;
  }

  // Bulk presence update for multiple users
  bulkUpdatePresence(updates) {
    const results = [];
    
    updates.forEach(update => {
      const { userId, activity, connectionId, action } = update;
      
      switch (action) {
        case 'connect':
          results.push(this.addUserConnection(userId, connectionId, update.metadata));
          break;
        case 'disconnect':
          this.removeUserConnection(userId, connectionId);
          results.push({ userId, action: 'disconnected' });
          break;
        case 'activity':
          this.updateUserActivity(userId, activity);
          results.push({ userId, action: 'activity_updated' });
          break;
        case 'typing':
          this.setTypingStatus(userId, update.conversationId, update.isTyping);
          results.push({ userId, action: 'typing_updated' });
          break;
      }
    });
    
    return results;
  }

  // Handle window focus/blur for more accurate presence
  handleWindowFocus(userId, focused) {
    const presence = this.userPresence.get(userId);
    if (!presence) return;

    if (focused) {
      // Window focused - user is active
      this.updateUserActivity(userId, { window: 'focused' });
    } else {
      // Window blurred - user might be away
      setTimeout(() => {
        const currentPresence = this.userPresence.get(userId);
        if (currentPresence && currentPresence.status === 'online') {
          currentPresence.status = 'idle';
          this.userPresence.set(userId, currentPresence);
          this.broadcastPresenceUpdate(userId, currentPresence);
        }
      }, 30000); // 30 seconds after blur
    }
  }
}

// Singleton instance
const presenceManager = new PresenceManager();

export default presenceManager;