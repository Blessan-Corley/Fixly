// lib/services/locationHistoryService.js - Comprehensive Location History Service
import { getServerAbly, CHANNELS, EVENTS } from '../ably';
import { sendTemplatedNotification } from './notificationService';
import { getRedis } from '../redis';
import connectDB from '../db';
import User from '../../models/User';
import Job from '../../models/Job';

// Location update intervals
const LOCATION_UPDATE_INTERVAL = 30 * 60 * 1000; // 30 minutes
const LOCATION_HISTORY_RETENTION = 7 * 24 * 60 * 60 * 1000; // 7 days
const RELEVANT_JOB_RADIUS = 25; // km

export class LocationHistoryService {
  constructor() {
    this.redis = null;
    this.updateIntervals = new Map();
    this.ably = null;
  }

  async init() {
    this.redis = await getRedis();
    this.ably = getServerAbly();
    return this;
  }

  // Start location tracking for a user
  async startLocationTracking(userId, initialLocation = null) {
    try {
      await connectDB();

      if (initialLocation) {
        await this.updateUserLocation(userId, initialLocation);
      }

      // Set up 30-minute interval updates
      if (!this.updateIntervals.has(userId)) {
        const intervalId = setInterval(async () => {
          await this.requestLocationUpdate(userId);
          await this.updateRelevantSuggestions(userId);
        }, LOCATION_UPDATE_INTERVAL);

        this.updateIntervals.set(userId, intervalId);

        // Store in Redis for persistence across server restarts
        if (this.redis) {
          await this.redis.set(
            `location_tracking:${userId}`,
            JSON.stringify({
              active: true,
              lastUpdate: new Date().toISOString(),
              interval: LOCATION_UPDATE_INTERVAL
            }),
            'EX',
            24 * 60 * 60 // 24 hours
          );
        }
      }

      console.log(`✅ Location tracking started for user ${userId}`);
    } catch (error) {
      console.error('Error starting location tracking:', error);
    }
  }

  // Stop location tracking for a user
  async stopLocationTracking(userId) {
    try {
      if (this.updateIntervals.has(userId)) {
        clearInterval(this.updateIntervals.get(userId));
        this.updateIntervals.delete(userId);
      }

      if (this.redis) {
        await this.redis.del(`location_tracking:${userId}`);
      }

      console.log(`✅ Location tracking stopped for user ${userId}`);
    } catch (error) {
      console.error('Error stopping location tracking:', error);
    }
  }

  // Update user's current location
  async updateUserLocation(userId, location) {
    try {
      await connectDB();

      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const timestamp = new Date();
      const locationEntry = {
        coordinates: {
          latitude: location.latitude,
          longitude: location.longitude
        },
        address: location.address || null,
        city: location.city || null,
        state: location.state || null,
        accuracy: location.accuracy || null,
        timestamp: timestamp
      };

      // Update current location
      user.location = locationEntry;

      // Add to location history
      if (!user.locationHistory) {
        user.locationHistory = [];
      }

      user.locationHistory.unshift(locationEntry);

      // Keep only last 50 location entries
      if (user.locationHistory.length > 50) {
        user.locationHistory = user.locationHistory.slice(0, 50);
      }

      user.lastLocationUpdate = timestamp;
      await user.save();

      // Cache in Redis for fast access
      if (this.redis) {
        const locationCache = {
          current: locationEntry,
          history: user.locationHistory.slice(0, 10), // Recent 10 locations
          lastUpdate: timestamp.toISOString()
        };

        await this.redis.set(
          `user_location:${userId}`,
          JSON.stringify(locationCache),
          'EX',
          2 * 60 * 60 // 2 hours
        );
      }

      // Broadcast location update via Ably (for real-time features)
      if (this.ably) {
        try {
          const channel = this.ably.channels.get(CHANNELS.userPresence(userId));
          await channel.publish('location_updated', {
            userId,
            location: locationEntry,
            timestamp: timestamp.toISOString()
          });
        } catch (ablyError) {
          console.error('Failed to broadcast location update:', ablyError);
        }
      }

      console.log(`✅ Location updated for user ${userId}`);
      return locationEntry;

    } catch (error) {
      console.error('Error updating user location:', error);
      throw error;
    }
  }

