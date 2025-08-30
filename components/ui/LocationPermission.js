'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MapPin, 
  X, 
  Settings, 
  AlertCircle, 
  CheckCircle,
  Loader,
  Navigation
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  getUserLocation, 
  checkLocationPermission, 
  saveUserLocation, 
  loadUserLocation, 
  clearUserLocation,
  saveLocationRejection,
  isLocationRejected,
  LOCATION_STORAGE_KEYS 
} from '../../utils/locationUtils';
import { locationManager } from '../../utils/locationManager';
import { 
  locationConsentManager, 
  ConsentTypes, 
  hasLocationConsent, 
  grantLocationConsent,
  revokeLocationConsent 
} from '../../utils/locationConsent';

export default function LocationPermission({ 
  onLocationUpdate, 
  showBanner = true, 
  className = '',
  autoRefresh = true,
  silent = false
}) {
  const [internalShowBanner, setInternalShowBanner] = useState(showBanner);
  const [locationState, setLocationState] = useState('unknown'); // unknown, requesting, granted, denied, error
  const [userLocation, setUserLocation] = useState(null);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [backgroundUpdating, setBackgroundUpdating] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);

  useEffect(() => {
    initializeLocationWithManager();
    
    // Set up location manager with comprehensive handling
    if (autoRefresh) {
      locationManager.initialize({
        autoStart: true,
        backgroundUpdates: true,
        watchLocation: false, // Don't watch continuously to save battery
        onUpdate: (location) => {
          setUserLocation(location);
          setLastUpdate(new Date());
          onLocationUpdate?.(location);
          if (!silent) {
            console.log('📍 Location updated in background:', location);
          }
        },
        onError: (error) => {
          console.debug('Background location error:', error);
          setError(error.message);
        }
      }).catch(error => {
        console.debug('Location manager initialization failed:', error);
      });
    }

    return () => {
      // Cleanup on unmount
      if (autoRefresh) {
        locationManager.destroy();
      }
    };
  }, [autoRefresh, silent]);

  // Background location refresh - silent and non-intrusive
  const backgroundLocationRefresh = async () => {
    if (locationState !== 'granted' || !userLocation) return;
    
    try {
      setBackgroundUpdating(true);
      
      // Check if location needs update via API
      const response = await fetch('/api/location/manage?silent=true');
      if (response.ok) {
        const data = await response.json();
        
        if (data.needsUpdate && data.hasLocation) {
          // Get fresh location silently
          const freshLocation = await getUserLocation();
          
          // Only update if location has changed significantly (>50 meters)
          if (userLocation && 
              Math.abs(freshLocation.lat - userLocation.lat) < 0.0005 && 
              Math.abs(freshLocation.lng - userLocation.lng) < 0.0005) {
            console.debug('Location unchanged, skipping update');
            return;
          }
          
          // Update in background without showing UI changes
          await fetch('/api/location/manage', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              lat: freshLocation.lat,
              lng: freshLocation.lng,
              accuracy: freshLocation.accuracy,
              source: 'background_gps',
              silent: true,
              backgroundUpdate: true
            })
          });
          
          // Update local state WITHOUT triggering onLocationUpdate to prevent page refreshes
          setUserLocation(freshLocation);
          setLastUpdate(new Date());
          // DO NOT call onLocationUpdate for background updates
          console.debug('Background location updated silently');
        }
      }
    } catch (error) {
      // Silent failure - don't show errors for background updates
      console.debug('Background location update failed:', error);
    } finally {
      setBackgroundUpdating(false);
    }
  };

  const initializeLocationWithManager = async () => {
    // Check for cached location first
    const cachedLocation = loadUserLocation();
    if (cachedLocation) {
      setUserLocation(cachedLocation);
      setLocationState('granted');
      setLastUpdate(new Date(cachedLocation.timestamp || Date.now()));
      onLocationUpdate?.(cachedLocation);
      
      // Check if location is stale and needs refresh (only if very stale)
      if (locationManager.isLocationStale(60)) { // 60 minutes - less frequent
        setTimeout(backgroundLocationRefresh, 5000); // Delay by 5 seconds
      }
      return;
    }

    // Check permission status using location manager
    const permission = await locationManager.getPermissionStatus();
    
    if (permission === 'granted') {
      // If permission is already granted, auto-request location silently
      try {
        const location = await locationManager.getCurrentLocation({ 
          silent: silent,
          maximumAge: 300000 // 5 minutes
        });
        
        setUserLocation(location);
        setLocationState('granted');
        setLastUpdate(new Date());
        
        // Save to local storage and server
        saveUserLocation(location);
        await locationManager.saveLocationToServer(location, {
          source: 'auto_gps',
          silent: silent
        });
        
        onLocationUpdate?.(location);
        
        if (!silent) {
          toast.success('Location automatically enabled for better job matching');
        }
      } catch (error) {
        console.debug('Auto location failed:', error);
        setLocationState('denied');
      }
    } else {
      setLocationState(permission === 'denied' ? 'denied' : 'unknown');
    }
  };

  const requestLocation = async () => {
    setLoading(true);
    setError('');
    setLocationState('requesting');

    try {
      // Use location manager for comprehensive location handling
      const location = await locationManager.getCurrentLocation({
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000, // 1 minute
        silent: false
      });
      
      setUserLocation(location);
      setLocationState('granted');
      setLastUpdate(new Date());
      
      // Save to localStorage
      saveUserLocation(location);
      
      // Save to server using location manager
      try {
        await locationManager.saveLocationToServer(location, {
          source: 'user_gps',
          consent: true,
          silent: false
        });
      } catch (apiError) {
        console.warn('API error saving location:', apiError);
        // Continue with local functionality even if API fails
        toast.warning('Location enabled locally. Server sync will retry automatically.');
      }
      
      // Notify parent component
      onLocationUpdate?.(location);
      
      toast.success('Location enabled! Showing jobs near you.');
      setShowPermissionModal(false);
      
      // Start background updates if autoRefresh is enabled (less frequent)
      if (autoRefresh) {
        setTimeout(() => {
          locationManager.startBackgroundUpdates(30); // 30 minutes instead of 10
        }, 30000); // Wait 30 seconds before starting
      }
      
    } catch (error) {
      console.error('Location error:', error);
      
      // Use location manager's error handling
      setError(error.message);
      setLocationState('denied');
      
      // Save rejection state to localStorage
      saveLocationRejection();
      
      // Location manager already shows appropriate toast messages
      
    } finally {
      setLoading(false);
    }
  };

  const disableLocation = async () => {
    setUserLocation(null);
    setLocationState('denied');
    clearUserLocation();
    
    // Clear from MongoDB via API
    try {
      await fetch('/api/location', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      console.log('Location cleared from MongoDB');
    } catch (apiError) {
      console.warn('API error clearing location:', apiError);
    }
    
    onLocationUpdate?.(null);
    setShowPermissionModal(false);
    toast.info('Location disabled. Showing all jobs.');
  };

  const LocationBanner = () => {
    if (!internalShowBanner || locationState === 'granted') return null;

    const wasRejected = isLocationRejected();
    const bannerColor = wasRejected ? 'from-amber-50 to-orange-50' : 'from-blue-50 to-indigo-50';
    const borderColor = wasRejected ? 'border-amber-200' : 'border-blue-200';
    const iconBg = wasRejected ? 'bg-amber-100' : 'bg-blue-100';
    const iconColor = wasRejected ? 'text-amber-600' : 'text-blue-600';
    const textColor = wasRejected ? 'text-amber-900' : 'text-blue-900';
    const descColor = wasRejected ? 'text-amber-700' : 'text-blue-700';

    return (
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`bg-gradient-to-r ${bannerColor} border ${borderColor} rounded-lg p-4 mb-6 shadow-sm`}
      >
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start">
            <div className={`w-10 h-10 ${iconBg} rounded-full flex items-center justify-center mr-3 flex-shrink-0`}>
              {wasRejected ? (
                <AlertCircle className={`h-5 w-5 ${iconColor}`} />
              ) : (
                <MapPin className={`h-5 w-5 ${iconColor}`} />
              )}
            </div>
            <div className="flex-1">
              <h4 className={`font-semibold ${textColor} mb-1 flex items-center`}>
                {wasRejected ? (
                  <>⚠️ Location access was denied</>
                ) : (
                  <>🎯 Find jobs near you</>
                )}
              </h4>
              <p className={`text-sm ${descColor} leading-relaxed`}>
                {wasRejected ? (
                  'Nearby job matching is disabled. Enable location to see jobs sorted by distance and get better matches.'
                ) : (
                  'Enable location to see jobs sorted by distance and discover opportunities nearby.'
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between sm:justify-end space-x-2 ml-auto">
            <button
              onClick={() => setShowPermissionModal(true)}
              className="btn-primary text-sm px-4 py-2 flex items-center whitespace-nowrap"
            >
              <Navigation className="h-3 w-3 mr-1" />
              <span className="hidden sm:inline">{wasRejected ? 'Try Again' : 'Enable Location'}</span>
              <span className="sm:hidden">{wasRejected ? 'Retry' : 'Enable'}</span>
            </button>
            <button
              onClick={() => setInternalShowBanner(false)}
              className="text-blue-400 hover:text-blue-600 p-1 rounded-full hover:bg-blue-100 transition-colors"
              aria-label="Close banner"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </motion.div>
    );
  };

  const LocationModal = () => (
    <AnimatePresence>
      {showPermissionModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setShowPermissionModal(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-xl p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-fixly-text mb-2">
                Enable Location Services
              </h3>
              <p className="text-fixly-text-muted">
                Get jobs sorted by distance and discover opportunities in your area
              </p>
            </div>

            {/* Benefits */}
            <div className="space-y-3 mb-6">
              <div className="flex items-center text-sm text-fixly-text">
                <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                See nearest jobs first
              </div>
              <div className="flex items-center text-sm text-fixly-text">
                <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                Filter by distance from your location
              </div>
              <div className="flex items-center text-sm text-fixly-text">
                <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                Reduce travel time to job sites
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <div className="flex items-start">
                  <AlertCircle className="h-4 w-4 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            )}

            {/* Privacy notice */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-6">
              <div className="flex items-start">
                <Settings className="h-4 w-4 text-gray-500 mr-2 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-gray-600">
                  <p className="font-medium mb-1">Privacy Notice</p>
                  <p>Your location is only stored locally on your device and used to calculate distances. It's not shared with other users or stored on our servers.</p>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={disableLocation}
                className="btn-ghost flex-1"
              >
                Maybe Later
              </button>
              <button
                onClick={requestLocation}
                disabled={loading}
                className="btn-primary flex-1 flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <Loader className="animate-spin h-4 w-4 mr-2" />
                    Getting Location...
                  </>
                ) : (
                  <>
                    <MapPin className="h-4 w-4 mr-2" />
                    Enable Location
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <div className={className}>
      <LocationBanner />
      <LocationModal />
      
      {/* Location status indicator (for debugging) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 left-4 bg-black text-white text-xs px-2 py-1 rounded">
          Location: {locationState} {userLocation && `(${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)})`}
        </div>
      )}
    </div>
  );
}