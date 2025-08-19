// lib/socket/auth-middleware.js - Socket Authentication Middleware
const jwt = require('jsonwebtoken');

/**
 * Creates authentication middleware for Socket.io
 * @returns {Function} Middleware function
 */
function createAuthMiddleware() {
  return async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || 
                   socket.handshake.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return next(new Error('Authentication token required'));
      }

      // Verify JWT token with timeout
      const verifyPromise = new Promise((resolve, reject) => {
        try {
          const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET);
          resolve(decoded);
        } catch (error) {
          reject(error);
        }
      });

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Token verification timeout')), 5000)
      );

      const decoded = await Promise.race([verifyPromise, timeoutPromise]);
      
      // Attach user info to socket
      socket.userId = decoded.sub || decoded.id;
      socket.user = {
        id: socket.userId,
        name: decoded.name,
        email: decoded.email,
        role: decoded.role
      };
      
      console.log(`🔌 User ${socket.userId} authenticated for Socket.io`);
      next();

    } catch (error) {
      console.error('❌ Socket authentication error:', error.message);
      
      // Provide specific error messages
      if (error.name === 'TokenExpiredError') {
        next(new Error('Token expired'));
      } else if (error.name === 'JsonWebTokenError') {
        next(new Error('Invalid token'));
      } else if (error.message === 'Token verification timeout') {
        next(new Error('Authentication timeout'));
      } else {
        next(new Error('Authentication failed'));
      }
    }
  };
}

/**
 * Validates user permissions for socket operations
 * @param {Object} socket - Socket instance
 * @param {string} operation - Operation type
 * @param {Object} data - Operation data
 * @returns {boolean} Has permission
 */
function hasPermission(socket, operation, data = {}) {
  if (!socket.user) {
    return false;
  }

  // Admin has all permissions
  if (socket.user.role === 'admin') {
    return true;
  }

  // Operation-specific permissions
  switch (operation) {
    case 'join_job':
      return true; // All authenticated users can join job rooms
    
    case 'send_message':
      return data.jobId && socket.userId; // Must have jobId and be authenticated
    
    case 'moderate_content':
      return socket.user.role === 'admin' || socket.user.role === 'moderator';
    
    case 'force_disconnect':
      return socket.user.role === 'admin';
    
    default:
      return false;
  }
}

module.exports = {
  createAuthMiddleware,
  hasPermission
};