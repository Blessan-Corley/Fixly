// Enhanced User Location History Model with Username Mapping
import mongoose from 'mongoose';

const userLocationHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  username: {
    type: String,
    required: true,
    index: true
  },
  location: {
    coordinates: {
      type: {
        type: String,
        enum: ['Point'],
        required: true
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
        validate: {
          validator: function(coords) {
            return coords.length === 2 && 
                   coords[1] >= -90 && coords[1] <= 90 &&  // latitude
                   coords[0] >= -180 && coords[0] <= 180; // longitude
          },
          message: 'Invalid coordinates format'
        }
      }
    },
    address: {
      formatted: String,
      street: String,
      city: String,
      state: String,
      country: { type: String, default: 'India' },
      pincode: String,
      landmark: String
    },
    precision: {
      type: String,
      enum: ['exact', 'approximate', 'city', 'district'],
      default: 'approximate'
    },
    source: {
      type: String,
      enum: ['gps', 'manual', 'ip', 'geocoded', 'estimated'],
      default: 'manual'
    },
    accuracy: {
      type: Number, // accuracy in meters
      min: 0
    }
  },
  deviceInfo: {
    userAgent: String,
    ip: String,
    deviceType: {
      type: String,
      enum: ['mobile', 'desktop', 'tablet', 'unknown'],
      default: 'unknown'
    }
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  sessionId: String,
  notes: String
}, {
  timestamps: true
});

// Create compound indexes for efficient queries
userLocationHistorySchema.index({ userId: 1, timestamp: -1 });
userLocationHistorySchema.index({ username: 1, timestamp: -1 });
userLocationHistorySchema.index({ 'location.coordinates': '2dsphere' });
userLocationHistorySchema.index({ 'location.address.city': 1, 'location.address.state': 1 });
userLocationHistorySchema.index({ timestamp: -1 }); // For cleanup operations

// Static methods for location queries
userLocationHistorySchema.statics.findByUsername = function(username, options = {}) {
  const { limit = 10, active = true } = options;
  
  const query = { username };
  if (active) query.isActive = true;
  
  return this.find(query)
    .sort({ timestamp: -1 })
    .limit(limit)
    .populate('userId', 'name profilePhoto role');
};

userLocationHistorySchema.statics.findNearby = function(longitude, latitude, maxDistance = 10000, options = {}) {
  const { limit = 20, active = true } = options;
  
  const query = {
    'location.coordinates': {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        $maxDistance: maxDistance
      }
    }
  };
  
  if (active) query.isActive = true;
  
  return this.find(query)
    .limit(limit)
    .populate('userId', 'name username profilePhoto role')
    .sort({ timestamp: -1 });
};

userLocationHistorySchema.statics.getUsersInArea = function(city, state, options = {}) {
  const { limit = 50, active = true, precision } = options;
  
  const query = {
    'location.address.city': new RegExp(city, 'i'),
    'location.address.state': new RegExp(state, 'i')
  };
  
  if (active) query.isActive = true;
  if (precision) query['location.precision'] = precision;
  
  return this.find(query)
    .limit(limit)
    .populate('userId', 'name username profilePhoto role')
    .sort({ timestamp: -1 });
};

userLocationHistorySchema.statics.getLocationStats = function(userId) {
  return this.aggregate([
    { $match: { userId: mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: null,
        totalLocations: { $sum: 1 },
        cities: { $addToSet: '$location.address.city' },
        states: { $addToSet: '$location.address.state' },
        firstLocation: { $min: '$timestamp' },
        lastLocation: { $max: '$timestamp' },
        averageAccuracy: { $avg: '$location.accuracy' }
      }
    }
  ]);
};

// Instance methods
userLocationHistorySchema.methods.getDistanceFrom = function(longitude, latitude) {
  if (!this.location?.coordinates?.coordinates) return null;
  
  const [myLng, myLat] = this.location.coordinates.coordinates;
  const R = 6371; // Earth's radius in km
  
  const dLat = (latitude - myLat) * Math.PI / 180;
  const dLng = (longitude - myLng) * Math.PI / 180;
  
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(myLat * Math.PI / 180) * Math.cos(latitude * Math.PI / 180) * 
            Math.sin(dLng/2) * Math.sin(dLng/2);
            
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in km
};

userLocationHistorySchema.methods.toPublicJSON = function() {
  return {
    id: this._id,
    username: this.username,
    location: {
      city: this.location.address.city,
      state: this.location.address.state,
      country: this.location.address.country,
      coordinates: this.location.coordinates.coordinates,
      precision: this.location.precision,
      accuracy: this.location.accuracy
    },
    timestamp: this.timestamp,
    source: this.location.source
  };
};

// Pre-save middleware
userLocationHistorySchema.pre('save', async function(next) {
  // Auto-populate username if not provided
  if (!this.username && this.userId) {
    try {
      const User = mongoose.model('User');
      const user = await User.findById(this.userId).select('username');
      if (user) {
        this.username = user.username;
      }
    } catch (error) {
      console.error('Failed to populate username:', error);
    }
  }
  
  next();
});

// TTL index to automatically delete old location records (90 days)
userLocationHistorySchema.index({ timestamp: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

export default mongoose.models.UserLocationHistory || mongoose.model('UserLocationHistory', userLocationHistorySchema);