import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const userSchema = new mongoose.Schema({
  // Password reset fields
  resetToken: String,
  resetTokenExpiry: Date,
  // Authentication IDs
  uid: {
    type: String,
    unique: true,
    sparse: true // For Firebase users
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true // For Google OAuth users
  },
  
  // Basic Info
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  username: {
    type: String,
    required: [true, 'Username is required'],
    trim: true,
    lowercase: true,
    minlength: [3, 'Username must be at least 3 characters'],
    maxlength: [20, 'Username cannot exceed 20 characters'],
    validate: {
      validator: function(username) {
        if (!username) return false;
        
        // Strict validation: only lowercase letters, numbers, and underscores
        if (!/^[a-z0-9_]+$/.test(username)) {
          return false;
        }
        
        // Cannot start or end with underscore
        if (username.startsWith('_') || username.endsWith('_')) {
          return false;
        }
        
        // Cannot have consecutive underscores
        if (username.includes('__')) {
          return false;
        }
        
        // Cannot be only numbers
        if (/^\d+$/.test(username)) {
          return false;
        }
        
        // Reserved usernames check
        const reserved = [
          'admin', 'administrator', 'root', 'system', 'support', 'help',
          'api', 'www', 'mail', 'email', 'fixly', 'user', 'users',
          'profile', 'dashboard', 'settings', 'auth', 'login', 'signup',
          'test', 'demo', 'temp', 'sample', 'null', 'undefined'
        ];
        
        if (reserved.includes(username)) {
          return false;
        }
        
        return username.length >= 3 && username.length <= 20;
      },
      message: 'Username must be 3-20 characters, contain only lowercase letters, numbers, and underscores (no spaces or special characters), and cannot be a reserved word'
    }
  },
  usernameChangeCount: {
    type: Number,
    default: 0,
    max: [3, 'Maximum 3 username changes allowed']
  },
  lastUsernameChange: {
    type: Date
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email address'],
    validate: {
      validator: function(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
      },
      message: 'Please enter a valid email address'
    }
  },
  phone: {
    type: String,
    required: function() {
      // Phone is mandatory only for email-auth users
      return this.authMethod === 'email';
    },
    validate: {
      validator: function(phone) {
        // If phone not provided and not required – accept
        if (!phone) return this.authMethod !== 'email';
        
        // For development/testing, allow any phone number
        if (process.env.NODE_ENV === 'development') return true;
        
        const cleanPhone = phone.replace(/[^\d]/g, '');
        const indianPhoneRegex = /^(\+91)?[6-9]\d{9}$/;
        return indianPhoneRegex.test(cleanPhone);
      },
      message: 'Please enter a valid Indian phone number (10 digits starting with 6-9)'
    },
    set: function(phone) {
      if (!phone) return phone;
      const cleanPhone = phone.replace(/[^\d]/g, '');
      return cleanPhone.startsWith('91') ? `+${cleanPhone}` : `+91${cleanPhone}`;
    }
  },
  passwordHash: {
    type: String,
    required: function() {
      return this.authMethod === 'email' && !this.uid && !this.googleId;
    },
    select: false // Excludes from queries by default
  },
  
  // Password Reset Tokens
  passwordResetToken: {
    type: String,
    select: false
  },
  passwordResetExpires: {
    type: Date,
    select: false
  },
  passwordResetAttempts: {
    type: Number,
    default: 0,
    select: false
  },
  
  // Authentication
  authMethod: {
    type: String,
    enum: {
      values: ['email', 'google'],
      message: 'Invalid authentication method'
    },
    required: true,
    default: 'email'
  },
  providers: [{
    type: String,
    enum: ['email', 'google'],
    validate: {
      validator: function(provider) {
        return ['email', 'google'].includes(provider);
      },
      message: 'Invalid provider'
    }
  }],
  
  // Role & Status
  role: {
    type: String,
    enum: {
      values: ['hirer', 'fixer', 'admin'],
      message: 'Invalid role'
    },
    required: function() {
      // Role required only after onboarding
      return this.isRegistered === true;
    }
  },
  isRegistered: {
    type: Boolean,
    default: false
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  phoneVerified: {
    type: Boolean,
    default: false
  },
  banned: {
    type: Boolean,
    default: false
  },
  bannedReason: {
    type: String,
    maxlength: [500, 'Ban reason cannot exceed 500 characters']
  },
  bannedAt: Date,
  bannedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Enhanced Location with precision and admin tracking
  location: {
    city: {
      type: String,
      required: false,
      trim: true,
      maxlength: [50, 'City name cannot exceed 50 characters']
    },
    state: {
      type: String,
      required: false,
      trim: true,
      maxlength: [50, 'State name cannot exceed 50 characters']
    },
    country: {
      type: String,
      default: 'India',
      maxlength: [50, 'Country name cannot exceed 50 characters']
    },
    address: {
      type: String,
      maxlength: [200, 'Address cannot exceed 200 characters']
    },
    pincode: {
      type: String,
      match: [/^[0-9]{6}$/, 'Invalid pincode format (6 digits)']
    },
    lat: {
      type: Number,
      min: [-90, 'Invalid latitude'],
      max: [90, 'Invalid latitude']
    },
    lng: {
      type: Number,
      min: [-180, 'Invalid longitude'],
      max: [180, 'Invalid longitude']
    },
    // GeoJSON Point for geospatial queries
    coordinates: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        validate: {
          validator: function(coords) {
            return coords.length === 2 && 
                   coords[0] >= -180 && coords[0] <= 180 && // longitude
                   coords[1] >= -90 && coords[1] <= 90;    // latitude
          },
          message: 'Invalid coordinates format [longitude, latitude]'
        }
      }
    },
    accuracy: Number, // GPS accuracy in meters
    source: {
      type: String,
      enum: ['gps', 'geocoding', 'manual', 'ip_geolocation'],
      default: 'manual'
    },
    precision: {
      type: String,
      enum: ['exact', 'approximate', 'city_level'],
      default: 'approximate'
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    },
    timezone: String
  },
  
  // Admin metadata for comprehensive user management
  adminMetadata: {
    flaggedBy: [{
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      reason: String,
      flaggedAt: { type: Date, default: Date.now },
      status: { type: String, enum: ['pending', 'reviewed', 'resolved'], default: 'pending' },
      severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' }
    }],
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reviewedAt: Date,
    adminNotes: String,
    riskLevel: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'low'
    },
    qualityScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 50
    },
    trustScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 50
    },
    tags: [String],
    priorityLevel: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal'
    },
    accountStatus: {
      type: String,
      enum: ['active', 'suspended', 'restricted', 'under_review'],
      default: 'active'
    },
    suspensionReason: String,
    suspendedUntil: Date,
    lastModifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    lastModifiedAt: {
      type: Date,
      default: Date.now
    },
    verificationLevel: {
      type: String,
      enum: ['none', 'basic', 'verified', 'premium'],
      default: 'none'
    },
    kycStatus: {
      type: String,
      enum: ['not_started', 'pending', 'approved', 'rejected'],
      default: 'not_started'
    },
    kycDocuments: [{
      type: String,
      docType: String,
      uploadedAt: Date,
      verifiedAt: Date,
      status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
      }
    }]
  },
  
  // Enhanced activity tracking for admin insights
  activityMetrics: {
    loginCount: { type: Number, default: 0 },
    lastLoginIP: String,
    lastUserAgent: String,
    profileViews: { type: Number, default: 0 },
    searchCount: { type: Number, default: 0 },
    jobViewCount: { type: Number, default: 0 },
    applicationCount: { type: Number, default: 0 },
    messageCount: { type: Number, default: 0 },
    averageSessionDuration: { type: Number, default: 0 }, // in minutes
    deviceFingerprint: String,
    preferredDevice: {
      type: String,
      enum: ['mobile', 'tablet', 'desktop'],
      default: 'mobile'
    },
    locationHistory: [{
      city: String,
      state: String,
      country: String,
      coordinates: [Number],
      timestamp: { type: Date, default: Date.now },
      source: String
    }],
    suspicious: {
      multipleAccounts: { type: Boolean, default: false },
      unusualActivity: { type: Boolean, default: false },
      rapidLocationChange: { type: Boolean, default: false },
      deviceInconsistency: { type: Boolean, default: false }
    }
  },
  
  // Profile
  profilePhoto: {
    type: String,
    default: null, // Don't set default, let it be null initially
    validate: {
      validator: function(url) {
        if (!url) return true; // Allow null/empty values
        // Allow relative paths for default avatars
        if (url.startsWith('/')) return true;
        // Validate full URLs
        const urlRegex = /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i;
        return urlRegex.test(url);
      },
      message: 'Please provide a valid image URL'
    }
  },
  picture: {
    type: String,
    default: null, // For Google profile pictures
    validate: {
      validator: function(url) {
        if (!url) return true;
        // Allow Google profile picture URLs and other valid image URLs
        if (url.includes('googleusercontent.com') || url.includes('googleapis.com')) return true;
        const urlRegex = /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i;
        return urlRegex.test(url);
      },
      message: 'Please provide a valid image URL'
    }
  },
  bio: {
    type: String,
    maxlength: [500, 'Bio cannot exceed 500 characters'],
    default: ''
  },
  website: {
    type: String,
    default: '',
    validate: {
      validator: function(url) {
        if (!url) return true;
        const urlRegex = /^https?:\/\//;
        return urlRegex.test(url);
      },
      message: 'Website must start with http:// or https://'
    }
  },
  experience: {
    type: String,
    maxlength: [1000, 'Experience description cannot exceed 1000 characters'],
    default: ''
  },
  
  // Fixer-specific fields
  skills: [{
    type: String,
    trim: true,
    lowercase: true,
    validate: {
      validator: function(skill) {
        return skill.length >= 2 && skill.length <= 50;
      },
      message: 'Skill must be between 2 and 50 characters'
    }
  }],
  availableNow: {
    type: Boolean,
    default: true
  },
  serviceRadius: {
    type: Number,
    default: 10, // kilometers
    min: [1, 'Service radius must be at least 1 km'],
    max: [100, 'Service radius cannot exceed 100 km']
  },
  hourlyRate: {
    type: Number,
    min: [0, 'Hourly rate cannot be negative'],
    max: [10000, 'Hourly rate cannot exceed ₹10,000']
  },
  minimumJobValue: {
    type: Number,
    min: [0, 'Minimum job value cannot be negative']
  },
  maximumJobValue: {
    type: Number,
    min: [0, 'Maximum job value cannot be negative'],
    validate: {
      validator: function(value) {
        return !this.minimumJobValue || value >= this.minimumJobValue;
      },
      message: 'Maximum job value must be greater than or equal to minimum job value'
    }
  },
  responseTime: {
    type: String,
    default: '1', // hours
    enum: {
      values: ['1', '2', '4', '8', '24'],
      message: 'Invalid response time'
    }
  },
  workingHours: {
    start: {
      type: String,
      default: '09:00',
      match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)']
    },
    end: {
      type: String,
      default: '18:00',
      match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)']
    }
  },
  workingDays: {
    type: [String],
    default: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    validate: {
      validator: function(days) {
        const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        return days.every(day => validDays.includes(day));
      },
      message: 'Invalid working days'
    }
  },
  autoApply: {
    type: Boolean,
    default: false
  },
  emergencyAvailable: {
    type: Boolean,
    default: false
  },
  
  // Portfolio for fixers
  portfolio: [{
    title: {
      type: String,
      required: [true, 'Portfolio title is required'],
      maxlength: [100, 'Portfolio title cannot exceed 100 characters']
    },
    description: {
      type: String,
      maxlength: [500, 'Portfolio description cannot exceed 500 characters']
    },
    images: [{
      type: String,
      validate: {
        validator: function(url) {
          const urlRegex = /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i;
          return urlRegex.test(url);
        },
        message: 'Please provide a valid image URL'
      }
    }],
    completedAt: {
      type: Date,
      validate: {
        validator: function(date) {
          return !date || date <= new Date();
        },
        message: 'Completion date cannot be in the future'
      }
    },
    category: {
      type: String,
      maxlength: [50, 'Category cannot exceed 50 characters']
    },
    url: {
      type: String,
      validate: {
        validator: function(url) {
          if (!url) return true;
          const urlRegex = /^https?:\/\//;
          return urlRegex.test(url);
        },
        message: 'URL must start with http:// or https://'
      }
    }
  }],
  
  // Privacy settings
  privacy: {
    profileVisibility: {
      type: String,
      enum: {
        values: ['public', 'verified', 'private'],
        message: 'Invalid profile visibility setting'
      },
      default: 'public'
    },
    showPhone: {
      type: Boolean,
      default: true
    },
    showEmail: {
      type: Boolean,
      default: false
    },
    showLocation: {
      type: Boolean,
      default: true
    },
    showRating: {
      type: Boolean,
      default: true
    },
    allowReviews: {
      type: Boolean,
      default: true
    },
    allowMessages: {
      type: Boolean,
      default: true
    },
    dataSharingConsent: {
      type: Boolean,
      default: false
    }
  },
  
  // App preferences
  preferences: {
    // App settings
    theme: {
      type: String,
      enum: {
        values: ['light', 'dark', 'auto'],
        message: 'Invalid theme'
      },
      default: 'light'
    },
    language: {
      type: String,
      default: 'en',
      enum: {
        values: ['en', 'hi', 'ta', 'te', 'ml', 'kn'],
        message: 'Invalid language'
      }
    },
    currency: {
      type: String,
      default: 'INR',
      enum: {
        values: ['INR', 'USD'],
        message: 'Invalid currency'
      }
    },
    timezone: {
      type: String,
      default: 'Asia/Kolkata'
    },
    mapProvider: {
      type: String,
      default: 'google',
      enum: {
        values: ['google', 'openstreetmap'],
        message: 'Invalid map provider'
      }
    },
    defaultView: {
      type: String,
      enum: {
        values: ['list', 'grid'],
        message: 'Invalid default view'
      },
      default: 'list'
    },
    
    // Notification preferences
    emailNotifications: {
      type: Boolean,
      default: true
    },
    smsNotifications: {
      type: Boolean,
      default: false
    },
    pushNotifications: {
      type: Boolean,
      default: true
    },
    jobApplications: {
      type: Boolean,
      default: true
    },
    jobUpdates: {
      type: Boolean,
      default: true
    },
    paymentUpdates: {
      type: Boolean,
      default: true
    },
    marketing: {
      type: Boolean,
      default: false
    },
    newsletter: {
      type: Boolean,
      default: true
    },
    weeklyDigest: {
      type: Boolean,
      default: true
    },
    instantAlerts: {
      type: Boolean,
      default: false
    },
    jobAlerts: {
      type: Boolean,
      default: true
    },
    marketingEmails: {
      type: Boolean,
      default: false
    }
  },
  
  // Subscription & Payments
  plan: {
    type: {
      type: String,
      enum: {
        values: ['free', 'pro'],
        message: 'Invalid plan type'
      },
      default: 'free'
    },
    startDate: Date,
    endDate: Date,
    status: {
      type: String,
      enum: {
        values: ['active', 'expired', 'cancelled'],
        message: 'Invalid plan status'
      },
      default: 'active'
    },
    paymentId: String,
    creditsUsed: {
      type: Number,
      default: 0,
      min: [0, 'Credits used cannot be negative']
    }
  },
  
  // Job limits for hirers
  lastJobPostedAt: Date,
  jobsPosted: {
    type: Number,
    default: 0,
    min: [0, 'Jobs posted cannot be negative']
  },
  
  // Stats
  jobsCompleted: {
    type: Number,
    default: 0,
    min: [0, 'Jobs completed cannot be negative']
  },
  totalEarnings: {
    type: Number,
    default: 0,
    min: [0, 'Total earnings cannot be negative']
  },
  rating: {
    average: {
      type: Number,
      default: 0,
      min: [0, 'Rating cannot be negative'],
      max: [5, 'Rating cannot exceed 5']
    },
    count: {
      type: Number,
      default: 0,
      min: [0, 'Rating count cannot be negative']
    }
  },
  
  // Badges
  badges: [{
    type: String,
    enum: {
      values: ['top_rated', 'fast_response', 'verified', 'new_fixer', 'experienced', 'reliable'],
      message: 'Invalid badge'
    }
  }],
  
  // Notifications
  notifications: [{
    type: {
      type: String,
      enum: {
        values: ['job_applied', 'job_accepted', 'job_completed', 'payment_due', 'review_received', 'dispute_opened', 'settings_updated', 'privacy_updated', 'welcome', 'job_question', 'comment_reply'],
        message: 'Invalid notification type'
      }
    },
    title: {
      type: String,
      required: [true, 'Notification title is required'],
      maxlength: [100, 'Notification title cannot exceed 100 characters']
    },
    message: {
      type: String,
      required: [true, 'Notification message is required'],
      maxlength: [500, 'Notification message cannot exceed 500 characters']
    },
    read: {
      type: Boolean,
      default: false
    },
    data: mongoose.Schema.Types.Mixed,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Account status
  deletedAt: Date,
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Important timestamps
  lastLoginAt: Date,
  lastActivityAt: Date,
  emailVerifiedAt: Date,
  phoneVerifiedAt: Date,
  profileCompletedAt: Date
}, {
  timestamps: true
});

