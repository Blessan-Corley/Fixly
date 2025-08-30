// utils/locationPrecision.js - Enhanced location handling with precision controls
import { validateAndSanitize } from './validation';

// Location precision levels for privacy control
export const LOCATION_PRECISION = {
  EXACT: 'exact',        // Full GPS precision (±1-5m)
  HIGH: 'high',          // High precision (±10-50m) 
  MEDIUM: 'medium',      // Medium precision (±100-500m)
  LOW: 'low',            // Low precision (±1-5km)
  CITY: 'city',          // City level only
  HIDDEN: 'hidden'       // No location sharing
};

// Privacy levels and their corresponding precision
export const PRIVACY_LEVELS = {
  [LOCATION_PRECISION.EXACT]: {
    latPrecision: 6,       // ±1.11m
    lngPrecision: 6,       // ±1.11m
    showExactLocation: true,
    showApproximateLocation: true,
    allowJobMatching: true,
    description: 'Exact location for best job matching'
  },
  [LOCATION_PRECISION.HIGH]: {
    latPrecision: 4,       // ±11.1m
    lngPrecision: 4,       // ±11.1m
    showExactLocation: true,
    showApproximateLocation: true,
    allowJobMatching: true,
    description: 'High precision for good job matching'
  },
  [LOCATION_PRECISION.MEDIUM]: {
    latPrecision: 3,       // ±111m
    lngPrecision: 3,       // ±111m
    showExactLocation: false,
    showApproximateLocation: true,
    allowJobMatching: true,
    description: 'Approximate location for privacy'
  },
  [LOCATION_PRECISION.LOW]: {
    latPrecision: 2,       // ±1.1km
    lngPrecision: 2,       // ±1.1km
    showExactLocation: false,
    showApproximateLocation: true,
    allowJobMatching: true,
    description: 'General area only'
  },
  [LOCATION_PRECISION.CITY]: {
    latPrecision: 1,       // ±11km (city level)
    lngPrecision: 1,       // ±11km (city level)
    showExactLocation: false,
    showApproximateLocation: true,
    allowJobMatching: false,
    description: 'City level only'
  },
  [LOCATION_PRECISION.HIDDEN]: {
    latPrecision: 0,       // No coordinates
    lngPrecision: 0,       // No coordinates
    showExactLocation: false,
    showApproximateLocation: false,
    allowJobMatching: false,
    description: 'Location hidden'
  }
};

/**
 * Process and store location with appropriate precision
 * @param {Object} locationData - Raw location data from user
 * @param {string} precisionLevel - Desired precision level
 * @param {Object} options - Additional options
 * @returns {Object} Processed location data
 */
export function processLocationData(locationData, precisionLevel = LOCATION_PRECISION.MEDIUM, options = {}) {
  const {
    source = 'user_input',
    accuracy = null,
    timestamp = new Date(),
    userConsent = false
  } = options;

  // Validate input coordinates
  const coordinates = validateAndSanitize.coordinates(locationData.lat, locationData.lng);
  
  // Get precision settings
  const precision = PRIVACY_LEVELS[precisionLevel] || PRIVACY_LEVELS[LOCATION_PRECISION.MEDIUM];
  
  // Apply precision reduction
  const processedLat = applyPrecision(coordinates.lat, precision.latPrecision);
  const processedLng = applyPrecision(coordinates.lng, precision.lngPrecision);

  // Create standardized location object
  const processedLocation = {
    // Exact coordinates (stored but access controlled by privacy settings)
    exactLocation: userConsent ? {
      lat: coordinates.lat,
      lng: coordinates.lng,
      accuracy: accuracy,
      source: source,
      timestamp: timestamp
    } : null,

    // Processed coordinates for job matching
    coordinates: precision.allowJobMatching ? {
      type: 'Point',
      coordinates: [processedLng, processedLat] // GeoJSON format: [longitude, latitude]
    } : null,

    // Individual lat/lng for compatibility
    lat: precision.showExactLocation ? processedLat : null,
    lng: precision.showExactLocation ? processedLng : null,

    // Address components (sanitized)
    address: locationData.address ? sanitizeAddressComponent(locationData.address) : null,
    city: locationData.city ? sanitizeAddressComponent(locationData.city) : null,
    state: locationData.state ? sanitizeAddressComponent(locationData.state) : null,
    pincode: locationData.pincode ? sanitizePincode(locationData.pincode) : null,
    country: locationData.country || 'IN',

    // Metadata
    precisionLevel: precisionLevel,
    hasGeoLocation: precision.allowJobMatching,
    locationSource: source,
    lastUpdated: timestamp,
    
    // Privacy flags
    privacy: {
      showExactLocation: precision.showExactLocation,
      showApproximateLocation: precision.showApproximateLocation,
      allowJobMatching: precision.allowJobMatching,
      userConsent: userConsent
    },

    // Search optimization
    searchArea: generateSearchArea(processedLat, processedLng, precisionLevel),
    
    // For analytics (anonymized)
    analyticsRegion: generateAnalyticsRegion(coordinates.lat, coordinates.lng)
  };

  return processedLocation;
}

