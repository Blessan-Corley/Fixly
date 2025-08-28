// Comprehensive Location Service for Fixly
import connectDB from '../mongodb';

class LocationService {
  constructor() {
    this.userLocations = new Map(); // userId -> location data
    this.locationUpdateInterval = 60 * 60 * 1000; // 1 hour in milliseconds
    this.maxLocationAge = 2 * 60 * 60 * 1000; // 2 hours
    this.geocodingCache = new Map(); // address -> coordinates cache
    
    // Start periodic location cleanup
    setInterval(() => this.cleanupStaleLocations(), 5 * 60 * 1000); // Every 5 minutes
  }

  // Get user's current location with fallbacks
  async getUserLocation(userId, request = null) {
    try {
      // Try to get from cache first
      const cached = this.userLocations.get(userId);
      if (cached && Date.now() - cached.timestamp < this.maxLocationAge) {
        return cached;
      }

      // Try to get from database
      await connectDB();
      const { default: User } = await import('../../models/User');
      const user = await User.findById(userId).select('location').lean();
      
      if (user?.location?.coordinates) {
        const locationData = {
          ...user.location,
          timestamp: Date.now(),
          source: 'database'
        };
        
        // Cache it
        this.userLocations.set(userId, locationData);
        return locationData;
      }

      // Try to get from IP if request is provided
      if (request) {
        const ipLocation = await this.getLocationFromIP(request);
        if (ipLocation) {
          return ipLocation;
        }
      }

      // Return default fallback
      return this.getDefaultLocation();
      
    } catch (error) {
      console.error(`Error getting location for user ${userId}:`, error);
      return this.getDefaultLocation();
    }
  }

  // Update user location
  async updateUserLocation(userId, locationData, source = 'manual') {
    try {
      const normalizedLocation = await this.normalizeLocationData(locationData);
      
      if (!normalizedLocation) {
        throw new Error('Invalid location data provided');
      }

      // Update cache
      const enhancedLocation = {
        ...normalizedLocation,
        timestamp: Date.now(),
        source,
        accuracy: locationData.accuracy || null
      };
      
      this.userLocations.set(userId, enhancedLocation);

      // Update database
      await connectDB();
      const { default: User } = await import('../../models/User');
      
      await User.findByIdAndUpdate(userId, {
        'location.coordinates': enhancedLocation.coordinates,
        'location.address': enhancedLocation.address,
        'location.city': enhancedLocation.city,
        'location.state': enhancedLocation.state,
        'location.country': enhancedLocation.country,
        'location.postalCode': enhancedLocation.postalCode,
        'location.lastUpdated': new Date(),
        'location.source': source
      });

      console.log(`📍 Updated location for user ${userId} from ${source}`);
      return enhancedLocation;
      
    } catch (error) {
      console.error(`Error updating location for user ${userId}:`, error);
      throw error;
    }
  }

