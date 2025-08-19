// lib/socket.js - Real-time Socket.io Server Implementation
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import jwt from 'jsonwebtoken';
import { getToken } from 'next-auth/jwt';

let io;

// Export function to get socket instance
export function getSocketInstance() {
  return io;
}

export async function initializeSocket(server) {
  if (!io) {
    io = new Server(server, {
      cors: {
        origin: process.env.NEXTAUTH_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
      },
      pingTimeout: 60000,
      pingInterval: 25000,
      transports: ['websocket', 'polling'],
      allowEIO3: true
    });

    // Set up Redis adapter if Redis is available
    if (process.env.REDIS_URL) {
      try {
        const redisConfig = {
          url: process.env.REDIS_URL,
          socket: {
            connectTimeout: 10000,
            commandTimeout: 5000
          }
        };

        // Add TLS configuration for Upstash
        if (process.env.REDIS_URL.includes('upstash.io')) {
          redisConfig.socket.tls = true;
          redisConfig.socket.rejectUnauthorized = false;
        }

        const pubClient = createClient(redisConfig);
        const subClient = pubClient.duplicate();

        await Promise.all([
          pubClient.connect(),
          subClient.connect()
        ]);

        io.adapter(createAdapter(pubClient, subClient));
        console.log('✅ Socket.io Redis adapter initialized');
      } catch (error) {
        console.warn('⚠️ Redis adapter failed, using memory adapter:', error.message);
      }
    } else {
      console.log('⚠️ No Redis URL configured, using memory adapter');
    }

    // Authentication middleware
    io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          return next(new Error('Authentication token required'));
        }

        // Verify JWT token
        const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET);
        socket.userId = decoded.sub || decoded.id;
        socket.user = decoded;
        
        console.log(`🔌 User ${socket.userId} connected to Socket.io`);
        next();
      } catch (error) {
        console.error('Socket authentication error:', error);
        next(new Error('Authentication failed'));
      }
    });

    // User activity tracking for resource management
    const userActivity = new Map();
    const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes
    const ACTIVITY_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes

    // Periodic cleanup of inactive users
    const cleanupInactiveUsers = setInterval(() => {
      const now = Date.now();
      userActivity.forEach((lastActivity, socketId) => {
        if (now - lastActivity > INACTIVITY_TIMEOUT) {
          const socket = io.sockets.sockets.get(socketId);
          if (socket) {
            console.log(`🧹 Auto-disconnecting inactive user ${socket.userId} after ${INACTIVITY_TIMEOUT / 60000} minutes`);
            socket.emit('inactivity_warning', {
              message: 'Auto-disconnecting due to inactivity. Your session will be restored when you return.',
              timeout: 5000
            });
            setTimeout(() => {
              socket.disconnect(true);
            }, 5000);
          }
          userActivity.delete(socketId);
        }
      });
    }, ACTIVITY_CHECK_INTERVAL);

    // Connection handling
    io.on('connection', (socket) => {
      const userId = socket.userId;
      
      // Track user activity
      userActivity.set(socket.id, Date.now());
      
      // Join user-specific room
      socket.join(`user:${userId}`);
      console.log(`✅ User ${userId} joined room: user:${userId}`);

      // Activity tracking helper
      const updateActivity = () => {
        userActivity.set(socket.id, Date.now());
      };

      // Handle user activity events
      socket.on('user:active', updateActivity);
      socket.on('heartbeat', updateActivity);

      // Handle job-specific rooms
      socket.on('join:job', (jobId) => {
        updateActivity();
        socket.join(`job:${jobId}`);
        console.log(`📋 User ${userId} joined job room: job:${jobId}`);
      });

      socket.on('leave:job', (jobId) => {
        updateActivity();
        socket.leave(`job:${jobId}`);
        console.log(`📋 User ${userId} left job room: job:${jobId}`);
      });

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

      // Handle notification events
      socket.on('notification:send', (data) => {
        updateActivity();
        const { to, notification } = data;
        socket.to(`user:${to}`).emit('notification:new', {
          ...notification,
          timestamp: new Date()
        });
      });

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

      // Handle disconnection
      socket.on('disconnect', (reason) => {
        console.log(`🔌 User ${userId} disconnected: ${reason}`);
        
        // Clean up activity tracking
        userActivity.delete(socket.id);
        
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
    });

    // Cleanup function for graceful shutdown
    io.cleanup = () => {
      if (cleanupInactiveUsers) {
        clearInterval(cleanupInactiveUsers);
        console.log('🧹 Stopped inactive user cleanup interval');
      }
    };

    console.log('🚀 Socket.io server initialized');
  }

  return io;
}

// Helper functions for emitting events from API routes
export function getSocket() {
  return io;
}

export function emitToUser(userId, event, data) {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
}

export function emitToJob(jobId, event, data) {
  if (io) {
    io.to(`job:${jobId}`).emit(event, data);
  }
}

export function emitToMessages(jobId, event, data) {
  if (io) {
    io.to(`messages:${jobId}`).emit(event, data);
  }
}

export function emitBroadcast(event, data) {
  if (io) {
    io.emit(event, data);
  }
}

export default io;