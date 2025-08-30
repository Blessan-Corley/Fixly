// models/UserLocation.js - Enhanced user location tracking with admin features
import mongoose from 'mongoose';
import { LOCATION_PRECISION } from '../utils/locationPrecision.js';

const userLocationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  
  // Cached user info for admin interface and quick lookups
  userInfo: {
    username: {
      type: String,
      required: true,
      index: true
    },
    name: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true,
      index: true
    },
    role: {
      type: String,
      enum: ['hirer', 'fixer'],
      required: true,
      index: true
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    }
  },
  
  // Enhanced current location with privacy controls
  currentLocation: {
    // Exact coordinates (privacy-controlled access)
    exactCoordinates: {
      type: [Number], // [longitude, latitude]
    },
    
    // Processed coordinates for job matching (precision-reduced)
    coordinates: {
      type: [Number], // [longitude, latitude] for GeoJSON  
    },
    
    accuracy: {
      type: Number, // Accuracy in meters
      default: null
    },
    
    // Privacy and precision settings
    precisionLevel: {
      type: String,
      enum: Object.values(LOCATION_PRECISION),
      default: LOCATION_PRECISION.MEDIUM,
    },
    
    hasGeoLocation: {
      type: Boolean,
      default: true,
    },
    
    privacy: {
      allowJobMatching: {
        type: Boolean,
        default: true,
      },
      showExactLocation: {
        type: Boolean,
        default: false
      },
      showApproximateLocation: {
        type: Boolean,
        default: true
      },
      userConsent: {
        type: Boolean,
        default: false
      }
    }
  },
  
  // Enhanced address information with validation
  address: {
    street: {
      type: String,
      trim: true,
      maxlength: [200, 'Street address too long']
    },
    city: {
      type: String,
      required: true,
      trim: true,
      maxlength: [50, 'City name too long'],
      index: true
    },
    state: {
      type: String,
      required: true,
      trim: true,
      maxlength: [50, 'State name too long'],
      index: true
    },
    country: {
      type: String,
      default: 'India',
      index: true
    },
    postalCode: {
      type: String,
      match: [/^[0-9]{6}$/, 'Invalid postal code format']
    },
    formattedAddress: {
      type: String,
      maxlength: [300, 'Address too long']
    },
    locality: String, // Neighborhood/area
    subLocality: String, // Sub-area
    landmark: String
  },
  
  // Location metadata
  source: {
    type: String,
    enum: ['gps', 'network', 'passive', 'manual', 'ip', 'cached'],
    default: 'gps'
  },
  
  // Permission and consent tracking
  permissions: {
    granted: {
      type: Boolean,
      required: true
    },
    grantedAt: {
      type: Date,
      default: Date.now
    },
    deniedAt: {
      type: Date,
      default: null
    },
    revokedAt: {
      type: Date,
      default: null
    },
    consentVersion: {
      type: String,
      default: '1.0'
    }
  },
  
  // Update tracking
  timestamps: {
    firstDetected: {
      type: Date,
      default: Date.now
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
      index: true
    },
    lastAccessed: {
      type: Date,
      default: Date.now
    },
    nextUpdateDue: {
      type: Date,
      default: function() {
        return new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
      }
    }
  },
  
  // Location history (limited to last 10 locations for performance)
  history: [{
    coordinates: [Number],
    timestamp: {
      type: Date,
      default: Date.now
    },
    accuracy: Number,
    source: {
      type: String,
      enum: ['gps', 'network', 'passive', 'manual', 'ip', 'cached']
    },
    changeReason: {
      type: String,
      enum: ['user_moved', 'accuracy_improvement', 'manual_update', 'periodic_refresh', 'job_search']
    }
  }],
  
  // Usage patterns
  usage: {
    totalUpdates: {
      type: Number,
      default: 1
    },
    jobSearches: {
      type: Number,
      default: 0
    },
    lastJobSearch: {
      type: Date,
      default: null
    },
    distanceBasedSorts: {
      type: Number,
      default: 0
    },
    radiusFiltersUsed: {
      type: Number,
      default: 0
    }
  },
  
  // Preferences
  preferences: {
    autoUpdate: {
      type: Boolean,
      default: true
    },
    updateFrequency: {
      type: String,
      enum: ['real-time', 'hourly', 'daily', 'weekly', 'manual'],
      default: 'daily'
    },
    shareLocation: {
      type: Boolean,
      default: false // Don't share exact location with other users
    },
    maxUpdateRadius: {
      type: Number,
      default: 1000 // Only update if moved more than 1km
    }
  },
  
  // Privacy and security
  privacy: {
    ipAddress: {
      type: String,
      default: null
    },
    userAgent: {
      type: String,
      default: null
    },
    encryptedData: {
      type: String,
      default: null
    }
  },
  
  // Enhanced system flags and admin controls
  flags: {
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    needsUpdate: {
      type: Boolean,
      default: false,
      index: true
    },
    hasErrors: {
      type: Boolean,
      default: false,
      index: true
    },
    lastError: {
      type: String,
      default: null
    },
    isStale: {
      type: Boolean,
      default: false,
      index: true
    },
    isVerified: {
      type: Boolean,
      default: false,
      index: true
    },
    isFlagged: {
      type: Boolean,
      default: false,
      index: true
    }
  },
  
  // Admin data for comprehensive management
  adminData: {
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    verificationDate: Date,
    flaggedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    flagReason: String,
    adminNotes: String,
    lastReviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    lastReviewedAt: Date,
    qualityScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 50
    }
  }
}, {
  timestamps: true,
  collection: 'userlocations',
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Enhanced indexes for performance and admin queries
userLocationSchema.index({ 'currentLocation.coordinates': '2dsphere' });
userLocationSchema.index({ 'currentLocation.exactCoordinates': '2dsphere' });
userLocationSchema.index({ 'userId': 1, 'timestamps.lastUpdated': -1 });
userLocationSchema.index({ 'userInfo.username': 1, 'userInfo.role': 1 });
userLocationSchema.index({ 'userInfo.email': 1, 'userInfo.isActive': 1 });
userLocationSchema.index({ 'address.city': 1, 'address.state': 1 });
userLocationSchema.index({ 'currentLocation.precisionLevel': 1 });
userLocationSchema.index({ 'currentLocation.privacy.allowJobMatching': 1 });
userLocationSchema.index({ 'flags.isActive': 1, 'flags.isVerified': 1 });
userLocationSchema.index({ 'flags.isFlagged': 1, 'flags.hasErrors': 1 });
userLocationSchema.index({ 'timestamps.nextUpdateDue': 1, 'flags.needsUpdate': 1 });

// Enhanced virtuals for better data access
userLocationSchema.virtual('latitude').get(function() {
  return this.currentLocation.coordinates?.[1] || null;
});

userLocationSchema.virtual('longitude').get(function() {
  return this.currentLocation.coordinates?.[0] || null;
});

userLocationSchema.virtual('exactLatitude').get(function() {
  return this.currentLocation.exactCoordinates?.[1] || null;
});

userLocationSchema.virtual('exactLongitude').get(function() {
  return this.currentLocation.exactCoordinates?.[0] || null;
});

userLocationSchema.virtual('fullDisplayName').get(function() {
  return `${this.userInfo.name} (${this.userInfo.username}) - ${this.userInfo.role}`;
});

userLocationSchema.virtual('locationSummary').get(function() {
  const parts = [this.address.city, this.address.state].filter(Boolean);
  const summary = parts.join(', ');
  return this.currentLocation.hasGeoLocation ? 
    `${summary} (${this.currentLocation.precisionLevel})` : 
    `${summary} (address only)`;
});

userLocationSchema.virtual('qualityScore').get(function() {
  let score = 0;
  
  // GPS accuracy scoring
  if (this.currentLocation.accuracy) {
    score += Math.max(0, 30 - (this.currentLocation.accuracy / 10));
  }
  
  // Update frequency scoring
  const daysSinceUpdate = (Date.now() - this.timestamps.lastUpdated) / (1000 * 60 * 60 * 24);
  score += Math.max(0, 30 - daysSinceUpdate);
  
  // Usage activity scoring
  score += Math.min(20, this.usage.totalUpdates);
  
  // Address completeness scoring
  const addressFields = [this.address.street, this.address.city, this.address.state, this.address.postalCode].filter(Boolean).length;
  score += (addressFields / 4) * 20;
  
  return Math.round(Math.min(100, score));
});

// Instance methods
// Enhanced location update method
userLocationSchema.methods.updateLocation = function(newCoords, metadata = {}) {
  // Add current location to history before updating
  if (this.currentLocation.coordinates) {
    this.history.push({
      coordinates: this.currentLocation.coordinates,
      timestamp: this.timestamps.lastUpdated,
      accuracy: this.currentLocation.accuracy,
      source: this.source,
      changeReason: metadata.changeReason || 'location_update'
    });
    
    // Keep only last 20 locations for better history
    if (this.history.length > 20) {
      this.history = this.history.slice(-20);
    }
  }
  
  // Update both exact and processed coordinates
  const exactCoords = [newCoords.lng, newCoords.lat];
  this.currentLocation.exactCoordinates = exactCoords;
  this.currentLocation.coordinates = exactCoords; // Can be precision-reduced later
  this.currentLocation.accuracy = newCoords.accuracy || null;
  this.currentLocation.hasGeoLocation = true;
  
  // Update timestamps and flags
  this.timestamps.lastUpdated = new Date();
  this.timestamps.nextUpdateDue = new Date(Date.now() + this.getUpdateInterval());
  this.usage.totalUpdates += 1;
  this.flags.isStale = false;
  this.flags.needsUpdate = false;
  this.flags.hasErrors = false;
  
  // Update admin quality score
  this.adminData.qualityScore = this.qualityScore;
};

// Method to get location based on privacy settings and context
userLocationSchema.methods.getLocationForContext = function(requestingUser = null, context = 'public') {
  const isOwner = requestingUser && requestingUser.toString() === this.userId.toString();
  
  // Owner always sees full data
  if (isOwner) {
    return {
      ...this.toObject(),
      isOwner: true
    };
  }
  
  const baseInfo = {
    userInfo: {
      username: this.userInfo.username,
      name: this.userInfo.name,
      role: this.userInfo.role
    },
    address: {
      city: this.address.city,
      state: this.address.state,
      country: this.address.country
    },
    lastUpdated: this.timestamps.lastUpdated
  };
  
  switch (context) {
    case 'admin':
      return {
        ...this.toObject(),
        isAdmin: true
      };
      
    case 'job_matching':
      if (this.currentLocation.privacy.allowJobMatching) {
        return {
          ...baseInfo,
          coordinates: this.currentLocation.coordinates,
          precisionLevel: this.currentLocation.precisionLevel,
          hasGeoLocation: this.currentLocation.hasGeoLocation
        };
      }
      break;
      
    case 'profile':
      if (this.currentLocation.privacy.showApproximateLocation) {
        const result = { ...baseInfo };
        if (this.currentLocation.privacy.showExactLocation) {
          result.coordinates = this.currentLocation.exactCoordinates;
        }
        return result;
      }
      break;
      
    default: // public
      if (this.currentLocation.privacy.showApproximateLocation) {
        return baseInfo;
      }
  }
  
  // Minimal info if no permission
  return {
    userInfo: {
      username: this.userInfo.username,
      role: this.userInfo.role
    },
    address: {
      city: this.address.city
    }
  };
};

// Method to update user info cache
userLocationSchema.methods.updateUserInfo = async function(userData) {
  this.userInfo = {
    username: userData.username,
    name: userData.name,
    email: userData.email,
    role: userData.role,
    isActive: userData.isActive !== false
  };
  
  await this.save();
  return this;
};

userLocationSchema.methods.getUpdateInterval = function() {
  const intervals = {
    'real-time': 5 * 60 * 1000,      // 5 minutes
    'hourly': 60 * 60 * 1000,        // 1 hour
    'daily': 24 * 60 * 60 * 1000,    // 24 hours
    'weekly': 7 * 24 * 60 * 60 * 1000, // 7 days
    'manual': 30 * 24 * 60 * 60 * 1000  // 30 days
  };
  return intervals[this.preferences.updateFrequency] || intervals.daily;
};

userLocationSchema.methods.isUpdateDue = function() {
  return new Date() > this.timestamps.nextUpdateDue;
};

userLocationSchema.methods.recordUsage = function(type) {
  this.timestamps.lastAccessed = new Date();
  if (type === 'job_search') {
    this.usage.jobSearches += 1;
    this.usage.lastJobSearch = new Date();
  } else if (type === 'distance_sort') {
    this.usage.distanceBasedSorts += 1;
  } else if (type === 'radius_filter') {
    this.usage.radiusFiltersUsed += 1;
  }
};

// Enhanced static methods with admin functionality
userLocationSchema.statics.findUsersNearLocation = function(lat, lng, radiusInMeters, limit = 50, options = {}) {
  const query = {
    'currentLocation.coordinates': {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [lng, lat]
        },
        $maxDistance: radiusInMeters
      }
    },
    'flags.isActive': true
  };
  
  if (options.allowJobMatching !== false) {
    query['currentLocation.privacy.allowJobMatching'] = true;
  }
  
  if (options.role) {
    query['userInfo.role'] = options.role;
  }
  
  return this.find(query)
    .populate('userId', 'name username email role')
    .limit(limit);
};

