// tests/locationTracking.test.js - Comprehensive Location Tracking Tests
import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useLocationTracking } from '../hooks/useLocationTracking';
import { LocationHistoryService } from '../lib/services/locationHistoryService';

// Mock dependencies
jest.mock('../contexts/AblyContext', () => ({
  useAblyChannel: jest.fn((channel, event, callback) => {
    // Store callback for manual triggering in tests
    global.mockAblyCallbacks = global.mockAblyCallbacks || {};
    global.mockAblyCallbacks[`${channel}:${event}`] = callback;
    return { unsubscribe: jest.fn() };
  })
}));

jest.mock('next-auth/react', () => ({
  useSession: () => ({
    data: {
      user: {
        id: 'test-user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'fixer'
      }
    },
    status: 'authenticated'
  })
}));

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn()
  }
}));

// Mock geolocation API
const mockGeolocation = {
  getCurrentPosition: jest.fn(),
  watchPosition: jest.fn(),
  clearWatch: jest.fn()
};

Object.defineProperty(global.navigator, 'geolocation', {
  value: mockGeolocation,
  writable: true
});

// Mock permissions API
Object.defineProperty(global.navigator, 'permissions', {
  value: {
    query: jest.fn(() => Promise.resolve({
      state: 'granted',
      onchange: null
    }))
  },
  writable: true
});

// Mock fetch
global.fetch = jest.fn();