  // Request location update via Ably (for active users)
  async requestLocationUpdate(userId) {
    try {
      if (this.ably) {
        const channel = this.ably.channels.get(CHANNELS.userNotifications(userId));
        await channel.publish('location_update_requested', {
          userId,
          timestamp: new Date().toISOString(),
          reason: 'periodic_update'
        });
      }
    } catch (error) {
      console.error('Error requesting location update:', error);
    }
  }

  // Update relevant job suggestions based on location
  async updateRelevantSuggestions(userId) {
    try {
      await connectDB();

      const user = await User.findById(userId);
      if (!user || !user.location?.coordinates) {
        return;
      }

      const userLat = user.location.coordinates.latitude;
      const userLng = user.location.coordinates.longitude;

      // Find nearby jobs using MongoDB geospatial query
      const nearbyJobs = await Job.find({
        status: 'open',
        'location.coordinates': {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [userLng, userLat]
            },
            $maxDistance: RELEVANT_JOB_RADIUS * 1000 // Convert km to meters
          }
        },
        createdBy: { $ne: userId }, // Don't include user's own jobs
        skillsRequired: {
          $in: user.skills || []
        }
      })
      .limit(10)
      .populate('createdBy', 'name rating')
      .lean();

      if (nearbyJobs.length > 0) {
        // Cache suggestions in Redis
        if (this.redis) {
          await this.redis.set(
            `job_suggestions:${userId}`,
            JSON.stringify({
              jobs: nearbyJobs,
              location: user.location,
              generatedAt: new Date().toISOString(),
              radius: RELEVANT_JOB_RADIUS
            }),
            'EX',
            60 * 60 // 1 hour
          );
        }

        // Send notification about relevant jobs
        const relevantJobsCount = nearbyJobs.length;
        if (relevantJobsCount > 0 && user.preferences?.jobNotifications !== false) {
          await sendTemplatedNotification(
            'JOB_STATUS_UPDATE', // Reusing template for job updates
            userId,
            {
              jobTitle: `${relevantJobsCount} relevant job${relevantJobsCount > 1 ? 's' : ''}`,
              status: `nearby in ${user.location.city || 'your area'}`
            },
            {
              priority: 'low',
              senderId: 'system'
            }
          );
        }

        // Broadcast suggestions via Ably
        if (this.ably) {
          const channel = this.ably.channels.get(CHANNELS.userNotifications(userId));
          await channel.publish('job_suggestions_updated', {
            userId,
            jobCount: nearbyJobs.length,
            location: user.location.city,
            timestamp: new Date().toISOString()
          });
        }
      }