  // Get location from IP address
  async getLocationFromIP(request) {
    try {
      const forwarded = request.headers.get('x-forwarded-for');
      const ip = forwarded ? forwarded.split(',')[0] : 
                 request.headers.get('x-real-ip') || 
                 request.headers.get('cf-connecting-ip') ||
                 'unknown';

      if (ip === 'unknown' || ip === '127.0.0.1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
        return null; // Local/private IP
      }

      // Use a free IP geolocation service
      const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,countryCode,region,regionName,city,zip,lat,lon,timezone`);
      const data = await response.json();
      
      if (data.status === 'success') {
        return {
          coordinates: [data.lon, data.lat], // [longitude, latitude] for GeoJSON
          address: `${data.city}, ${data.regionName}`,
          city: data.city,
          state: data.regionName,
          country: data.country,
          countryCode: data.countryCode,
          postalCode: data.zip,
          timezone: data.timezone,
          timestamp: Date.now(),
          source: 'ip',
          accuracy: 'city' // IP-based location is city-level accurate
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error getting location from IP:', error);
      return null;
    }
  }

  // Normalize various location data formats
  async normalizeLocationData(locationData) {
    try {
      let coordinates;
      let address = '';
      let city = '';
      let state = '';
      let country = '';
      let postalCode = '';

      // Handle different input formats
      if (locationData.coordinates) {
        coordinates = Array.isArray(locationData.coordinates) ? 
          locationData.coordinates : 
          [locationData.coordinates.lng || locationData.coordinates.longitude, 
           locationData.coordinates.lat || locationData.coordinates.latitude];
      } else if (locationData.latitude && locationData.longitude) {
        coordinates = [locationData.longitude, locationData.latitude];
      } else if (locationData.lat && locationData.lng) {
        coordinates = [locationData.lng, locationData.lat];
      } else if (locationData.address) {
        // Geocode address to coordinates
        coordinates = await this.geocodeAddress(locationData.address);
        address = locationData.address;
      } else {
        return null;
      }

      // Use provided address components or reverse geocode
      if (locationData.address) {
        address = locationData.address;
      }
      if (locationData.city) {
        city = locationData.city;
      }
      if (locationData.state) {
        state = locationData.state;
      }
      if (locationData.country) {
        country = locationData.country;
      }
      if (locationData.postalCode) {
        postalCode = locationData.postalCode;
      }

      // If we don't have address components, try reverse geocoding
      if (!address && coordinates) {
        const reverseGeocode = await this.reverseGeocode(coordinates);
        if (reverseGeocode) {
          address = reverseGeocode.address;
          city = city || reverseGeocode.city;
          state = state || reverseGeocode.state;
          country = country || reverseGeocode.country;
          postalCode = postalCode || reverseGeocode.postalCode;
        }
      }

      return {
        coordinates,
        address,
        city,
        state,
        country,
        postalCode
      };
      
    } catch (error) {
      console.error('Error normalizing location data:', error);
      return null;
    }
  }

  // Geocode address to coordinates
  async geocodeAddress(address) {
    try {
      // Check cache first
      if (this.geocodingCache.has(address)) {
        return this.geocodingCache.get(address);
      }

      // Use Nominatim (OpenStreetMap) for free geocoding
      const encodedAddress = encodeURIComponent(address);
      const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodedAddress}&format=json&limit=1`);
      const data = await response.json();
      
      if (data && data.length > 0) {
        const result = data[0];
        const coordinates = [parseFloat(result.lon), parseFloat(result.lat)];
        
        // Cache the result
        this.geocodingCache.set(address, coordinates);
        
        // Limit cache size
        if (this.geocodingCache.size > 1000) {
          const firstKey = this.geocodingCache.keys().next().value;
          this.geocodingCache.delete(firstKey);
        }
        
        return coordinates;
      }
      
      return null;
    } catch (error) {
      console.error('Error geocoding address:', error);
      return null;
    }
  }

  // Reverse geocode coordinates to address
  async reverseGeocode(coordinates) {
    try {
      const [lng, lat] = coordinates;
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
      const data = await response.json();
      
      if (data && data.address) {
        const addr = data.address;
        return {
          address: data.display_name,
          city: addr.city || addr.town || addr.village || '',
          state: addr.state || '',
          country: addr.country || '',
          postalCode: addr.postcode || ''
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      return null;
    }
  }

  // Find nearby jobs based on location
  async findNearbyJobs(userLocation, options = {}) {
    try {
      const {
        maxDistance = 50000, // 50km in meters
        limit = 20,
        skills = [],
        budgetMin = null,
        budgetMax = null,
        sortBy = 'distance' // distance, createdAt, budget
      } = options;

      if (!userLocation?.coordinates) {
        throw new Error('Valid user location required');
      }

      await connectDB();
      const { default: Job } = await import('../../models/Job');

      // Build aggregation pipeline
      const pipeline = [
        // GeoNear must be first stage
        {
          $geoNear: {
            near: {
              type: 'Point',
              coordinates: userLocation.coordinates
            },
            distanceField: 'distance',
            maxDistance: maxDistance,
            spherical: true,
            query: {
              status: 'open',
              'location.coordinates': { $exists: true }
            }
          }
        },
        // Add additional filters
        {
          $match: {
            ...(skills.length > 0 && { skillsRequired: { $in: skills } }),
            ...(budgetMin && { 'budget.amount': { $gte: budgetMin } }),
            ...(budgetMax && { 'budget.amount': { $lte: budgetMax } })
          }
        },
        // Add calculated fields
        {
          $addFields: {
            distanceKm: { $round: [{ $divide: ['$distance', 1000] }, 2] },
            relevanceScore: {
              $add: [
                // Distance factor (closer = higher score)
                { $divide: [maxDistance, { $add: ['$distance', 1] }] },
                // Time factor (newer = higher score)  
                { $divide: [{ $subtract: [Date.now(), '$createdAt'] }, 86400000] }, // days since posted
                // Skill match factor
                ...(skills.length > 0 ? [{
                  $multiply: [
                    { $size: { $setIntersection: ['$skillsRequired', skills] } },
                    100
                  ]
                }] : [0])
              ]
            }
          }
        },
        // Sort based on preference
        {
          $sort: sortBy === 'distance' ? { distance: 1 } :
                 sortBy === 'createdAt' ? { createdAt: -1 } :
                 sortBy === 'budget' ? { 'budget.amount': -1 } :
                 { relevanceScore: -1, distance: 1 }
        },
        {
          $limit: limit
        },
        // Populate creator info
        {
          $lookup: {
            from: 'users',
            localField: 'createdBy',
            foreignField: '_id',
            as: 'creator',
            pipeline: [
              {
                $project: {
                  name: 1,
                  photoURL: 1,
                  'rating.average': 1,
                  jobsPosted: 1
                }
              }
            ]
          }
        },
        {
          $unwind: { path: '$creator', preserveNullAndEmptyArrays: true }
        }
      ];

      const jobs = await Job.aggregate(pipeline);

      return {
        jobs,
        totalFound: jobs.length,
        searchLocation: userLocation,
        searchRadius: maxDistance / 1000, // km
        filters: { skills, budgetMin, budgetMax, sortBy }
      };
      
    } catch (error) {
      console.error('Error finding nearby jobs:', error);
      throw error;
    }
  }

  // Auto-update user location periodically
  async scheduleLocationUpdate(userId) {
    const intervalId = setInterval(async () => {
      try {
        // Check if user has enabled location auto-update
        await connectDB();
        const { default: User } = await import('../../models/User');
        const user = await User.findById(userId).select('preferences.locationAutoUpdate').lean();
        
        if (!user?.preferences?.locationAutoUpdate) {
          clearInterval(intervalId);
          return;
        }

        // Try to update location (this would typically be triggered by client-side geolocation)
        console.log(`🕐 Scheduled location check for user ${userId}`);
        
      } catch (error) {
        console.error(`Error in scheduled location update for ${userId}:`, error);
      }
    }, this.locationUpdateInterval);

    return intervalId;
  }

  // Get default/fallback location (could be based on user's signup location or country)
  getDefaultLocation() {
    return {
      coordinates: [-74.0060, 40.7128], // New York City as default
      address: 'New York, NY, USA',
      city: 'New York',
      state: 'New York',
      country: 'United States',
      postalCode: '10001',
      timestamp: Date.now(),
      source: 'default',
      accuracy: 'city'
    };
  }

  // Calculate distance between two points
  calculateDistance(point1, point2) {
    const [lng1, lat1] = point1;
    const [lng2, lat2] = point2;
    
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lng2-lng1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance in meters
  }

  // Clean up stale locations from cache
  cleanupStaleLocations() {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [userId, locationData] of this.userLocations.entries()) {
      if (now - locationData.timestamp > this.maxLocationAge) {
        this.userLocations.delete(userId);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`🧹 Cleaned up ${cleaned} stale location entries`);
    }
  }

  // Location permission handling
  async handleLocationPermission(userId, permission, request = null) {
    try {
      await connectDB();
      const { default: User } = await import('../../models/User');
      
      if (permission === 'granted') {
        // User granted location permission
        await User.findByIdAndUpdate(userId, {
          'preferences.locationEnabled': true,
          'preferences.locationAutoUpdate': true
        });
        
        console.log(`✅ Location permission granted for user ${userId}`);
        
        // Try to get initial location from IP
        if (request) {
          const ipLocation = await this.getLocationFromIP(request);
          if (ipLocation) {
            await this.updateUserLocation(userId, ipLocation, 'ip_initial');
          }
        }
        
      } else if (permission === 'denied') {
        // User denied location permission
        await User.findByIdAndUpdate(userId, {
          'preferences.locationEnabled': false,
          'preferences.locationAutoUpdate': false
        });
        
        console.log(`❌ Location permission denied for user ${userId}`);
        
        // Try to use IP-based location as fallback
        if (request) {
          const ipLocation = await this.getLocationFromIP(request);
          if (ipLocation) {
            await this.updateUserLocation(userId, ipLocation, 'ip_fallback');
          }
        }
      }
      
    } catch (error) {
      console.error('Error handling location permission:', error);
    }
  }

  // Get location statistics
  getLocationStats() {
    const cachedLocations = this.userLocations.size;
    const sourceStats = {};
    
    for (const locationData of this.userLocations.values()) {
      sourceStats[locationData.source] = (sourceStats[locationData.source] || 0) + 1;
    }
    
    return {
      cachedLocations,
      sourceStats,
      geocodingCacheSize: this.geocodingCache.size
    };
  }
}

// Singleton instance
const locationService = new LocationService();

export default locationService;