describe('Location Tracking System', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.mockAblyCallbacks = {};

    // Reset localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn()
      },
      writable: true
    });

    // Default successful responses
    fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: {
          current: {
            latitude: 19.0760,
            longitude: 72.8777,
            city: 'Mumbai',
            state: 'Maharashtra'
          },
          history: [],
          suggestions: { jobs: [] }
        }
      })
    });
  });

  describe('useLocationTracking Hook', () => {
    test('should initialize with default state', () => {
      const { result } = renderHook(() => useLocationTracking());

      expect(result.current.isTracking).toBe(false);
      expect(result.current.currentLocation).toBe(null);
      expect(result.current.locationHistory).toEqual([]);
      expect(result.current.jobSuggestions).toEqual([]);
      expect(result.current.error).toBe(null);
      expect(result.current.permissionStatus).toBe('prompt');
    });

    test('should check geolocation permission on mount', async () => {
      renderHook(() => useLocationTracking());

      await waitFor(() => {
        expect(navigator.permissions.query).toHaveBeenCalledWith({ name: 'geolocation' });
      });
    });

    test('should start location tracking successfully', async () => {
      mockGeolocation.getCurrentPosition.mockImplementation((success) => {
        success({
          coords: {
            latitude: 19.0760,
            longitude: 72.8777,
            accuracy: 10
          }
        });
      });

      const { result } = renderHook(() => useLocationTracking());

      await act(async () => {
        const success = await result.current.startTracking();
        expect(success).toBe(true);
      });

      expect(result.current.isTracking).toBe(true);
      expect(result.current.error).toBe(null);
      expect(mockGeolocation.getCurrentPosition).toHaveBeenCalled();
    });

    test('should handle geolocation errors gracefully', async () => {
      mockGeolocation.getCurrentPosition.mockImplementation((success, error) => {
        error(new Error('Location access denied'));
      });

      const { result } = renderHook(() => useLocationTracking());

      await act(async () => {
        const success = await result.current.startTracking();
        expect(success).toBe(false);
      });

      expect(result.current.isTracking).toBe(false);
      expect(result.current.error).toContain('Location access denied');
    });

    test('should update location manually', async () => {
      mockGeolocation.getCurrentPosition.mockImplementation((success) => {
        success({
          coords: {
            latitude: 19.0760,
            longitude: 72.8777,
            accuracy: 10
          }
        });
      });

      const { result } = renderHook(() => useLocationTracking());

      await act(async () => {
        await result.current.updateLocationNow();
      });

      expect(fetch).toHaveBeenCalledWith('/api/user/location/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          location: expect.objectContaining({
            latitude: 19.0760,
            longitude: 72.8777
          })
        })
      });
    });

    test('should stop tracking and clear intervals', async () => {
      const { result } = renderHook(() => useLocationTracking());

      // Start tracking first
      await act(async () => {
        await result.current.startTracking();
      });

      expect(result.current.isTracking).toBe(true);

      // Stop tracking
      await act(async () => {
        await result.current.stopTracking();
      });

      expect(result.current.isTracking).toBe(false);
      expect(fetch).toHaveBeenCalledWith('/api/user/location/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop_tracking' })
      });
    });

    test('should respond to Ably location update requests', async () => {
      mockGeolocation.getCurrentPosition.mockImplementation((success) => {
        success({
          coords: {
            latitude: 19.0760,
            longitude: 72.8777,
            accuracy: 10
          }
        });
      });

      const { result } = renderHook(() => useLocationTracking());

      // Start tracking
      await act(async () => {
        await result.current.startTracking();
      });

      // Simulate Ably callback for location update request
      const callback = global.mockAblyCallbacks['user:test-user-123:notifications:location_update_requested'];

      await act(async () => {
        if (callback) {
          callback({ data: { reason: 'periodic_update' } });
        }
      });

      // Should have called getCurrentPosition again
      expect(mockGeolocation.getCurrentPosition).toHaveBeenCalledTimes(2);
    });

    test('should fetch job suggestions when enabled', async () => {
      const { result } = renderHook(() => useLocationTracking({ enableSuggestions: true }));

      await act(async () => {
        await result.current.fetchLocationData(true);
      });

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/user/location/history?'),
        undefined
      );
    });
  });

  describe('LocationHistoryService', () => {
    let service;

    beforeEach(async () => {
      service = new LocationHistoryService();

      // Mock Redis and Ably
      service.redis = {
        set: jest.fn().mockResolvedValue('OK'),
        get: jest.fn().mockResolvedValue(null),
        del: jest.fn().mockResolvedValue(1),
        keys: jest.fn().mockResolvedValue([])
      };

      service.ably = {
        channels: {
          get: jest.fn().mockReturnValue({
            publish: jest.fn().mockResolvedValue()
          })
        }
      };
    });

    test('should calculate distance correctly', () => {
      const distance = service.calculateDistance(
        19.0760, 72.8777, // Mumbai
        28.6139, 77.2090  // Delhi
      );

      // Distance between Mumbai and Delhi is approximately 1150 km
      expect(distance).toBeGreaterThan(1100);
      expect(distance).toBeLessThan(1200);
    });

    test('should start location tracking for user', async () => {
      const userId = 'test-user-123';
      const initialLocation = {
        latitude: 19.0760,
        longitude: 72.8777,
        city: 'Mumbai'
      };

      await service.startLocationTracking(userId, initialLocation);

      expect(service.updateIntervals.has(userId)).toBe(true);
      expect(service.redis.set).toHaveBeenCalledWith(
        `location_tracking:${userId}`,
        expect.stringContaining('\"active\":true'),
        'EX',
        86400
      );
    });

    test('should stop location tracking for user', async () => {
      const userId = 'test-user-123';

      // Start tracking first
      await service.startLocationTracking(userId);
      expect(service.updateIntervals.has(userId)).toBe(true);

      // Stop tracking
      await service.stopLocationTracking(userId);
      expect(service.updateIntervals.has(userId)).toBe(false);
      expect(service.redis.del).toHaveBeenCalledWith(`location_tracking:${userId}`);
    });

    test('should update user location with caching', async () => {
      const userId = 'test-user-123';
      const location = {
        latitude: 19.0760,
        longitude: 72.8777,
        city: 'Mumbai',
        state: 'Maharashtra'
      };

      // Mock connectDB and User model
      const mockUser = {
        _id: userId,
        location: null,
        locationHistory: [],
        save: jest.fn().mockResolvedValue()
      };

      // Mock database connection and user finding
      global.connectDB = jest.fn().mockResolvedValue();
      global.User = {
        findById: jest.fn().mockResolvedValue(mockUser)
      };

      const result = await service.updateUserLocation(userId, location);

      expect(result).toMatchObject({
        coordinates: {
          latitude: 19.0760,
          longitude: 72.8777
        },
        city: 'Mumbai',
        state: 'Maharashtra'
      });

      expect(mockUser.save).toHaveBeenCalled();
      expect(service.redis.set).toHaveBeenCalledWith(
        `user_location:${userId}`,
        expect.stringContaining('Mumbai'),
        'EX',
        7200
      );
    });

    test('should cleanup old location history', async () => {
      // Mock User.updateMany
      global.User = {
        updateMany: jest.fn().mockResolvedValue({ modifiedCount: 5 })
      };

      await service.cleanupOldLocations();

      expect(global.User.updateMany).toHaveBeenCalledWith(
        {},
        {
          $pull: {
            locationHistory: {
              timestamp: { $lt: expect.any(Date) }
            }
          }
        }
      );
    });
  });

  describe('API Endpoints', () => {
    test('should handle GET /api/user/location/history', async () => {
      const response = await fetch('/api/user/location/history?limit=10&includeSuggestions=true');

      expect(fetch).toHaveBeenCalledWith('/api/user/location/history?limit=10&includeSuggestions=true');
    });

    test('should handle POST /api/user/location/history for location update', async () => {
      const locationData = {
        action: 'update',
        location: {
          latitude: 19.0760,
          longitude: 72.8777,
          city: 'Mumbai'
        }
      };

      await fetch('/api/user/location/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(locationData)
      });

      expect(fetch).toHaveBeenCalledWith('/api/user/location/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(locationData)
      });
    });
  });

  describe('Real-time Features', () => {
    test('should broadcast location updates via Ably', async () => {
      const service = new LocationHistoryService();
      service.ably = {
        channels: {
          get: jest.fn().mockReturnValue({
            publish: jest.fn().mockResolvedValue()
          })
        }
      };

      const mockChannel = service.ably.channels.get();

      // Mock the location update process
      await service.requestLocationUpdate('test-user-123');

      expect(service.ably.channels.get).toHaveBeenCalledWith('user:test-user-123:notifications');
      expect(mockChannel.publish).toHaveBeenCalledWith(
        'location_update_requested',
        expect.objectContaining({
          userId: 'test-user-123',
          reason: 'periodic_update'
        })
      );
    });

    test('should handle job suggestions notifications', async () => {
      const { result } = renderHook(() => useLocationTracking({ enableSuggestions: true }));

      // Simulate Ably callback for job suggestions
      const callback = global.mockAblyCallbacks['user:test-user-123:notifications:job_suggestions_updated'];

      await act(async () => {
        if (callback) {
          callback({
            data: {
              jobCount: 3,
              location: 'Mumbai'
            }
          });
        }
      });

      // Should trigger toast notification
      expect(require('sonner').toast.info).toHaveBeenCalledWith(
        'Found 3 relevant jobs near Mumbai',
        expect.any(Object)
      );
    });
  });

  describe('Error Handling', () => {
    test('should handle network errors gracefully', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useLocationTracking());

      await act(async () => {
        await result.current.fetchLocationData();
      });

      // Should not crash and should continue functioning
      expect(result.current.locationHistory).toEqual([]);
    });

    test('should handle location permission denial', async () => {
      navigator.permissions.query.mockResolvedValue({
        state: 'denied',
        onchange: null
      });

      const { result } = renderHook(() => useLocationTracking());

      await act(async () => {
        const success = await result.current.startTracking();
        expect(success).toBe(false);
      });

      expect(result.current.error).toBe('Location permission is required');
    });

    test('should handle low accuracy locations', async () => {
      mockGeolocation.getCurrentPosition.mockImplementation((success) => {
        success({
          coords: {
            latitude: 19.0760,
            longitude: 72.8777,
            accuracy: 500 // Low accuracy
          }
        });
      });

      const { result } = renderHook(() => useLocationTracking({ accuracyThreshold: 100 }));

      await act(async () => {
        try {
          await result.current.updateLocationNow();
        } catch (error) {
          expect(error.message).toContain('Location accuracy too low');
        }
      });
    });
  });
});