// Comprehensive indexes for better query performance and admin searches
// Note: email and username unique constraints are handled by schema field definitions
userSchema.index({ role: 1 });
userSchema.index({ 'location.city': 1, role: 1 });
userSchema.index({ 'location.state': 1, role: 1 });
userSchema.index({ 'location.country': 1 });
userSchema.index({ skills: 1, role: 1 });
userSchema.index({ availableNow: 1, role: 1 });
userSchema.index({ banned: 1 });
userSchema.index({ 'plan.type': 1, 'plan.status': 1 });
userSchema.index({ phone: 1 });
userSchema.index({ isActive: 1, deletedAt: 1 });
userSchema.index({ authMethod: 1 });
userSchema.index({ providers: 1 });
userSchema.index({ 'rating.average': -1, 'rating.count': -1 });
userSchema.index({ lastActivityAt: -1 });
userSchema.index({ createdAt: -1 });

// Geospatial indexes for location-based queries
userSchema.index({ 'location.coordinates': '2dsphere' });

// Admin-specific indexes for comprehensive management
userSchema.index({ username: 1, email: 1 }); // Combined search
userSchema.index({ 'adminMetadata.riskLevel': 1, role: 1 });
userSchema.index({ 'adminMetadata.qualityScore': -1 });
userSchema.index({ 'adminMetadata.trustScore': -1 });
userSchema.index({ 'adminMetadata.accountStatus': 1, lastActivityAt: -1 });
userSchema.index({ 'adminMetadata.flaggedBy.status': 1, 'adminMetadata.flaggedBy.flaggedAt': -1 });
userSchema.index({ 'adminMetadata.priorityLevel': 1, createdAt: -1 });
userSchema.index({ 'adminMetadata.verificationLevel': 1, isVerified: 1 });
userSchema.index({ 'adminMetadata.kycStatus': 1, role: 1 });
userSchema.index({ 'adminMetadata.reviewedBy': 1, 'adminMetadata.reviewedAt': -1 });
userSchema.index({ 'adminMetadata.lastModifiedBy': 1, 'adminMetadata.lastModifiedAt': -1 });
userSchema.index({ 'adminMetadata.tags': 1 });

