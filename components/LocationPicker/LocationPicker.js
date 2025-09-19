'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin,
  Search,
  Crosshair,
  Loader,
  AlertCircle,
  CheckCircle,
  Navigation,
  RefreshCw,
  X,
  ChevronDown,
  Map as MapIcon,
  Satellite,
  Layers
} from 'lucide-react';
import { toast } from 'sonner';
import LocationPickerErrorBoundary from './LocationPickerErrorBoundary';
import {
  INDIA_BOUNDS,
  MAJOR_INDIAN_CITIES,
  isWithinIndiaBounds,
  getCurrentLocation,
  calculateDistance,
  findNearestCity,
  formatLocationName,
  validateLocation,
  locationCache,
  handleLocationError,
  debounce,
  isMobileDevice,
  getTouchCoordinates,
  announceToScreenReader
} from './locationUtils';

// Google Maps API loader
let isGoogleMapsLoaded = false;
let googleMapsPromise = null;

const loadGoogleMaps = () => {
  if (isGoogleMapsLoaded && window.google?.maps) {
    return Promise.resolve(window.google.maps);
  }

  if (googleMapsPromise) {
    return googleMapsPromise;
  }

  googleMapsPromise = new Promise((resolve, reject) => {
    if (window.google?.maps) {
      isGoogleMapsLoaded = true;
      resolve(window.google.maps);
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places,geometry&region=IN&language=en`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      if (window.google?.maps) {
        isGoogleMapsLoaded = true;
        resolve(window.google.maps);
      } else {
        reject(new Error('Google Maps failed to load'));
      }
    };

    script.onerror = () => {
      reject(new Error('Failed to load Google Maps script'));
    };

    document.head.appendChild(script);
  });

  return googleMapsPromise;
};

// Default center (India center)
const INDIA_CENTER = {
  lat: 20.5937,
  lng: 78.9629
};

const LocationPicker = ({
  onLocationSelect,
  initialLocation = null,
  placeholder = "Search for a location...",
  className = "",
  height = "400px",
  showQuickCities = true,
  allowCurrentLocation = true,
  required = false,
  disabled = false,
  mapType = 'roadmap', // roadmap, satellite, hybrid, terrain
  zoom = 10,
  enableStreetView = false,
  enableFullscreen = true,
  showMapTypeControl = true,
  showZoomControl = true,
  theme = 'default' // default, dark
}) => {
  // Core state
  const [map, setMap] = useState(null);
  const [marker, setMarker] = useState(null);
  const [autocomplete, setAutocomplete] = useState(null);
  const [placesService, setPlacesService] = useState(null);

  // Location state
  const [selectedLocation, setSelectedLocation] = useState(initialLocation);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [searchValue, setSearchValue] = useState('');
  const [suggestions, setSuggestions] = useState([]);

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showQuickCitiesPanel, setShowQuickCitiesPanel] = useState(false);
  const [currentMapType, setCurrentMapType] = useState(mapType);

  // Error state
  const [error, setError] = useState(null);
  const [locationError, setLocationError] = useState(null);

  // Refs
  const mapRef = useRef(null);
  const searchInputRef = useRef(null);
  const suggestionsRef = useRef(null);
  const debounceRef = useRef(null);
  const mapInstanceRef = useRef(null);

  // Cache for search results
  const searchCache = useRef(new Map());

  // Initialize Google Maps
  useEffect(() => {
    let isMounted = true;

    const initializeMap = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const googleMaps = await loadGoogleMaps();

        if (!isMounted) return;

        if (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
          throw new Error('Google Maps API key is not configured');
        }

        // Create map instance
        const mapInstance = new googleMaps.Map(mapRef.current, {
          center: selectedLocation || currentLocation || INDIA_CENTER,
          zoom: selectedLocation ? 15 : zoom,
          mapTypeId: currentMapType,
          restriction: {
            latLngBounds: INDIA_BOUNDS,
            strictBounds: true
          },
          streetViewControl: enableStreetView,
          fullscreenControl: enableFullscreen,
          mapTypeControl: showMapTypeControl,
          zoomControl: showZoomControl,
          gestureHandling: 'cooperative',
          clickableIcons: false,
          styles: theme === 'dark' ? [
            { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
            { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
            { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] }
          ] : []
        });

        mapInstanceRef.current = mapInstance;
        setMap(mapInstance);

        // Create marker
        const markerInstance = new googleMaps.Marker({
          map: mapInstance,
          draggable: !disabled,
          animation: googleMaps.Animation.DROP,
          icon: {
            path: googleMaps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: '#3B82F6',
            fillOpacity: 1,
            strokeWeight: 2,
            strokeColor: '#FFFFFF'
          }
        });

        setMarker(markerInstance);

        // Create autocomplete
        if (searchInputRef.current) {
          const autocompleteInstance = new googleMaps.places.Autocomplete(
            searchInputRef.current,
            {
              bounds: new googleMaps.LatLngBounds(
                new googleMaps.LatLng(INDIA_BOUNDS.south, INDIA_BOUNDS.west),
                new googleMaps.LatLng(INDIA_BOUNDS.north, INDIA_BOUNDS.east)
              ),
              componentRestrictions: { country: 'in' },
              fields: ['place_id', 'geometry', 'name', 'formatted_address', 'address_components'],
              types: ['establishment', 'geocode']
            }
          );

          setAutocomplete(autocompleteInstance);

          // Places service
          const placesServiceInstance = new googleMaps.places.PlacesService(mapInstance);
          setPlacesService(placesServiceInstance);

          // Autocomplete listener
          autocompleteInstance.addListener('place_changed', () => {
            const place = autocompleteInstance.getPlace();
            if (place.geometry?.location) {
              handleLocationSelect({
                lat: place.geometry.location.lat(),
                lng: place.geometry.location.lng(),
                address: place.formatted_address,
                name: place.name,
                placeId: place.place_id
              });
            }
          });
        }

        // Map click listener
        mapInstance.addListener('click', (event) => {
          if (!disabled) {
            handleMapClick(event.latLng);
          }
        });

        // Marker drag listener
        markerInstance.addListener('dragend', () => {
          const position = markerInstance.getPosition();
          handleMapClick(position);
        });

        // Set initial location
        if (selectedLocation) {
          const position = new googleMaps.LatLng(selectedLocation.lat, selectedLocation.lng);
          markerInstance.setPosition(position);
          mapInstance.setCenter(position);
        } else if (allowCurrentLocation) {
          detectCurrentLocation();
        }

      } catch (err) {
        console.error('Failed to initialize map:', err);
        setError(err.message);
        toast.error('Failed to load map. Please refresh the page.');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    if (mapRef.current) {
      initializeMap();
    }

    return () => {
      isMounted = false;
    };
  }, []);

  // Get current location using utility function
  const detectCurrentLocation = useCallback(async () => {
    if (!allowCurrentLocation) return;

    setIsLoadingLocation(true);
    setLocationError(null);

    try {
      const location = await getCurrentLocation();
      setCurrentLocation(location);

      if (map && marker) {
        const googleMaps = window.google.maps;
        const position = new googleMaps.LatLng(location.lat, location.lng);
        marker.setPosition(position);
        map.setCenter(position);
        map.setZoom(15);

        // Get address for current location
        await reverseGeocode(location);
      }

      announceToScreenReader('Current location detected successfully');
      toast.success('Current location detected!');

    } catch (err) {
      console.error('Location detection error:', err);
      const errorMessage = handleLocationError(err, 'location detection');
      setLocationError(errorMessage);
    } finally {
      setIsLoadingLocation(false);
    }
  }, [allowCurrentLocation, map, marker]);

  // Handle map click
  const handleMapClick = useCallback(async (latLng) => {
    if (disabled) return;

    const location = {
      lat: latLng.lat(),
      lng: latLng.lng()
    };

    marker?.setPosition(latLng);
    await reverseGeocode(location);
  }, [marker, disabled]);

  // Reverse geocoding to get address
  const reverseGeocode = useCallback(async (location) => {
    if (!window.google?.maps) return;

    try {
      const geocoder = new window.google.maps.Geocoder();

      // Check cache first
      const cacheKey = `${location.lat.toFixed(6)},${location.lng.toFixed(6)}`;
      if (searchCache.current.has(cacheKey)) {
        const cachedResult = searchCache.current.get(cacheKey);
        handleLocationSelect({ ...location, ...cachedResult });
        return;
      }

      const result = await new Promise((resolve, reject) => {
        geocoder.geocode({ location }, (results, status) => {
          if (status === 'OK' && results[0]) {
            resolve(results[0]);
          } else {
            reject(new Error('Geocoding failed'));
          }
        });
      });

      const addressData = {
        address: result.formatted_address,
        name: result.address_components[0]?.long_name || '',
        placeId: result.place_id
      };

      // Cache result
      searchCache.current.set(cacheKey, addressData);

      // Cache in Redis if available
      try {
        await locationCache.cacheSearchResults(cacheKey, addressData);
      } catch (error) {
        console.warn('Failed to cache location data:', error);
      }

      handleLocationSelect({ ...location, ...addressData });
    } catch (err) {
      console.error('Reverse geocoding failed:', err);
      handleLocationSelect(location);
    }
  }, []);

  // Handle location selection
  const handleLocationSelect = useCallback((location) => {
    setSelectedLocation(location);
    setSearchValue(location.address || location.name || '');
    setShowSuggestions(false);

    if (onLocationSelect) {
      onLocationSelect(location);
    }
  }, [onLocationSelect]);

  // Search places with Redis caching
  const searchPlaces = useCallback(async (query) => {
    if (!query.trim() || !placesService) return;

    // Check local cache first
    const cacheKey = `search:${query.toLowerCase()}`;
    if (searchCache.current.has(cacheKey)) {
      setSuggestions(searchCache.current.get(cacheKey));
      return;
    }

    // Check Redis cache
    const cachedResults = await locationCache.getCachedSearchResults(query);
    if (cachedResults) {
      setSuggestions(cachedResults);
      searchCache.current.set(cacheKey, cachedResults);
      return;
    }

    setIsSearching(true);

    try {
      const results = await new Promise((resolve, reject) => {
        placesService.textSearch(
          {
            query,
            bounds: new window.google.maps.LatLngBounds(
              new window.google.maps.LatLng(INDIA_BOUNDS.south, INDIA_BOUNDS.west),
              new window.google.maps.LatLng(INDIA_BOUNDS.north, INDIA_BOUNDS.east)
            ),
            region: 'in'
          },
          (results, status) => {
            if (status === window.google.maps.places.PlacesServiceStatus.OK) {
              resolve(results.slice(0, 5)); // Limit to 5 results
            } else {
              reject(new Error('Places search failed'));
            }
          }
        );
      });

      const suggestions = results.map(place => ({
        placeId: place.place_id,
        name: place.name,
        address: place.formatted_address,
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng(),
        rating: place.rating,
        types: place.types
      }));

      setSuggestions(suggestions);
      searchCache.current.set(cacheKey, suggestions);

      // Cache in Redis for future use
      await locationCache.cacheSearchResults(query, suggestions);

    } catch (err) {
      console.error('Places search failed:', err);
      setSuggestions([]);
      handleLocationError(err, 'place search');
    } finally {
      setIsSearching(false);
    }
  }, [placesService]);


  // Handle search input change with debouncing
  const debouncedSearch = useMemo(
    () => debounce((query) => searchPlaces(query), 300),
    [searchPlaces]
  );

  const handleSearchChange = useCallback((e) => {
    const value = e.target.value;
    setSearchValue(value);
    setShowSuggestions(!!value.trim());

    if (value.trim()) {
      debouncedSearch(value.trim());
    } else {
      setSuggestions([]);
    }
  }, [debouncedSearch]);

  // Handle quick city selection
  const handleQuickCitySelect = useCallback((city) => {
    if (map && marker) {
      const googleMaps = window.google.maps;
      const position = new googleMaps.LatLng(city.lat, city.lng);

      marker.setPosition(position);
      map.setCenter(position);
      map.setZoom(12);

      handleLocationSelect({
        lat: city.lat,
        lng: city.lng,
        name: city.name,
        address: `${city.name}, ${city.state}, India`
      });

      announceToScreenReader(`Selected ${city.name}, ${city.state}`);
    }
    setShowQuickCitiesPanel(false);
  }, [map, marker, handleLocationSelect]);

  // Handle map type change
  const handleMapTypeChange = useCallback((type) => {
    setCurrentMapType(type);
    if (map) {
      map.setMapTypeId(type);
    }
  }, [map]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!showSuggestions || suggestions.length === 0) return;

      // Handle suggestion navigation with arrow keys
      // Implementation for keyboard navigation
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showSuggestions, suggestions]);

  // Memoized map container style
  const mapContainerStyle = useMemo(() => ({
    width: '100%',
    height,
    borderRadius: '12px',
    overflow: 'hidden',
    position: 'relative'
  }), [height]);

  if (error) {
    return (
      <div className={`w-full ${className}`}>
        <div className="flex items-center justify-center p-8 bg-red-50 border border-red-200 rounded-lg">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-red-800 mb-2">Failed to Load Map</h3>
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="btn-primary"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Reload Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full space-y-4 ${className}`}>
      {/* Search Bar */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchValue}
            onChange={handleSearchChange}
            placeholder={placeholder}
            disabled={disabled || isLoading}
            className={`input-field pl-10 pr-20 ${disabled ? 'cursor-not-allowed' : ''}`}
            aria-label="Search location"
            role="combobox"
            aria-expanded={showSuggestions}
            aria-autocomplete="list"
          />

          {/* Action buttons */}
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
            {allowCurrentLocation && (
              <button
                onClick={detectCurrentLocation}
                disabled={disabled || isLoadingLocation}
                className="p-1.5 hover:bg-gray-100 rounded-md transition-colors"
                title="Use current location"
                aria-label="Use current location"
              >
                {isLoadingLocation ? (
                  <Loader className="h-4 w-4 animate-spin text-blue-500" />
                ) : (
                  <Crosshair className="h-4 w-4 text-gray-500 hover:text-blue-500" />
                )}
              </button>
            )}

            {showQuickCities && (
              <button
                onClick={() => setShowQuickCitiesPanel(!showQuickCitiesPanel)}
                disabled={disabled}
                className="p-1.5 hover:bg-gray-100 rounded-md transition-colors"
                title="Quick city selection"
                aria-label="Quick city selection"
              >
                <Navigation className="h-4 w-4 text-gray-500 hover:text-blue-500" />
              </button>
            )}
          </div>
        </div>

        {/* Search Suggestions */}
        <AnimatePresence>
          {showSuggestions && (suggestions.length > 0 || isSearching) && (
            <motion.div
              ref={suggestionsRef}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto"
            >
              {isSearching && (
                <div className="flex items-center justify-center p-4">
                  <Loader className="h-5 w-5 animate-spin text-blue-500 mr-2" />
                  <span className="text-gray-600">Searching...</span>
                </div>
              )}

              {suggestions.map((suggestion, index) => (
                <button
                  key={suggestion.placeId}
                  onClick={() => handleLocationSelect(suggestion)}
                  className="w-full text-left p-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
                  role="option"
                  aria-selected="false"
                >
                  <div className="flex items-start space-x-3">
                    <MapPin className="h-4 w-4 text-gray-400 mt-1 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">
                        {suggestion.name}
                      </div>
                      <div className="text-sm text-gray-500 truncate">
                        {suggestion.address}
                      </div>
                      {suggestion.rating && (
                        <div className="text-xs text-yellow-600 mt-1">
                          ⭐ {suggestion.rating}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quick Cities Panel */}
        <AnimatePresence>
          {showQuickCitiesPanel && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-40"
            >
              <div className="p-3 border-b border-gray-100">
                <h3 className="font-medium text-gray-900">Quick City Selection</h3>
              </div>
              <div className="grid grid-cols-2 gap-1 p-2">
                {MAJOR_INDIAN_CITIES.slice(0, 8).map((city) => (
                  <button
                    key={`${city.name}-${city.state}`}
                    onClick={() => handleQuickCitySelect(city)}
                    className="text-left p-2 hover:bg-gray-50 rounded transition-colors"
                  >
                    <div className="font-medium text-gray-900 text-sm">
                      {city.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {city.state}
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Error Messages */}
      {locationError && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg"
        >
          <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
          <span className="text-sm text-red-700">{locationError}</span>
          <button
            onClick={() => setLocationError(null)}
            className="ml-auto text-red-500 hover:text-red-700"
          >
            <X className="h-4 w-4" />
          </button>
        </motion.div>
      )}

      {/* Selected Location Display */}
      {selectedLocation && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center space-x-2 p-3 bg-green-50 border border-green-200 rounded-lg"
        >
          <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="font-medium text-green-800 truncate">
              {selectedLocation.name || 'Selected Location'}
            </div>
            {selectedLocation.address && (
              <div className="text-sm text-green-600 truncate">
                {selectedLocation.address}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Map Container */}
      <div className="relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg z-10">
            <div className="text-center">
              <Loader className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-2" />
              <p className="text-gray-600">Loading map...</p>
            </div>
          </div>
        )}

        <div
          ref={mapRef}
          style={mapContainerStyle}
          className={`${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
          role="application"
          aria-label="Interactive map for location selection"
        />

        {/* Map Controls */}
        {!isLoading && showMapTypeControl && (
          <div className="absolute top-4 right-4 z-10">
            <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
              <button
                onClick={() => handleMapTypeChange('roadmap')}
                className={`p-2 text-sm font-medium transition-colors ${
                  currentMapType === 'roadmap'
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
                title="Road map"
              >
                <MapIcon className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleMapTypeChange('satellite')}
                className={`p-2 text-sm font-medium transition-colors ${
                  currentMapType === 'satellite'
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
                title="Satellite view"
              >
                <Satellite className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleMapTypeChange('hybrid')}
                className={`p-2 text-sm font-medium transition-colors ${
                  currentMapType === 'hybrid'
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
                title="Hybrid view"
              >
                <Layers className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Map Instructions */}
        {!selectedLocation && !isLoading && (
          <div className="absolute bottom-4 left-4 right-4 z-10">
            <div className="bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg border border-gray-200">
              <p className="text-sm text-gray-700 text-center">
                📍 Click on the map or search above to select a location
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Wrapped component with error boundary
const LocationPickerWithErrorBoundary = (props) => {
  return (
    <LocationPickerErrorBoundary
      allowFallback={true}
      onFallback={() => {
        console.log('LocationPicker error boundary fallback triggered');
        // Could show a simple text input as fallback
        if (props.onLocationSelect) {
          props.onLocationSelect(null);
        }
      }}
    >
      <LocationPicker {...props} />
    </LocationPickerErrorBoundary>
  );
};

export default LocationPickerWithErrorBoundary;