import mongoose from 'mongoose';

const locationPreferenceSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  
  // Current location data
  currentLocation: {
    lat: {
      type: Number,
      min: -90,
      max: 90,
      required: false
    },
    lng: {
      type: Number,
      min: -180,
      max: 180,
      required: false
    },
    accuracy: {
      type: Number,
      min: 0,
      required: false
    },
    address: {
      type: String,
      trim: true,
      maxlength: 200
    },
    city: {
      type: String,
      trim: true,
      maxlength: 100
    },
    state: {
      type: String,
      trim: true,
      maxlength: 100
    },
    pincode: {
      type: String,
      trim: true,
      match: /^[0-9]{6}$/
    }
  },

  // Location preferences
  preferences: {
    maxTravelDistance: {
      type: Number,
      min: 1,
      max: 100,
      default: 25 // Default 25km radius
    },
    preferredCities: [{
      type: String,
      trim: true
    }],
    autoLocationEnabled: {
      type: Boolean,
      default: false
    },
    locationSharingConsent: {
      type: Boolean,
      default: false,
      required: true
    }
  },

  // Security and privacy
  privacy: {
    shareExactLocation: {
      type: Boolean,
      default: false
    },
    shareApproximateLocation: {
      type: Boolean,
      default: true
    },
    trackLocationHistory: {
      type: Boolean,
      default: false
    }
  },

  // Location history (optional, only if user consents)
  locationHistory: [{
    lat: Number,
    lng: Number,
    timestamp: {
      type: Date,
      default: Date.now
    },
    accuracy: Number,
    source: {
      type: String,
      enum: ['gps', 'ip', 'manual'],
      default: 'gps'
    },
    // Additional location details
    address: String,
    city: String,
    state: String,
    pincode: String,
    // Movement tracking
    isSignificantMove: {
      type: Boolean,
      default: false
    },
    distanceFromPrevious: Number
  }],

  // Recent locations (last 5 locations for quick access)
  recentLocations: [{
    lat: Number,
    lng: Number,
    city: String,
    state: String,
    timestamp: Date,
    usageCount: {
      type: Number,
      default: 1
    }
  }],

  // Metadata
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  lastLocationUpdate: {
    type: Date
  },
  ipLocation: {
    lat: Number,
    lng: Number,
    city: String,
    country: String,
    timestamp: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance  
locationPreferenceSchema.index({ lastUpdated: -1 });

// Geospatial index for location-based queries
locationPreferenceSchema.index({
  'currentLocation.lat': 1,
  'currentLocation.lng': 1
}, {
  name: 'location_2d'
});

// Virtual for getting location age
locationPreferenceSchema.virtual('locationAge').get(function() {
  if (!this.lastLocationUpdate) return null;
  return Date.now() - this.lastLocationUpdate.getTime();
});

// Method to check if location is recent (within 1 hour)
locationPreferenceSchema.methods.isLocationRecent = function() {
  if (!this.lastLocationUpdate) return false;
  const oneHour = 60 * 60 * 1000;
  return (Date.now() - this.lastLocationUpdate.getTime()) < oneHour;
};

// Method to update location securely
locationPreferenceSchema.methods.updateLocation = function(locationData) {
  // Validate coordinates
  if (locationData.lat < -90 || locationData.lat > 90) {
    throw new Error('Invalid latitude');
  }
  if (locationData.lng < -180 || locationData.lng > 180) {
    throw new Error('Invalid longitude');
  }

  const currentLat = parseFloat(locationData.lat);
  const currentLng = parseFloat(locationData.lng);

  // Calculate distance from previous location if exists
  let distanceFromPrevious = null;
  let isSignificantMove = false;
  
  if (this.currentLocation?.lat && this.currentLocation?.lng) {
    const R = 6371; // Earth radius in km
    const dLat = (currentLat - this.currentLocation.lat) * Math.PI / 180;
    const dLng = (currentLng - this.currentLocation.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.currentLocation.lat * Math.PI / 180) * Math.cos(currentLat * Math.PI / 180) *
      Math.sin(dLng/2) * Math.sin(dLng/2);
    distanceFromPrevious = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)) * R;
    
    // Consider it significant if moved more than 1km
    isSignificantMove = distanceFromPrevious > 1;
  }

  // Update current location
  this.currentLocation = {
    ...this.currentLocation,
    ...locationData,
    lat: currentLat,
    lng: currentLng
  };

  this.lastLocationUpdate = new Date();
  this.lastUpdated = new Date();

  // Update recent locations
  const recentLocation = {
    lat: currentLat,
    lng: currentLng,
    city: locationData.city || this.currentLocation.city,
    state: locationData.state || this.currentLocation.state,
    timestamp: new Date(),
    usageCount: 1
  };

  // Check if this location already exists in recent locations
  const existingIndex = this.recentLocations.findIndex(loc => 
    Math.abs(loc.lat - currentLat) < 0.001 && Math.abs(loc.lng - currentLng) < 0.001
  );

  if (existingIndex >= 0) {
    // Update usage count and timestamp
    this.recentLocations[existingIndex].usageCount++;
    this.recentLocations[existingIndex].timestamp = new Date();
  } else {
    // Add new recent location
    this.recentLocations.unshift(recentLocation);
    // Keep only last 5 recent locations
    this.recentLocations = this.recentLocations.slice(0, 5);
  }

  // Add to history if user consents
  if (this.privacy.trackLocationHistory) {
    const historyEntry = {
      lat: currentLat,
      lng: currentLng,
      accuracy: locationData.accuracy,
      source: locationData.source || 'gps',
      address: locationData.address,
      city: locationData.city,
      state: locationData.state,
      pincode: locationData.pincode,
      isSignificantMove,
      distanceFromPrevious,
      timestamp: new Date()
    };

    this.locationHistory.push(historyEntry);

    // Keep only last 100 location entries
    if (this.locationHistory.length > 100) {
      this.locationHistory = this.locationHistory.slice(-100);
    }
  }

  return this.save();
};

// Static method to find users near a location
locationPreferenceSchema.statics.findNearbyUsers = function(lat, lng, radiusKm = 10) {
  return this.find({
    'currentLocation.lat': {
      $exists: true,
      $ne: null
    },
    'currentLocation.lng': {
      $exists: true,
      $ne: null
    },
    'preferences.autoLocationEnabled': true,
    'preferences.locationSharingConsent': true
  }).where({
    $expr: {
      $lte: [
        {
          $multiply: [
            6371, // Earth's radius in km
            {
              $acos: {
                $add: [
                  {
                    $multiply: [
                      { $sin: { $degreesToRadians: lat } },
                      { $sin: { $degreesToRadians: '$currentLocation.lat' } }
                    ]
                  },
                  {
                    $multiply: [
                      { $cos: { $degreesToRadians: lat } },
                      { $cos: { $degreesToRadians: '$currentLocation.lat' } },
                      { $cos: { $degreesToRadians: { $subtract: ['$currentLocation.lng', lng] } } }
                    ]
                  }
                ]
              }
            }
          ]
        },
        radiusKm
      ]
    }
  });
};

// Pre-save middleware to clean old location history
locationPreferenceSchema.pre('save', function(next) {
  // Remove location history older than 30 days if user disabled tracking
  if (!this.privacy.trackLocationHistory) {
    this.locationHistory = [];
  } else {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    this.locationHistory = this.locationHistory.filter(
      entry => entry.timestamp > thirtyDaysAgo
    );
  }
  next();
});

export default mongoose.models.LocationPreference || 
  mongoose.model('LocationPreference', locationPreferenceSchema);