// Activity tracking indexes
userSchema.index({ 'activityMetrics.loginCount': -1, lastLoginAt: -1 });
userSchema.index({ 'activityMetrics.lastLoginIP': 1 });
userSchema.index({ 'activityMetrics.suspicious.multipleAccounts': 1 });
userSchema.index({ 'activityMetrics.suspicious.unusualActivity': 1 });
userSchema.index({ 'activityMetrics.preferredDevice': 1, role: 1 });

// Composite indexes for admin queries
userSchema.index({ role: 1, 'adminMetadata.accountStatus': 1, lastActivityAt: -1 });
userSchema.index({ banned: 1, 'adminMetadata.riskLevel': 1, createdAt: -1 });
userSchema.index({ isVerified: 1, 'adminMetadata.verificationLevel': 1, 'rating.average': -1 });

// Text search index for comprehensive user search
userSchema.index({
  username: 'text',
  name: 'text',
  email: 'text',
  'location.city': 'text',
  'location.state': 'text',
  skills: 'text',
  bio: 'text'
}, {
  name: 'UserTextSearchIndex',
  weights: {
    username: 10,
    name: 8,
    email: 6,
    skills: 5,
    'location.city': 3,
    bio: 2
  }
});

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return this.name;
});

// Method to compare password for authentication
userSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.passwordHash || !candidatePassword) {
    return false;
  }
  try {
    return await bcrypt.compare(candidatePassword, this.passwordHash);
  } catch (error) {
    console.error('Password comparison error:', error);
    return false;
  }
};

