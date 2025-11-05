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

        const cleanPhone = phone.replace(/[^\d+]/g, '');
        // Allow international format with +91 or just 10 digits
        const indianPhoneRegex = /^(\+91[6-9]\d{9}|[6-9]\d{9})$/;
        return indianPhoneRegex.test(cleanPhone);
      },
      message: 'Please enter a valid Indian phone number (10 digits starting with 6-9)'
    },
    set: function(phone) {
      if (!phone) return phone;
      const cleanPhone = phone.replace(/[^\d]/g, '');
      // Only format if not already formatted
      if (cleanPhone.startsWith('91') && cleanPhone.length === 12) {
        return `+${cleanPhone}`;
      } else if (cleanPhone.length === 10) {
        return `+91${cleanPhone}`;
      }
      return phone; // Return as-is if already formatted
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
    default: true  // Default to verified unless explicitly set to false
  },
  phoneVerified: {
    type: Boolean,
    default: false
  },
  banned: {
    type: Boolean,
    default: false
  },
  banDetails: {
    reason: {
      type: String,
      enum: [
        'spam_behavior',
        'inappropriate_content',
        'harassment',
        'fraud_scam',
        'fake_profile',
        'multiple_accounts',
        'poor_service_quality',
        'payment_issues',
        'violation_terms',
        'safety_concerns',
        'legal_issues',
        'other'
      ]
    },
    description: {
      type: String,
      maxlength: [1000, 'Ban description cannot exceed 1000 characters']
    },
    type: {
      type: String,
      enum: ['temporary', 'permanent'],
      default: 'temporary'
    },
    duration: {
      type: Number, // days for temporary bans
      min: [1, 'Ban duration must be at least 1 day'],
      max: [365, 'Ban duration cannot exceed 1 year']
    },
    bannedAt: {
      type: Date,
      default: Date.now
    },
    expiresAt: {
      type: Date
    },
    bannedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: function() { return this.banned; }
    },
    bannedByRole: {
      type: String,
      enum: ['admin', 'moderator', 'system'],
      default: 'admin'
    },
    appeal: {
      submitted: {
        type: Boolean,
        default: false
      },
      submittedAt: Date,
      message: {
        type: String,
        maxlength: [2000, 'Appeal message cannot exceed 2000 characters']
      },
      evidence: [{
        type: String, // URLs to evidence
        description: String
      }],
      status: {
        type: String,
        enum: ['pending', 'under_review', 'approved', 'rejected'],
        default: 'pending'
      },
      reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      reviewedAt: Date,
      response: {
        type: String,
        maxlength: [1000, 'Appeal response cannot exceed 1000 characters']
      }
    },
    warnings: [{
      reason: String,
      description: String,
      issuedAt: {
        type: Date,
        default: Date.now
      },
      issuedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      acknowledged: {
        type: Boolean,
        default: false
      },
      acknowledgedAt: Date
    }],
    previousBans: [{
      reason: String,
      duration: Number,
      bannedAt: Date,
      unbannedAt: Date,
      bannedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    }]
  },
  // Keep legacy fields for backward compatibility
  bannedReason: {
    type: String,
    maxlength: [500, 'Ban reason cannot exceed 500 characters']
  },
  bannedAt: Date,
  bannedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Enhanced Location Storage with Comprehensive Tracking
  location: {
    // Current/Real-time Location (used by location tracking service)
    coordinates: {
      latitude: {
        type: Number,
        validate: {
          validator: function(lat) {
            if (lat == null || lat === undefined) return true;
            return lat >= 6.4 && lat <= 37.6; // India bounds
          },
          message: 'Latitude must be within India bounds (6.4 to 37.6)'
        }
      },
      longitude: {
        type: Number,
        validate: {
          validator: function(lng) {
            if (lng == null || lng === undefined) return true;
            return lng >= 68.7 && lng <= 97.25; // India bounds
          },
          message: 'Longitude must be within India bounds (68.7 to 97.25)'
        }
      }
    },
    address: {
      type: String,
      trim: true,
      maxlength: [300, 'Address cannot exceed 300 characters']
    },
    city: {
      type: String,
      trim: true,
      maxlength: [50, 'City name cannot exceed 50 characters']
    },
    state: {
      type: String,
      trim: true,
      maxlength: [50, 'State name cannot exceed 50 characters']
    },
    accuracy: {
      type: Number,
      min: [0, 'Accuracy cannot be negative']
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    source: {
      type: String,
      enum: ['gps', 'manual', 'home', 'network'],
      default: 'gps'
    },

    // Home/Primary Address
    homeAddress: {
      doorNo: {
        type: String,
        trim: true,
        maxlength: [20, 'Door number cannot exceed 20 characters']
      },
      street: {
        type: String,
        trim: true,
        maxlength: [100, 'Street name cannot exceed 100 characters']
      },
      district: {
        type: String,
        trim: true,
        maxlength: [50, 'District name cannot exceed 50 characters']
      },
      state: {
        type: String,
        trim: true,
        maxlength: [50, 'State name cannot exceed 50 characters']
      },
      postalCode: {
        type: String,
        trim: true,
        validate: {
          validator: function(code) {
            if (!code) return true;
            return /^[1-9][0-9]{5}$/.test(code);
          },
          message: 'Please provide a valid Indian postal code'
        }
      },
      formattedAddress: {
        type: String,
        trim: true,
        maxlength: [300, 'Formatted address cannot exceed 300 characters']
      },
      coordinates: {
        latitude: {
          type: Number,
          validate: {
            validator: function(lat) {
              if (lat == null || lat === undefined) return true;
              return lat >= 6.4 && lat <= 37.6;
            },
            message: 'Latitude must be within India bounds (6.4 to 37.6)'
          }
        },
        longitude: {
          type: Number,
          validate: {
            validator: function(lng) {
              if (lng == null || lng === undefined) return true;
              return lng >= 68.7 && lng <= 97.25;
            },
            message: 'Longitude must be within India bounds (68.7 to 97.25)'
          }
        }
      },
      setAt: {
        type: Date,
        default: Date.now
      }
    }
  },

  // Location History with Comprehensive Metadata
  locationHistory: [{
    coordinates: {
      latitude: {
        type: Number,
        required: true,
        validate: {
          validator: function(lat) {
            return lat >= 6.4 && lat <= 37.6;
          },
          message: 'Latitude must be within India bounds'
        }
      },
      longitude: {
        type: Number,
        required: true,
        validate: {
          validator: function(lng) {
            return lng >= 68.7 && lng <= 97.25;
          },
          message: 'Longitude must be within India bounds'
        }
      }
    },
    address: {
      type: String,
      trim: true,
      maxlength: [300, 'Address cannot exceed 300 characters']
    },
    city: {
      type: String,
      trim: true,
      maxlength: [50, 'City name cannot exceed 50 characters']
    },
    state: {
      type: String,
      trim: true,
      maxlength: [50, 'State name cannot exceed 50 characters']
    },
    accuracy: {
      type: Number,
      min: [0, 'Accuracy cannot be negative'],
      max: [10000, 'Accuracy seems unrealistic']
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now
    },
    source: {
      type: String,
      enum: ['gps', 'manual', 'home', 'network', 'auto_update'],
      default: 'gps'
    },
    metadata: {
      deviceInfo: {
        userAgent: String,
        platform: String,
        battery: Number,
        networkType: String
      },
      sessionId: String,
      requestId: String,
      updateReason: {
        type: String,
        enum: ['manual', 'periodic', 'job_search', 'application', 'emergency'],
        default: 'periodic'
      },
      processingTime: Number // ms
    }
  }],

  // Location Tracking Settings & Status
  locationTracking: {
    isEnabled: {
      type: Boolean,
      default: false
    },
    enabledAt: Date,
    disabledAt: Date,
    lastUpdateRequested: Date,
    updateInterval: {
      type: Number,
      default: 30, // minutes
      min: [5, 'Update interval cannot be less than 5 minutes'],
      max: [120, 'Update interval cannot exceed 2 hours']
    },
    permissions: {
      precise: {
        type: Boolean,
        default: false
      },
      background: {
        type: Boolean,
        default: false
      },
      grantedAt: Date,
      revokedAt: Date
    },
    preferences: {
      onlyWhenActive: {
        type: Boolean,
        default: true
      },
      lowPowerMode: {
        type: Boolean,
        default: false
      },
      autoDisableAfterInactivity: {
        type: Boolean,
        default: true
      },
      inactivityThreshold: {
        type: Number,
        default: 7 // days
      }
    }
  },

  // Timestamp for last location update
  lastLocationUpdate: {
    type: Date
  },
  
  // Profile
  profilePhoto: {
    url: {
      type: String,
      default: null,
      validate: {
        validator: function(url) {
          if (!url) return true; // Allow null/empty values
          // Allow relative paths for default avatars
          if (url.startsWith('/')) return true;
          // Allow Google profile photos (lh3.googleusercontent.com)
          if (url.includes('googleusercontent.com')) return true;
          // Allow Cloudinary URLs
          if (url.includes('cloudinary.com')) return true;
          // Validate full URLs with image extensions
          const urlRegex = /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i;
          return urlRegex.test(url);
        },
        message: 'Please provide a valid image URL'
      }
    },
    cloudinaryPublicId: {
      type: String,
      default: null
    },
    lastUpdated: {
      type: Date,
      default: null
    },
    originalName: {
      type: String,
      default: null
    },
    fileSize: {
      type: Number,
      default: null
    },
    dimensions: {
      width: { type: Number, default: null },
      height: { type: Number, default: null }
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
    },
    distribution: {
      5: { type: Number, default: 0 },
      4: { type: Number, default: 0 },
      3: { type: Number, default: 0 },
      2: { type: Number, default: 0 },
      1: { type: Number, default: 0 }
    },
    // Detailed ratings for fixers
    fixerRatings: {
      communication: { type: Number, default: 0 },
      quality: { type: Number, default: 0 },
      timeliness: { type: Number, default: 0 },
      professionalism: { type: Number, default: 0 }
    },
    // Detailed ratings for hirers
    hirerRatings: {
      clarity: { type: Number, default: 0 },
      responsiveness: { type: Number, default: 0 },
      paymentTimeliness: { type: Number, default: 0 },
      professionalism: { type: Number, default: 0 }
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
        values: ['job_applied', 'job_accepted', 'job_completed', 'payment_due', 'review_received', 'dispute_opened', 'settings_updated', 'privacy_updated', 'welcome', 'job_question', 'comment_reply', 'subscription_success', 'subscription_cancelled', 'credits_reset'],
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
  profileCompletedAt: Date,

  // Registration metadata
  registrationMetadata: {
    deviceInfo: {
      type: {
        type: String,
        enum: ['mobile', 'tablet', 'desktop', 'unknown'],
        default: 'unknown'
      },
      os: String,
      browser: String,
      userAgent: String
    },
    ip: String,
    timestamp: Date,
    source: {
      type: String,
      enum: ['web_signup', 'mobile_app', 'api'],
      default: 'web_signup'
    }
  }
}, {
  timestamps: true
});

// Enhanced indexes for better query performance  
// Note: email and username unique constraints are handled by schema field definitions
userSchema.index({ role: 1 });
userSchema.index({ 'location.city': 1, role: 1 });
userSchema.index({ skills: 1, role: 1 });
userSchema.index({ availableNow: 1, role: 1 });
userSchema.index({ banned: 1 });
userSchema.index({ 'plan.type': 1, 'plan.status': 1 });
userSchema.index({ phone: 1 });
userSchema.index({ isActive: 1, deletedAt: 1 });
userSchema.index({ authMethod: 1 });
userSchema.index({ providers: 1 });
userSchema.index({ 'rating.average': -1, 'rating.count': -1 }); // For sorting
userSchema.index({ lastActivityAt: -1 }); // For activity tracking
userSchema.index({ createdAt: -1 }); // For new users

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
// NOTE: Fixers can apply to unlimited jobs. Credits are only deducted when application is ACCEPTED.
userSchema.methods.canApplyToJob = function() {
  if (this.role !== 'fixer') return false;
  if (this.banned) return false;
  return true; // All fixers can apply to jobs. Credits deducted only on job assignment.
};

// Method to check if fixer can be assigned more jobs (credit check for acceptance)
userSchema.methods.canBeAssignedJob = function() {
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
};

// Method to ban user
userSchema.methods.banUser = function(adminId, reason, description, type = 'temporary', duration = 7) {
  // Store previous ban if exists
  if (this.banned) {
    if (!this.banDetails.previousBans) {
      this.banDetails.previousBans = [];
    }
    this.banDetails.previousBans.push({
      reason: this.banDetails.reason,
      duration: this.banDetails.duration,
      bannedAt: this.banDetails.bannedAt,
      unbannedAt: new Date(),
      bannedBy: this.banDetails.bannedBy
    });
  }

  this.banned = true;
  this.banDetails = {
    reason,
    description,
    type,
    duration: type === 'temporary' ? duration : undefined,
    bannedAt: new Date(),
    expiresAt: type === 'temporary' ? new Date(Date.now() + duration * 24 * 60 * 60 * 1000) : undefined,
    bannedBy: adminId,
    bannedByRole: 'admin',
    appeal: {
      submitted: false,
      status: 'pending'
    },
    warnings: this.banDetails?.warnings || [],
    previousBans: this.banDetails?.previousBans || []
  };

  // Update legacy fields for compatibility
  this.bannedReason = description;
  this.bannedAt = new Date();
  this.bannedBy = adminId;

  // Add notification
  this.addNotification(
    'account_banned',
    'Account Banned',
    `Your account has been ${type === 'permanent' ? 'permanently' : 'temporarily'} banned. Reason: ${reason}`,
    { banType: type, duration, reason, description }
  );

  return this.save();
};

// Method to unban user
userSchema.methods.unbanUser = function(adminId, reason = 'Appeal approved') {
  if (!this.banned) {
    throw new Error('User is not banned');
  }

  // Store in previous bans
  if (!this.banDetails.previousBans) {
    this.banDetails.previousBans = [];
  }
  this.banDetails.previousBans.push({
    reason: this.banDetails.reason,
    duration: this.banDetails.duration,
    bannedAt: this.banDetails.bannedAt,
    unbannedAt: new Date(),
    bannedBy: this.banDetails.bannedBy
  });

  this.banned = false;
  this.banDetails = undefined;
  this.bannedReason = undefined;
  this.bannedAt = undefined;
  this.bannedBy = undefined;

  // Add notification
  this.addNotification(
    'account_unbanned',
    'Account Unbanned',
    `Your account has been unbanned. Reason: ${reason}`,
    { unbanReason: reason, unbannedBy: adminId }
  );

  return this.save();
};

// Method to check if ban has expired
userSchema.methods.isBanExpired = function() {
  if (!this.banned || !this.banDetails) return false;
  if (this.banDetails.type === 'permanent') return false;
  if (!this.banDetails.expiresAt) return false;

  return new Date() > this.banDetails.expiresAt;
};

// Method to get remaining ban time
userSchema.methods.getBanTimeRemaining = function() {
  if (!this.banned || !this.banDetails) return null;
  if (this.banDetails.type === 'permanent') return 'permanent';
  if (!this.banDetails.expiresAt) return null;

  const now = new Date();
  const expires = this.banDetails.expiresAt;

  if (now >= expires) return null; // Ban has expired

  const diffMs = expires - now;
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));

  if (diffDays > 1) {
    return `${diffDays} days`;
  } else if (diffHours > 1) {
    return `${diffHours} hours`;
  } else {
    return 'Less than 1 hour';
  }
};

