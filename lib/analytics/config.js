// lib/analytics/config.js - Analytics Configuration
const ANALYTICS_CONFIG = {
  // Buffer settings for batch processing
  bufferSize: 50, // Reduced for better performance
  flushInterval: 3000, // 3 seconds for faster processing
  maxRetries: 3,
  retryDelay: 1000,
  
  // Cache settings
  cacheExpiry: 24 * 60 * 60, // 24 hours
  realTimeThreshold: 100, // Max real-time events per minute
  
  // Storage settings
  maxEventAge: 30 * 24 * 60 * 60, // 30 days
  compressionThreshold: 1000, // Compress data over 1KB
  
  // Performance settings
  enableRealTime: true,
  enableBatching: true,
  enableCompression: true,
  enableMetrics: true
};

// Event types for tracking
const EVENT_TYPES = {
  // User Events
  USER_SIGNUP: 'user_signup',
  USER_LOGIN: 'user_login',
  USER_LOGOUT: 'user_logout',
  USER_PROFILE_UPDATE: 'user_profile_update',
  USER_VERIFICATION: 'user_verification',
  
  // Job Events
  JOB_POSTED: 'job_posted',
  JOB_VIEWED: 'job_viewed',
  JOB_APPLIED: 'job_applied',
  JOB_ACCEPTED: 'job_accepted',
  JOB_COMPLETED: 'job_completed',
  JOB_CANCELLED: 'job_cancelled',
  JOB_RATED: 'job_rated',
  
  // Search Events
  SEARCH_PERFORMED: 'search_performed',
  FILTER_APPLIED: 'filter_applied',
  LOCATION_SEARCH: 'location_search',
  
  // Payment Events
  PAYMENT_INITIATED: 'payment_initiated',
  PAYMENT_COMPLETED: 'payment_completed',
  PAYMENT_FAILED: 'payment_failed',
  PAYOUT_REQUESTED: 'payout_requested',
  
  // Engagement Events
  MESSAGE_SENT: 'message_sent',
  COMMENT_POSTED: 'comment_posted',
  NOTIFICATION_CLICKED: 'notification_clicked',
  PAGE_VIEW: 'page_view',
  SESSION_START: 'session_start',
  SESSION_END: 'session_end',
  
  // Admin Events
  ADMIN_ACTION: 'admin_action',
  USER_BANNED: 'user_banned',
  USER_UNBANNED: 'user_unbanned',
  
  // Error Events
  ERROR_OCCURRED: 'error_occurred',
  API_ERROR: 'api_error',
  CLIENT_ERROR: 'client_error'
};

// Metric aggregation types
const AGGREGATION_TYPES = {
  COUNT: 'count',
  SUM: 'sum',
  AVERAGE: 'average',
  UNIQUE: 'unique',
  MAX: 'max',
  MIN: 'min'
};

module.exports = {
  ANALYTICS_CONFIG,
  EVENT_TYPES,
  AGGREGATION_TYPES
};