// Method to check if user can post a job (3-hour limit for free, unlimited for pro)
userSchema.methods.canPostJob = function() {
  // Pro users can post unlimited jobs
  if (this.plan?.type === 'pro' && this.plan?.status === 'active') {
    return true;
  }
  
  // Free users have 3-hour gap between posts
  if (!this.lastJobPostedAt) return true;
  const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
  return this.lastJobPostedAt < threeHoursAgo;
};

// Method to get time remaining until next job can be posted
userSchema.methods.getNextJobPostTime = function() {
  if (this.plan?.type === 'pro' && this.plan?.status === 'active') {
    return null; // No restrictions for pro users
  }
  
  if (!this.lastJobPostedAt) return null; // Can post immediately
  
  const nextAllowedTime = new Date(this.lastJobPostedAt.getTime() + 3 * 60 * 60 * 1000);
  const now = new Date();
  
  if (now >= nextAllowedTime) return null; // Can post now
  
  return nextAllowedTime;
};

// Method to check if fixer can apply to jobs
userSchema.methods.canApplyToJob = function() {
  if (this.role !== 'fixer') return false;
  if (this.banned) return false;
  if (this.plan && this.plan.type === 'pro' && this.plan.status === 'active') return true;
  const creditsUsed = this.plan ? (this.plan.creditsUsed || 0) : 0;
  return creditsUsed < 3;
};