// Admin-specific queries
userLocationSchema.statics.findByAdminCriteria = function(criteria = {}) {
  const query = {};
  
  if (criteria.username) {
    query['userInfo.username'] = new RegExp(criteria.username, 'i');
  }
  if (criteria.email) {
    query['userInfo.email'] = new RegExp(criteria.email, 'i');
  }
  if (criteria.role) {
    query['userInfo.role'] = criteria.role;
  }
  if (criteria.city) {
    query['address.city'] = new RegExp(criteria.city, 'i');
  }
  if (criteria.state) {
    query['address.state'] = new RegExp(criteria.state, 'i');
  }
  if (criteria.isActive !== undefined) {
    query['userInfo.isActive'] = criteria.isActive;
  }
  if (criteria.hasLocation !== undefined) {
    query['currentLocation.hasGeoLocation'] = criteria.hasLocation;
  }
  if (criteria.isVerified !== undefined) {
    query['flags.isVerified'] = criteria.isVerified;
  }
  if (criteria.isFlagged !== undefined) {
    query['flags.isFlagged'] = criteria.isFlagged;
  }
  
  return this.find(query)
    .populate('userId', 'name username email role createdAt')
    .populate('adminData.verifiedBy', 'name username')
    .populate('adminData.flaggedBy', 'name username')
    .sort({ 'timestamps.lastUpdated': -1 });
};