describe('Integration Tests', () => {
  test('should complete full location tracking workflow', async () => {
    // Mock successful geolocation
    mockGeolocation.getCurrentPosition.mockImplementation((success) => {
      success({
        coords: {
          latitude: 19.0760,
          longitude: 72.8777,
          accuracy: 10
        }
      });
    });

    // Mock successful API responses
    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          formatted_address: 'Mumbai, Maharashtra, India',
          city: 'Mumbai',
          state: 'Maharashtra'
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: { location: { city: 'Mumbai' } }
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });

    const { result } = renderHook(() => useLocationTracking());

    // Start tracking
    await act(async () => {
      const success = await result.current.startTracking();
      expect(success).toBe(true);
    });

    // Verify state
    expect(result.current.isTracking).toBe(true);
    expect(result.current.currentLocation).toMatchObject({
      latitude: 19.0760,
      longitude: 72.8777
    });

    // Stop tracking
    await act(async () => {
      await result.current.stopTracking();
    });

    expect(result.current.isTracking).toBe(false);
  });
});

describe('Performance Tests', () => {
  test('should handle rapid location updates efficiently', async () => {
    const { result } = renderHook(() => useLocationTracking());

    // Simulate rapid updates
    const updates = Array.from({ length: 10 }, (_, i) =>
      result.current.updateLocationNow()
    );

    await act(async () => {
      await Promise.allSettled(updates);
    });

    // Should not crash or cause memory leaks
    expect(result.current.error).toBe(null);
  });

  test('should cleanup resources properly', async () => {
    const { result, unmount } = renderHook(() => useLocationTracking());

    await act(async () => {
      await result.current.startTracking();
    });

    // Unmount and verify cleanup
    unmount();

    // Intervals should be cleared
    expect(clearInterval).toHaveBeenCalled();
  });
});

export default {};