// Method to add notification
userSchema.methods.addNotification = function(type, title, message, data = {}) {
  this.notifications.unshift({
    type,
    title,
    message,
    data,
    createdAt: new Date()
  });
  
  // Keep only last 50 notifications
  if (this.notifications.length > 50) {
    this.notifications = this.notifications.slice(0, 50);
  }
  
  return this.save();
};

// Method to calculate average rating
userSchema.methods.updateRating = function(newRating) {
  const currentTotal = this.rating.average * this.rating.count;
  this.rating.count += 1;
  this.rating.average = (currentTotal + newRating) / this.rating.count;
  this.rating.average = Math.round(this.rating.average * 10) / 10; // Round to 1 decimal
  return this.save();
};

// Method to link Google account
userSchema.methods.linkGoogleAccount = function(googleId, picture) {
  this.googleId = googleId;
  this.picture = picture || this.profilePhoto;
  this.emailVerified = true;
  this.isVerified = true;
  this.authMethod = 'google';
  
  if (!this.providers.includes('google')) {
    this.providers.push('google');
  }
  
  return this.save();
};

// NEW: Method to generate password reset token
userSchema.methods.createPasswordResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');
  
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  this.passwordResetAttempts = 0;
  
  return resetToken;
};

// NEW: Method to verify password reset token
userSchema.methods.verifyPasswordResetToken = function(token) {
  const hashedToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
  
  return this.passwordResetToken === hashedToken && 
         this.passwordResetExpires > Date.now() &&
         this.passwordResetAttempts < 3;
};

// NEW: Method to increment password reset attempts
userSchema.methods.incrementPasswordResetAttempts = function() {
  this.passwordResetAttempts += 1;
  return this.save();
};

// NEW: Method to clear password reset token
userSchema.methods.clearPasswordResetToken = function() {
  this.passwordResetToken = undefined;
  this.passwordResetExpires = undefined;
  this.passwordResetAttempts = 0;
  return this.save();
};

// Method to update badges based on performance
userSchema.methods.updateBadges = function() {
  const badges = [];
  
  // Rating-based badges
  if (this.rating.average >= 4.5 && this.rating.count >= 10) {
    badges.push('top_rated');
  }
  
  // Experience-based badges
  if (this.jobsCompleted >= 50) {
    badges.push('experienced');
  } else if (this.jobsCompleted <= 3) {
    badges.push('new_fixer');
  }
  
  // Verification badge
  if (this.isVerified) {
    badges.push('verified');
  }
  
  // Reliability badge (completion rate > 90%)
  if (this.jobsCompleted >= 10 && this.rating.average >= 4.0) {
    badges.push('reliable');
  }
  
  this.badges = badges;
  return this.save();
};

// Enhanced static method to find fixers by location and skills with admin capabilities
userSchema.statics.findNearbyFixers = function(city, skills = [], radius = 10, isAdmin = false) {
  const query = {
    role: 'fixer',
    banned: false,
    availableNow: true,
    isActive: true,
    deletedAt: { $exists: false }
  };
  
  // Location query - handle both text and coordinates
  if (city) {
    query.$or = [
      { 'location.city': new RegExp(city, 'i') },
      { 'location.state': new RegExp(city, 'i') }
    ];
  }
  
  // Skills filter
  if (skills.length > 0) {
    query.skills = { $in: skills.map(skill => skill.toLowerCase()) };
  }
  
  // Admin can see additional data
  if (!isAdmin) {
    query['adminMetadata.accountStatus'] = { $ne: 'suspended' };
  }
  
  return this.find(query)
    .populate(isAdmin ? 'adminMetadata.reviewedBy adminMetadata.lastModifiedBy' : '')
    .sort({ 'rating.average': -1, jobsCompleted: -1 });
};

