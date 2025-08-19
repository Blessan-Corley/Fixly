// lib/socket/activity-manager.js - User Activity Management
const { ACTIVITY_CONFIG } = require('./config');

/**
 * Manages user activity tracking and auto-disconnect
 */
class ActivityManager {
  constructor(io) {
    this.io = io;
    this.userActivity = new Map();
    this.cleanupInterval = null;
    this.isShuttingDown = false;
  }

  /**
   * Initialize activity manager
   */
  initialize() {
    this.startCleanupInterval();
    console.log('✅ Activity Manager initialized');
  }

  /**
   * Update user activity timestamp
   * @param {string} socketId - Socket ID
   */
  updateActivity(socketId) {
    if (!this.isShuttingDown) {
      this.userActivity.set(socketId, Date.now());
    }
  }

  /**
   * Remove user from activity tracking
   * @param {string} socketId - Socket ID
   */
  removeUser(socketId) {
    this.userActivity.delete(socketId);
  }

  /**
   * Start periodic cleanup of inactive users
   */
  startCleanupInterval() {
    this.cleanupInterval = setInterval(() => {
      this.cleanupInactiveUsers();
    }, ACTIVITY_CONFIG.ACTIVITY_CHECK_INTERVAL);
  }

  /**
   * Clean up inactive users
   */
  cleanupInactiveUsers() {
    if (this.isShuttingDown) return;

    const now = Date.now();
    const inactiveUsers = [];

    this.userActivity.forEach((lastActivity, socketId) => {
      if (now - lastActivity > ACTIVITY_CONFIG.INACTIVITY_TIMEOUT) {
        inactiveUsers.push(socketId);
      }
    });

    // Process inactive users
    inactiveUsers.forEach(socketId => {
      this.handleInactiveUser(socketId);
    });

    if (inactiveUsers.length > 0) {
      console.log(`🧹 Cleaned up ${inactiveUsers.length} inactive users`);
    }
  }

  /**
   * Handle inactive user disconnection
   * @param {string} socketId - Socket ID
   */
  handleInactiveUser(socketId) {
    const socket = this.io.sockets.sockets.get(socketId);
    
    if (!socket) {
      this.userActivity.delete(socketId);
      return;
    }

    console.log(`🧹 Auto-disconnecting inactive user ${socket.userId} after ${ACTIVITY_CONFIG.INACTIVITY_TIMEOUT / 60000} minutes`);
    
    // Send warning
    socket.emit('inactivity_warning', {
      message: 'Auto-disconnecting due to inactivity. Your session will be restored when you return.',
      timeout: ACTIVITY_CONFIG.WARNING_TIMEOUT
    });

    // Disconnect after warning timeout
    setTimeout(() => {
      if (socket.connected && !this.isShuttingDown) {
        socket.disconnect(true);
      }
      this.userActivity.delete(socketId);
    }, ACTIVITY_CONFIG.WARNING_TIMEOUT);
  }

  /**
   * Get activity statistics
   * @returns {Object} Activity stats
   */
  getStats() {
    const now = Date.now();
    let activeUsers = 0;
    let inactiveUsers = 0;

    this.userActivity.forEach((lastActivity) => {
      if (now - lastActivity > ACTIVITY_CONFIG.INACTIVITY_TIMEOUT) {
        inactiveUsers++;
      } else {
        activeUsers++;
      }
    });

    return {
      totalTracked: this.userActivity.size,
      activeUsers,
      inactiveUsers,
      connectedSockets: this.io.sockets.sockets.size
    };
  }

  /**
   * Gracefully shutdown activity manager
   */
  shutdown() {
    this.isShuttingDown = true;
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    this.userActivity.clear();
    console.log('🧹 Activity Manager shutdown complete');
  }
}

module.exports = {
  ActivityManager
};