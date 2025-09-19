'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin,
  Crosshair,
  Loader,
  CheckCircle,
  AlertCircle,
  Navigation,
  Home,
  Edit3,
  Map,
  FileText,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
  Target
} from 'lucide-react';
import { toast } from 'sonner';
import LocationPicker from '../LocationPicker/LocationPicker';

const AddressForm = ({
  onAddressSelect,
  initialAddress = null,
  showMap = true,
  allowGPSAutoFill = true,
  required = false,
  disabled = false,
  className = ""
}) => {
  // State management
  const [viewMode, setViewMode] = useState('map'); // 'map' or 'form'
  const [isLocationSelected, setIsLocationSelected] = useState(false);
  const [autoFilledFromGPS, setAutoFilledFromGPS] = useState(false);

  // Address state - simplified structure
  const [address, setAddress] = useState({
    doorNo: '',
    street: '',
    district: '',
    state: '',
    postalCode: '',
    coordinates: null,
    formatted: '',
    source: 'manual' // 'gps', 'search', 'manual'
  });

  // UI state - consolidated error handling
  const [validationErrors, setValidationErrors] = useState({});

  // Indian states for dropdown
  const indianStates = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
    'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
    'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
    'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
    'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
    'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
    'Delhi', 'Lakshadweep', 'Puducherry'
  ];

  // Initialize with provided address
  useEffect(() => {
    if (initialAddress) {
      setAddress(prev => ({ ...prev, ...initialAddress }));
      if (initialAddress.coordinates) {
        setIsLocationSelected(true);
        setAutoFilledFromGPS(initialAddress.source === 'gps');
      }
    }
  }, [initialAddress]);

  // Parse address components from Google Places result
  const parseAddressComponents = (result) => {
    const components = result.address_components || [];
    const parsed = {
      doorNo: '',
      street: '',
      district: '',
      state: '',
      postalCode: ''
    };

    components.forEach(component => {
      const types = component.types;

      if (types.includes('street_number')) {
        parsed.doorNo = component.long_name;
      } else if (types.includes('route')) {
        parsed.street = component.long_name;
      } else if (types.includes('sublocality') || types.includes('locality')) {
        if (!parsed.district) {
          parsed.district = component.long_name;
        }
      } else if (types.includes('administrative_area_level_2')) {
        parsed.district = component.long_name;
      } else if (types.includes('administrative_area_level_1')) {
        parsed.state = component.long_name;
      } else if (types.includes('postal_code')) {
        parsed.postalCode = component.long_name;
      }
    });

    return parsed;
  };

  // Handle location selection from LocationPicker
  const handleLocationSelect = useCallback(async (location) => {
    if (!location) return;

    try {
      let addressData = {
        doorNo: '',
        street: '',
        district: '',
        state: '',
        postalCode: ''
      };

      // If we have detailed address info from the location picker
      if (location.address) {
        // Try to reverse geocode for detailed address components
        if (window.google?.maps) {
          const geocoder = new window.google.maps.Geocoder();

          try {
            const result = await new Promise((resolve, reject) => {
              geocoder.geocode(
                { location: { lat: location.lat, lng: location.lng } },
                (results, status) => {
                  if (status === 'OK' && results[0]) {
                    resolve(results[0]);
                  } else {
                    reject(new Error('Geocoding failed'));
                  }
                }
              );
            });

            addressData = parseAddressComponents(result);
          } catch (error) {
            console.warn('Reverse geocoding failed:', error);
          }
        }
      }

      const newAddress = {
        ...addressData,
        coordinates: { lat: location.lat, lng: location.lng },
        formatted: location.address || location.name || `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`,
        source: location.isCurrentLocation ? 'gps' : (location.placeId ? 'search' : 'manual')
      };

      setAddress(newAddress);
      setIsLocationSelected(true);
      setAutoFilledFromGPS(location.isCurrentLocation);

      // Show success message
      if (location.isCurrentLocation) {
        toast.success('📍 GPS location detected and address auto-filled!');
      } else if (location.placeId) {
        toast.success('📍 Location selected from search');
      } else {
        toast.success('📍 Location selected from map');
      }

      // Notify parent component
      if (onAddressSelect) {
        onAddressSelect(newAddress);
      }

    } catch (error) {
      console.error('Error processing location:', error);
      setValidationErrors(prev => ({ ...prev, general: 'Failed to process selected location' }));
    }
  }, [onAddressSelect]);

  // Validate individual field
  const validateField = (name, value) => {
    switch (name) {
      case 'street':
        return !value.trim() ? 'Street name is required' : '';
      case 'district':
        return !value.trim() ? 'District is required' : '';
      case 'state':
        return !value ? 'State is required' : '';
      case 'postalCode':
        if (!value.trim()) return 'Postal code is required';
        if (!/^[1-9][0-9]{5}$/.test(value)) return 'Please enter a valid Indian postal code';
        return '';
      default:
        return '';
    }
  };

  // Handle field blur for real-time validation
  const handleBlur = (e) => {
    const { name, value } = e.target;
    const errorMsg = validateField(name, value);
    setValidationErrors((prev) => ({ ...prev, [name]: errorMsg }));
  };

  // Clear errors when user starts typing
  const handleInputChange = (field, value) => {
    // Update address state
    setAddress(prev => ({
      ...prev,
      [field]: value,
      source: 'manual'
    }));

    // Clear existing error for this field when user starts typing
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Handle manual input changes (legacy - now integrated above)
  const handleManualInputChange = (field, value) => {
    const newAddress = { ...address, [field]: value };

    // Update formatted address when individual fields change
    if (['doorNo', 'street', 'district', 'state', 'postalCode'].includes(field)) {
      const formatted = [
        newAddress.doorNo,
        newAddress.street,
        newAddress.district,
        newAddress.state,
        newAddress.postalCode
      ].filter(part => part && part.trim()).join(', ');

      newAddress.formatted = formatted;
      newAddress.source = 'manual';
    }

    setAddress(newAddress);

    // Clear field-specific error
    if (validationErrors[field]) {
      setValidationErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }

    // Notify parent
    if (onAddressSelect) {
      onAddressSelect(newAddress);
    }
  };

  // Validate form
  const validateForm = () => {
    const errors = {};

    // Validate all fields
    const fields = ['street', 'district', 'state', 'postalCode'];
    fields.forEach(field => {
      const errorMsg = validateField(field, address[field]);
      if (errorMsg) errors[field] = errorMsg;
    });

    if (required && (!address.coordinates || !address.coordinates.lat)) {
      errors.general = 'Please select a location on the map';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form submission
  const handleSubmit = () => {
    if (validateForm()) {
      if (onAddressSelect) {
        onAddressSelect(address);
      }
      toast.success('Address saved successfully!');
    }
  };

  return (
    <div className={`address-form-container space-y-6 ${className}`}>
      {/* Header with enhanced animations */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center space-x-2">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
          >
            <Home className="h-5 w-5 text-fixly-accent" />
          </motion.div>
          <h3 className="text-lg font-semibold text-fixly-text">Your Address</h3>
        </div>

        {/* Enhanced View Mode Toggle */}
        <div className="flex items-center space-x-1 bg-fixly-bg/50 rounded-lg p-1 border border-fixly-border/50">
          <motion.button
            onClick={() => setViewMode('map')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 relative ${
              viewMode === 'map'
                ? 'bg-fixly-accent text-white shadow-sm'
                : 'text-fixly-text-muted hover:bg-fixly-accent/10 hover:text-fixly-accent'
            }`}
          >
            <Map className="h-4 w-4" />
            <span>Map</span>
            {viewMode === 'map' && (
              <motion.div
                layoutId="activeTab"
                className="absolute inset-0 bg-fixly-accent rounded-md -z-10"
                initial={false}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
          </motion.button>
          <motion.button
            onClick={() => setViewMode('form')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 relative ${
              viewMode === 'form'
                ? 'bg-fixly-accent text-white shadow-sm'
                : 'text-fixly-text-muted hover:bg-fixly-accent/10 hover:text-fixly-accent'
            }`}
          >
            <FileText className="h-4 w-4" />
            <span>Form</span>
            {viewMode === 'form' && (
              <motion.div
                layoutId="activeTab"
                className="absolute inset-0 bg-fixly-accent rounded-md -z-10"
                initial={false}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
          </motion.button>
        </div>
      </motion.div>

      {/* Error Display */}
      {validationErrors.general && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg"
        >
          <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
          <span className="text-sm text-red-700">{validationErrors.general}</span>
        </motion.div>
      )}

      {/* Enhanced GPS Status */}
      <AnimatePresence>
        {autoFilledFromGPS && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="relative overflow-hidden"
          >
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: '100%' }}
              transition={{ duration: 1.5, ease: "easeInOut", repeat: Infinity }}
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
            />
            <div className="flex items-center space-x-3 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl shadow-sm">
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="flex-shrink-0"
              >
                <Navigation className="h-5 w-5 text-green-600" />
              </motion.div>
              <div className="flex-1">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-sm font-semibold text-green-800 flex items-center space-x-2"
                >
                  <span>GPS Location Auto-filled</span>
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="w-2 h-2 bg-green-500 rounded-full"
                  />
                </motion.div>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="text-xs text-green-600 mt-1"
                >
                  Your address has been automatically detected and filled using GPS
                </motion.div>
              </div>
              <motion.button
                whileHover={{ scale: 1.1, rotate: 15 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                  setAutoFilledFromGPS(false);
                  setIsLocationSelected(false);
                  setAddress(prev => ({ ...prev, source: 'manual' }));
                }}
                className="flex-shrink-0 p-2 text-green-600 hover:text-green-800 hover:bg-green-100 rounded-lg transition-all duration-200"
                title="Edit manually"
              >
                <Edit3 className="h-4 w-4" />
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      <AnimatePresence mode="wait">
        {viewMode === 'map' ? (
          <motion.div
            key="map"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-4"
          >
            {/* Location Picker */}
            <LocationPicker
              onLocationSelect={handleLocationSelect}
              initialLocation={address.coordinates ? {
                lat: address.coordinates.lat,
                lng: address.coordinates.lng,
                address: address.formatted
              } : null}
              allowCurrentLocation={allowGPSAutoFill}
              disabled={disabled}
              height="400px"
              zoom={15}
              showRecentLocations={true}
              maxRecentLocations={5}
              showQuickCities={true}
              placeholder="Search for your address..."
              className="rounded-lg border border-fixly-border overflow-hidden"
            />

            {/* Enhanced Quick Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex space-x-2"
            >
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setViewMode('form')}
                disabled={!isLocationSelected}
                className={`btn-primary flex-1 flex items-center justify-center space-x-2 transition-all duration-200 ${
                  !isLocationSelected ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-lg'
                }`}
              >
                <motion.div
                  animate={isLocationSelected ? { scale: [1, 1.2, 1] } : {}}
                  transition={{ duration: 0.6 }}
                >
                  <CheckCircle className="h-4 w-4" />
                </motion.div>
                <span>{isLocationSelected ? 'Review & Complete Address' : 'Select Location First'}</span>
              </motion.button>
            </motion.div>
          </motion.div>
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            {/* Selected Location Display */}
            {isLocationSelected && address.formatted && (
              <div className="p-4 bg-fixly-accent/5 border border-fixly-accent/20 rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-fixly-text mb-1">
                      Selected Location
                    </div>
                    <div className="text-sm text-fixly-text-light">
                      {address.formatted}
                    </div>
                    {address.coordinates && (
                      <div className="text-xs text-fixly-text-muted mt-1">
                        📍 {address.coordinates.lat.toFixed(6)}, {address.coordinates.lng.toFixed(6)}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => setViewMode('map')}
                    className="text-fixly-accent hover:text-fixly-accent-dark"
                  >
                    <MapPin className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Address Form Fields */}
            <div className="grid grid-cols-1 gap-4">
              {/* Door/House Number */}
              <div>
                <label htmlFor="doorNo" className="block text-sm font-medium text-fixly-text mb-1">
                  Door/House Number
                </label>
                <input
                  id="doorNo"
                  name="doorNo"
                  type="text"
                  value={address.doorNo}
                  onChange={(e) => handleInputChange('doorNo', e.target.value)}
                  onBlur={handleBlur}
                  placeholder="123, A-45, etc."
                  disabled={disabled}
                  className="input-field"
                />
              </div>

              {/* Street Name */}
              <div>
                <label htmlFor="street" className="block text-sm font-medium text-fixly-text mb-1">
                  Street Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="street"
                  name="street"
                  type="text"
                  value={address.street}
                  onChange={(e) => handleInputChange('street', e.target.value)}
                  onBlur={handleBlur}
                  placeholder="Main Street, MG Road, etc."
                  disabled={disabled}
                  className={`input-field ${validationErrors.street ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                />
                {validationErrors.street && (
                  <p className="mt-1 text-xs text-red-600" role="alert">{validationErrors.street}</p>
                )}
              </div>

              {/* District */}
              <div>
                <label htmlFor="district" className="block text-sm font-medium text-fixly-text mb-1">
                  District/City <span className="text-red-500">*</span>
                </label>
                <input
                  id="district"
                  name="district"
                  type="text"
                  value={address.district}
                  onChange={(e) => handleInputChange('district', e.target.value)}
                  onBlur={handleBlur}
                  placeholder="Mumbai, Bangalore, Delhi, etc."
                  disabled={disabled}
                  className={`input-field ${validationErrors.district ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                />
                {validationErrors.district && (
                  <p className="mt-1 text-xs text-red-600" role="alert">{validationErrors.district}</p>
                )}
              </div>

              {/* State */}
              <div>
                <label htmlFor="state" className="block text-sm font-medium text-fixly-text mb-1">
                  State <span className="text-red-500">*</span>
                </label>
                <select
                  id="state"
                  name="state"
                  value={address.state}
                  onChange={(e) => handleInputChange('state', e.target.value)}
                  onBlur={handleBlur}
                  disabled={disabled}
                  className={`input-field ${validationErrors.state ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                >
                  <option value="">Select State</option>
                  {indianStates.map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </select>
                {validationErrors.state && (
                  <p className="mt-1 text-xs text-red-600" role="alert">{validationErrors.state}</p>
                )}
              </div>

              {/* Postal Code */}
              <div>
                <label htmlFor="postalCode" className="block text-sm font-medium text-fixly-text mb-1">
                  Postal Code <span className="text-red-500">*</span>
                </label>
                <input
                  id="postalCode"
                  name="postalCode"
                  type="text"
                  value={address.postalCode}
                  onChange={(e) => {
                    // Auto-format postal code: only numbers, max 6 digits
                    const formatted = e.target.value.replace(/\D/g, '').slice(0, 6);
                    handleInputChange('postalCode', formatted);
                  }}
                  onBlur={handleBlur}
                  placeholder="400001, 560001, etc."
                  disabled={disabled}
                  maxLength={6}
                  className={`input-field ${validationErrors.postalCode ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                />
                {validationErrors.postalCode && (
                  <p className="mt-1 text-xs text-red-600" role="alert">{validationErrors.postalCode}</p>
                )}
              </div>
            </div>

            {/* Enhanced Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex space-x-3 pt-4"
            >
              <motion.button
                whileHover={{ scale: 1.02, x: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setViewMode('map')}
                className="btn-ghost flex-1 flex items-center justify-center space-x-2 hover:shadow-md transition-all duration-200"
              >
                <motion.div
                  whileHover={{ x: -2 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  <MapPin className="h-4 w-4" />
                </motion.div>
                <span>Back to Map</span>
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSubmit}
                disabled={disabled}
                className="btn-primary flex-1 flex items-center justify-center space-x-2 hover:shadow-lg transition-all duration-200"
              >
                <motion.div
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                >
                  <CheckCircle className="h-4 w-4" />
                </motion.div>
                <span>Save Address</span>
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Validation Summary */}
      {required && Object.keys(validationErrors).length > 0 && (
        <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
          <p className="text-sm text-orange-700">
            Please complete all required fields and select a location on the map.
          </p>
        </div>
      )}
    </div>
  );
};

export default AddressForm;