// Admin-specific static methods
userSchema.statics.findByAdminCriteria = function(criteria = {}) {
  const query = {};
  
  // Basic filters
  if (criteria.role) query.role = criteria.role;
  if (criteria.banned !== undefined) query.banned = criteria.banned;
  if (criteria.verified !== undefined) query.isVerified = criteria.verified;
  
  // Admin metadata filters
  if (criteria.riskLevel) {
    query['adminMetadata.riskLevel'] = criteria.riskLevel;
  }
  
  if (criteria.accountStatus) {
    query['adminMetadata.accountStatus'] = criteria.accountStatus;
  }
  
  if (criteria.flagged) {
    query['adminMetadata.flaggedBy.0'] = { $exists: true };
    query['adminMetadata.flaggedBy.status'] = 'pending';
  }
  
  if (criteria.kycStatus) {
    query['adminMetadata.kycStatus'] = criteria.kycStatus;
  }
  
  if (criteria.qualityScoreMin) {
    query['adminMetadata.qualityScore'] = { $gte: criteria.qualityScoreMin };
  }
  
  if (criteria.trustScoreMin) {
    query['adminMetadata.trustScore'] = { $gte: criteria.trustScoreMin };
  }
  
  if (criteria.suspicious) {
    query.$or = [
      { 'activityMetrics.suspicious.multipleAccounts': true },
      { 'activityMetrics.suspicious.unusualActivity': true },
      { 'activityMetrics.suspicious.rapidLocationChange': true }
    ];
  }
  
  if (criteria.needsReview) {
    query.$or = [
      { 'adminMetadata.reviewedBy': { $exists: false } },
      { 'adminMetadata.flaggedBy.0': { $exists: true } },
      { 'adminMetadata.riskLevel': 'high' },
      { 'adminMetadata.qualityScore': { $lt: 30 } }
    ];
  }
  
  // Date filters
  if (criteria.createdAfter) {
    query.createdAt = { $gte: new Date(criteria.createdAfter) };
  }
  
  if (criteria.lastActiveAfter) {
    query.lastActivityAt = { $gte: new Date(criteria.lastActiveAfter) };
  }
  
  // Location filters
  if (criteria.city) {
    query['location.city'] = new RegExp(criteria.city, 'i');
  }
  
  if (criteria.state) {
    query['location.state'] = new RegExp(criteria.state, 'i');
  }
  
  return this.find(query)
    .populate('adminMetadata.reviewedBy', 'name username')
    .populate('adminMetadata.lastModifiedBy', 'name username')
    .populate('bannedBy', 'name username')
    .sort({
      'adminMetadata.priorityLevel': -1,
      'adminMetadata.riskLevel': -1,
      'adminMetadata.flaggedBy.flaggedAt': -1,
      lastActivityAt: -1
    });
};

userSchema.statics.findWithFilters = function(filters = {}, isAdmin = false) {
  const query = {};
  
  // Basic filters
  if (filters.role) query.role = filters.role;
  if (filters.city) query['location.city'] = new RegExp(filters.city, 'i');
  if (filters.state) query['location.state'] = new RegExp(filters.state, 'i');
  if (filters.skills && filters.skills.length > 0) {
    query.skills = { $in: filters.skills.map(skill => skill.toLowerCase()) };
  }
  
  // Status filters
  if (!isAdmin) {
    query.banned = false;
    query.isActive = true;
    query.deletedAt = { $exists: false };
  } else {
    if (filters.banned !== undefined) query.banned = filters.banned;
    if (filters.active !== undefined) query.isActive = filters.active;
  }
  
  // Admin filters
  if (isAdmin && filters.username) {
    query.username = new RegExp(filters.username, 'i');
  }
  
  if (isAdmin && filters.email) {
    query.email = new RegExp(filters.email, 'i');
  }
  
  // Text search
  if (filters.search) {
    query.$text = { $search: filters.search };
  }
  
  // Date range
  if (filters.dateFrom || filters.dateTo) {
    query.createdAt = {};
    if (filters.dateFrom) query.createdAt.$gte = new Date(filters.dateFrom);
    if (filters.dateTo) query.createdAt.$lte = new Date(filters.dateTo);
  }
  
  // Geospatial query
  if (filters.near && filters.near.lat && filters.near.lng) {
    const maxDistance = filters.near.radius ? filters.near.radius * 1000 : 25000; // Default 25km
    query['location.coordinates'] = {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [filters.near.lng, filters.near.lat]
        },
        $maxDistance: maxDistance
      }
    };
  }
  
  // Sorting
  const sort = {};
  if (filters.sortBy) {
    switch (filters.sortBy) {
      case 'newest':
        sort.createdAt = -1;
        break;
      case 'oldest':
        sort.createdAt = 1;
        break;
      case 'rating':
        sort['rating.average'] = -1;
        sort['rating.count'] = -1;
        break;
      case 'experience':
        sort.jobsCompleted = -1;
        break;
      case 'activity':
        sort.lastActivityAt = -1;
        break;
      case 'name':
        sort.name = 1;
        break;
      case 'username':
        sort.username = 1;
        break;
      case 'location':
        sort['location.city'] = 1;
        sort['location.state'] = 1;
        break;
      case 'quality':
        if (isAdmin) sort['adminMetadata.qualityScore'] = -1;
        break;
      case 'trust':
        if (isAdmin) sort['adminMetadata.trustScore'] = -1;
        break;
      case 'risk':
        if (isAdmin) sort['adminMetadata.riskLevel'] = -1;
        break;
      case 'relevance':
        if (filters.search) sort.score = { $meta: 'textScore' };
        break;
      default:
        sort.lastActivityAt = -1;
    }
  } else {
    sort['rating.average'] = -1;
    sort.lastActivityAt = -1;
  }
  
  let queryBuilder = this.find(query);
  
  if (isAdmin) {
    queryBuilder = queryBuilder
      .populate('adminMetadata.reviewedBy', 'name username')
      .populate('adminMetadata.lastModifiedBy', 'name username')
      .populate('bannedBy', 'name username');
  }
  
  return queryBuilder.sort(sort);
};

// Get user statistics for admin dashboard
userSchema.statics.getUserStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        hirers: { $sum: { $cond: [{ $eq: ['$role', 'hirer'] }, 1, 0] } },
        fixers: { $sum: { $cond: [{ $eq: ['$role', 'fixer'] }, 1, 0] } },
        verified: { $sum: { $cond: ['$isVerified', 1, 0] } },
        banned: { $sum: { $cond: ['$banned', 1, 0] } },
        active: { $sum: { $cond: ['$isActive', 1, 0] } },
        highRisk: { $sum: { $cond: [{ $eq: ['$adminMetadata.riskLevel', 'high'] }, 1, 0] } },
        flagged: { $sum: { $cond: [{ $gt: [{ $size: { $ifNull: ['$adminMetadata.flaggedBy', []] } }, 0] }, 1, 0] } },
        avgRating: { $avg: '$rating.average' },
        avgJobsCompleted: { $avg: '$jobsCompleted' }
      }
    }
  ]);
};

