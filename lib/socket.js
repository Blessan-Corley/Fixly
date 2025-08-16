// lib/socket.js - Real-time Socket.io Server Implementation
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { getToken } from 'next-auth/jwt';

let io;

export function initializeSocket(server) {
  if (!io) {
    io = new Server(server, {
      cors: {
        origin: process.env.NEXTAUTH_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
      },
      pingTimeout: 60000,
      pingInterval: 25000,
      transports: ['websocket', 'polling']
    });

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

    // Connection handling
    io.on('connection', (socket) => {
      const userId = socket.userId;
      
      // Join user-specific room
      socket.join(`user:${userId}`);
      console.log(`✅ User ${userId} joined room: user:${userId}`);

      // Handle job-specific rooms
      socket.on('join:job', (jobId) => {
        socket.join(`job:${jobId}`);
        console.log(`📋 User ${userId} joined job room: job:${jobId}`);
      });

      socket.on('leave:job', (jobId) => {
        socket.leave(`job:${jobId}`);
        console.log(`📋 User ${userId} left job room: job:${jobId}`);
      });

      // Handle messaging
      socket.on('join:messages', (jobId) => {
        socket.join(`messages:${jobId}`);
        console.log(`💬 User ${userId} joined messages: messages:${jobId}`);
      });

      socket.on('leave:messages', (jobId) => {
        socket.leave(`messages:${jobId}`);
        console.log(`💬 User ${userId} left messages: messages:${jobId}`);
      });

      // Handle new message
      socket.on('message:send', (data) => {
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
        const { jobId } = data;
        socket.to(`messages:${jobId}`).emit('typing:start', {
          userId,
          jobId,
          timestamp: new Date()
        });
      });

      socket.on('typing:stop', (data) => {
        const { jobId } = data;
        socket.to(`messages:${jobId}`).emit('typing:stop', {
          userId,
          jobId,
          timestamp: new Date()
        });
      });

      // Handle job updates
      socket.on('job:update', (data) => {
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
        const { to, notification } = data;
        socket.to(`user:${to}`).emit('notification:new', {
          ...notification,
          timestamp: new Date()
        });
      });

      // Handle presence/online status
      socket.on('user:online', () => {
        socket.broadcast.emit('user:status', {
          userId,
          status: 'online',
          timestamp: new Date()
        });
      });

      socket.on('user:away', () => {
        socket.broadcast.emit('user:status', {
          userId,
          status: 'away',
          timestamp: new Date()
        });
      });

      // Handle disconnection
      socket.on('disconnect', (reason) => {
        console.log(`🔌 User ${userId} disconnected: ${reason}`);
        
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