/**
 * Apply precision reduction to coordinates
 * @param {number} coordinate - Original coordinate
 * @param {number} precision - Number of decimal places
 * @returns {number} Reduced precision coordinate
 */
function applyPrecision(coordinate, precision) {
  if (precision <= 0) return null;
  return Math.round(coordinate * Math.pow(10, precision)) / Math.pow(10, precision);
}

/**
 * Generate search area for job matching
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude  
 * @param {string} precisionLevel - Precision level
 * @returns {Object} Search area definition
 */
function generateSearchArea(lat, lng, precisionLevel) {
  if (!lat || !lng) return null;

  const radiusMap = {
    [LOCATION_PRECISION.EXACT]: 5,     // 5km radius
    [LOCATION_PRECISION.HIGH]: 10,     // 10km radius
    [LOCATION_PRECISION.MEDIUM]: 25,   // 25km radius
    [LOCATION_PRECISION.LOW]: 50,      // 50km radius
    [LOCATION_PRECISION.CITY]: 100,    // 100km radius
    [LOCATION_PRECISION.HIDDEN]: 0     // No search
  };

  const radius = radiusMap[precisionLevel] || 25;

  return radius > 0 ? {
    center: { lat, lng },
    radius: radius,
    unit: 'km',
    type: 'circle'
  } : null;
}

/**
 * Generate anonymized analytics region
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {string} Analytics region identifier
 */
function generateAnalyticsRegion(lat, lng) {
  // Create a coarse grid for analytics (10km x 10km squares)
  const gridSize = 0.09; // Approximately 10km at equator
  const gridLat = Math.floor(lat / gridSize) * gridSize;
  const gridLng = Math.floor(lng / gridSize) * gridSize;
  
  return `${gridLat.toFixed(2)},${gridLng.toFixed(2)}`;
}

/**
 * Sanitize address components
 * @param {string} component - Address component
 * @returns {string} Sanitized component
 */