// Get location statistics
userSchema.statics.getLocationStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: {
          city: '$location.city',
          state: '$location.state'
        },
        count: { $sum: 1 },
        fixers: { $sum: { $cond: [{ $eq: ['$role', 'fixer'] }, 1, 0] } },
        hirers: { $sum: { $cond: [{ $eq: ['$role', 'hirer'] }, 1, 0] } },
        avgRating: { $avg: '$rating.average' }
      }
    },
    { $sort: { count: -1 } },
    { $limit: 50 }
  ]);
};

// Static method to find by Google ID
userSchema.statics.findByGoogleId = function(googleId) {
  return this.findOne({ googleId });
};

// Static method to find by email or Google ID
userSchema.statics.findByEmailOrGoogleId = function(email, googleId) {
  const query = { email: email.toLowerCase() };
  if (googleId) {
    query.$or = [
      { email: email.toLowerCase() },
      { googleId }
    ];
  }
  return this.findOne(query);
};

// NEW: Static method to find by email (for password reset)
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

// NEW: Static method to find by phone
userSchema.statics.findByPhone = function(phone) {
  const cleanPhone = phone.replace(/[^\d]/g, '');
  const formattedPhone = cleanPhone.startsWith('91') ? `+${cleanPhone}` : `+91${cleanPhone}`;
  return this.findOne({ phone: formattedPhone });
};