// Method to issue warning
userSchema.methods.issueWarning = function(adminId, reason, description) {
  if (!this.banDetails) {
    this.banDetails = { warnings: [] };
  }
  if (!this.banDetails.warnings) {
    this.banDetails.warnings = [];
  }

  this.banDetails.warnings.push({
    reason,
    description,
    issuedAt: new Date(),
    issuedBy: adminId,
    acknowledged: false
  });

  // Add notification
  this.addNotification(
    'warning_issued',
    'Warning Issued',
    `You have received a warning: ${reason}`,
    { reason, description, warningId: this.banDetails.warnings.length - 1 }
  );

  return this.save();
};

// Method to submit ban appeal
userSchema.methods.submitBanAppeal = function(message, evidence = []) {
  if (!this.banned || !this.banDetails) {
    throw new Error('User is not banned');
  }

  if (this.banDetails.appeal && this.banDetails.appeal.submitted) {
    throw new Error('Appeal already submitted');
  }

  this.banDetails.appeal = {
    submitted: true,
    submittedAt: new Date(),
    message,
    evidence,
    status: 'pending'
  };

  // Add notification
  this.addNotification(
    'appeal_submitted',
    'Ban Appeal Submitted',
    'Your ban appeal has been submitted and is under review.',
    { appealMessage: message }
  );

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

// Static method to find fixers by location and skills
userSchema.statics.findNearbyFixers = function(city, skills = [], radius = 10) {
  const query = {
    role: 'fixer',
    banned: false,
    availableNow: true,
    isActive: true,
    deletedAt: { $exists: false },
    'location.city': new RegExp(city, 'i')
  };
  
  if (skills.length > 0) {
    query.skills = { $in: skills };
  }
  
  return this.find(query).sort({ 'rating.average': -1, jobsCompleted: -1 });
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

// Pre-save middleware
userSchema.pre('save', async function(next) {
  try {
  // Ensure phone number is properly formatted
  if (this.phone) {
    // Clean the phone number
    const cleanPhone = this.phone.replace(/[^\d]/g, '');

    // Only format if it doesn't already have country code
    if (!this.phone.startsWith('+')) {
      // If it starts with 91, just add +
      if (cleanPhone.startsWith('91')) {
        this.phone = '+' + cleanPhone;
      } else {
        // Otherwise add +91
        this.phone = '+91' + cleanPhone;
      }
    }
  }
  
  // Convert skills to lowercase
  if (this.skills) {
    this.skills = this.skills.map(skill => skill.toLowerCase().trim());
  }
    
    // Hash password if modified and not empty
    if (this.isModified('passwordHash') && this.passwordHash) {
      // Check if password is already hashed (starts with $2a$, $2b$, or $2y$)
      if (!/^\$2[aby]\$\d{2}\$/.test(this.passwordHash)) {
        // It's a raw password, validate and hash it
        if (this.passwordHash.length < 6) {
          throw new Error('Password must be at least 6 characters long');
        }
        const saltRounds = 12;
        this.passwordHash = await bcrypt.hash(this.passwordHash, saltRounds);
      }
      // If already hashed, leave it as is
    }
    
    // Update last activity
    this.lastActivityAt = new Date();
  
  next();
  } catch (error) {
    next(error);
  }
});

// Post-save middleware to update badges
userSchema.post('save', function(doc) {
  if (doc.role === 'fixer' && doc.isModified('rating')) {
    doc.updateBadges();
  }
});

export default mongoose.models.User || mongoose.model('User', userSchema);