function sanitizeAddressComponent(component) {
  if (typeof component !== 'string') return null;
  
  return component
    .trim()
    .replace(/[<>\"'&\\]/g, '') // Remove dangerous characters
    .replace(/\s+/g, ' ') // Normalize whitespace
    .substring(0, 100); // Limit length
}

/**
 * Sanitize and validate pincode
 * @param {string} pincode - Input pincode
 * @returns {string|null} Valid pincode or null
 */
function sanitizePincode(pincode) {
  if (typeof pincode !== 'string') return null;
  
  const cleaned = pincode.replace(/\D/g, ''); // Remove non-digits
  
  // Validate Indian pincode format
  if (/^[1-9]\d{5}$/.test(cleaned)) {
    return cleaned;
  }
  
  return null;
}

/**
 * Get location data based on user's privacy settings
 * @param {Object} storedLocation - Location from database
 * @param {Object} requester - User requesting the location
 * @param {string} context - Context of the request ('profile', 'job_matching', 'public')
 * @returns {Object} Location data appropriate for the context
 */
export function getLocationForContext(storedLocation, requester = null, context = 'public') {
  if (!storedLocation || !storedLocation.privacy) {
    return { city: storedLocation?.city || null, state: storedLocation?.state || null };
  }

  const privacy = storedLocation.privacy;
  const isOwner = requester && storedLocation.userId === requester.id;

  // Owner always sees full data
  if (isOwner) {
    return storedLocation;
  }

  // Context-based access control
  switch (context) {
    case 'job_matching':
      return privacy.allowJobMatching ? {
        coordinates: storedLocation.coordinates,
        searchArea: storedLocation.searchArea,
        city: storedLocation.city,
        state: storedLocation.state,
        precisionLevel: storedLocation.precisionLevel
      } : { city: storedLocation.city, state: storedLocation.state };

    case 'profile':
      return privacy.showApproximateLocation ? {
        city: storedLocation.city,
        state: storedLocation.state,
        ...(privacy.showExactLocation && {
          lat: storedLocation.lat,
          lng: storedLocation.lng
        })
      } : { city: storedLocation.city };

    case 'public':
    default:
      return privacy.showApproximateLocation ? {
        city: storedLocation.city,
        state: storedLocation.state
      } : {};
  }
}

/**
 * Calculate distance between two locations with precision consideration
 * @param {Object} location1 - First location
 * @param {Object} location2 - Second location
 * @returns {number|null} Distance in kilometers or null if not calculable
 */
export function calculatePreciseDistance(location1, location2) {
  // Use exact coordinates if available and user consents
  const coords1 = getCoordinatesForDistance(location1);
  const coords2 = getCoordinatesForDistance(location2);

  if (!coords1 || !coords2) return null;

  return haversineDistance(coords1.lat, coords1.lng, coords2.lat, coords2.lng);
}

/**
 * Get coordinates for distance calculation based on precision
 * @param {Object} location - Location object
 * @returns {Object|null} Coordinates or null
 */
function getCoordinatesForDistance(location) {
  // Prefer exact location if available and permitted
  if (location.exactLocation && location.privacy?.userConsent) {
    return location.exactLocation;
  }
  
  // Fall back to processed coordinates
  if (location.lat && location.lng) {
    return { lat: location.lat, lng: location.lng };
  }
  
  // Try GeoJSON coordinates
  if (location.coordinates?.coordinates) {
    const [lng, lat] = location.coordinates.coordinates;
    return { lat, lng };
  }
  
  return null;
}

/**
 * Haversine distance calculation
 * @param {number} lat1 - Latitude of first point
 * @param {number} lng1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lng2 - Longitude of second point
 * @returns {number} Distance in kilometers
 */
function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c;
}

/**
 * Convert degrees to radians
 * @param {number} degrees - Degrees
 * @returns {number} Radians
 */
function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

/**
 * Validate location update request
 * @param {Object} locationData - Location data from request
 * @param {Object} user - User making the request
 * @returns {Object} Validation result
 */
export function validateLocationUpdate(locationData, user) {
  try {
    // Basic validation
    if (!locationData) {
      throw new Error('Location data is required');
    }

    // Validate coordinates if provided
    if (locationData.lat !== undefined || locationData.lng !== undefined) {
      validateAndSanitize.coordinates(locationData.lat, locationData.lng);
    }

    // Validate precision level
    const precision = locationData.precisionLevel || LOCATION_PRECISION.MEDIUM;
    if (!Object.values(LOCATION_PRECISION).includes(precision)) {
      throw new Error('Invalid precision level');
    }

    // Validate consent for precise location
    if (precision === LOCATION_PRECISION.EXACT && !locationData.userConsent) {
      throw new Error('User consent required for exact location sharing');
    }

    // Rate limiting check (user-specific)
    // This should be implemented in the calling code using existing rate limiting

    return { valid: true, precision };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

export default {
  processLocationData,
  getLocationForContext,
  calculatePreciseDistance,
  validateLocationUpdate,
  LOCATION_PRECISION,
  PRIVACY_LEVELS
};