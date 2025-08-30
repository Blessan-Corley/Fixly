// utils/geocodingService.js - Automatic address filling with reverse geocoding
import { toast } from 'sonner';

class GeocodingService {
  constructor() {
    this.googleApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    this.mapboxApiKey = process.env.NEXT_PUBLIC_MAPBOX_API_KEY;
    
    // Cache for geocoding results (15-minute TTL)
    this.cache = new Map();
    this.cacheTimeout = 15 * 60 * 1000; // 15 minutes
    
    // Rate limiting
    this.requestCounts = new Map();
    this.resetTime = Date.now() + 60000; // Reset every minute
    
    // Preferred service order: Google > Mapbox > OpenStreetMap (free)
    this.services = [];
    if (this.googleApiKey) this.services.push('google');
    if (this.mapboxApiKey) this.services.push('mapbox');
    this.services.push('openstreetmap'); // Always available as fallback
    
    // Service health tracking
    this.serviceHealth = {
      google: { failures: 0, lastFailure: null },
      mapbox: { failures: 0, lastFailure: null },
      openstreetmap: { failures: 0, lastFailure: null }
    };
  }

  // Cache management
  getCacheKey(lat, lng, type = 'reverse') {
    return `${type}:${lat.toFixed(4)}:${lng.toFixed(4)}`;
  }
  
  getFromCache(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }
  
  setToCache(key, data) {
    this.cache.set(key, { data, timestamp: Date.now() });
    // Clean old cache entries (keep max 1000 entries)
    if (this.cache.size > 1000) {
      const entries = Array.from(this.cache.entries());
      const oldEntries = entries.slice(0, entries.length - 500);
      oldEntries.forEach(([k]) => this.cache.delete(k));
    }
  }
  
  // Rate limiting check
  checkRateLimit(service) {
    const now = Date.now();
    if (now > this.resetTime) {
      this.requestCounts.clear();
      this.resetTime = now + 60000;
    }
    
    const count = this.requestCounts.get(service) || 0;
    const limits = { google: 50, mapbox: 50, openstreetmap: 30 }; // Per minute
    
    if (count >= limits[service]) {
      throw new Error(`Rate limit exceeded for ${service}`);
    }
    
    this.requestCounts.set(service, count + 1);
  }
  
  // Service health check
  isServiceHealthy(service) {
    const health = this.serviceHealth[service];
    const now = Date.now();
    
    // If service has failed more than 3 times in last 5 minutes, consider unhealthy
    if (health.failures >= 3 && health.lastFailure && (now - health.lastFailure) < 300000) {
      return false;
    }
    
    // Reset failures after 10 minutes
    if (health.lastFailure && (now - health.lastFailure) > 600000) {
      health.failures = 0;
      health.lastFailure = null;
    }
    
    return true;
  }
  
  recordServiceFailure(service, error) {
    const health = this.serviceHealth[service];
    health.failures++;
    health.lastFailure = Date.now();
    console.warn(`Service ${service} failed:`, error.message);
  }
  
  recordServiceSuccess(service) {
    const health = this.serviceHealth[service];
    health.failures = Math.max(0, health.failures - 1); // Gradually recover
  }

  // Main method to get address from coordinates (enhanced)
  async reverseGeocode(lat, lng, options = {}) {
    const { preferredService = 'auto', silent = false, useCache = true } = options;
    
    // Validate coordinates with more precision
    if (!lat || !lng || 
        typeof lat !== 'number' || typeof lng !== 'number' ||
        Math.abs(lat) > 90 || Math.abs(lng) > 180 ||
        isNaN(lat) || isNaN(lng)) {
      throw new Error('Invalid coordinates provided');
    }

    // Check cache first
    if (useCache) {
      const cacheKey = this.getCacheKey(lat, lng);
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        if (!silent) console.log('📦 Using cached address result');
        return { ...cached, fromCache: true };
      }
    }

    // Determine which services to use (filter by health)
    let servicesToTry = preferredService === 'auto' ? [...this.services] : [preferredService];
    
    servicesToTry = servicesToTry.filter(service => {
      if (service === 'google') return !!this.googleApiKey && this.isServiceHealthy(service);
      if (service === 'mapbox') return !!this.mapboxApiKey && this.isServiceHealthy(service);
      return this.isServiceHealthy(service);
    });
    
