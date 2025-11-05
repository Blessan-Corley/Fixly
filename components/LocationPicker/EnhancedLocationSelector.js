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

  // Get device-specific location messages - clean and professional
  const getLocationMessage = useCallback((hasLocation = false) => {
    const device = getDeviceInfo();

    if (!hasLocation) {
      if (device.isDesktop) {
        return {
          type: 'info',
          message: 'Seems like you are using a laptop. Try maps for better accuracy.'
        };
      } else {
        return {
          type: 'info',
          message: 'Use map for precise location.'
        };
      }
    }

    // When location is detected
    if (device.isDesktop) {
      return {
        type: 'info',
        message: 'Seems like you are using a laptop. Try maps for better accuracy.'
      };
    } else {
      return {
        type: 'info',
        message: 'Use map for precise location.'
      };
    }
  }, [getDeviceInfo]);

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
    // Enhanced Google Maps availability check
    if (typeof window === 'undefined') {
      console.warn('SSR environment - skipping geocoding');
      return;
    }

    // Wait for Google Maps API to be fully loaded
    let retries = 0;
    const maxRetries = 10;
    while ((!window.google || !window.google.maps || !window.google.maps.Geocoder) && retries < maxRetries) {
      console.log(`⏳ Waiting for Google Maps API... (${retries + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, 500));
      retries++;
    }

    if (!window.google || !window.google.maps || !window.google.maps.Geocoder) {
      console.warn('❌ Google Maps API not available for geocoding after retries');
      // Create a basic location object without geocoding
      const basicLocation = {
        lat,
        lng,
        address: `Location at ${lat.toFixed(6)}, ${lng.toFixed(6)}`,
        formatted: `Location at ${lat.toFixed(6)}, ${lng.toFixed(6)}`,
        formatted_address: `Location at ${lat.toFixed(6)}, ${lng.toFixed(6)}`,
        // ✅ CRITICAL FIX: Flatten commonly used fields for easier access
        city: 'GPS Location',
        state: '',
        name: 'GPS Location',
        coordinates: { lat, lng },
        components: {},
        isInIndia: isLocationInIndia(lat, lng)
      };
      setSelectedLocation(basicLocation);
      // ✅ CRITICAL FIX: Don't call onLocationSelect here - wait for user to confirm
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
          // ✅ CRITICAL FIX: Don't call onLocationSelect here - wait for user to confirm
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

      const components = parseAddressComponents(response.address_components);
      const location = {
        lat,
        lng,
        address: response.formatted_address,
        formatted: response.formatted_address,
        formatted_address: response.formatted_address,
        // ✅ CRITICAL FIX: Flatten commonly used fields for easier access
        // Use formatted address as fallback if city is not available
        city: components.city || response.formatted_address.split(',')[0] || '',
        state: components.state || '',
        name: components.city || response.formatted_address.split(',')[0] || 'Selected Location',
        coordinates: {
          lat,
          lng
        },
        components: components,
        isInIndia: isLocationInIndia(lat, lng, components)
      };

      // Validate if location is in India
      if (!location.isInIndia) {
        toast.error('Fixly is currently available only in India. Please select a location within India.', {
          duration: 4000,
        });
        setError('Location outside India selected. Please choose a location within India.');
        return;
      }

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
      // ✅ CRITICAL FIX: Don't call onLocationSelect here - wait for user to confirm
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
      // ✅ CRITICAL FIX: Handle multiple city-level address types
      if (types.includes('locality')) result.city = component.long_name;
      if (types.includes('sublocality') && !result.city) result.city = component.long_name;
      if (types.includes('administrative_area_level_2') && !result.city) result.city = component.long_name;
      if (types.includes('administrative_area_level_1')) result.state = component.long_name;
      if (types.includes('postal_code')) result.pincode = component.long_name;
      if (types.includes('country')) result.country = component.long_name;
      if (types.includes('country')) result.countryCode = component.short_name;
    });
    return result;
  };

  // Check if location is within India borders
  const isLocationInIndia = useCallback((lat, lng, addressComponents = null) => {
    // Rough India bounding box check (more accurate than exact polygon for performance)
    const indiaBounds = {
      north: 37.6,    // Kashmir
      south: 6.4,     // Kanyakumari
      east: 97.25,    // Arunachal Pradesh
      west: 68.7      // Gujarat
    };

    const isInBounds = lat >= indiaBounds.south && lat <= indiaBounds.north &&
                       lng >= indiaBounds.west && lng <= indiaBounds.east;

    // If address components are available, also check country
    let isIndiaByAddress = true;
    if (addressComponents && addressComponents.countryCode) {
      isIndiaByAddress = addressComponents.countryCode === 'IN';
    }

    return isInBounds && isIndiaByAddress;
  }, []);

  // Initialize Google Maps autocomplete for address search
  const initializeAutocomplete = useCallback(async () => {
    // SSR safety and duplicate check
    if (typeof window === 'undefined' || !autocompleteRef.current) {
      return;
    }

    // Wait for Google Maps Places API to be fully loaded
    let placesRetries = 0;
    const maxPlacesRetries = 10;
    while ((!window.google || !window.google.maps || !window.google.maps.places) && placesRetries < maxPlacesRetries) {
      console.log(`⏳ Waiting for Google Maps Places API... (${placesRetries + 1}/${maxPlacesRetries})`);
      await new Promise(resolve => setTimeout(resolve, 500));
      placesRetries++;
    }

    if (!window.google || !window.google.maps || !window.google.maps.places) {
      console.warn('❌ Google Maps Places API not available for autocomplete');
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
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        const components = parseAddressComponents(place.address_components);

        const location = {
          lat,
          lng,
          address: place.formatted_address,
          formatted: place.formatted_address,
          formatted_address: place.formatted_address,
          // ✅ CRITICAL FIX: Flatten commonly used fields for easier access
          // Use formatted address as fallback if city is not available
          city: components.city || place.formatted_address.split(',')[0] || '',
          state: components.state || '',
          name: components.city || place.formatted_address.split(',')[0] || 'Selected Location',
          coordinates: {
            lat,
            lng
          },
          components: components,
          isInIndia: isLocationInIndia(lat, lng, components)
        };

        // Validate if location is in India
        if (!location.isInIndia) {
          toast.error('Fixly is currently available only in India. Please select a location within India.', {
            duration: 4000,
          });
          setError('Address outside India selected. Please choose a location within India.');
          // Clear the input
          if (autocompleteRef.current) {
            autocompleteRef.current.value = '';
          }
          return;
        }

        setSelectedLocation(location);
        onLocationSelect(location);
        setCurrentStep('initial');
        setError(''); // Clear any previous errors
        toast.success('Address selected successfully');
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
  const initializeMap = useCallback(async () => {
    // SSR safety check
    if (typeof window === 'undefined' || !mapRef.current) {
      return;
    }

    // Wait for Google Maps API to be fully loaded
    let mapRetries = 0;
    const maxMapRetries = 10;
    while ((!window.google || !window.google.maps) && mapRetries < maxMapRetries) {
      console.log(`⏳ Waiting for Google Maps API for map initialization... (${mapRetries + 1}/${maxMapRetries})`);
      await new Promise(resolve => setTimeout(resolve, 500));
      mapRetries++;
    }

    if (!window.google || !window.google.maps) {
      console.warn('❌ Google Maps API not available for map initialization');
      return;
    }

    // Smart center selection: GPS > Previous selection > India center (only when no location exists)
    let mapCenter;
    if (gpsLocation) {
      mapCenter = { lat: gpsLocation.lat, lng: gpsLocation.lng };
    } else if (selectedLocation && selectedLocation.coordinates) {
      mapCenter = { lat: selectedLocation.coordinates.lat, lng: selectedLocation.coordinates.lng };
    } else if (selectedLocation && selectedLocation.lat && selectedLocation.lng) {
      mapCenter = { lat: selectedLocation.lat, lng: selectedLocation.lng };
    } else {
      mapCenter = { lat: 20.5937, lng: 78.9629 }; // India center as fallback
    }
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
      mapId: 'FIXLY_MAP', // Required for AdvancedMarkerElement
      styles: [
        {
          featureType: 'poi',
          elementType: 'labels',
          stylers: [{ visibility: 'off' }]
        }
      ]
    });

    // Create draggable marker with proper error handling
    let marker;

    // Wait for marker library to be fully loaded
    let markerRetries = 0;
    const maxMarkerRetries = 5;
    while (!window.google?.maps?.marker?.AdvancedMarkerElement && markerRetries < maxMarkerRetries) {
      console.log(`⏳ Waiting for Google Maps marker library... (${markerRetries + 1}/${maxMarkerRetries})`);
      await new Promise(resolve => setTimeout(resolve, 200));
      markerRetries++;
    }

    try {
      // Try to use the new AdvancedMarkerElement API if available
      if (window.google?.maps?.marker?.AdvancedMarkerElement) {
        console.log('✅ Using AdvancedMarkerElement');

        const markerElement = document.createElement('div');
        markerElement.style.width = '40px';
        markerElement.style.height = '40px';
        markerElement.style.backgroundImage = 'url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8IS0tIFdoaXRlIG91dGxpbmUgZm9yIGNvbnRyYXN0IC0tPgogIDxwYXRoIGQ9Ik0yMCAzQzE0LjQ4IDMgMTAgNy40OCAxMCAxM0MxMCAyMi4xNyAyMCAzNyAyMCAzN0MyMCAzNyAzMCAyMi4xNyAzMCAxM0MzMCA3LjQ4IDI1LjUyIDMgMjAgM1oiIGZpbGw9IndoaXRlIiBzdHJva2U9IiMwMDAiIHN0cm9rZS13aWR0aD0iMS41Ii8+CiAgPCEtLSBSZWQgZmlsbCAtLT4KICA8cGF0aCBkPSJNMjAgNEMxNS4wMyA0IDExIDguMDMgMTEgMTNDMTEgMjEuNTQgMjAgMzUgMjAgMzVDMjAgMzUgMjkgMjEuNTQgMjkgMTNDMjkgOC4wMyAyNC45NyA0IDIwIDRaIiBmaWxsPSIjRUYzNDQ0Ii8+CiAgPCEtLSBXaGl0ZSBjZW50ZXIgY2lyY2xlIC0tPgogIDxjaXJjbGUgY3g9IjIwIiBjeT0iMTMiIHI9IjQiIGZpbGw9IndoaXRlIi8+Cjwvc3ZnPgo=)';
        markerElement.style.backgroundSize = 'contain';
        markerElement.style.backgroundRepeat = 'no-repeat';
        markerElement.style.cursor = 'pointer';
        markerElement.style.filter = 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))';
        markerElement.title = 'Drag to select location';

        marker = new window.google.maps.marker.AdvancedMarkerElement({
          map: map,
          position: mapCenter,
          content: markerElement,
          gmpDraggable: true
        });
      } else {
        console.log('⚠️ AdvancedMarkerElement not available, using legacy Marker');
        // Fallback to legacy Marker for older API versions
        marker = new window.google.maps.Marker({
          position: mapCenter,
          map: map,
          draggable: true,
          title: 'Drag to select location',
          animation: hasSpecificLocation ? window.google.maps.Animation.DROP : null,
          icon: {
            url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8IS0tIFdoaXRlIG91dGxpbmUgZm9yIGNvbnRyYXN0IC0tPgogIDxwYXRoIGQ9Ik0yMCAzQzE0LjQ4IDMgMTAgNy40OCAxMCAxM0MxMCAyMi4xNyAyMCAzNyAyMCAzN0MyMCAzNyAzMCAyMi4xNyAzMCAxM0MzMCA3LjQ4IDI1LjUyIDMgMjAgM1oiIGZpbGw9IndoaXRlIiBzdHJva2U9IiMwMDAiIHN0cm9rZS13aWR0aD0iMS41Ii8+CiAgPCEtLSBSZWQgZmlsbCAtLT4KICA8cGF0aCBkPSJNMjAgNEMxNS4wMyA0IDExIDguMDMgMTEgMTNDMTEgMjEuNTQgMjAgMzUgMjAgMzVDMjAgMzUgMjkgMjEuNTQgMjkgMTNDMjkgOC4wMyAyNC45NyA0IDIwIDRaIiBmaWxsPSIjRUYzNDQ0Ii8+CiAgPCEtLSBXaGl0ZSBjZW50ZXIgY2lyY2xlIC0tPgogIDxjaXJjbGUgY3g9IjIwIiBjeT0iMTMiIHI9IjQiIGZpbGw9IndoaXRlIi8+Cjwvc3ZnPgo=',
            scaledSize: new window.google.maps.Size(40, 40),
            anchor: new window.google.maps.Point(20, 35)
          }
        });
      }
    } catch (error) {
      console.warn('❌ Error creating AdvancedMarkerElement, using legacy Marker:', error);
      // Fallback to legacy Marker
      marker = new window.google.maps.Marker({
        position: mapCenter,
        map: map,
        draggable: true,
        title: 'Drag to select location',
        animation: hasSpecificLocation ? window.google.maps.Animation.DROP : null
      });
    }

    markerRef.current = marker;

    // Update location on marker drag with visual feedback
    if (marker.gmpDraggable !== undefined) {
      // AdvancedMarkerElement events
      marker.addListener('dragstart', () => {
        // Visual feedback when dragging starts for AdvancedMarker
        console.log('AdvancedMarker drag started');
      });

      marker.addListener('dragend', async () => {
        const position = marker.position;
        const lat = position.lat;
        const lng = position.lng;

        await reverseGeocode(lat, lng);
        // Don't show toast for drag updates, too chatty
      });
    } else {
      // Legacy Marker events
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
    }

    // Allow clicking on map to move marker
    map.addListener('click', async (event) => {
      const lat = event.latLng.lat();
      const lng = event.latLng.lng();

      // Move marker with animation based on marker type
      if (marker.gmpDraggable !== undefined) {
        // AdvancedMarkerElement
        marker.position = { lat, lng };
      } else {
        // Legacy Marker
        marker.setPosition({ lat, lng });
        marker.setAnimation(window.google.maps.Animation.DROP);
        setTimeout(() => marker.setAnimation(null), 750);
      }

      await reverseGeocode(lat, lng);
      // Don't show toast for click updates, too chatty
    });
  }, [gpsLocation, selectedLocation, accuracy, reverseGeocode]);

  // Confirm map selection
  const confirmMapSelection = useCallback(() => {
    if (selectedLocation) {
      onLocationSelect(selectedLocation); // ✅ CRITICAL FIX: Call parent callback on confirmation
      setShowMapModal(false);
      setCurrentStep('initial');
      toast.success('Location confirmed');
    }
  }, [selectedLocation, onLocationSelect]);

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

  // Load Google Maps API with proper async loading
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
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places,marker&loading=async`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      console.log('✅ Google Maps API loaded successfully');
    };

    script.onerror = () => {
      console.error('❌ Failed to load Google Maps API');
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

        {/* Error Message for locations outside India */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4"
          >
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="font-medium text-red-900 dark:text-red-100">Service Area Limitation</h4>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
                <div className="mt-3 p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
                  <p className="text-xs text-red-600 dark:text-red-400">
                    <strong>Why this restriction?</strong> Fixly currently provides services only within India to ensure quality service delivery and compliance with local regulations.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setError('')}
                className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}
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
                                   {selectedLocation.components.city}
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

                  {/* Device-specific guidance message */}
                  {(() => {
                    const locationMsg = getLocationMessage(false);
                    return (
                      <div className="mt-3 p-3 rounded-lg bg-gray-50 border border-gray-200 dark:bg-gray-800 dark:border-gray-700 max-w-md mx-auto">
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          {locationMsg.message}
                        </p>
                      </div>
                    );
                  })()}
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
                    {/* Simple device-appropriate message */}
                    {(() => {
                      const locationMsg = getLocationMessage(true);
                      return (
                        <div className="mt-3 p-3 rounded-lg bg-gray-50 border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
                          <p className="text-sm text-gray-700 dark:text-gray-300">
                            {locationMsg.message}
                          </p>
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
                  className="input-field input-field-with-icon"
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

                {/* Cancel Button - Top Right Corner */}
                <div className="absolute top-4 right-4">
                  <button
                    onClick={() => setShowMapModal(false)}
                    className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 transition-all hover:shadow-xl"
                    title="Cancel"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Confirm Button - Bottom Right Corner */}
                <div className="absolute bottom-4 right-4">
                  <button
                    onClick={confirmMapSelection}
                    disabled={!selectedLocation}
                    className="bg-fixly-primary hover:bg-fixly-primary-hover disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg shadow-lg transition-all hover:shadow-xl flex items-center space-x-2 font-medium"
                    title="Confirm Location"
                  >
                    <CheckCircle className="h-5 w-5" />
                    <span>Confirm Location</span>
                  </button>
                </div>

              </div>

              {/* Selected Address Display - Enhanced with Fixly branding */}
              {selectedLocation && (
                <div className="p-4 bg-fixly-bg dark:bg-gray-800 border-t border-fixly-border dark:border-gray-700">
                  <div className="flex items-start space-x-3">
                    <div className="bg-fixly-primary/10 dark:bg-fixly-primary/20 p-2 rounded-lg">
                      <MapPin className="h-5 w-5 text-fixly-primary" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-fixly-text dark:text-white flex items-center">
                        <span>Selected Location</span>
                      </h4>
                      <p className="text-sm text-fixly-text-muted dark:text-gray-300 mt-1 font-medium">
                        {selectedLocation.address}
                      </p>
                      {selectedLocation.components && selectedLocation.components.city && (
                        <div className="flex items-center mt-2 text-xs text-fixly-text-muted dark:text-gray-400">
                          <div className="w-2 h-2 bg-fixly-primary rounded-full mr-2"></div>
                          {selectedLocation.components.city}
                          {selectedLocation.components.state && `, ${selectedLocation.components.state}`}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </LocationPickerErrorBoundary>
  );
};

export default EnhancedLocationSelector;