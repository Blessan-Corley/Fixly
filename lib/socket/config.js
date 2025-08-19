// lib/socket/config.js - Socket.io Configuration
const SOCKET_CONFIG = {
  cors: {
    origin: process.env.NEXTAUTH_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling'],
  allowEIO3: true
};

const REDIS_CONFIG = {
  base: {
    socket: {
      connectTimeout: 10000,
      commandTimeout: 5000
    }
  },
  upstash: {
    socket: {
      tls: true,
      rejectUnauthorized: false
    }
  }
};

const ACTIVITY_CONFIG = {
  INACTIVITY_TIMEOUT: 30 * 60 * 1000, // 30 minutes
  ACTIVITY_CHECK_INTERVAL: 5 * 60 * 1000, // 5 minutes
  WARNING_TIMEOUT: 5000 // 5 seconds warning
};

module.exports = {
  SOCKET_CONFIG,
  REDIS_CONFIG,
  ACTIVITY_CONFIG
};