// lib/analytics/event-buffer.js - Event Buffering System
const { ANALYTICS_CONFIG } = require('./config');

/**
 * High-performance event buffer with compression and batching
 */
class EventBuffer {
  constructor(analyticsStorage) {
    this.storage = analyticsStorage;
    this.buffer = [];
    this.flushInterval = null;
    this.isFlushing = false;
    this.retryQueue = [];
    this.metrics = {
      eventsBuffered: 0,
      eventsFlushed: 0,
      flushErrors: 0,
      compressionSaved: 0
    };
    
    this.initialize();
  }

  /**
   * Initialize the buffer system
   */
  initialize() {
    this.startBuffering();
    console.log('✅ Analytics Event Buffer initialized');
  }

  /**
   * Start the buffering system
   */
  startBuffering() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }

    this.flushInterval = setInterval(() => {
      this.flush();
    }, ANALYTICS_CONFIG.flushInterval);
  }

  /**
   * Add event to buffer
   * @param {Object} event - Event object
   */
  addEvent(event) {
    if (!event) return false;

    try {
      // Add metadata
      const enrichedEvent = {
        ...event,
        bufferedAt: Date.now(),
        id: event.id || this.generateEventId()
      };

      this.buffer.push(enrichedEvent);
      this.metrics.eventsBuffered++;

      // Auto-flush if buffer is full
      if (this.buffer.length >= ANALYTICS_CONFIG.bufferSize) {
        this.flush();
      }

      return true;
    } catch (error) {
      console.error('❌ Error adding event to buffer:', error);
      return false;
    }
  }

  /**
   * Flush buffer to storage
   */
  async flush() {
    if (this.isFlushing || this.buffer.length === 0) return;

    this.isFlushing = true;
    const eventsToFlush = [...this.buffer];
    this.buffer = [];

    try {
      // Process events in batches
      const batchSize = 25;
      const batches = this.createBatches(eventsToFlush, batchSize);

      for (const batch of batches) {
        await this.processBatch(batch);
      }

      this.metrics.eventsFlushed += eventsToFlush.length;
      
      // Process retry queue
      await this.processRetryQueue();

    } catch (error) {
      console.error('❌ Error flushing events:', error);
      this.metrics.flushErrors++;
      
      // Add events back to retry queue
      this.retryQueue.push(...eventsToFlush.map(event => ({
        event,
        attempts: 0,
        lastAttempt: Date.now()
      })));
    } finally {
      this.isFlushing = false;
    }
  }

  /**
   * Create batches from events
   * @param {Array} events - Events to batch
   * @param {number} batchSize - Size of each batch
   * @returns {Array} Array of batches
   */
  createBatches(events, batchSize) {
    const batches = [];
    for (let i = 0; i < events.length; i += batchSize) {
      batches.push(events.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Process a batch of events
   * @param {Array} batch - Batch of events
   */
  async processBatch(batch) {
    try {
      // Compress batch if enabled and large enough
      let processedBatch = batch;
      if (ANALYTICS_CONFIG.enableCompression) {
        const batchSize = JSON.stringify(batch).length;
        if (batchSize > ANALYTICS_CONFIG.compressionThreshold) {
          processedBatch = await this.compressBatch(batch);
          this.metrics.compressionSaved += batchSize - JSON.stringify(processedBatch).length;
        }
      }

      // Store batch
      await this.storage.storeBatch(processedBatch);

    } catch (error) {
      console.error('❌ Error processing batch:', error);
      throw error;
    }
  }

  /**
   * Compress batch for storage
   * @param {Array} batch - Batch to compress
   * @returns {Object} Compressed batch
   */
  async compressBatch(batch) {
    // Simple compression by grouping similar events
    const compressed = {
      compressed: true,
      timestamp: Date.now(),
      events: {}
    };

    batch.forEach(event => {
      const key = `${event.type}_${event.userId || 'anonymous'}`;
      if (!compressed.events[key]) {
        compressed.events[key] = {
          type: event.type,
          userId: event.userId,
          count: 0,
          properties: event.properties,
          timestamps: []
        };
      }
      compressed.events[key].count++;
      compressed.events[key].timestamps.push(event.properties.timestamp);
    });

    return compressed;
  }

  /**
   * Process retry queue
   */
  async processRetryQueue() {
    if (this.retryQueue.length === 0) return;

    const now = Date.now();
    const toRetry = this.retryQueue.filter(item => 
      item.attempts < ANALYTICS_CONFIG.maxRetries &&
      (now - item.lastAttempt) > ANALYTICS_CONFIG.retryDelay
    );

    for (const item of toRetry) {
      try {
        await this.storage.storeEvent(item.event);
        
        // Remove from retry queue
        const index = this.retryQueue.indexOf(item);
        if (index > -1) {
          this.retryQueue.splice(index, 1);
        }
        
      } catch (error) {
        item.attempts++;
        item.lastAttempt = now;
        
        if (item.attempts >= ANALYTICS_CONFIG.maxRetries) {
          console.error('❌ Event failed after max retries:', item.event.type);
          const index = this.retryQueue.indexOf(item);
          if (index > -1) {
            this.retryQueue.splice(index, 1);
          }
        }
      }
    }
  }

  /**
   * Generate unique event ID
   * @returns {string} Event ID
   */
  generateEventId() {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get buffer metrics
   * @returns {Object} Buffer metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      bufferSize: this.buffer.length,
      retryQueueSize: this.retryQueue.length,
      isFlushing: this.isFlushing
    };
  }

  /**
   * Gracefully shutdown buffer
   */
  async shutdown() {
    console.log('🧹 Shutting down analytics buffer...');
    
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }

    // Final flush
    await this.flush();
    
    console.log('✅ Analytics buffer shutdown complete');
  }
}

module.exports = {
  EventBuffer
};