userLocationSchema.statics.getLocationStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: null,
        totalUsers: { $sum: 1 },
        activeUsers: {
          $sum: {
            $cond: [{ $eq: ['$flags.isActive', true] }, 1, 0]
          }
        },
        verifiedLocations: {
          $sum: {
            $cond: [{ $eq: ['$flags.isVerified', true] }, 1, 0]
          }
        },
        flaggedLocations: {
          $sum: {
            $cond: [{ $eq: ['$flags.isFlagged', true] }, 1, 0]
          }
        },
        avgQualityScore: { $avg: '$adminData.qualityScore' },
        totalJobSearches: { $sum: '$usage.jobSearches' }
      }
    }
  ]);
  
  return stats[0] || {};
};

userLocationSchema.statics.findStaleLocations = function() {
  return this.find({
    'timestamps.nextUpdateDue': { $lt: new Date() },
    'flags.isActive': true,
    'preferences.autoUpdate': true
  });
};

userLocationSchema.statics.createOrUpdate = async function(userId, locationData, userInfo, metadata = {}) {
  const existing = await this.findOne({ userId });
  
  if (existing) {
    // Update user info cache if provided
    if (userInfo) {
      existing.userInfo = {
        username: userInfo.username,
        name: userInfo.name,
        email: userInfo.email,
        role: userInfo.role,
        isActive: userInfo.isActive !== false
      };
    }
    
    existing.updateLocation(locationData, metadata);
    if (metadata.source) existing.source = metadata.source;
    if (metadata.address) existing.address = { ...existing.address, ...metadata.address };
    return await existing.save();
  } else {
    return await this.create({
      userId,
      userInfo: {
        username: userInfo.username,
        name: userInfo.name,
        email: userInfo.email,
        role: userInfo.role,
        isActive: userInfo.isActive !== false
      },
      currentLocation: {
        coordinates: [locationData.lng, locationData.lat],
        exactCoordinates: [locationData.lng, locationData.lat],
        accuracy: locationData.accuracy,
        hasGeoLocation: true,
        precisionLevel: metadata.precisionLevel || LOCATION_PRECISION.MEDIUM,
        privacy: {
          allowJobMatching: true,
          showExactLocation: false,
          showApproximateLocation: true,
          userConsent: metadata.userConsent || false
        }
      },
      address: metadata.address || {},
      source: metadata.source || 'gps',
      permissions: {
        granted: true,
        grantedAt: new Date()
      }
    });
  }
};

export default mongoose.models.UserLocation || mongoose.model('UserLocation', userLocationSchema);