// Enhanced pre-save middleware with admin features and location handling
userSchema.pre('save', async function(next) {
  try {
    // Ensure phone number is properly formatted
    if (this.phone && !this.phone.startsWith('+')) {
      this.phone = '+91' + this.phone.replace(/[^\d]/g, '');
    }
    
    // Convert skills to lowercase
    if (this.skills) {
      this.skills = this.skills.map(skill => skill.toLowerCase().trim());
    }
    
    // Hash password if modified and not empty
    if (this.isModified('passwordHash') && this.passwordHash) {
      // Check if password is already hashed
      if (!/^\$2[aby]\$\d{2}\$/.test(this.passwordHash)) {
        if (this.passwordHash.length < 6) {
          throw new Error('Password must be at least 6 characters long');
        }
        const saltRounds = 12;
        this.passwordHash = await bcrypt.hash(this.passwordHash, saltRounds);
      }
    }
    
    // Set GeoJSON coordinates if lat/lng provided
    if (this.isModified('location.lat') || this.isModified('location.lng')) {
      if (this.location.lat && this.location.lng) {
        this.location.coordinates = {
          type: 'Point',
          coordinates: [this.location.lng, this.location.lat]
        };
        this.location.lastUpdated = new Date();
      }
    }
    
    // Track location history for admin monitoring
    if (this.isModified('location') && this.location.city) {
      if (!this.activityMetrics) this.activityMetrics = {};
      if (!this.activityMetrics.locationHistory) this.activityMetrics.locationHistory = [];
      
      // Only add if location actually changed
      const lastLocation = this.activityMetrics.locationHistory[0];
      const currentLocation = {
        city: this.location.city,
        state: this.location.state,
        country: this.location.country || 'India'
      };
      
      if (!lastLocation || 
          lastLocation.city !== currentLocation.city || 
          lastLocation.state !== currentLocation.state) {
        
        this.activityMetrics.locationHistory.unshift({
          ...currentLocation,
          coordinates: this.location.coordinates?.coordinates,
          timestamp: new Date(),
          source: this.location.source || 'manual'
        });
        
        // Keep only last 10 location changes
        if (this.activityMetrics.locationHistory.length > 10) {
          this.activityMetrics.locationHistory = this.activityMetrics.locationHistory.slice(0, 10);
        }
        
        // Check for rapid location changes (suspicious activity)
        if (this.activityMetrics.locationHistory.length >= 2) {
          const timeDiff = this.activityMetrics.locationHistory[0].timestamp - 
                          this.activityMetrics.locationHistory[1].timestamp;
          if (timeDiff < 24 * 60 * 60 * 1000) { // Less than 24 hours
            this.activityMetrics.suspicious.rapidLocationChange = true;
          }
        }
      }
    }
    
    // Calculate quality and trust scores
    if (this.isNew || this.isModified()) {
      // Quality score calculation
      let qualityScore = 0;
      
      // Profile completeness (50 points)
      if (this.name) qualityScore += 5;
      if (this.bio) qualityScore += 5;
      if (this.location?.city) qualityScore += 10;
      if (this.phone) qualityScore += 10;
      if (this.profilePhoto || this.picture) qualityScore += 5;
      if (this.skills && this.skills.length > 0) qualityScore += 10;
      if (this.portfolio && this.portfolio.length > 0) qualityScore += 5;
      
      // Verification status (25 points)
      if (this.emailVerified) qualityScore += 10;
      if (this.phoneVerified) qualityScore += 10;
      if (this.isVerified) qualityScore += 5;
      
      // Activity and engagement (25 points)
      if (this.rating?.count > 0) qualityScore += 10;
      if (this.jobsCompleted > 0) qualityScore += 10;
      if (this.lastActivityAt && (Date.now() - this.lastActivityAt) < 7 * 24 * 60 * 60 * 1000) {
        qualityScore += 5; // Active in last 7 days
      }
      
      // Trust score calculation
      let trustScore = 50; // Base trust score
      
      // Positive factors
      if (this.isVerified) trustScore += 15;
      if (this.emailVerified && this.phoneVerified) trustScore += 10;
      if (this.rating?.average >= 4.0 && this.rating.count >= 5) trustScore += 15;
      if (this.jobsCompleted >= 10) trustScore += 10;
      
      // Negative factors
      if (this.activityMetrics?.suspicious?.multipleAccounts) trustScore -= 20;
      if (this.activityMetrics?.suspicious?.unusualActivity) trustScore -= 15;
      if (this.activityMetrics?.suspicious?.rapidLocationChange) trustScore -= 10;
      if (this.adminMetadata?.flaggedBy?.length > 0) trustScore -= 25;
      
      if (!this.adminMetadata) this.adminMetadata = {};
      this.adminMetadata.qualityScore = Math.max(0, Math.min(qualityScore, 100));
      this.adminMetadata.trustScore = Math.max(0, Math.min(trustScore, 100));
      
      // Auto-set risk level based on trust score
      if (this.adminMetadata.trustScore < 30) {
        this.adminMetadata.riskLevel = 'high';
      } else if (this.adminMetadata.trustScore < 50) {
        this.adminMetadata.riskLevel = 'medium';
      } else {
        this.adminMetadata.riskLevel = 'low';
      }
    }
    
    // Update last activity
    this.lastActivityAt = new Date();
    
    // Initialize admin metadata if not exists
    if (!this.adminMetadata) {
      this.adminMetadata = {
        riskLevel: 'low',
        qualityScore: 50,
        trustScore: 50,
        accountStatus: 'active',
        priorityLevel: 'normal',
        verificationLevel: 'none',
        kycStatus: 'not_started',
        lastModifiedAt: new Date()
      };
    }
    
    // Initialize activity metrics if not exists
    if (!this.activityMetrics) {
      this.activityMetrics = {
        loginCount: 0,
        profileViews: 0,
        searchCount: 0,
        jobViewCount: 0,
        applicationCount: 0,
        messageCount: 0,
        averageSessionDuration: 0,
        preferredDevice: 'mobile',
        locationHistory: [],
        suspicious: {
          multipleAccounts: false,
          unusualActivity: false,
          rapidLocationChange: false,
          deviceInconsistency: false
        }
      };
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

// Admin methods for user management
userSchema.methods.flagUser = function(adminId, reason, severity = 'medium') {
  if (!this.adminMetadata) this.adminMetadata = {};
  if (!this.adminMetadata.flaggedBy) this.adminMetadata.flaggedBy = [];
  
  this.adminMetadata.flaggedBy.push({
    userId: adminId,
    reason,
    severity,
    flaggedAt: new Date(),
    status: 'pending'
  });
  
  this.adminMetadata.lastModifiedBy = adminId;
  this.adminMetadata.lastModifiedAt = new Date();
  
  return this.save();
};

userSchema.methods.updateRiskLevel = function(riskLevel, adminId) {
  if (!this.adminMetadata) this.adminMetadata = {};
  this.adminMetadata.riskLevel = riskLevel;
  this.adminMetadata.lastModifiedBy = adminId;
  this.adminMetadata.lastModifiedAt = new Date();
  return this.save();
};

userSchema.methods.addAdminNote = function(note, adminId) {
  if (!this.adminMetadata) this.adminMetadata = {};
  this.adminMetadata.adminNotes = note;
  this.adminMetadata.lastModifiedBy = adminId;
  this.adminMetadata.lastModifiedAt = new Date();
  return this.save();
};

userSchema.methods.suspendUser = function(reason, suspendedUntil, adminId) {
  if (!this.adminMetadata) this.adminMetadata = {};
  this.adminMetadata.accountStatus = 'suspended';
  this.adminMetadata.suspensionReason = reason;
  this.adminMetadata.suspendedUntil = suspendedUntil;
  this.adminMetadata.lastModifiedBy = adminId;
  this.adminMetadata.lastModifiedAt = new Date();
  this.isActive = false;
  return this.save();
};

userSchema.methods.updateKycStatus = function(status, adminId, documents = []) {
  if (!this.adminMetadata) this.adminMetadata = {};
  this.adminMetadata.kycStatus = status;
  if (documents.length > 0) {
    this.adminMetadata.kycDocuments = documents;
  }
  this.adminMetadata.lastModifiedBy = adminId;
  this.adminMetadata.lastModifiedAt = new Date();
  return this.save();
};

userSchema.methods.recordLogin = function(ipAddress, userAgent) {
  if (!this.activityMetrics) this.activityMetrics = {};
  this.activityMetrics.loginCount = (this.activityMetrics.loginCount || 0) + 1;
  this.activityMetrics.lastLoginIP = ipAddress;
  this.activityMetrics.lastUserAgent = userAgent;
  this.lastLoginAt = new Date();
  this.lastActivityAt = new Date();
  return this.save();
};

userSchema.methods.updateActivityMetric = function(metric, value = 1) {
  if (!this.activityMetrics) this.activityMetrics = {};
  this.activityMetrics[metric] = (this.activityMetrics[metric] || 0) + value;
  this.lastActivityAt = new Date();
  return this.save();
};

// Post-save middleware to update badges
userSchema.post('save', function(doc) {
  if (doc.role === 'fixer' && doc.isModified('rating')) {
    doc.updateBadges();
  }
});

export default mongoose.models.User || mongoose.model('User', userSchema);