    // If no healthy services, try all available ones as last resort
    if (servicesToTry.length === 0) {
      servicesToTry = this.services.filter(service => {
        if (service === 'google') return !!this.googleApiKey;
        if (service === 'mapbox') return !!this.mapboxApiKey;
        return true;
      });
    }

    let lastError = null;
    
    // Try each service in order
    for (const service of servicesToTry) {
      try {
        // Check rate limits
        this.checkRateLimit(service);
        
        const result = await this[`${service}ReverseGeocode`](lat, lng);
        if (result) {
          // Record success
          this.recordServiceSuccess(service);
          
          const finalResult = {
            ...result,
            service: service,
            coordinates: { lat, lng },
            timestamp: Date.now()
          };
          
          // Cache the result
          if (useCache) {
            const cacheKey = this.getCacheKey(lat, lng);
            this.setToCache(cacheKey, finalResult);
          }
          
          if (!silent) {
            console.log(`✅ Address resolved using ${service}:`, result.formatted);
          }
          
          return finalResult;
        }
      } catch (error) {
        lastError = error;
        this.recordServiceFailure(service, error);
        
        // Don't log rate limit errors as warnings
        if (!error.message.includes('Rate limit')) {
          console.warn(`${service} geocoding failed:`, error.message);
        }
      }
    }
    
