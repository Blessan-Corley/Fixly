// lib/socket.js - Optimized Socket.io Server (Backward Compatible)
// This file maintains backward compatibility while using the new modular structure

const {
  initializeSocket,
  getSocketInstance,
  getSocket,
  emitToUser,
  emitToJob,
  emitToMessages,
  emitBroadcast,
  getServerStats
} = require('./simple-websocket');

// Export all functions for backward compatibility
module.exports = {
  initializeSocket,
  getSocketInstance,
  getSocket,
  emitToUser,
  emitToJob,
  emitToMessages,
  emitBroadcast,
  getServerStats
};

// Default export for ES6 imports
module.exports.default = module.exports;