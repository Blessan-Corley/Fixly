// Location Selector Component with comprehensive fallback handling
'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getUserLocationManager } from '../../lib/location/UserLocationManager';
import { useResponsive } from '../ui/ResponsiveLayout';

const LocationSelector = ({ 
  onLocationSelected, 
  onLocationError, 
  showManualInput = true,
  showSuggestions = true,
  placeholder = "Enter your city or location...",
  autoDetect = true,
  className = ""
}) => {
  const { isMobile, isTablet } = useResponsive();
  
  const [location, setLocation] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showDialog, setShowDialog] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [selectedMethod, setSelectedMethod] = useState('auto');
  const [status, setStatus] = useState('idle'); // idle, detecting, manual, error, success
  
  const locationManager = useRef(null);
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);

  // Initialize managers
  useEffect(() => {
    locationManager.current = getUserLocationManager();

    // Set up event listeners
    const handleLocationSuccess = (event) => {
      const { location: loc, method } = event.detail;
      setLocation(loc);
      setStatus('success');
      setIsLoading(false);
      setError(null);
      setSelectedMethod(method);
      
      if (onLocationSelected) {
        onLocationSelected(loc);
      }
    };

    const handleLocationError = (event) => {
      const { error: err } = event.detail;
      setError(err);
      setStatus('error');
      setIsLoading(false);
      
      if (onLocationError) {
        onLocationError(err);
      }
    };

    const handleManualInputRequired = (event) => {
      const { onComplete } = event.detail;
      setShowDialog(true);
      setStatus('manual');
      setIsLoading(false);
      
      // Store callback for when user completes manual input
      window.locationInputCallback = onComplete;
    };

    const handleLocationSelectionRequired = (event) => {
      const { onLocationSelected: callback } = event.detail;
      setShowDialog(true);
      setStatus('manual');
      setIsLoading(false);
      
      // Store callback
      window.locationSelectionCallback = callback;
    };

    locationManager.current.on('locationSuccess', handleLocationSuccess);
    locationManager.current.on('locationMethodFailed', handleLocationError);
    locationManager.current.on('manualLocationRequired', handleManualInputRequired);
    locationManager.current.on('locationSelectionRequired', handleLocationSelectionRequired);

    // Auto-detect location if enabled
    if (autoDetect) {
      detectLocation();
    }

    return () => {
      if (locationManager.current) {
        locationManager.current.off('locationSuccess', handleLocationSuccess);
        locationManager.current.off('locationMethodFailed', handleLocationError);
        locationManager.current.off('manualLocationRequired', handleManualInputRequired);
        locationManager.current.off('locationSelectionRequired', handleLocationSelectionRequired);
      }
    };
  }, [autoDetect, onLocationSelected, onLocationError]);

  // Auto-detect location
  const detectLocation = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setStatus('detecting');

    try {
      const result = await locationManager.current.getUserLocation({
        context: 'location_selector'
      });
      
      // Result will be handled by event listeners
      if (!result) {
        setStatus('manual');
        setShowDialog(true);
      }
    } catch (error) {
      console.error('Location detection failed:', error);
      setError(error.message);
      setStatus('manual');
      setShowDialog(true);
      setIsLoading(false);
    }
  }, []);

  // Handle manual input change
  const handleInputChange = useCallback((e) => {
    const value = e.target.value;
    setManualInput(value);

    if (showSuggestions && value.length >= 2) {
      // Get suggestions from available location options
      const options = locationManager.current.getAvailableLocationOptions();
      const filtered = options.filter(option => 
        option.label.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 8);
      setSuggestions(filtered);
    } else {
      setSuggestions([]);
    }
  }, [showSuggestions]);

  // Handle suggestion selection
  const handleSuggestionSelect = useCallback(async (suggestion) => {
    setManualInput(suggestion.label);
    setSuggestions([]);
    setIsLoading(true);

    try {
      let result;
      if (suggestion.type === 'signup_form') {
        result = suggestion.location;
      } else if (suggestion.type === 'preferred_city') {
        result = await locationManager.current.geocodeCity(suggestion.city);
      } else {
        result = await locationManager.current.geocodeCity(suggestion.label);
      }
      
      setLocation(result);
      setStatus('success');
      setShowDialog(false);
      
      if (onLocationSelected) {
        onLocationSelected(result);
      }

      // Complete manual input if callback exists
      if (window.locationInputCallback) {
        window.locationInputCallback(result);
        delete window.locationInputCallback;
      }

      if (window.locationSelectionCallback) {
        window.locationSelectionCallback(result);
        delete window.locationSelectionCallback;
      }
    } catch (error) {
      setError(error.message);
      setStatus('error');
    } finally {
      setIsLoading(false);
    }
  }, [onLocationSelected]);

  // Handle manual input submit
  const handleManualSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!manualInput.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await locationManager.current.geocodeCity(manualInput.trim());
      
      setLocation(result);
      setStatus('success');
      setShowDialog(false);
      
      if (onLocationSelected) {
        onLocationSelected(result);
      }

      // Complete callbacks
      if (window.locationInputCallback) {
        window.locationInputCallback(result);
        delete window.locationInputCallback;
      }

      if (window.locationSelectionCallback) {
        window.locationSelectionCallback(result);
        delete window.locationSelectionCallback;
      }
    } catch (error) {
      setError(error.message);
      setStatus('error');
    } finally {
      setIsLoading(false);
    }
  }, [manualInput, onLocationSelected]);

  // Handle retry detection
  const handleRetryDetection = useCallback(() => {
    setError(null);
    setShowDialog(false);
    detectLocation();
  }, [detectLocation]);

  // Handle use IP location
  const handleUseIPLocation = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await locationManager.current.getIPLocation();
      setLocation(result);
      setStatus('success');
      setShowDialog(false);
      
      if (onLocationSelected) {
        onLocationSelected(result);
      }

      if (window.locationInputCallback) {
        window.locationInputCallback(result);
        delete window.locationInputCallback;
      }

      if (window.locationSelectionCallback) {
        window.locationSelectionCallback(result);
        delete window.locationSelectionCallback;
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  }, [onLocationSelected]);

  // Close dialog
  const handleCloseDialog = useCallback(() => {
    setShowDialog(false);
    
    // Complete callbacks with null if user cancels
    if (window.locationInputCallback) {
      window.locationInputCallback(null);
      delete window.locationInputCallback;
    }

    if (window.locationSelectionCallback) {
      window.locationSelectionCallback(null);
      delete window.locationSelectionCallback;
    }
  }, []);

  // Click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target)) {
        setSuggestions([]);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Format location display
  const formatLocationDisplay = (loc) => {
    if (!loc) return '';
    
    if (loc.city && loc.region) {
      return `${loc.city}, ${loc.region}`;
    } else if (loc.city) {
      return loc.city;
    } else if (loc.address) {
      return loc.address;
    } else {
      return `${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}`;
    }
  };

  // Get status icon
  const getStatusIcon = () => {
    switch (status) {
      case 'detecting':
        return (
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
        );
      case 'success':
        return (
          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        );
      case 'error':
        return (
          <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L3.316 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        );
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Location Display */}
      <div className={`
        flex items-center space-x-3 p-3 bg-white border rounded-lg shadow-sm
        ${status === 'error' ? 'border-red-300 bg-red-50' : ''}
        ${status === 'success' ? 'border-green-300 bg-green-50' : ''}
        ${isMobile ? 'p-4' : 'p-3'}
      `}>
        <div className="flex-shrink-0">
          {getStatusIcon()}
        </div>
        
        <div className="flex-1">
          {location ? (
            <div>
              <p className="text-sm font-medium text-gray-900">
                {formatLocationDisplay(location)}
              </p>
              <p className="text-xs text-gray-500">
                Via {location.method?.replace('_', ' ')} • Accuracy: ~{Math.round(location.accuracy || 1000)}m
              </p>
            </div>
          ) : status === 'detecting' ? (
            <p className="text-sm text-gray-600">Detecting your location...</p>
          ) : (
            <p className="text-sm text-gray-600">No location set</p>
          )}
        </div>

        <div className="flex-shrink-0">
          {status === 'success' && (
            <button
              onClick={() => setShowDialog(true)}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              Change
            </button>
          )}
          
          {status === 'error' && (
            <button
              onClick={handleRetryDetection}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              Retry
            </button>
          )}
          
          {status === 'idle' && (
            <button
              onClick={detectLocation}
              className="text-sm text-blue-600 hover:text-blue-700"
              disabled={isLoading}
            >
              Detect
            </button>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Location Selection Dialog */}
      {showDialog && (
        <>
          {/* Mobile backdrop */}
          {isMobile && (
            <div 
              className="fixed inset-0 bg-black bg-opacity-50 z-40"
              onClick={handleCloseDialog}
            />
          )}
          
          <div className={`
            absolute z-50 bg-white rounded-lg shadow-xl border
            ${isMobile ? 
              'fixed inset-x-4 top-20 bottom-20' : 
              'top-full mt-2 left-0 right-0'
            }
          `}>
            {/* Dialog Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Set Your Location
              </h3>
              <button
                onClick={handleCloseDialog}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Dialog Content */}
            <div className="p-4 space-y-4">
              {/* Auto-detect options */}
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900">Quick Options</h4>
                
                <button
                  onClick={handleRetryDetection}
                  disabled={isLoading}
                  className={`
                    w-full flex items-center space-x-3 p-3 border rounded-lg
                    hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed
                    ${isLoading ? 'bg-gray-50' : 'bg-white'}
                  `}
                >
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  </svg>
                  <span>Use My Current Location (GPS)</span>
                  {isLoading && selectedMethod === 'geolocation' && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  )}
                </button>

                <button
                  onClick={handleUseIPLocation}
                  disabled={isLoading}
                  className={`
                    w-full flex items-center space-x-3 p-3 border rounded-lg
                    hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed
                    ${isLoading ? 'bg-gray-50' : 'bg-white'}
                  `}
                >
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
                  </svg>
                  <span>Use IP-based Location</span>
                  {isLoading && selectedMethod === 'ip' && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
                  )}
                </button>
              </div>

              {/* Manual input */}
              {showManualInput && (
                <div className="space-y-2" ref={suggestionsRef}>
                  <h4 className="font-medium text-gray-900">Enter Manually</h4>
                  
                  <form onSubmit={handleManualSubmit} className="relative">
                    <input
                      ref={inputRef}
                      type="text"
                      value={manualInput}
                      onChange={handleInputChange}
                      placeholder={placeholder}
                      className={`
                        w-full px-3 py-2 border border-gray-300 rounded-md
                        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                        ${isMobile ? 'text-16px' : ''} /* Prevent zoom on iOS */
                      `}
                      autoComplete="address"
                    />
                    
                    <button
                      type="submit"
                      disabled={!manualInput.trim() || isLoading}
                      className={`
                        absolute right-2 top-1/2 transform -translate-y-1/2
                        px-3 py-1 text-sm bg-blue-600 text-white rounded
                        hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed
                      `}
                    >
                      {isLoading ? '...' : 'Set'}
                    </button>
                  </form>

                  {/* Suggestions dropdown */}
                  {suggestions.length > 0 && (
                    <div className="absolute w-full bg-white border border-gray-200 rounded-md shadow-lg z-10 max-h-60 overflow-y-auto">
                      {suggestions.map((suggestion, index) => (
                        <button
                          key={index}
                          onClick={() => handleSuggestionSelect(suggestion)}
                          className="w-full text-left px-4 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                        >
                          <div className="flex items-center">
                            <span className="mr-2">{suggestion.icon}</span>
                            <div>
                              <div className="font-medium text-gray-900">{suggestion.label}</div>
                              {suggestion.type === 'signup_form' && (
                                <div className="text-sm text-gray-500">From your registration</div>
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default LocationSelector;