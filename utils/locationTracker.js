// Advanced Location Tracking Service with Username Integration
import UserLocationHistory from '@/models/UserLocationHistory';
import User from '@/models/User';
import connectDB from '@/lib/db';
import realtimeManager from '@/lib/realtime/RealtimeManager';

class LocationTracker {
  constructor() {
    this.trackingOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000 // 5 minutes
    };
  }

  // Track and store user location with username mapping
  async trackUserLocation(userId, locationData, options = {}) {
    try {
      await connectDB();
      
      const {
        latitude,
        longitude,
        accuracy = null,
        address = {},
        source = 'manual',
        sessionId = null,
        deviceInfo = {},
        notes = null
      } = locationData;

      // Get user details
      const user = await User.findById(userId).select('username name location');
      if (!user) {
        throw new Error('User not found');
      }

      // Determine precision based on accuracy
      let precision = 'approximate';
      if (accuracy) {
        if (accuracy <= 10) precision = 'exact';
        else if (accuracy <= 100) precision = 'approximate';
        else if (accuracy <= 1000) precision = 'city';
        else precision = 'district';
      }

      // Create location history record
      const locationRecord = new UserLocationHistory({
        userId,
        username: user.username,
        location: {
          coordinates: {
            type: 'Point',
            coordinates: [longitude, latitude]
          },
          address: {
            formatted: address.formatted || `${address.city || ''}, ${address.state || ''}`.trim().replace(/^,/, ''),
            street: address.street,
            city: address.city,
            state: address.state,
            country: address.country || 'India',
            pincode: address.pincode,
            landmark: address.landmark
          },
          precision,
          source,
          accuracy
        },
        deviceInfo: {
          userAgent: deviceInfo.userAgent,
          ip: deviceInfo.ip,
          deviceType: this.detectDeviceType(deviceInfo.userAgent)
        },
        sessionId,
        notes
      });

      await locationRecord.save();

      // Update user's current location
      await this.updateUserLocation(userId, {
        lat: latitude,
        lng: longitude,
        city: address.city,
        state: address.state,
        country: address.country || 'India',
        source,
        precision,
        lastUpdated: new Date()
      });

      // Emit real-time location update to relevant users
      this.emitLocationUpdate(userId, user.username, locationRecord.toPublicJSON());

      console.log(`📍 Location tracked for user ${user.username}: ${address.city}, ${address.state}`);
      return locationRecord.toPublicJSON();

    } catch (error) {
      console.error('Location tracking error:', error);
      throw error;
    }
  }

  // Update user's primary location
  async updateUserLocation(userId, locationData) {
    try {
      const updateData = {
        'location.lat': locationData.lat,
        'location.lng': locationData.lng,
        'location.city': locationData.city,
        'location.state': locationData.state,
        'location.country': locationData.country,
        'location.source': locationData.source,
        'location.precision': locationData.precision,
        'location.lastUpdated': locationData.lastUpdated || new Date()
      };

      await User.findByIdAndUpdate(userId, updateData);
    } catch (error) {
      console.error('User location update error:', error);
      throw error;
    }
  }

  // Find users near a location by username search
  async findUsersNearLocation(searchLocation, options = {}) {
    try {
      await connectDB();
      
      const {
        maxDistance = 10000, // 10km default
        limit = 20,
        includeInactive = false,
        usernameFilter = null
      } = options;

      let query = UserLocationHistory.findNearby(
        searchLocation.longitude,
        searchLocation.latitude,
        maxDistance,
        { limit, active: !includeInactive }
      );

      // Apply username filter if provided
      if (usernameFilter) {
        query = query.where('username').regex(new RegExp(usernameFilter, 'i'));
      }

      const nearbyUsers = await query.exec();

      // Calculate distances and format results
      const results = nearbyUsers.map(record => {
        const distance = record.getDistanceFrom(searchLocation.longitude, searchLocation.latitude);
        return {
          ...record.toPublicJSON(),
          user: record.userId,
          distance: Math.round(distance * 100) / 100 // Round to 2 decimal places
        };
      });

      return results.sort((a, b) => a.distance - b.distance);

    } catch (error) {
      console.error('Nearby users search error:', error);
      throw error;
    }
  }

  // Search users by location and skills
  async searchUsersByLocationAndSkills(searchCriteria) {
    try {
      await connectDB();
      
      const {
        city,
        state,
        skills = [],
        maxDistance = null,
        centerLocation = null,
        limit = 50
      } = searchCriteria;

      let locationQuery;
      
      if (centerLocation && maxDistance) {
        // Search by radius
        locationQuery = UserLocationHistory.findNearby(
          centerLocation.longitude,
          centerLocation.latitude,
          maxDistance,
          { limit, active: true }
        );
      } else if (city && state) {
        // Search by city/state
        locationQuery = UserLocationHistory.getUsersInArea(city, state, { limit, active: true });
      } else {
        throw new Error('Either city/state or centerLocation/maxDistance is required');
      }

      const locationResults = await locationQuery.exec();
      
      if (skills.length === 0) {
        return locationResults.map(record => record.toPublicJSON());
      }

      // Filter by skills if provided
      const userIds = locationResults.map(record => record.userId);
      const usersWithSkills = await User.find({
        _id: { $in: userIds },
        skills: { $in: skills }
      }).select('_id username name skills profilePhoto role location');

      // Combine location and skill data
      const results = locationResults
        .filter(record => usersWithSkills.some(user => user._id.equals(record.userId)))
        .map(record => {
          const user = usersWithSkills.find(u => u._id.equals(record.userId));
          return {
            ...record.toPublicJSON(),
            user: {
              id: user._id,
              username: user.username,
              name: user.name,
              skills: user.skills,
              profilePhoto: user.profilePhoto,
              role: user.role
            }
          };
        });

      return results;

    } catch (error) {
      console.error('Location and skills search error:', error);
      throw error;
    }
  }

  // Get location history for a user
  async getUserLocationHistory(userId, options = {}) {
    try {
      await connectDB();
      
      const { limit = 20, includeInactive = false } = options;
      
      const history = await UserLocationHistory.find({
        userId,
        ...(includeInactive ? {} : { isActive: true })
      })
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();

      return history.map(record => ({
        id: record._id,
        location: record.location,
        timestamp: record.timestamp,
        source: record.location.source,
        precision: record.location.precision
      }));

    } catch (error) {
      console.error('Location history error:', error);
      throw error;
    }
  }

  // Find username by location (reverse lookup)
  async findUsernameByLocation(latitude, longitude, radius = 100) {
    try {
      await connectDB();
      
      const nearbyRecords = await UserLocationHistory.findNearby(
        longitude, 
        latitude, 
        radius,
        { limit: 10, active: true }
      );

      return nearbyRecords.map(record => ({
        username: record.username,
        distance: record.getDistanceFrom(longitude, latitude),
        lastSeen: record.timestamp,
        precision: record.location.precision,
        accuracy: record.location.accuracy
      }));

    } catch (error) {
      console.error('Username by location search error:', error);
      throw error;
    }
  }

  // Real-time location update broadcasting
  emitLocationUpdate(userId, username, locationData) {
    try {
      // Broadcast to users in the same city
      if (locationData.location.city) {
        realtimeManager.broadcastToRoom(`city_${locationData.location.city.toLowerCase()}`, {
          type: 'location_update',
          userId,
          username,
          location: locationData.location,
          timestamp: new Date()
        });
      }

      // Broadcast to user's connections
      realtimeManager.sendToUser(userId, {
        type: 'location_tracked',
        data: locationData,
        timestamp: new Date()
      });

    } catch (error) {
      console.error('Location broadcast error:', error);
    }
  }

  // Helper to detect device type
  detectDeviceType(userAgent) {
    if (!userAgent) return 'unknown';
    
    const ua = userAgent.toLowerCase();
    if (/mobile|android|iphone|ipod|blackberry|windows phone/i.test(ua)) {
      return 'mobile';
    }
    if (/tablet|ipad/i.test(ua)) {
      return 'tablet';
    }
    return 'desktop';
  }

  // Cleanup old location records
  async cleanupOldRecords(daysOld = 90) {
    try {
      await connectDB();
      
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);
      
      const result = await UserLocationHistory.deleteMany({
        timestamp: { $lt: cutoffDate },
        isActive: false
      });

      console.log(`🧹 Cleaned up ${result.deletedCount} old location records`);
      return result.deletedCount;

    } catch (error) {
      console.error('Location cleanup error:', error);
      throw error;
    }
  }
}

// Export singleton instance
const locationTracker = new LocationTracker();
export default locationTracker;