// Database-based real-time system - Most reliable
class SimpleRealtime {
  constructor() {
    this.subscribers = new Map();
    this.pollingInterval = 2000; // 2 seconds
  }
  
  // Subscribe to real-time updates
  subscribe(userId, callback) {
    if (!this.subscribers.has(userId)) {
      this.subscribers.set(userId, []);
    }
    this.subscribers.get(userId).push(callback);
    
    // Start polling for this user
    this.startPolling(userId);
  }
  
  // Unsubscribe from updates
  unsubscribe(userId, callback) {
    const callbacks = this.subscribers.get(userId);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) callbacks.splice(index, 1);
      
      if (callbacks.length === 0) {
        this.subscribers.delete(userId);
      }
    }
  }
  
  // Start polling for user updates
  async startPolling(userId) {
    const poll = async () => {
      try {
        // Check for new notifications
        const notifications = await this.getNewNotifications(userId);
        if (notifications.length > 0) {
          this.notifySubscribers(userId, 'notifications', notifications);
        }
        
        // Check for new messages
        const messages = await this.getNewMessages(userId);
        if (messages.length > 0) {
          this.notifySubscribers(userId, 'messages', messages);
        }
        
        // Check for comment updates
        const comments = await this.getNewComments(userId);
        if (comments.length > 0) {
          this.notifySubscribers(userId, 'comments', comments);
        }
        
      } catch (error) {
        console.error('Polling error:', error);
      }
      
      // Continue polling if user is still subscribed
      if (this.subscribers.has(userId)) {
        setTimeout(poll, this.pollingInterval);
      }
    };
    
    poll();
  }
  
  // Notify all subscribers for a user
  notifySubscribers(userId, type, data) {
    const callbacks = this.subscribers.get(userId);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback({ type, data, timestamp: Date.now() });
        } catch (error) {
          console.error('Callback error:', error);
        }
      });
    }
  }
  
  // Mock database queries (replace with your actual DB calls)
  async getNewNotifications(userId) {
    // Replace with actual database query
    return [
      {
        id: Date.now(),
        title: 'New Job Application',
        message: 'Someone applied to your job posting',
        type: 'job_application'
      }
    ];
  }
  
  async getNewMessages(userId) {
    // Replace with actual database query
    return [];
  }
  
  async getNewComments(userId) {
    // Replace with actual database query  
    return [];
  }
  
  // Trigger immediate update (call this when data changes)
  async triggerUpdate(userId, type, data) {
    this.notifySubscribers(userId, type, data);
  }
}

// Export singleton instance
const realtime = new SimpleRealtime();
module.exports = realtime;