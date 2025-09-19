'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin,
  Crosshair,
  Search,
  Navigation,
  Loader,
  CheckCircle,
  AlertCircle,
  Target,
  Map,
  Edit3,
  X,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

const EnhancedLocationPicker = ({
  onLocationSelect,
  initialLocation = null,
  allowGPS = true,
  allowManualEntry = true,
  showSearchBox = true,
  restrictToIndia = true,
  className = "",
  disabled = false
}) => {
  // State management
  const [map, setMap] = useState(null);
  const [marker, setMarker] = useState(null);
  const [autocomplete, setAutocomplete] = useState(null);
  const [placesService, setPlacesService] = useState(null);

  // Location state
  const [selectedLocation, setSelectedLocation] = useState(initialLocation);
  const [isDetectingGPS, setIsDetectingGPS] = useState(false);
  const [gpsPermissionGranted, setGpsPermissionGranted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [error, setError] = useState('');

  // Refs
  const mapRef = useRef(null);
  const searchInputRef = useRef(null);

  // India bounds for map restriction
  const INDIA_BOUNDS = {
    north: 37.6,
    south: 6.4,
    west: 68.1,
    east: 97.4
  };

  // Default center (India)
  const DEFAULT_CENTER = { lat: 20.5937, lng: 78.9629 };

  // Load Google Maps script
  const loadGoogleMaps = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (window.google && window.google.maps) {
        resolve(window.google);
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places,geometry&region=IN&language=en`;
      script.async = true;
      script.defer = true;

      script.onload = () => {
        if (window.google && window.google.maps) {
          resolve(window.google);
        } else {
          reject(new Error('Google Maps failed to load'));
        }
      };

      script.onerror = () => {
        reject(new Error('Failed to load Google Maps script'));
      };

      document.head.appendChild(script);
    });
  }, []);

  // Initialize map
  const initializeMap = useCallback(async () => {
    try {
      await loadGoogleMaps();

      if (!mapRef.current) return;

      const mapOptions = {
        center: selectedLocation?.coordinates || DEFAULT_CENTER,
        zoom: selectedLocation ? 16 : 6,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        zoomControl: true,
        gestureHandling: 'cooperative',
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
          }
        ]
      };

      if (restrictToIndia) {
        mapOptions.restriction = {
          latLngBounds: INDIA_BOUNDS,
          strictBounds: false
        };
      }

      const googleMap = new window.google.maps.Map(mapRef.current, mapOptions);
      setMap(googleMap);

      // Initialize marker
      const mapMarker = new window.google.maps.Marker({
        position: selectedLocation?.coordinates || DEFAULT_CENTER,
        map: googleMap,
        draggable: true,
        title: 'Drag to set your location',
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="20" cy="20" r="18" fill="#FF6B35" stroke="white" stroke-width="4"/>
              <circle cx="20" cy="20" r="8" fill="white"/>
            </svg>
          `),
          scaledSize: new window.google.maps.Size(40, 40),
          anchor: new window.google.maps.Point(20, 20)
        }
      });

      setMarker(mapMarker);

      // Initialize Places service
      const service = new window.google.maps.places.PlacesService(googleMap);
      setPlacesService(service);

      // Initialize Autocomplete for search
      if (searchInputRef.current) {
        const autoComplete = new window.google.maps.places.Autocomplete(
          searchInputRef.current,
          {
            componentRestrictions: restrictToIndia ? { country: 'IN' } : {},
            fields: ['place_id', 'geometry', 'name', 'formatted_address', 'address_components'],
            types: ['establishment', 'geocode']
          }
        );

        setAutocomplete(autoComplete);

        autoComplete.addListener('place_changed', () => {
          const place = autoComplete.getPlace();
          if (place.geometry) {
            handlePlaceSelect(place);
          }
        });
      }

      // Add marker drag listener
      mapMarker.addListener('dragend', (event) => {
        const newPosition = {
          lat: event.latLng.lat(),
          lng: event.latLng.lng()
        };
        handleLocationChange(newPosition, 'manual');
      });

      // Add map click listener
      googleMap.addListener('click', (event) => {
        const newPosition = {
          lat: event.latLng.lat(),
          lng: event.latLng.lng()
        };
        mapMarker.setPosition(newPosition);
        handleLocationChange(newPosition, 'manual');
      });

      setIsMapLoaded(true);

    } catch (error) {
      console.error('Failed to initialize map:', error);
      setError('Failed to load map. Please check your internet connection.');
    }
  }, [selectedLocation, restrictToIndia, loadGoogleMaps]);

  // Handle place selection from autocomplete
  const handlePlaceSelect = useCallback((place) => {
    if (!place.geometry || !map || !marker) return;

    const location = {
      lat: place.geometry.location.lat(),
      lng: place.geometry.location.lng()
    };

    // Update map and marker
    map.setCenter(location);
    map.setZoom(16);
    marker.setPosition(location);

    // Parse address components
    const addressData = parseAddressComponents(place);

    const locationData = {
      coordinates: location,
      formatted: place.formatted_address,
      source: 'search',
      ...addressData
    };

    setSelectedLocation(locationData);
    setSearchQuery(place.formatted_address);
    setShowSuggestions(false);

    if (onLocationSelect) {
      onLocationSelect(locationData);
    }

    toast.success('Location selected from search');
  }, [map, marker, onLocationSelect]);

  // Handle location change (from drag or click)
  const handleLocationChange = useCallback(async (coordinates, source = 'manual') => {
    try {
      // Reverse geocode to get address
      const geocoder = new window.google.maps.Geocoder();
      const result = await new Promise((resolve, reject) => {
        geocoder.geocode(
          { location: coordinates },
          (results, status) => {
            if (status === 'OK' && results[0]) {
              resolve(results[0]);
            } else {
              reject(new Error('Geocoding failed'));
            }
          }
        );
      });

      const addressData = parseAddressComponents(result);
      const locationData = {
        coordinates,
        formatted: result.formatted_address,
        source,
        ...addressData
      };

      setSelectedLocation(locationData);
      setSearchQuery(result.formatted_address);

      if (onLocationSelect) {
        onLocationSelect(locationData);
      }

    } catch (error) {
      console.error('Reverse geocoding failed:', error);

      // Still save coordinates even if reverse geocoding fails
      const locationData = {
        coordinates,
        formatted: `${coordinates.lat.toFixed(6)}, ${coordinates.lng.toFixed(6)}`,
        source,
        doorNo: '',
        street: '',
        district: '',
        state: '',
        postalCode: ''
      };

      setSelectedLocation(locationData);

      if (onLocationSelect) {
        onLocationSelect(locationData);
      }
    }
  }, [onLocationSelect]);

  // Parse Google Places address components
  const parseAddressComponents = (result) => {
    const components = result.address_components || [];
    const addressData = {
      doorNo: '',
      street: '',
      district: '',
      state: '',
      postalCode: ''
    };

    components.forEach(component => {
      const types = component.types;

      if (types.includes('street_number')) {
        addressData.doorNo = component.long_name;
      } else if (types.includes('route')) {
        addressData.street = component.long_name;
      } else if (types.includes('sublocality') || types.includes('locality')) {
        if (!addressData.district) {
          addressData.district = component.long_name;
        }
      } else if (types.includes('administrative_area_level_2')) {
        addressData.district = component.long_name;
      } else if (types.includes('administrative_area_level_1')) {
        addressData.state = component.long_name;
      } else if (types.includes('postal_code')) {
        addressData.postalCode = component.long_name;
      }
    });

    return addressData;
  };

  // Get current GPS location
  const getCurrentGPSLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by this browser');
      return;
    }

    setIsDetectingGPS(true);
    setError('');

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000
    };

    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, options);
      });

      const { latitude, longitude, accuracy } = position.coords;
      const coordinates = { lat: latitude, lng: longitude };

      // Check if location is within India bounds (if restricted)
      if (restrictToIndia) {
        const isInIndia =
          latitude >= INDIA_BOUNDS.south && latitude <= INDIA_BOUNDS.north &&
          longitude >= INDIA_BOUNDS.west && longitude <= INDIA_BOUNDS.east;

        if (!isInIndia) {
          throw new Error('Your location appears to be outside India. Please select a location manually.');
        }
      }

      // Update map
      if (map && marker) {
        map.setCenter(coordinates);
        map.setZoom(16);
        marker.setPosition(coordinates);
      }

      setGpsPermissionGranted(true);
      await handleLocationChange({ ...coordinates, accuracy }, 'gps');
      toast.success('Location detected successfully!');

    } catch (error) {
      console.error('GPS location error:', error);

      let errorMessage = 'Failed to get your location';
      if (error.code) {
        switch (error.code) {
          case 1:
            errorMessage = 'Location access denied. Please enable location permissions.';
            break;
          case 2:
            errorMessage = 'Location information unavailable.';
            break;
          case 3:
            errorMessage = 'Location request timed out.';
            break;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }

      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsDetectingGPS(false);
    }
  }, [map, marker, restrictToIndia, handleLocationChange]);

  // Search for places
  const searchPlaces = useCallback(async (query) => {
    if (!placesService || !query.trim()) {
      setSearchSuggestions([]);
      return;
    }

    const request = {
      query,
      fields: ['place_id', 'name', 'geometry', 'formatted_address', 'address_components'],
      locationBias: map ? map.getCenter() : DEFAULT_CENTER
    };

    if (restrictToIndia) {
      request.region = 'IN';
    }

    try {
      const results = await new Promise((resolve, reject) => {
        placesService.textSearch(request, (results, status) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK) {
            resolve(results.slice(0, 5)); // Limit to 5 suggestions
          } else {
            resolve([]);
          }
        });
      });

      setSearchSuggestions(results);
    } catch (error) {
      console.error('Places search error:', error);
      setSearchSuggestions([]);
    }
  }, [placesService, map, restrictToIndia]);

  // Handle search input change
  const handleSearchChange = (value) => {
    setSearchQuery(value);
    if (value.length > 2) {
      searchPlaces(value);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
      setSearchSuggestions([]);
    }
  };

  // Initialize map on component mount
  useEffect(() => {
    initializeMap();
  }, [initializeMap]);

  return (
    <div className={`enhanced-location-picker ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-fixly-text flex items-center">
            <MapPin className="h-5 w-5 mr-2 text-fixly-accent" />
            Select Your Location
          </h3>
          <p className="text-sm text-fixly-text-light">
            Use GPS, search, or drag the marker to set your precise location
          </p>
        </div>

        {allowGPS && (
          <button
            onClick={getCurrentGPSLocation}
            disabled={isDetectingGPS || disabled}
            className="btn-primary flex items-center space-x-2"
          >
            {isDetectingGPS ? (
              <Loader className="h-4 w-4 animate-spin" />
            ) : gpsPermissionGranted ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <Crosshair className="h-4 w-4" />
            )}
            <span>
              {isDetectingGPS
                ? 'Detecting...'
                : gpsPermissionGranted
                ? 'GPS Active'
                : 'Use GPS'
              }
            </span>
          </button>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg mb-4"
        >
          <AlertCircle className="h-4 w-4 text-red-500" />
          <span className="text-sm text-red-700">{error}</span>
          <button
            onClick={() => setError('')}
            className="ml-auto text-red-500 hover:text-red-700"
          >
            <X className="h-4 w-4" />
          </button>
        </motion.div>
      )}

      {/* GPS Status */}
      {gpsPermissionGranted && selectedLocation?.source === 'gps' && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center space-x-2 p-3 bg-green-50 border border-green-200 rounded-lg mb-4"
        >
          <Navigation className="h-4 w-4 text-green-600" />
          <div className="flex-1">
            <div className="text-sm font-medium text-green-800">GPS Location Detected</div>
            <div className="text-xs text-green-600">
              Accuracy: ±{Math.round(selectedLocation.coordinates?.accuracy || 0)}m
            </div>
          </div>
        </motion.div>
      )}

      {/* Search Box */}
      {showSearchBox && (
        <div className="relative mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-fixly-text-muted" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search for a location..."
              disabled={disabled}
              className="input-field pl-10 pr-10"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setShowSuggestions(false);
                }}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-fixly-text-muted hover:text-fixly-text"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Search Suggestions */}
          <AnimatePresence>
            {showSuggestions && searchSuggestions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute z-10 w-full mt-1 bg-white border border-fixly-border rounded-lg shadow-lg max-h-60 overflow-y-auto"
              >
                {searchSuggestions.map((place, index) => (
                  <button
                    key={place.place_id}
                    onClick={() => handlePlaceSelect(place)}
                    className="w-full px-4 py-3 text-left hover:bg-fixly-accent/5 border-b border-fixly-border last:border-b-0 first:rounded-t-lg last:rounded-b-lg"
                  >
                    <div className="flex items-start space-x-2">
                      <MapPin className="h-4 w-4 text-fixly-accent mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-fixly-text truncate">
                          {place.name}
                        </div>
                        <div className="text-xs text-fixly-text-light truncate">
                          {place.formatted_address}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Map Container */}
      <div className="relative">
        <div
          ref={mapRef}
          className="w-full h-80 rounded-lg border border-fixly-border bg-fixly-bg"
        />

        {/* Map Loading Overlay */}
        {!isMapLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-fixly-bg rounded-lg">
            <div className="text-center">
              <Loader className="h-8 w-8 animate-spin text-fixly-accent mx-auto mb-2" />
              <p className="text-sm text-fixly-text-muted">Loading map...</p>
            </div>
          </div>
        )}

        {/* Map Instructions */}
        {isMapLoaded && (
          <div className="absolute bottom-2 left-2 right-2 bg-white/90 backdrop-blur-sm rounded-lg p-2 text-xs text-fixly-text-muted">
            <div className="flex items-center justify-center space-x-4">
              <span className="flex items-center">
                <Target className="h-3 w-3 mr-1" />
                Click to place marker
              </span>
              <span className="flex items-center">
                <Navigation className="h-3 w-3 mr-1" />
                Drag marker to adjust
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Selected Location Display */}
      {selectedLocation && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-4 bg-fixly-accent/5 border border-fixly-accent/20 rounded-lg"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="text-sm font-medium text-fixly-text mb-1">
                Selected Location
              </div>
              <div className="text-sm text-fixly-text-light">
                {selectedLocation.formatted}
              </div>
              <div className="text-xs text-fixly-text-muted mt-1">
                📍 {selectedLocation.coordinates?.lat.toFixed(6)}, {selectedLocation.coordinates?.lng.toFixed(6)}
                {selectedLocation.source && (
                  <span className="ml-2 px-1.5 py-0.5 bg-fixly-accent/10 text-fixly-accent rounded text-xs">
                    {selectedLocation.source === 'gps' ? 'GPS' : selectedLocation.source === 'search' ? 'Search' : 'Manual'}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={() => {
                setSelectedLocation(null);
                setSearchQuery('');
                if (marker) {
                  marker.setPosition(DEFAULT_CENTER);
                }
                if (map) {
                  map.setCenter(DEFAULT_CENTER);
                  map.setZoom(6);
                }
              }}
              className="text-fixly-text-muted hover:text-fixly-text"
            >
              <Edit3 className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default EnhancedLocationPicker;