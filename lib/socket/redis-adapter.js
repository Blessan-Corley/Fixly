// lib/socket/redis-adapter.js - Redis Adapter Setup
const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient } = require('redis');
const { REDIS_CONFIG } = require('./config');

/**
 * Creates and configures Redis adapter for Socket.io with robust error handling
 * @param {Server} io - Socket.io server instance
 * @returns {Promise<boolean>} Success status
 */
async function setupRedisAdapter(io) {
  // Allow disabling Redis in development with environment variable
  if (process.env.DISABLE_REDIS === 'true') {
    console.log('⚠️ Redis disabled via DISABLE_REDIS env var, using memory adapter');
    return false;
  }

  if (!process.env.REDIS_URL) {
    console.log('⚠️ No Redis URL configured, using memory adapter');
    return false;
  }

  // Check if DNS resolution fails for Upstash, fallback to memory adapter
  if (process.env.REDIS_URL.includes('upstash.io')) {
    try {
      const { lookup } = require('dns').promises;
      await lookup('ethical-dodo-7308.upstash.io');
    } catch (dnsError) {
      console.warn('⚠️ DNS resolution failed for Redis host. Using memory adapter for Socket.io');
      console.log('🔧 Redis analytics will still work via REST API');
      return false;
    }
  }

  let pubClient = null;
  let subClient = null;

  try {
    // Use the same stable configuration as our working Redis client
    const redisConfig = {
      url: process.env.REDIS_URL,
      socket: {
        tls: true,
        rejectUnauthorized: false,
        connectTimeout: 30000,
        commandTimeout: 5000,
        lazyConnect: false,
        keepAlive: true,
        family: 0 // Let system choose IPv4 or IPv6
      },
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      retryDelayOnClusterDown: 300,
      enableOfflineQueue: false,
      connectTimeout: 10000,
      commandTimeout: 5000,
      lazyConnect: false
    };

    // Create clients
    pubClient = createClient(redisConfig);
    subClient = createClient(redisConfig);

    // Set up comprehensive error handlers BEFORE connecting
    const setupErrorHandlers = (client, name) => {
      client.on('error', (error) => {
        console.error(`❌ Redis ${name} Client Error:`, error.message);
        // Don't crash the server, just log and continue with memory adapter
      });

      client.on('connect', () => {
        console.log(`✅ Redis ${name} client connected`);
      });

      client.on('ready', () => {
        console.log(`✅ Redis ${name} client ready`);
      });

      client.on('end', () => {
        console.log(`⚠️ Redis ${name} client connection ended`);
      });

      client.on('reconnecting', () => {
        console.log(`🔄 Redis ${name} client reconnecting...`);
      });
    };

    setupErrorHandlers(pubClient, 'Pub');
    setupErrorHandlers(subClient, 'Sub');

    // Test connection with proper timeout for Upstash
    console.log('🔗 Connecting to Redis for Socket.io adapter...');
    await Promise.race([
      Promise.all([
        pubClient.connect(),
        subClient.connect()
      ]),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Redis connection timeout after 15 seconds')), 15000)
      )
    ]);

    // Quick ping test
    await Promise.race([
      Promise.all([
        pubClient.ping(),
        subClient.ping()
      ]),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Redis ping timeout')), 5000)
      )
    ]);
    
    console.log('✅ Redis adapter connections verified');

    // Set up adapter only if connections are successful
    io.adapter(createAdapter(pubClient, subClient));
    console.log('✅ Socket.io Redis adapter initialized successfully');
    return true;

  } catch (error) {
    console.warn('⚠️ Redis adapter failed, using memory adapter:', error.message);
    
    // Cleanup failed connections properly
    const cleanup = async (client, name) => {
      if (client && client.isOpen) {
        try {
          await client.quit();
        } catch (e) {
          try {
            await client.disconnect();
          } catch (e2) {
            // Force close if needed
            if (client.socket && typeof client.socket.destroy === 'function') {
              client.socket.destroy();
            }
          }
        }
      }
    };
    
    await Promise.all([
      cleanup(pubClient, 'Pub'),
      cleanup(subClient, 'Sub')
    ]);

    // Continue without Redis adapter - use memory adapter
    console.log('🔄 Continuing with memory adapter for Socket.io');
    return false;
  }
}

/**
 * Gracefully shuts down Redis connections
 * @param {Server} io - Socket.io server instance
 */
async function shutdownRedisAdapter(io) {
  try {
    if (io.adapter && typeof io.adapter.close === 'function') {
      await io.adapter.close();
      console.log('✅ Redis adapter closed gracefully');
    }
  } catch (error) {
    console.error('❌ Error closing Redis adapter:', error);
  }
}

module.exports = {
  setupRedisAdapter,
  shutdownRedisAdapter
};