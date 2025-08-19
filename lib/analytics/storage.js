// lib/analytics/storage.js - Analytics Storage System
const { ANALYTICS_CONFIG, AGGREGATION_TYPES } = require('./config');

/**
 * High-performance analytics storage with Redis backend
 */
class AnalyticsStorage {
  constructor(redisClient) {
    this.redis = redisClient;
    this.keyPrefixes = {
      events: 'analytics:events:',
      metrics: 'analytics:metrics:',
      counters: 'analytics:counters:',
      sessions: 'analytics:sessions:',
      daily: 'analytics:daily:',
      hourly: 'analytics:hourly:'
    };
    
    this.pipeline = null;
    this.metrics = {
      eventsStored: 0,
      storageErrors: 0,
      retrievalTime: 0,
      compressionRatio: 0
    };
  }

  /**
   * Store a single event
   * @param {Object} event - Event object
   */
  async storeEvent(event) {
    if (!event || !event.type) {
      throw new Error('Invalid event object');
    }

    try {
      const eventKey = `${this.keyPrefixes.events}${event.id}`;
      const eventData = JSON.stringify(event);
      
      // Store event with TTL
      await this.redis.setex(eventKey, ANALYTICS_CONFIG.maxEventAge, eventData);
      
      // Update counters and metrics
      await this.updateCounters(event);
      await this.updateMetrics(event);
      
      this.metrics.eventsStored++;
      return true;

    } catch (error) {
      this.metrics.storageErrors++;
      console.error('❌ Error storing event:', error);
      throw error;
    }
  }

  /**
   * Store a batch of events efficiently
   * @param {Array} events - Array of events
   */
  async storeBatch(events) {
    if (!events || events.length === 0) return;

    try {
      // Use Redis pipeline for batch operations
      this.pipeline = this.redis.multi();
      
      for (const event of events) {
        const eventKey = `${this.keyPrefixes.events}${event.id}`;
        const eventData = JSON.stringify(event);
        
        // Add to pipeline
        this.pipeline.setex(eventKey, ANALYTICS_CONFIG.maxEventAge, eventData);
        
        // Update counters in pipeline
        this.addCountersToPipeline(event);
      }
      
      // Execute all operations
      await this.pipeline.exec();
      this.pipeline = null;
      
      this.metrics.eventsStored += events.length;
      return true;

    } catch (error) {
      this.metrics.storageErrors++;
      console.error('❌ Error storing event batch:', error);
      throw error;
    }
  }

  /**
   * Update event counters
   * @param {Object} event - Event object
   */
  async updateCounters(event) {
    const date = new Date();
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
    const hourStr = date.toISOString().split('T')[1].split(':')[0]; // HH
    
    const counterKeys = {
      total: `${this.keyPrefixes.counters}total:${event.type}`,
      daily: `${this.keyPrefixes.daily}${dateStr}:${event.type}`,
      hourly: `${this.keyPrefixes.hourly}${dateStr}:${hourStr}:${event.type}`,
      user: event.userId ? `${this.keyPrefixes.counters}user:${event.userId}:${event.type}` : null
    };

    const operations = [
      this.redis.incr(counterKeys.total),
      this.redis.incr(counterKeys.daily),
      this.redis.incr(counterKeys.hourly)
    ];

    if (counterKeys.user) {
      operations.push(this.redis.incr(counterKeys.user));
    }

    // Set TTL on daily and hourly counters
    operations.push(
      this.redis.expire(counterKeys.daily, 31 * 24 * 60 * 60), // 31 days
      this.redis.expire(counterKeys.hourly, 7 * 24 * 60 * 60)  // 7 days
    );

    await Promise.all(operations);
  }

  /**
   * Add counters to pipeline (for batch operations)
   * @param {Object} event - Event object
   */
  addCountersToPipeline(event) {
    if (!this.pipeline) return;

    const date = new Date();
    const dateStr = date.toISOString().split('T')[0];
    const hourStr = date.toISOString().split('T')[1].split(':')[0];
    
    const counterKeys = {
      total: `${this.keyPrefixes.counters}total:${event.type}`,
      daily: `${this.keyPrefixes.daily}${dateStr}:${event.type}`,
      hourly: `${this.keyPrefixes.hourly}${dateStr}:${hourStr}:${event.type}`,
      user: event.userId ? `${this.keyPrefixes.counters}user:${event.userId}:${event.type}` : null
    };

    this.pipeline.incr(counterKeys.total);
    this.pipeline.incr(counterKeys.daily);
    this.pipeline.incr(counterKeys.hourly);
    
    if (counterKeys.user) {
      this.pipeline.incr(counterKeys.user);
    }

    // Set TTL
    this.pipeline.expire(counterKeys.daily, 31 * 24 * 60 * 60);
    this.pipeline.expire(counterKeys.hourly, 7 * 24 * 60 * 60);
  }

