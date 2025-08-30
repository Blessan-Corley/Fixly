'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, Navigation, Target, Loader, CheckCircle, AlertCircle,
  Search, Edit3, RefreshCcw, Zap, Globe, Building, Home
} from 'lucide-react';
import { toast } from 'sonner';
import { locationManager } from '../../utils/locationManager';
import { getAddressFromCoordinates, getCoordinatesFromAddress } from '../../utils/geocodingService';

export default function LocationInput({ 
  value = null, 
  onChange, 
  required = false,
  placeholder = "Enter location or use GPS",
  showFullForm = true,
  compact = false,
  label = "Location",
  className = ""
}) {
  const [locationData, setLocationData] = useState(value || {
    coordinates: null,
    formatted: '',
    street: '',
    area: '',
    city: '',
    district: '',
    state: '',
    pincode: '',
    country: 'India'
  });
  
  const [inputMode, setInputMode] = useState('manual'); // manual, gps, searching
  const [loading, setLoading] = useState(false);
  const [addressInput, setAddressInput] = useState('');
  const [showDetails, setShowDetails] = useState(false);
  const [isValid, setIsValid] = useState(false);
  const [error, setError] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  // Enhanced validation
  const validateLocationData = (data) => {
    // Clear previous errors
    setError('');
    
    // Check if we have coordinates (most precise)
    if (data.coordinates && data.coordinates.lat && data.coordinates.lng) {
      return true;
    }
    
    // Check if we have minimum required fields
    if (data.city && data.state) {
      return true;
    }
    
    // Check if we have a formatted address
    if (data.formatted && data.formatted.length > 10) {
      return true;
    }
    
    // Set appropriate error message
    if (required) {
      setError('Please provide a valid location');
    }
    
    return false;
  };
  
  // Validate location data
  useEffect(() => {
    const valid = validateLocationData(locationData);
    setIsValid(valid);
    
    if (onChange) {
      onChange({
        ...locationData,
        isValid: valid,
        error: error
      });
    }
  }, [locationData, onChange, required, error]);

  // Initialize with provided value
  useEffect(() => {
    if (value && value !== locationData) {
      setLocationData(value);
      if (value.formatted) {
        setAddressInput(value.formatted);
      }
    }
  }, [value]);

  // Enhanced GPS location handling with retry logic
  const handleGPSLocation = async (isRetry = false) => {
    setInputMode('gps');
    setLoading(true);
    setError('');
    
    if (!isRetry) {
      setRetryCount(0);
    }

    try {
      // Show progress for longer operations
      const progressToast = !isRetry ? toast.loading('Getting your location...', {
        description: 'This may take a few seconds'
      }) : null;
      
      // Get current location with adaptive accuracy
      const position = await locationManager.getCurrentLocation({
        enableHighAccuracy: retryCount === 0, // Use high accuracy on first try
        timeout: isRetry ? 15000 : 10000, // Longer timeout on retry
        maximumAge: 60000, // Accept 1-minute old location
        silent: false
      });
      
      // Dismiss progress toast
      if (progressToast) {
        toast.dismiss(progressToast);
      }

      // Get address details using geocoding
      const addressDetails = await locationManager.getLocationDetails(
        position.lat, 
        position.lng
      );

      const newLocationData = {
        coordinates: {
          lat: position.lat,
          lng: position.lng,
          accuracy: position.accuracy
        },
        formatted: addressDetails.formatted,
        street: addressDetails.street || '',
        area: addressDetails.area || '',
        city: addressDetails.city || '',
        district: addressDetails.district || '',
        state: addressDetails.state || '',
        pincode: addressDetails.pincode || '',
        country: addressDetails.country || 'India',
        autoFilled: true,
        source: 'gps',
        service: addressDetails.service,
        timestamp: new Date().toISOString()
      };

      setLocationData(newLocationData);
      setAddressInput(addressDetails.formatted);
      setInputMode('manual');
      setError('');
      
      // Success feedback with accuracy info
      const accuracyText = position.accuracy < 50 ? 'high accuracy' : 
                          position.accuracy < 200 ? 'good accuracy' : 'approximate';
      
      toast.success('📍 Location auto-filled successfully!', {
        description: `Found: ${addressDetails.city}, ${addressDetails.state} (${accuracyText})`
      });

    } catch (error) {
      console.error('GPS location error:', error);
      setInputMode('manual');
      
      // Enhanced error handling
      if (error.code === 1 || error.message.includes('denied')) {
        setError('Location access denied');
        toast.error('Location access denied', {
          description: 'Please enable location services in your browser settings',
          action: {
            label: 'How to enable',
            onClick: () => window.open('https://support.google.com/chrome/answer/142065', '_blank')
          }
        });
      } else if (error.code === 2 || error.message.includes('unavailable')) {
        setError('Location unavailable');
        if (retryCount < 2) {
          toast.error('Location unavailable', {
            description: 'Retrying with different settings...',
            action: {
              label: 'Retry now',
              onClick: () => {
                setRetryCount(prev => prev + 1);
                setTimeout(() => handleGPSLocation(true), 1000);
              }
            }
          });
        } else {
          toast.error('Unable to get precise location', {
            description: 'Please enter your address manually'
          });
        }
      } else if (error.code === 3 || error.message.includes('timeout')) {
        setError('Location request timed out');
        if (retryCount < 1) {
          toast.error('Location request timed out', {
            action: {
              label: 'Try again',
              onClick: () => {
                setRetryCount(prev => prev + 1);
                handleGPSLocation(true);
              }
            }
          });
        } else {
          toast.error('Location service is slow. Please try manual entry.');
        }
      } else {
        setError('Location service error');
        toast.error('Failed to get GPS location', {
          description: 'Please enter your address manually'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Enhanced address search with better error handling
  const handleAddressSearch = async (address) => {
    if (!address || address.length < 5) {
      return;
    }

    setInputMode('searching');
    setLoading(true);
    setError('');

    try {
      // Get coordinates from address with better options
      const result = await getCoordinatesFromAddress(address, { 
        silent: true,
        useCache: true,
        preferredService: 'auto'
      });
      
      if (result && result.success !== false) {
        const newLocationData = {
          coordinates: result.coordinates,
          formatted: result.formatted,
          street: result.components?.fullStreet || '',
          area: result.components?.area || '',
          city: result.components?.city || '',
          district: result.components?.district || '',
          state: result.components?.state || '',
          pincode: result.components?.pincode || '',
          country: result.components?.country || 'India',
          autoFilled: true,
          source: 'search',
          service: result.service,
          confidence: result.confidence || 0.7,
          timestamp: new Date().toISOString()
        };

        setLocationData(newLocationData);
        setInputMode('manual');
        setShowSuggestions(false);
        
        // Only show success for high-confidence results
        if (result.confidence > 0.8 || result.service === 'google') {
          toast.success('🎯 Address found and auto-filled!', {
            description: `Using ${result.service} geocoding`
          });
        }
      } else if (result && result.success === false) {
        // Handle fallback result
        console.debug('Using fallback address result:', result.error);
      }
    } catch (error) {
      console.debug('Address search failed:', error);
      
      // Only show error for important failures
      if (error.message.includes('quota') || error.message.includes('denied')) {
        setError('Address search temporarily unavailable');
        toast.error('Address search unavailable', {
          description: 'Please enter your address manually'
        });
      }
    } finally {
      setLoading(false);
      setInputMode('manual');
    }
  };

  // Enhanced manual input handling with suggestions
  const handleInputChange = (e) => {
    const value = e.target.value;
    setAddressInput(value);
    setError('');
    
    // Update basic location data for manual entry
    setLocationData(prev => ({
      ...prev,
      formatted: value,
      autoFilled: false,
      source: 'manual',
      timestamp: new Date().toISOString()
    }));

    // Clear previous suggestions
    setSuggestions([]);
    setShowSuggestions(false);

    // Debounced address search with better logic
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    debounceRef.current = setTimeout(() => {
      if (value.length >= 3) {
        // Generate suggestions for common Indian address patterns
        generateAddressSuggestions(value);
        
        // Perform geocoding search for longer queries
        if (value.length >= 8) {
          handleAddressSearch(value);
        }
      }
    }, 500);
  };
  
  // Generate address suggestions based on input
  const generateAddressSuggestions = (input) => {
    const suggestions = [];
    const lowerInput = input.toLowerCase();
    
    // Common Indian localities and areas (you can expand this)
    const commonAreas = [
      'MG Road', 'Brigade Road', 'Koramangala', 'Indiranagar', 'HSR Layout',
      'Whitefield', 'Electronic City', 'Marathahalli', 'BTM Layout', 'Jayanagar',
      'Rajajinagar', 'Malleshwaram', 'Basavanagudi', 'Yeshwanthpur', 'Hebbal'
    ];
    
    commonAreas.forEach(area => {
      if (area.toLowerCase().includes(lowerInput) && input.length >= 3) {
        suggestions.push({
          text: `${area}, Bangalore, Karnataka`,
          type: 'area',
          confidence: 0.8
        });
      }
    });
    
    if (suggestions.length > 0) {
      setSuggestions(suggestions.slice(0, 5));
      setShowSuggestions(true);
    }
  };

  // Handle individual field changes
  const handleFieldChange = (field, value) => {
    setLocationData(prev => ({
      ...prev,
      [field]: value,
      autoFilled: false,
      source: 'manual'
    }));
  };

  // Enhanced clear function
  const handleClear = () => {
    const emptyData = {
      coordinates: null,
      formatted: '',
      street: '',
      area: '',
      city: '',
      district: '',
      state: '',
      pincode: '',
      country: 'India'
    };
    
    setLocationData(emptyData);
    setAddressInput('');
    setShowDetails(false);
    setError('');
    setSuggestions([]);
    setShowSuggestions(false);
    setRetryCount(0);
    
    // Clear any pending debounced searches
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    // Focus back to input
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };
  
  // Handle suggestion selection
  const handleSuggestionSelect = (suggestion) => {
    setAddressInput(suggestion.text);
    setShowSuggestions(false);
    
    // Trigger search for the selected suggestion
    handleAddressSearch(suggestion.text);
  };
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Main Input */}
      <div>
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {label} {required && <span className="text-red-500">*</span>}
            {locationData.autoFilled && (
              <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                Auto-filled
              </span>
            )}
          </label>
        )}
        
        <div className="relative">
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={addressInput}
              onChange={handleInputChange}
              onFocus={() => {
                if (suggestions.length > 0) {
                  setShowSuggestions(true);
                }
              }}
              onBlur={() => {
                // Delay hiding suggestions to allow clicks
                setTimeout(() => setShowSuggestions(false), 150);
              }}
              placeholder={placeholder}
              className={`w-full px-4 py-3 pr-12 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                error ? 'border-red-300 bg-red-50' :
                isValid ? 'border-green-300 bg-green-50' : 'border-gray-300'
              } ${loading ? 'bg-gray-50' : ''}`}
              required={required}
              disabled={loading}
              autoComplete="address-line1"
              aria-describedby={error ? 'location-error' : undefined}
            />
            
            {/* Address Suggestions Dropdown */}
            <AnimatePresence>
              {showSuggestions && suggestions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                >
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleSuggestionSelect(suggestion)}
                      className="w-full px-4 py-3 text-left hover:bg-blue-50 focus:bg-blue-50 focus:outline-none border-b border-gray-100 last:border-b-0"
                    >
                      <div className="flex items-center">
                        <Search className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-700">{suggestion.text}</span>
                        <span className="ml-auto text-xs text-gray-500 capitalize">{suggestion.type}</span>
                      </div>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          {/* Error Message */}
          {error && (
            <p id="location-error" className="text-red-500 text-sm mt-1 flex items-center">
              <AlertCircle className="h-4 w-4 mr-1" />
              {error}
            </p>
          )}
          
          {/* Loading spinner */}
          {loading && (
            <div className="absolute right-12 top-1/2 transform -translate-y-1/2">
              <Loader className="h-4 w-4 animate-spin text-gray-400" />
            </div>
          )}
          
          {/* Status indicator */}
          <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
            {isValid && !loading && !error && (
              <CheckCircle className="h-4 w-4 text-green-500" />
            )}
            {error && !loading && (
              <AlertCircle className="h-4 w-4 text-red-500" />
            )}
            {!isValid && !loading && !error && addressInput && (
              <AlertCircle className="h-4 w-4 text-orange-500" />
            )}
          </div>
        </div>
      </div>

      {/* GPS and Action Buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={handleGPSLocation}
          disabled={loading}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors text-sm"
        >
          {loading && inputMode === 'gps' ? (
            <Loader className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Navigation className="h-4 w-4 mr-2" />
          )}
          Use GPS
        </button>
        
        {!compact && (
          <>
            <button
              type="button"
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
            >
              <Edit3 className="h-4 w-4 mr-2" />
              {showDetails ? 'Hide Details' : 'Edit Details'}
            </button>
            
            {locationData.formatted && (
              <button
                type="button"
                onClick={handleClear}
                className="flex items-center px-3 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors text-sm"
              >
                Clear
              </button>
            )}
          </>
        )}
        
        {locationData.autoFilled && (
          <div className="flex items-center text-xs text-gray-500">
            <Target className="h-3 w-3 mr-1 text-green-600" />
            Auto-filled via {locationData.service || 'GPS'}
          </div>
        )}
      </div>

      {/* Location Status */}
      {locationData.coordinates && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-center text-sm text-green-800">
            <MapPin className="h-4 w-4 mr-2 text-green-600" />
            <span className="font-medium">Precise location set</span>
            {locationData.coordinates.accuracy && (
              <span className="ml-2 text-green-600">
                (±{Math.round(locationData.coordinates.accuracy)}m accuracy)
              </span>
            )}
          </div>
        </div>
      )}

      {/* Detailed Address Fields */}
      <AnimatePresence>
        {(showDetails || !locationData.formatted) && showFullForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-gray-50 rounded-lg p-4 space-y-4"
          >
            <h4 className="font-medium text-gray-900 flex items-center">
              <Building className="h-4 w-4 mr-2" />
              Address Details
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Street/Building</label>
                <input
                  type="text"
                  value={locationData.street || ''}
                  onChange={(e) => handleFieldChange('street', e.target.value)}
                  placeholder="House no., street name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Area/Locality</label>
                <input
                  type="text"
                  value={locationData.area || ''}
                  onChange={(e) => handleFieldChange('area', e.target.value)}
                  placeholder="Area, neighborhood"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
                <input
                  type="text"
                  value={locationData.city || ''}
                  onChange={(e) => handleFieldChange('city', e.target.value)}
                  placeholder="City name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required={required}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">State *</label>
                <input
                  type="text"
                  value={locationData.state || ''}
                  onChange={(e) => handleFieldChange('state', e.target.value)}
                  placeholder="State name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required={required}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pincode</label>
                <input
                  type="text"
                  value={locationData.pincode || ''}
                  onChange={(e) => handleFieldChange('pincode', e.target.value)}
                  placeholder="6-digit pincode"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                <input
                  type="text"
                  value={locationData.country || 'India'}
                  onChange={(e) => handleFieldChange('country', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
                  readOnly
                />
              </div>
            </div>
            
            {/* Coordinates Display */}
            {locationData.coordinates && (
              <div className="bg-white rounded-md p-3 border">
                <div className="text-sm text-gray-600 mb-1">GPS Coordinates</div>
                <div className="font-mono text-sm">
                  {locationData.coordinates.lat.toFixed(6)}, {locationData.coordinates.lng.toFixed(6)}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Help Text */}
      {!compact && (
        <div className="text-xs text-gray-500 flex items-start space-x-4">
          <div className="flex items-center">
            <Zap className="h-3 w-3 mr-1 text-blue-500" />
            <span>GPS for instant auto-fill</span>
          </div>
          <div className="flex items-center">
            <Globe className="h-3 w-3 mr-1 text-green-500" />
            <span>Address search powered by geocoding</span>
          </div>
        </div>
      )}
    </div>
  );
}