      console.log(`✅ Updated suggestions for user ${userId}: ${nearbyJobs.length} relevant jobs`);

    } catch (error) {
      console.error('Error updating relevant suggestions:', error);
    }
  }

  // Get user's location history
  async getLocationHistory(userId, limit = 20) {
    try {
      // Try Redis first
      if (this.redis) {
        const cached = await this.redis.get(`user_location:${userId}`);
        if (cached) {
          const locationData = JSON.parse(cached);
          return {
            current: locationData.current,
            history: locationData.history.slice(0, limit),
            source: 'cache'
          };
        }
      }

      // Fallback to database
      await connectDB();
      const user = await User.findById(userId).select('location locationHistory').lean();

      if (!user) {
        return { current: null, history: [], source: 'database' };
      }

      return {
        current: user.location,
        history: (user.locationHistory || []).slice(0, limit),
        source: 'database'
      };

    } catch (error) {
      console.error('Error getting location history:', error);
      return { current: null, history: [], source: 'error' };
    }
  }

  // Get job suggestions based on current location
  async getJobSuggestions(userId) {
    try {
      // Try Redis cache first
      if (this.redis) {
        const cached = await this.redis.get(`job_suggestions:${userId}`);
        if (cached) {
          const suggestions = JSON.parse(cached);
          return {
            ...suggestions,
            source: 'cache'
          };
        }
      }

      // Generate fresh suggestions
      await this.updateRelevantSuggestions(userId);

      // Try cache again
      if (this.redis) {
        const cached = await this.redis.get(`job_suggestions:${userId}`);
        if (cached) {
          const suggestions = JSON.parse(cached);
          return {
            ...suggestions,
            source: 'fresh'
          };
        }
      }

      return {
        jobs: [],
        location: null,
        generatedAt: new Date().toISOString(),
        source: 'empty'
      };

    } catch (error) {
      console.error('Error getting job suggestions:', error);
      return {
        jobs: [],
        location: null,
        generatedAt: new Date().toISOString(),
        source: 'error'
      };
    }
  }

  // Clean up old location history entries
  async cleanupOldLocations() {
    try {
      await connectDB();

      const cutoffDate = new Date(Date.now() - LOCATION_HISTORY_RETENTION);

      const result = await User.updateMany(
        {},
        {
          $pull: {
            locationHistory: {
              timestamp: { $lt: cutoffDate }
            }
          }
        }
      );

      console.log(`✅ Cleaned up old location history: ${result.modifiedCount} users updated`);

    } catch (error) {
      console.error('Error cleaning up old locations:', error);
    }
  }

  // Calculate distance between two coordinates (Haversine formula)
  calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  // Initialize tracking for all active users (for server restart)
  async initializeActiveTracking() {
    try {
      if (!this.redis) return;

      const activeTrackingKeys = await this.redis.keys('location_tracking:*');

      for (const key of activeTrackingKeys) {
        const userId = key.replace('location_tracking:', '');
        const data = await this.redis.get(key);

        if (data) {
          const trackingInfo = JSON.parse(data);
          if (trackingInfo.active) {
            await this.startLocationTracking(userId);
            console.log(`✅ Resumed location tracking for user ${userId}`);
          }
        }
      }

    } catch (error) {
      console.error('Error initializing active tracking:', error);
    }
  }

  // Cleanup on service shutdown
  async cleanup() {
    try {
      // Clear all intervals
      for (const [userId, intervalId] of this.updateIntervals) {
        clearInterval(intervalId);
        console.log(`✅ Cleared location tracking interval for user ${userId}`);
      }

      this.updateIntervals.clear();

      // Close Ably connection if needed
      if (this.ably) {
        this.ably.close();
      }

    } catch (error) {
      console.error('Error during location service cleanup:', error);
    }
  }
}

// Create singleton instance
let locationHistoryServiceInstance = null;

export async function getLocationHistoryService() {
  if (!locationHistoryServiceInstance) {
    locationHistoryServiceInstance = new LocationHistoryService();
    await locationHistoryServiceInstance.init();

    // Initialize tracking for users who were being tracked before restart
    await locationHistoryServiceInstance.initializeActiveTracking();

    // Set up periodic cleanup (daily)
    setInterval(() => {
      locationHistoryServiceInstance.cleanupOldLocations();
    }, 24 * 60 * 60 * 1000);
  }

  return locationHistoryServiceInstance;
}

// Helper functions for easy use
export async function startUserLocationTracking(userId, initialLocation = null) {
  const service = await getLocationHistoryService();
  return service.startLocationTracking(userId, initialLocation);
}

export async function stopUserLocationTracking(userId) {
  const service = await getLocationHistoryService();
  return service.stopLocationTracking(userId);
}

export async function updateUserLocation(userId, location) {
  const service = await getLocationHistoryService();
  return service.updateUserLocation(userId, location);
}

export async function getUserLocationHistory(userId, limit = 20) {
  const service = await getLocationHistoryService();
  return service.getLocationHistory(userId, limit);
}

export async function getUserJobSuggestions(userId) {
  const service = await getLocationHistoryService();
  return service.getJobSuggestions(userId);
}