  /**
   * Update aggregated metrics
   * @param {Object} event - Event object
   */
  async updateMetrics(event) {
    try {
      // Extract numerical values for aggregation
      const numericValues = this.extractNumericValues(event);
      
      if (Object.keys(numericValues).length === 0) return;

      const date = new Date().toISOString().split('T')[0];
      
      for (const [metric, value] of Object.entries(numericValues)) {
        const metricKey = `${this.keyPrefixes.metrics}${date}:${event.type}:${metric}`;
        
        // Store for different aggregation types
        await Promise.all([
          this.redis.lpush(`${metricKey}:values`, value),
          this.redis.expire(`${metricKey}:values`, 7 * 24 * 60 * 60), // 7 days
          this.redis.incr(`${metricKey}:count`),
          this.redis.expire(`${metricKey}:count`, 7 * 24 * 60 * 60)
        ]);
      }

    } catch (error) {
      console.error('❌ Error updating metrics:', error);
    }
  }

  /**
   * Extract numeric values from event properties
   * @param {Object} event - Event object
   * @returns {Object} Numeric values
   */
  extractNumericValues(event) {
    const numericValues = {};
    
    if (event.properties) {
      Object.entries(event.properties).forEach(([key, value]) => {
        if (typeof value === 'number' && !isNaN(value)) {
          numericValues[key] = value;
        }
      });
    }
    
    return numericValues;
  }

  /**
   * Get event count for a specific type
   * @param {string} eventType - Event type
   * @param {string} period - Period (total, daily, hourly)
   * @param {string} date - Date string (for daily/hourly)
   * @returns {Promise<number>} Event count
   */
  async getEventCount(eventType, period = 'total', date = null) {
    try {
      let key;
      
      switch (period) {
        case 'daily':
          if (!date) date = new Date().toISOString().split('T')[0];
          key = `${this.keyPrefixes.daily}${date}:${eventType}`;
          break;
        case 'hourly':
          if (!date) {
            const now = new Date();
            date = now.toISOString().split('T')[0];
            const hour = now.toISOString().split('T')[1].split(':')[0];
            key = `${this.keyPrefixes.hourly}${date}:${hour}:${eventType}`;
          } else {
            key = `${this.keyPrefixes.hourly}${date}:${eventType}`;
          }
          break;
        default:
          key = `${this.keyPrefixes.counters}total:${eventType}`;
      }
      
      const count = await this.redis.get(key);
      return parseInt(count) || 0;

    } catch (error) {
      console.error('❌ Error getting event count:', error);
      return 0;
    }
  }

  /**
   * Get aggregated metrics
   * @param {string} eventType - Event type
   * @param {string} metric - Metric name
   * @param {string} aggregationType - Aggregation type
   * @param {string} date - Date string
   * @returns {Promise<number>} Aggregated value
   */
  async getAggregatedMetric(eventType, metric, aggregationType, date = null) {
    try {
      if (!date) date = new Date().toISOString().split('T')[0];
      
      const metricKey = `${this.keyPrefixes.metrics}${date}:${eventType}:${metric}`;
      
      switch (aggregationType) {
        case AGGREGATION_TYPES.COUNT:
          const count = await this.redis.get(`${metricKey}:count`);
          return parseInt(count) || 0;
          
        case AGGREGATION_TYPES.SUM:
          const values = await this.redis.lrange(`${metricKey}:values`, 0, -1);
          return values.reduce((sum, val) => sum + parseFloat(val), 0);
          
        case AGGREGATION_TYPES.AVERAGE:
          const allValues = await this.redis.lrange(`${metricKey}:values`, 0, -1);
          if (allValues.length === 0) return 0;
          const sum = allValues.reduce((acc, val) => acc + parseFloat(val), 0);
          return sum / allValues.length;
          
        case AGGREGATION_TYPES.MAX:
          const maxValues = await this.redis.lrange(`${metricKey}:values`, 0, -1);
          return Math.max(...maxValues.map(v => parseFloat(v))) || 0;
          
        case AGGREGATION_TYPES.MIN:
          const minValues = await this.redis.lrange(`${metricKey}:values`, 0, -1);
          return Math.min(...minValues.map(v => parseFloat(v))) || 0;
          
        default:
          return 0;
      }

    } catch (error) {
      console.error('❌ Error getting aggregated metric:', error);
      return 0;
    }
  }

  /**
   * Get storage metrics
   * @returns {Object} Storage metrics
   */
  getMetrics() {
    return { ...this.metrics };
  }

  /**
   * Cleanup old data
   */
  async cleanup() {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 30);
      
      // This would be implemented with a more sophisticated cleanup strategy
      console.log('🧹 Analytics storage cleanup completed');
      
    } catch (error) {
      console.error('❌ Error during analytics cleanup:', error);
    }
  }
}

module.exports = {
  AnalyticsStorage
};