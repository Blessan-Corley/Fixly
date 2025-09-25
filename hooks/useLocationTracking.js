// hooks/useLocationTracking.js - Client-side location tracking hook
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useAblyChannel } from '../contexts/AblyContext';
import { toast } from 'sonner';

const LOCATION_UPDATE_INTERVAL = 30 * 60 * 1000; // 30 minutes
const LOCATION_OPTIONS = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 5 * 60 * 1000 // 5 minutes
};

export function useLocationTracking(options = {}) {
  const { data: session } = useSession();
  const [isTracking, setIsTracking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationHistory, setLocationHistory] = useState([]);
  const [jobSuggestions, setJobSuggestions] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [error, setError] = useState(null);
  const [permissionStatus, setPermissionStatus] = useState('prompt');

  const trackingIntervalRef = useRef(null);
  const watchIdRef = useRef(null);

  const {
    autoStart = true,
    enableSuggestions = true,
    showNotifications = true,
    accuracyThreshold = 100 // meters
  } = options;

  // Subscribe to location update requests from server
  useAblyChannel(
    session?.user?.id ? `user:${session.user.id}:notifications` : null,
    'location_update_requested',
    (message) => {
      if (isTracking) {
        updateLocationNow();
      }
    },
    [isTracking]
  );

  // Subscribe to job suggestions updates
  useAblyChannel(
    session?.user?.id ? `user:${session.user.id}:notifications` : null,
    'job_suggestions_updated',
    (message) => {
      if (enableSuggestions && showNotifications) {
        const { jobCount, location } = message.data;
        if (jobCount > 0) {
          toast.info(`Found ${jobCount} relevant jobs near ${location}`, {
            action: {
              label: 'View Jobs',
              onClick: () => window.location.href = '/dashboard/browse-jobs'
            }
          });
        }
      }
      // Refresh suggestions
      fetchLocationData(true);
    },
    [enableSuggestions, showNotifications]
  );

  // Check geolocation permission
  const checkPermission = useCallback(async () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser');
      return false;
    }

    try {
      if (navigator.permissions) {
        const permission = await navigator.permissions.query({ name: 'geolocation' });
        setPermissionStatus(permission.state);

        permission.onchange = () => {
          setPermissionStatus(permission.state);
          if (permission.state === 'denied') {
            stopTracking();
          }
        };

        return permission.state !== 'denied';
      }
      return true;
    } catch (error) {
      console.error('Error checking geolocation permission:', error);
      return true; // Assume allowed if we can't check
    }
  }, []);

  // Get current position
  const getCurrentPosition = useCallback(async () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: new Date()
          };

          // Only use location if accuracy is acceptable
          if (location.accuracy <= accuracyThreshold) {
            resolve(location);
          } else {
            reject(new Error(`Location accuracy too low: ${location.accuracy}m`));
          }
        },
        (error) => {
          console.error('Geolocation error:', error);
          reject(error);
        },
        LOCATION_OPTIONS
      );
    });
  }, [accuracyThreshold]);

  // Reverse geocode coordinates to get address
  const reverseGeocode = useCallback(async (latitude, longitude) => {
    try {
      const response = await fetch('/api/location/reverse-geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude, longitude })
      });

      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error('Reverse geocoding error:', error);
    }

    return null;
  }, []);

  // Update location on server
  const updateLocationOnServer = useCallback(async (location) => {
    try {
      const response = await fetch('/api/user/location/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          location
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update location on server');
      }

      const result = await response.json();
      setLastUpdate(new Date());
      return result.data?.location;

    } catch (error) {
      console.error('Server location update error:', error);
      setError('Failed to update location on server');
      throw error;
    }
  }, []);

  // Fetch location data and suggestions from server
  const fetchLocationData = useCallback(async (includeSuggestions = enableSuggestions) => {
    try {
      const params = new URLSearchParams({
        limit: '20',
        includeSuggestions: includeSuggestions.toString()
      });

      const response = await fetch(`/api/user/location/history?${params}`);

      if (response.ok) {
        const result = await response.json();
        setLocationHistory(result.data.history || []);
        setCurrentLocation(result.data.current);

        if (result.data.suggestions) {
          setJobSuggestions(result.data.suggestions.jobs || []);
        }
      }
    } catch (error) {
      console.error('Error fetching location data:', error);
    }
  }, [enableSuggestions]);

  // Update location now
  const updateLocationNow = useCallback(async () => {
    try {
      setError(null);

      const position = await getCurrentPosition();
      const addressInfo = await reverseGeocode(position.latitude, position.longitude);

      const locationData = {
        ...position,
        address: addressInfo?.formatted_address,
        city: addressInfo?.city,
        state: addressInfo?.state
      };

      setCurrentLocation(locationData);
      await updateLocationOnServer(locationData);

      // Fetch updated suggestions
      if (enableSuggestions) {
        setTimeout(() => fetchLocationData(true), 1000);
      }

    } catch (error) {
      console.error('Location update error:', error);
      setError(error.message);

      if (showNotifications) {
        toast.error('Failed to update location', {
          description: error.message
        });
      }
    }
  }, [getCurrentPosition, reverseGeocode, updateLocationOnServer, enableSuggestions, fetchLocationData, showNotifications]);

  // Start location tracking
  const startTracking = useCallback(async () => {
    try {
      const hasPermission = await checkPermission();
      if (!hasPermission) {
        setError('Location permission is required');
        return false;
      }

      // Get initial location
      await updateLocationNow();

      // Set up periodic updates
      trackingIntervalRef.current = setInterval(updateLocationNow, LOCATION_UPDATE_INTERVAL);

      // Set up continuous watching for more accurate tracking (optional)
      if (navigator.geolocation && options.enableContinuousWatch) {
        watchIdRef.current = navigator.geolocation.watchPosition(
          async (position) => {
            const location = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              timestamp: new Date()
            };

            if (location.accuracy <= accuracyThreshold) {
              setCurrentLocation(prev => {
                // Only update if location changed significantly (>50m)
                if (!prev ||
                    Math.abs(prev.latitude - location.latitude) > 0.0005 ||
                    Math.abs(prev.longitude - location.longitude) > 0.0005) {
                  return location;
                }
                return prev;
              });
            }
          },
          (error) => console.error('Watch position error:', error),
          { ...LOCATION_OPTIONS, enableHighAccuracy: false }
        );
      }

      // Notify server to start tracking
      try {
        await fetch('/api/user/location/history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'start_tracking' })
        });
      } catch (serverError) {
        console.error('Failed to notify server about tracking start:', serverError);
      }

      setIsTracking(true);
      setError(null);

      if (showNotifications) {
        toast.success('Location tracking started', {
          description: 'You\'ll receive relevant job suggestions every 30 minutes'
        });
      }

      return true;

    } catch (error) {
      console.error('Error starting location tracking:', error);
      setError(error.message);
      return false;
    }
  }, [checkPermission, updateLocationNow, accuracyThreshold, showNotifications, options.enableContinuousWatch]);

  // Stop location tracking
  const stopTracking = useCallback(async () => {
    try {
      // Clear intervals and watchers
      if (trackingIntervalRef.current) {
        clearInterval(trackingIntervalRef.current);
        trackingIntervalRef.current = null;
      }

      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }

      // Notify server to stop tracking
      try {
        await fetch('/api/user/location/history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'stop_tracking' })
        });
      } catch (serverError) {
        console.error('Failed to notify server about tracking stop:', serverError);
      }

      setIsTracking(false);

      if (showNotifications) {
        toast.info('Location tracking stopped');
      }

    } catch (error) {
      console.error('Error stopping location tracking:', error);
    }
  }, [showNotifications]);

  // Initialize on mount
  useEffect(() => {
    if (session?.user?.id && autoStart) {
      fetchLocationData();

      // Auto-start tracking if user had it enabled before
      const savedPreference = localStorage.getItem('fixly_location_tracking');
      if (savedPreference === 'enabled') {
        startTracking();
      }
    }
  }, [session?.user?.id, autoStart, fetchLocationData, startTracking]);

  // Save tracking preference
  useEffect(() => {
    if (session?.user?.id) {
      localStorage.setItem('fixly_location_tracking', isTracking ? 'enabled' : 'disabled');
    }
  }, [isTracking, session?.user?.id]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (trackingIntervalRef.current) {
        clearInterval(trackingIntervalRef.current);
      }
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return {
    // State
    isTracking,
    currentLocation,
    locationHistory,
    jobSuggestions,
    lastUpdate,
    error,
    permissionStatus,

    // Actions
    startTracking,
    stopTracking,
    updateLocationNow,
    fetchLocationData,

    // Helpers
    canTrack: permissionStatus !== 'denied' && !!navigator.geolocation
  };
}