'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import LocationPickerErrorBoundary from './LocationPickerErrorBoundary';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin,
  Target,
  Map,
  AlertTriangle,
  CheckCircle,
  X,
  Search,
  Loader2,
  Navigation,
  Edit3,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

const EnhancedLocationSelector = ({
  onLocationSelect,
  initialLocation = null,
  showLabel = true,
  required = false,
  className = ''
}) => {
  // Core state
  const [currentStep, setCurrentStep] = useState('initial'); // initial, gps-detecting, gps-success, gps-failed, map-selection, address-search
  const [gpsLocation, setGpsLocation] = useState(null);
  const [accuracy, setAccuracy] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(initialLocation);
  const [isLoading, setIsLoading] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  // Address input is handled by Google Autocomplete, no state needed
  const [suggestions, setSuggestions] = useState([]);
  const [error, setError] = useState('');

  // Map refs
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const autocompleteRef = useRef(null);
  const googleMapsLoaded = useRef(false);
  const autocompleteInstance = useRef(null);

  // Handle initial location prop
  useEffect(() => {
    if (initialLocation && (!selectedLocation || JSON.stringify(initialLocation) !== JSON.stringify(selectedLocation))) {
      setSelectedLocation(initialLocation);
    }
  }, [initialLocation, selectedLocation]);

  // Enhanced device detection
  const getDeviceInfo = useCallback(() => {
    const userAgent = navigator.userAgent;
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    const isTablet = /iPad|Android.*Tablet|Surface/i.test(userAgent);
    const isDesktop = !isMobile && !isTablet;

    return {
      type: isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop',
      isMobile,
      isTablet,
      isDesktop,
      hasGoodGPS: isMobile, // Mobile devices typically have better GPS
      userAgent
    };
  }, []);

  // Check if location is accurate based on device type
  const isLocationAccurate = useCallback((acc) => {
    const device = getDeviceInfo();
    const threshold = device.isMobile ? 1000 : 5000; // 1km for mobile, 5km for desktop
    return acc && acc <= threshold;
  }, [getDeviceInfo]);

  // Format accuracy for display
  const formatAccuracy = useCallback((acc) => {
    if (!acc) return 'Unknown';
    if (acc < 1000) return `${Math.round(acc)}m`;
    return `${(acc / 1000).toFixed(1)}km`;
  }, []);

  // Get device-specific location messages
  const getLocationMessage = useCallback((accuracy, hasLocation = false) => {
    const device = getDeviceInfo();

    if (!hasLocation) {
      if (device.isDesktop) {
        return {
          type: 'info',
          icon: '💻',
          message: 'GPS on laptops/desktops may not be very accurate. Consider using map selection for precise location.',
          suggestion: 'Use map for better precision'
        };
      } else if (device.isTablet) {
        return {
          type: 'info',
          icon: '📱',
          message: 'Enable location services for better accuracy, or use map selection.',
          suggestion: 'Use map for precise location'
        };
      } else {
        return {
          type: 'info',
          icon: '📍',
          message: 'Enable location services for automatic detection, or search your address.',
          suggestion: 'Use GPS or search address'
        };
      }
    }

    // When location is detected
    if (accuracy) {
      if (device.isDesktop && accuracy > 1000) {
        return {
          type: 'warning',
          icon: '💻',
          message: `Location detected but accuracy is ${formatAccuracy(accuracy)}. Laptops use WiFi positioning which may not be precise.`,
          suggestion: 'Use map to pinpoint exact location'
        };
      } else if (device.isDesktop && accuracy <= 1000) {
        return {
          type: 'success',
          icon: '✅',
          message: `Good location accuracy (${formatAccuracy(accuracy)}) for a desktop device.`,
          suggestion: 'Use map for fine-tuning if needed'
        };
      } else if (device.isMobile && accuracy > 1000) {
        return {
          type: 'warning',
          icon: '📍',
          message: `Location detected with ${formatAccuracy(accuracy)} accuracy.`,
          suggestion: 'Use map for better precision'
        };
      } else {
        return {
          type: 'success',
          icon: '🎯',
          message: `Great! Location detected with ${formatAccuracy(accuracy)} accuracy.`,
          suggestion: 'Location looks good'
        };
      }
    }

    return {
      type: 'success',
      icon: '📍',
      message: 'Location detected successfully.',
      suggestion: 'Use map to verify if needed'
    };
  }, [getDeviceInfo, formatAccuracy]);

  // Get current location using GPS
  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser');
      setCurrentStep('gps-failed');
      return;
    }

    setIsLoading(true);
    setCurrentStep('gps-detecting');
    setError('');

    const options = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 60000
    };

    const successCallback = async (position) => {
      const { latitude, longitude, accuracy: acc } = position.coords;

      setGpsLocation({ lat: latitude, lng: longitude });
      setAccuracy(acc);
      setIsLoading(false);

      // Always try to get address via reverse geocoding
      await reverseGeocode(latitude, longitude);

      if (isLocationAccurate(acc)) {
        setCurrentStep('gps-success');
        // Only show success toast for good accuracy
      } else {
        setCurrentStep('gps-failed');
        // Only show warning for poor accuracy, don't spam with intermediate updates
      }
    };

    const errorCallback = (error) => {
      setIsLoading(false);
      setCurrentStep('gps-failed');

      let errorMessage = 'Failed to get location';
      switch (error.code) {
        case error.PERMISSION_DENIED:
          errorMessage = 'Location access denied. Please enable location permissions.';
          break;
        case error.POSITION_UNAVAILABLE:
          errorMessage = 'Location information unavailable. Try using map selection.';
          break;
        case error.TIMEOUT:
          errorMessage = 'Location request timed out. Try again or use map selection.';
          break;
      }

      setError(errorMessage);
      // Only show error toast for critical failures
    };

    navigator.geolocation.getCurrentPosition(successCallback, errorCallback, options);
  }, [isLocationAccurate, formatAccuracy]);

  // Reverse geocode coordinates to address with caching
  const reverseGeocode = useCallback(async (lat, lng) => {
    // SSR safety check
    if (typeof window === 'undefined' || !window.google || !window.google.maps) {
      console.warn('Google Maps not available for geocoding');
      return;
    }

    // Create cache key
    const cacheKey = `geocode_${lat.toFixed(5)}_${lng.toFixed(5)}`;

    try {
      // Check cache first (expires after 24 hours)
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        const isValid = Date.now() - timestamp < 24 * 60 * 60 * 1000; // 24 hours

        if (isValid) {
          console.log('Using cached geocoding result');
          setSelectedLocation(data);
          onLocationSelect(data);
          return;
        } else {
          localStorage.removeItem(cacheKey); // Remove expired cache
        }
      }

      const geocoder = new window.google.maps.Geocoder();
      const response = await new Promise((resolve, reject) => {
        geocoder.geocode(
          { location: { lat, lng } },
          (results, status) => {
            if (status === 'OK' && results[0]) {
              resolve(results[0]);
            } else {
              reject(new Error('Geocoding failed'));
            }
          }
        );
      });

      const location = {
        lat,
        lng,
        address: response.formatted_address,
        formatted: response.formatted_address,
        coordinates: {
          lat,
          lng
        },
        components: parseAddressComponents(response.address_components)
      };

      // Cache the result
      try {
        localStorage.setItem(cacheKey, JSON.stringify({
          data: location,
          timestamp: Date.now()
        }));
      } catch (e) {
        console.warn('Failed to cache geocoding result:', e);
      }

      setSelectedLocation(location);
      onLocationSelect(location);
    } catch (error) {
      console.error('Reverse geocoding failed:', error);
      // Don't show toast for geocoding failures, it's not critical
    }
  }, [onLocationSelect]);

  // Parse Google Maps address components
  const parseAddressComponents = (components) => {
    const result = {};
    components.forEach(component => {
      const types = component.types;
      if (types.includes('street_number')) result.streetNumber = component.long_name;
      if (types.includes('route')) result.street = component.long_name;
      if (types.includes('locality')) result.city = component.long_name;
      if (types.includes('administrative_area_level_1')) result.state = component.long_name;
      if (types.includes('postal_code')) result.pincode = component.long_name;
      if (types.includes('country')) result.country = component.long_name;
    });
    return result;
  };

  // Initialize Google Maps autocomplete for address search
  const initializeAutocomplete = useCallback(() => {
    // SSR safety and duplicate check
    if (typeof window === 'undefined' || !window.google || !window.google.maps || !window.google.maps.places || !autocompleteRef.current) {
      return;
    }

    // Clean up existing autocomplete
    if (autocompleteInstance.current) {
      window.google.maps.event.clearInstanceListeners(autocompleteInstance.current);
    }

    const autocomplete = new window.google.maps.places.Autocomplete(
      autocompleteRef.current,
      {
        componentRestrictions: { country: 'IN' },
        fields: ['formatted_address', 'geometry', 'address_components']
      }
    );

    autocompleteInstance.current = autocomplete;

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (place.geometry) {
        const location = {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
          address: place.formatted_address,
          formatted: place.formatted_address,
          coordinates: {
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng()
          },
          components: parseAddressComponents(place.address_components)
        };

        setSelectedLocation(location);
        onLocationSelect(location);
        setCurrentStep('initial');
        // Only show success toast for final selection
        toast.success('Address selected');
      }
    });
  }, [onLocationSelect]);

  // Open map selection modal
  const openMapModal = useCallback(() => {
    setShowMapModal(true);
    setTimeout(() => {
      initializeMap();
    }, 100);
  }, []);

  // Initialize Google Map in modal
  const initializeMap = useCallback(() => {
    // SSR safety check
    if (typeof window === 'undefined' || !window.google || !window.google.maps || !mapRef.current) {
      return;
    }

    // Smart center selection: GPS > Previous selection > India center (only when no location exists)
    const mapCenter = gpsLocation || selectedLocation || { lat: 20.5937, lng: 78.9629 };
    const hasSpecificLocation = !!(gpsLocation || selectedLocation);

    // Intelligent zoom based on context and device
    let zoomLevel;
    if (gpsLocation) {
      // GPS location - zoom in appropriately based on accuracy
      zoomLevel = accuracy && accuracy <= 100 ? 18 : accuracy <= 500 ? 16 : 14;
    } else if (selectedLocation) {
      // Previously selected location - good detail zoom
      zoomLevel = 15;
    } else {
      // No specific location - country/city level
      zoomLevel = window.innerWidth < 768 ? 5 : 6; // Mobile vs Desktop
    }

    const map = new window.google.maps.Map(mapRef.current, {
      center: mapCenter,
      zoom: zoomLevel,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      styles: [
        {
          featureType: 'poi',
          elementType: 'labels',
          stylers: [{ visibility: 'off' }]
        }
      ]
    });

    // Create draggable marker at the smart center position
    const marker = new window.google.maps.Marker({
      position: mapCenter,
      map: map,
      draggable: true,
      title: 'Drag to select location',
      animation: hasSpecificLocation ? window.google.maps.Animation.DROP : null
    });

    markerRef.current = marker;

    // Update location on marker drag with visual feedback
    marker.addListener('dragstart', () => {
      // Visual feedback when dragging starts
      marker.setAnimation(null);
    });

    marker.addListener('dragend', async () => {
      const position = marker.getPosition();
      const lat = position.lat();
      const lng = position.lng();

      // Add bounce animation to indicate processing
      marker.setAnimation(window.google.maps.Animation.BOUNCE);
      setTimeout(() => marker.setAnimation(null), 750);

      await reverseGeocode(lat, lng);
      // Don't show toast for drag updates, too chatty
    });

    // Allow clicking on map to move marker
    map.addListener('click', async (event) => {
      const lat = event.latLng.lat();
      const lng = event.latLng.lng();

      // Move marker with animation
      marker.setPosition({ lat, lng });
      marker.setAnimation(window.google.maps.Animation.DROP);
      setTimeout(() => marker.setAnimation(null), 750);

      await reverseGeocode(lat, lng);
      // Don't show toast for click updates, too chatty
    });
  }, [gpsLocation, selectedLocation, accuracy, reverseGeocode]);

  // Confirm map selection
  const confirmMapSelection = useCallback(() => {
    if (selectedLocation) {
      setShowMapModal(false);
      setCurrentStep('initial');
      toast.success('Location confirmed');
    }
  }, [selectedLocation]);

  // Reset to initial state
  const resetSelection = useCallback(() => {
    setCurrentStep('initial');
    setGpsLocation(null);
    setAccuracy(null);
    setSelectedLocation(null);
    setError('');
    // Clear autocomplete input if needed
    if (autocompleteRef.current) {
      autocompleteRef.current.value = '';
    }
    setSuggestions([]);
    onLocationSelect(null);
  }, [onLocationSelect]);

  // Load Google Maps API with proper checks
  const loadGoogleMapsAPI = useCallback(() => {
    // SSR safety check
    if (typeof window === 'undefined') return;

    // Check if already loaded or loading
    if (window.google || googleMapsLoaded.current || document.querySelector('#google-maps-script')) {
      return;
    }

    googleMapsLoaded.current = true;
    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;

    script.onerror = () => {
      console.error('Failed to load Google Maps API');
      googleMapsLoaded.current = false;
    };

    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    loadGoogleMapsAPI();

    // Cleanup function
    return () => {
      // Clean up autocomplete instance
      if (autocompleteInstance.current && typeof window !== 'undefined' && window.google) {
        window.google.maps.event.clearInstanceListeners(autocompleteInstance.current);
      }
    };
  }, [loadGoogleMapsAPI]);

  useEffect(() => {
    if (currentStep === 'address-search') {
      setTimeout(() => {
        initializeAutocomplete();
      }, 100);
    }
  }, [currentStep, initializeAutocomplete]);

  return (
    <LocationPickerErrorBoundary
      onFallbackMode={() => setCurrentStep('address-search')}
    >
      <div className={`space-y-4 ${className}`}>
      {/* Label */}
      {showLabel && (
        <label className="block text-sm font-medium text-fixly-text dark:text-gray-200 mb-2">
          Select Location {required && <span className="text-red-500">*</span>}
        </label>
      )}

      {/* Main Interface */}
      <div className="bg-white dark:bg-gray-900 border border-fixly-border dark:border-gray-700 rounded-xl p-6 space-y-4">
        {/* Current Step Display */}
        <AnimatePresence mode="wait">
          {currentStep === 'initial' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {selectedLocation ? (
                // Selected Location Display
                <div className="space-y-4">
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                        <div className="flex-1">
                          <h4 className="font-medium text-green-900 dark:text-green-100">Location Selected</h4>
                          <p className="text-sm text-green-700 dark:text-green-300 mt-1">{selectedLocation.address}</p>
                          {selectedLocation.components && (
                            <div className="mt-2 space-y-1">
                              {selectedLocation.components.city && (
                                <p className="text-xs text-green-600 dark:text-green-400">
                                  📍 {selectedLocation.components.city}
                                  {selectedLocation.components.state && `, ${selectedLocation.components.state}`}
                                  {selectedLocation.components.country && ` - ${selectedLocation.components.country}`}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={resetSelection}
                        className="text-green-600 hover:text-green-700 p-1"
                        title="Change location"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Confirm Location Button */}
                  <div className="flex items-center justify-center">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        if (selectedLocation) {
                          onLocationSelect(selectedLocation);
                          toast.success('Location confirmed!');
                        }
                      }}
                      className="btn-primary flex items-center space-x-2 px-8 py-3"
                    >
                      <CheckCircle className="h-5 w-5" />
                      <span>Confirm This Location</span>
                    </motion.button>
                  </div>
                </div>
              ) : (
                // Location Selection Options
                <div className="text-center space-y-4">
                  <div className="flex items-center justify-center w-16 h-16 bg-fixly-primary/10 rounded-full mx-auto">
                    <MapPin className="h-8 w-8 text-fixly-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-fixly-text dark:text-gray-200">Choose Your Location</h3>
                    <p className="text-sm text-fixly-text-muted mt-1">
                      Select how you'd like to set your location
                    </p>
                  </div>
                </div>
              )}

              {/* Action Buttons - Improved Desktop Layout */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl mx-auto">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={getCurrentLocation}
                  disabled={isLoading}
                  className="btn-primary flex items-center justify-center space-x-2 transform hover:-translate-y-0.5"
                >
                  <Target className="h-5 w-5" />
                  <span>Use GPS</span>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={openMapModal}
                  className="btn-secondary flex items-center justify-center space-x-2 transform hover:-translate-y-0.5"
                >
                  <Map className="h-5 w-5" />
                  <span>Select on Map</span>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setCurrentStep('address-search')}
                  className="btn-ghost flex items-center justify-center space-x-2 transform hover:-translate-y-0.5"
                >
                  <Search className="h-5 w-5" />
                  <span>Search Address</span>
                </motion.button>
              </div>
            </motion.div>
          )}

          {currentStep === 'gps-detecting' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-center py-8"
            >
              <div className="flex items-center justify-center w-16 h-16 bg-blue-50 rounded-full mx-auto mb-4">
                <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
              </div>
              <h3 className="text-lg font-semibold text-fixly-text">Detecting Your Location</h3>
              <p className="text-sm text-fixly-text-muted mt-1">
                Please allow location access when prompted
              </p>
              <button
                onClick={() => setCurrentStep('initial')}
                className="btn-ghost mt-4 text-sm"
              >
                Cancel
              </button>
            </motion.div>
          )}

          {currentStep === 'gps-success' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="text-center">
                <div className="flex items-center justify-center w-16 h-16 bg-green-50 dark:bg-green-900/20 rounded-full mx-auto mb-4">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-green-900 dark:text-green-100">Location Found!</h3>
                {selectedLocation && (
                  <div className="mt-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg max-w-md mx-auto">
                    <p className="text-sm text-green-800 dark:text-green-200 font-medium">
                      {selectedLocation.address}
                    </p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl mx-auto">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    if (selectedLocation) {
                      onLocationSelect(selectedLocation);
                    }
                    setCurrentStep('initial');
                    toast.success('Location confirmed!');
                  }}
                  className="btn-primary flex items-center justify-center space-x-2 transform hover:-translate-y-0.5"
                >
                  <CheckCircle className="h-5 w-5" />
                  <span>Confirm Location</span>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={openMapModal}
                  className="btn-secondary flex items-center justify-center space-x-2 transform hover:-translate-y-0.5"
                >
                  <Map className="h-5 w-5" />
                  <span>Use Maps</span>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={getCurrentLocation}
                  className="btn-ghost flex items-center justify-center space-x-2 transform hover:-translate-y-0.5"
                >
                  <RefreshCw className="h-5 w-5" />
                  <span>Retry GPS</span>
                </motion.button>
              </div>
            </motion.div>
          )}

          {currentStep === 'gps-failed' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Show as success if we have location, error only for actual failures */}
              {selectedLocation && selectedLocation.address ? (
                <>
                  <div className="text-center">
                    <div className="flex items-center justify-center w-16 h-16 bg-green-50 dark:bg-green-900/20 rounded-full mx-auto mb-4">
                      <CheckCircle className="h-8 w-8 text-green-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-green-900 dark:text-green-100">Location Found!</h3>
                    <div className="mt-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg max-w-md mx-auto">
                      <p className="text-sm text-green-800 dark:text-green-200 font-medium">
                        {selectedLocation.address}
                      </p>
                    </div>
                    {/* Device-specific location accuracy message */}
                    {(() => {
                      const locationMsg = getLocationMessage(accuracy, true);
                      return (
                        <div className={`mt-3 p-3 rounded-lg border ${
                          locationMsg.type === 'warning'
                            ? 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800'
                            : locationMsg.type === 'success'
                            ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
                            : 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800'
                        }`}>
                          <div className="flex items-start space-x-2">
                            <span className="text-lg">{locationMsg.icon}</span>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium ${
                                locationMsg.type === 'warning'
                                  ? 'text-amber-800 dark:text-amber-200'
                                  : locationMsg.type === 'success'
                                  ? 'text-green-800 dark:text-green-200'
                                  : 'text-blue-800 dark:text-blue-200'
                              }`}>
                                {locationMsg.message}
                              </p>
                              <p className={`text-xs mt-1 ${
                                locationMsg.type === 'warning'
                                  ? 'text-amber-600 dark:text-amber-300'
                                  : locationMsg.type === 'success'
                                  ? 'text-green-600 dark:text-green-300'
                                  : 'text-blue-600 dark:text-blue-300'
                              }`}>
                                💡 {locationMsg.suggestion}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl mx-auto">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        onLocationSelect(selectedLocation);
                        setCurrentStep('initial');
                        toast.success('Location confirmed!');
                      }}
                      className="btn-primary flex items-center justify-center space-x-2 transform hover:-translate-y-0.5"
                    >
                      <CheckCircle className="h-5 w-5" />
                      <span>Confirm Location</span>
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={openMapModal}
                      className="btn-secondary flex items-center justify-center space-x-2 transform hover:-translate-y-0.5"
                    >
                      <Map className="h-5 w-5" />
                      <span>Use Maps</span>
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={getCurrentLocation}
                      className="btn-ghost flex items-center justify-center space-x-2 transform hover:-translate-y-0.5"
                    >
                      <RefreshCw className="h-5 w-5" />
                      <span>Retry GPS</span>
                    </motion.button>
                  </div>
                </>
              ) : (
                /* Only show error state for actual GPS failures */
                <>
                  <div className="text-center py-6">
                    <div className="flex items-center justify-center w-16 h-16 bg-orange-50 rounded-full mx-auto mb-4">
                      <AlertTriangle className="h-8 w-8 text-orange-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-orange-900">Unable to get location</h3>
                    <p className="text-sm text-orange-700 mt-1 max-w-sm mx-auto">
                      {error || 'Please try again or use map selection.'}
                    </p>
                    <div className="flex items-center justify-center space-x-3 mt-4">
                      <button
                        onClick={getCurrentLocation}
                        className="btn-ghost text-sm flex items-center space-x-2"
                      >
                        <RefreshCw className="h-4 w-4" />
                        <span>Try Again</span>
                      </button>
                      <button
                        onClick={openMapModal}
                        className="btn-primary text-sm"
                      >
                        Use Map Instead
                      </button>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          )}

          {currentStep === 'address-search' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-fixly-text">Search Address</h3>
                <button
                  onClick={() => setCurrentStep('initial')}
                  className="text-fixly-text-muted hover:text-fixly-text"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="relative">
                <input
                  ref={autocompleteRef}
                  type="text"
                  placeholder="Type your address..."
                  className="input-field pl-10"
                  defaultValue=""
                  // onChange handled by Google Autocomplete
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-fixly-text-muted" />
              </div>

              <p className="text-sm text-fixly-text-muted">
                Start typing your address and select from suggestions
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Map Selection Modal */}
      <AnimatePresence>
        {showMapModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-fixly-border">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-fixly-primary/10 rounded-lg flex items-center justify-center">
                    <Map className="h-5 w-5 text-fixly-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-fixly-text">Select Location on Map</h3>
                    <p className="text-sm text-fixly-text-muted">Drag the marker or click to select your exact location</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowMapModal(false)}
                  className="text-fixly-text-muted hover:text-fixly-text p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Map Container */}
              <div className="relative">
                <div
                  ref={mapRef}
                  className="w-full h-[500px] bg-gray-100"
                />

                {/* Map Controls Overlay */}
                <div className="absolute top-4 left-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 max-w-xs">
                  <div className="flex items-center space-x-2 text-sm text-fixly-text-muted dark:text-gray-300">
                    <Navigation className="h-4 w-4" />
                    <span>Click or drag marker to select location</span>
                  </div>
                </div>

                {/* Floating Confirm Button */}
                {selectedLocation && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="absolute bottom-4 right-4"
                  >
                    <button
                      onClick={confirmMapSelection}
                      className="btn-primary flex items-center space-x-2 text-sm transform hover:-translate-y-1 shadow-lg hover:shadow-xl"
                    >
                      <CheckCircle className="h-5 w-5" />
                      <span>Confirm Location</span>
                    </button>
                  </motion.div>
                )}
              </div>

              {/* Selected Address Display */}
              {selectedLocation && (
                <div className="p-4 bg-gray-50 border-t border-fixly-border">
                  <div className="flex items-start space-x-3">
                    <MapPin className="h-5 w-5 text-fixly-primary mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-medium text-fixly-text">Selected Location</h4>
                      <p className="text-sm text-fixly-text-muted mt-1">{selectedLocation.address}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Modal Footer */}
              <div className="flex items-center justify-end space-x-3 p-6 border-t border-fixly-border">
                <button
                  onClick={() => setShowMapModal(false)}
                  className="btn-ghost"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmMapSelection}
                  disabled={!selectedLocation}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Confirm Location
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </LocationPickerErrorBoundary>
  );
};

export default EnhancedLocationSelector;