    // All services failed - provide fallback
    const fallbackResult = {
      success: false,
      coordinates: { lat, lng },
      formatted: `Location: ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
      city: 'Unknown',
      state: 'Unknown', 
      country: 'India',
      service: 'fallback',
      error: lastError?.message || 'All geocoding services unavailable'
    };
    
    if (!silent) {
      console.warn('⚠️ All geocoding services failed, using fallback');
    }
    
    return fallbackResult;
  }

  // Google Maps Geocoding API (Most Accurate for India) - Enhanced
  async googleReverseGeocode(lat, lng) {
    if (!this.googleApiKey) {
      throw new Error('Google Maps API key not configured');
    }

    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${this.googleApiKey}&language=en&region=in&result_type=street_address|route|neighborhood|locality|administrative_area`;
    
    // Add timeout and proper error handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
    
    try {
      const response = await fetch(url, { 
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Fixly/1.0'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Handle different status codes
      if (data.status === 'OVER_QUERY_LIMIT') {
        throw new Error('Google Maps API quota exceeded');
      }
      
      if (data.status === 'REQUEST_DENIED') {
        throw new Error('Google Maps API request denied - check API key');
      }
      
      if (data.status === 'INVALID_REQUEST') {
        throw new Error('Invalid request parameters');
      }
      
      if (data.status !== 'OK' || !data.results?.length) {
        throw new Error(`Google geocoding failed: ${data.status}`);
      }

      const result = data.results[0];
      const components = this.parseGoogleComponents(result.address_components);
      
      return {
        success: true,
        formatted: result.formatted_address,
        components: components,
        accuracy: this.getGoogleAccuracy(result.geometry.location_type),
        placeId: result.place_id,
        confidence: this.getGoogleConfidence(result.geometry.location_type),
        raw: result
      };
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error('Google geocoding request timed out');
      }
      
      throw error;
    }
  }

  // Mapbox Geocoding API
  async mapboxReverseGeocode(lat, lng) {
    if (!this.mapboxApiKey) {
      throw new Error('Mapbox API key not configured');
    }

    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${this.mapboxApiKey}&country=in&language=en`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (!data.features?.length) {
      throw new Error('Mapbox geocoding returned no results');
    }

    const feature = data.features[0];
    const components = this.parseMapboxComponents(feature);
    
    return {
      formatted: feature.place_name,
      components: components,
      accuracy: 'high',
      confidence: feature.relevance,
      raw: feature
    };
  }

  // OpenStreetMap Nominatim (Free) - Enhanced
  async openstreetmapReverseGeocode(lat, lng) {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&accept-language=en&countrycodes=in&zoom=18&extratags=1`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout for free service
    
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Fixly-App/1.0 (contact@fixly.app)', // Required by Nominatim
          'Accept': 'application/json',
          'Accept-Language': 'en'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('OpenStreetMap rate limit exceeded');
        }
        throw new Error(`OpenStreetMap geocoding failed: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data || data.error) {
        throw new Error(`OpenStreetMap geocoding error: ${data?.error || 'No results'}`);
      }
      
      // Check if result is too generic (e.g., just country level)
      if (data.type === 'country' || !data.address) {
        throw new Error('OpenStreetMap result too generic');
      }

      const components = this.parseNominatimComponents(data.address);
      
      return {
        success: true,
        formatted: data.display_name,
        components: components,
        accuracy: this.getNominatimAccuracy(data.type, data.class),
        confidence: parseFloat(data.importance || 0),
        osm_id: data.osm_id,
        osm_type: data.osm_type,
        raw: data
      };
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error('OpenStreetMap request timed out');
      }
      
      throw error;
    }
  }

  // Parse Google address components
  parseGoogleComponents(addressComponents) {
    const components = {
      streetNumber: '',
      streetName: '',
      subLocality: '',
      locality: '',
      city: '',
      district: '',
      state: '',
      country: '',
      pincode: '',
      area: ''
    };

    for (const component of addressComponents) {
      const types = component.types;
      const longName = component.long_name;
      const shortName = component.short_name;

      if (types.includes('street_number')) {
        components.streetNumber = longName;
      } else if (types.includes('route')) {
        components.streetName = longName;
      } else if (types.includes('sublocality_level_1') || types.includes('sublocality')) {
        components.subLocality = longName;
        components.area = longName; // Use as area
      } else if (types.includes('locality')) {
        components.locality = longName;
        if (!components.city) components.city = longName;
      } else if (types.includes('administrative_area_level_2')) {
        components.district = longName;
        if (!components.city) components.city = longName;
      } else if (types.includes('administrative_area_level_1')) {
        components.state = longName;
      } else if (types.includes('country')) {
        components.country = longName;
      } else if (types.includes('postal_code')) {
        components.pincode = longName;
      }
    }

    // Build full address components
    const addressParts = [];
    if (components.streetNumber) addressParts.push(components.streetNumber);
    if (components.streetName) addressParts.push(components.streetName);
    
    return {
      ...components,
      fullStreet: addressParts.join(' ') || components.area || components.subLocality,
      fullAddress: addressParts.join(' ') + (components.area ? `, ${components.area}` : '') + (components.city ? `, ${components.city}` : '') + (components.state ? `, ${components.state}` : '') + (components.pincode ? ` ${components.pincode}` : '')
    };
  }

  // Parse Mapbox components
  parseMapboxComponents(feature) {
    const context = feature.context || [];
    const components = {
      streetNumber: '',
      streetName: feature.text || '',
      subLocality: '',
      locality: '',
      city: '',
      district: '',
      state: '',
      country: 'India',
      pincode: '',
      area: ''
    };

    for (const ctx of context) {
      if (ctx.id.startsWith('postcode')) {
        components.pincode = ctx.text;
      } else if (ctx.id.startsWith('place')) {
        components.city = ctx.text;
        components.locality = ctx.text;
      } else if (ctx.id.startsWith('district')) {
        components.district = ctx.text;
      } else if (ctx.id.startsWith('region')) {
        components.state = ctx.text;
      } else if (ctx.id.startsWith('neighborhood')) {
        components.area = ctx.text;
        components.subLocality = ctx.text;
      }
    }

    return {
      ...components,
      fullStreet: components.streetName,
      fullAddress: `${components.streetName}${components.area ? `, ${components.area}` : ''}${components.city ? `, ${components.city}` : ''}${components.state ? `, ${components.state}` : ''}${components.pincode ? ` ${components.pincode}` : ''}`
    };
  }

  // Parse Nominatim components
  parseNominatimComponents(address) {
    return {
      streetNumber: address.house_number || '',
      streetName: address.road || '',
      subLocality: address.suburb || address.neighbourhood || '',
      locality: address.suburb || address.city_district || '',
      city: address.city || address.town || address.village || '',
      district: address.state_district || '',
      state: address.state || '',
      country: address.country || 'India',
      pincode: address.postcode || '',
      area: address.neighbourhood || address.suburb || '',
      fullStreet: `${address.house_number || ''} ${address.road || ''}`.trim(),
      fullAddress: `${address.house_number || ''} ${address.road || ''}${address.neighbourhood ? `, ${address.neighbourhood}` : ''}${address.city || address.town ? `, ${address.city || address.town}` : ''}${address.state ? `, ${address.state}` : ''}${address.postcode ? ` ${address.postcode}` : ''}`.trim()
    };
  }

  // Get accuracy level from Google's location_type
  getGoogleAccuracy(locationType) {
    const accuracyMap = {
      'ROOFTOP': 'very_high',      // ~1-5 meters
      'RANGE_INTERPOLATED': 'high', // ~10-50 meters  
      'GEOMETRIC_CENTER': 'medium', // ~100-500 meters
      'APPROXIMATE': 'low'          // >1000 meters
    };
    return accuracyMap[locationType] || 'unknown';
  }
  
  // Get confidence score from Google's location_type
  getGoogleConfidence(locationType) {
    const confidenceMap = {
      'ROOFTOP': 0.95,
      'RANGE_INTERPOLATED': 0.85,
      'GEOMETRIC_CENTER': 0.70,
      'APPROXIMATE': 0.50
    };
    return confidenceMap[locationType] || 0.30;
  }
  
  // Get accuracy from Nominatim result type
  getNominatimAccuracy(type, classification) {
    if (type === 'house' || type === 'building') return 'high';
    if (type === 'residential' || type === 'commercial') return 'medium';
    if (classification === 'highway' || type === 'road') return 'medium';
    if (type === 'neighbourhood' || type === 'suburb') return 'low';
    if (type === 'city' || type === 'town') return 'very_low';
    return 'unknown';
  }

  // Forward geocoding (address to coordinates) - for when users type addresses
  async forwardGeocode(address, options = {}) {
    const { preferredService = 'auto', silent = false } = options;
    
    let servicesToTry = preferredService === 'auto' ? this.services : [preferredService];
    servicesToTry = servicesToTry.filter(service => {
      if (service === 'google') return !!this.googleApiKey;
      if (service === 'mapbox') return !!this.mapboxApiKey;
      return true;
    });

    for (const service of servicesToTry) {
      try {
        const result = await this[`${service}ForwardGeocode`](address);
        if (result) {
          if (!silent) {
            console.log(`✅ Coordinates found using ${service}:`, result.coordinates);
          }
          return { ...result, service };
        }
      } catch (error) {
        console.warn(`${service} forward geocoding failed:`, error.message);
      }
    }
    
    throw new Error('Address geocoding failed with all services');
  }

  // Google forward geocoding
  async googleForwardGeocode(address) {
    if (!this.googleApiKey) {
      throw new Error('Google Maps API key not configured');
    }

    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${this.googleApiKey}&region=in`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status !== 'OK' || !data.results?.length) {
      throw new Error(`Google geocoding failed: ${data.status}`);
    }

    const result = data.results[0];
    
    return {
      coordinates: {
        lat: result.geometry.location.lat,
        lng: result.geometry.location.lng
      },
      formatted: result.formatted_address,
      accuracy: this.getGoogleAccuracy(result.geometry.location_type),
      components: this.parseGoogleComponents(result.address_components),
      placeId: result.place_id
    };
  }

  // Simple interface for location auto-fill
  async getLocationDetails(lat, lng, silent = true) {
    try {
      const result = await this.reverseGeocode(lat, lng, { silent });
      
      return {
        success: true,
        coordinates: { lat, lng },
        formatted: result.formatted,
        street: result.components.fullStreet,
        area: result.components.area || result.components.subLocality,
        city: result.components.city,
        district: result.components.district,
        state: result.components.state,
        pincode: result.components.pincode,
        country: result.components.country,
        accuracy: result.accuracy,
        service: result.service
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        coordinates: { lat, lng },
        // Fallback data
        formatted: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        city: 'Unknown',
        state: 'Unknown',
        country: 'India'
      };
    }
  }
}

// Create singleton instance
export const geocodingService = new GeocodingService();

// Convenience functions
export const getAddressFromCoordinates = (lat, lng, options) => 
  geocodingService.getLocationDetails(lat, lng, options?.silent);

export const getCoordinatesFromAddress = (address, options) => 
  geocodingService.forwardGeocode(address, options);

export default geocodingService;