// utils/optimizedLocationAlgorithms.js - High-performance location algorithms
import { LOCATION_PRECISION, PRIVACY_LEVELS } from './locationPrecision';

/**
 * Optimized Haversine distance calculation with caching
 * Uses fast approximation for nearby distances and exact calculation for far distances
 */
class DistanceCalculator {
  constructor() {
    this.cache = new Map();
    this.maxCacheSize = 1000;
    
    // Pre-calculated constants for performance
    this.EARTH_RADIUS_KM = 6371;
    this.DEG_TO_RAD = Math.PI / 180;
    this.KM_PER_DEGREE_LAT = 110.574; // Approximate km per degree latitude
    this.FAST_DISTANCE_THRESHOLD = 50; // Use fast approximation under 50km
  }

  /**
   * High-performance distance calculation with caching and optimization
   * @param {number} lat1 - First latitude
   * @param {number} lng1 - First longitude
   * @param {number} lat2 - Second latitude
   * @param {number} lng2 - Second longitude
   * @returns {number} Distance in kilometers
   */
  calculate(lat1, lng1, lat2, lng2) {
    // Input validation with fast checks
    if (!this.isValidCoordinate(lat1, lng1) || !this.isValidCoordinate(lat2, lng2)) {
      return null;
    }

    // Check cache first
    const cacheKey = `${lat1.toFixed(4)},${lng1.toFixed(4)},${lat2.toFixed(4)},${lng2.toFixed(4)}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    let distance;

    // Use fast approximation for short distances
    const roughDistance = this.fastApproximateDistance(lat1, lng1, lat2, lng2);
    
    if (roughDistance < this.FAST_DISTANCE_THRESHOLD) {
      // For nearby locations, use equirectangular approximation (much faster)
      distance = this.equirectangularDistance(lat1, lng1, lat2, lng2);
    } else {
      // For far locations, use accurate Haversine formula
      distance = this.haversineDistance(lat1, lng1, lat2, lng2);
    }

    // Cache the result with LRU eviction
    this.cacheResult(cacheKey, distance);
    
    return distance;
  }

  /**
   * Ultra-fast distance approximation for initial filtering
   * @param {number} lat1 - First latitude
   * @param {number} lng1 - First longitude
   * @param {number} lat2 - Second latitude
   * @param {number} lng2 - Second longitude
   * @returns {number} Approximate distance in kilometers
   */
  fastApproximateDistance(lat1, lng1, lat2, lng2) {
    const dLat = Math.abs(lat2 - lat1);
    const dLng = Math.abs(lng2 - lng1);
    
    // Very rough approximation using lat/lng differences
    return Math.sqrt(dLat * dLat + dLng * dLng) * this.KM_PER_DEGREE_LAT;
  }

  /**
   * Equirectangular distance approximation (good for short distances)
   * @param {number} lat1 - First latitude
   * @param {number} lng1 - First longitude
   * @param {number} lat2 - Second latitude
   * @param {number} lng2 - Second longitude
   * @returns {number} Distance in kilometers
   */
  equirectangularDistance(lat1, lng1, lat2, lng2) {
    const dLat = (lat2 - lat1) * this.DEG_TO_RAD;
    const dLng = (lng2 - lng1) * this.DEG_TO_RAD;
    const avgLat = (lat1 + lat2) / 2 * this.DEG_TO_RAD;
    
    const x = dLng * Math.cos(avgLat);
    const y = dLat;
    
    return Math.sqrt(x * x + y * y) * this.EARTH_RADIUS_KM;
  }

  /**
   * Accurate Haversine distance calculation
   * @param {number} lat1 - First latitude
   * @param {number} lng1 - First longitude
   * @param {number} lat2 - Second latitude
   * @param {number} lng2 - Second longitude
   * @returns {number} Distance in kilometers
   */
  haversineDistance(lat1, lng1, lat2, lng2) {
    const dLat = (lat2 - lat1) * this.DEG_TO_RAD;
    const dLng = (lng2 - lng1) * this.DEG_TO_RAD;
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * this.DEG_TO_RAD) * Math.cos(lat2 * this.DEG_TO_RAD) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    return this.EARTH_RADIUS_KM * c;
  }

  /**
   * Fast coordinate validation
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @returns {boolean} True if valid coordinates
   */
  isValidCoordinate(lat, lng) {
    return typeof lat === 'number' && typeof lng === 'number' &&
           lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 &&
           !isNaN(lat) && !isNaN(lng) && isFinite(lat) && isFinite(lng);
  }

  /**
   * Cache result with LRU eviction
   * @param {string} key - Cache key
   * @param {number} value - Distance value
   */
  cacheResult(key, value) {
    if (this.cache.size >= this.maxCacheSize) {
      // Remove oldest entry (simple LRU)
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }

  /**
   * Clear the distance calculation cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Get cache statistics for monitoring
   * @returns {Object} Cache stats
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize,
      hitRate: this.hitCount / (this.hitCount + this.missCount) || 0
    };
  }
}

/**
 * Optimized bounding box calculations for spatial filtering
 */
class BoundingBoxCalculator {
  constructor() {
    this.KM_TO_DEGREE_LAT = 1 / 110.574; // Approximate degrees per km latitude
  }

  /**
   * Calculate bounding box for efficient spatial queries
   * @param {number} lat - Center latitude
   * @param {number} lng - Center longitude
   * @param {number} radiusKm - Radius in kilometers
   * @returns {Object} Bounding box coordinates
   */
  calculateBoundingBox(lat, lng, radiusKm) {
    const latDelta = radiusKm * this.KM_TO_DEGREE_LAT;
    
    // Longitude conversion depends on latitude
    const lngDelta = radiusKm / (111.32 * Math.cos(lat * Math.PI / 180));
    
    return {
      north: Math.min(lat + latDelta, 90),
      south: Math.max(lat - latDelta, -90),
      east: lng + lngDelta,
      west: lng - lngDelta,
      // For MongoDB queries
      query: {
        lat: { $gte: Math.max(lat - latDelta, -90), $lte: Math.min(lat + latDelta, 90) },
        lng: { $gte: lng - lngDelta, $lte: lng + lngDelta }
      }
    };
  }

  /**
   * Check if a point is within a bounding box
   * @param {number} lat - Point latitude
   * @param {number} lng - Point longitude
   * @param {Object} bbox - Bounding box
   * @returns {boolean} True if point is within box
   */
  isPointInBoundingBox(lat, lng, bbox) {
    return lat >= bbox.south && lat <= bbox.north &&
           lng >= bbox.west && lng <= bbox.east;
  }

  /**
   * Calculate area of bounding box (for query optimization)
   * @param {Object} bbox - Bounding box
   * @returns {number} Area in square kilometers
   */
  calculateBoundingBoxArea(bbox) {
    const latSpan = bbox.north - bbox.south;
    const lngSpan = bbox.east - bbox.west;
    const avgLat = (bbox.north + bbox.south) / 2;
    
    // Approximate area calculation
    const latKm = latSpan * 110.574;
    const lngKm = lngSpan * 111.32 * Math.cos(avgLat * Math.PI / 180);
    
    return latKm * lngKm;
  }
}

/**
 * Spatial indexing for in-memory location operations
 */
class SpatialGrid {
  constructor(cellSizeKm = 10) {
    this.cellSizeKm = cellSizeKm;
    this.cellSizeDegrees = cellSizeKm / 110.574; // Approximate
    this.grid = new Map();
  }

  /**
   * Get grid cell key for coordinates
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @returns {string} Grid cell key
   */
  getCellKey(lat, lng) {
    const cellLat = Math.floor(lat / this.cellSizeDegrees);
    const cellLng = Math.floor(lng / this.cellSizeDegrees);
    return `${cellLat},${cellLng}`;
  }

  /**
   * Add point to spatial grid
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @param {any} data - Associated data
   */
  addPoint(lat, lng, data) {
    const key = this.getCellKey(lat, lng);
    if (!this.grid.has(key)) {
      this.grid.set(key, []);
    }
    this.grid.get(key).push({ lat, lng, data });
  }

  /**
   * Find nearby points efficiently using grid
   * @param {number} lat - Search center latitude
   * @param {number} lng - Search center longitude
   * @param {number} radiusKm - Search radius
   * @returns {Array} Nearby points
   */
  findNearbyPoints(lat, lng, radiusKm) {
    const searchRadius = Math.ceil(radiusKm / this.cellSizeKm);
    const centerCellLat = Math.floor(lat / this.cellSizeDegrees);
    const centerCellLng = Math.floor(lng / this.cellSizeDegrees);
    
    const nearbyPoints = [];
    
    // Check surrounding cells
    for (let dLat = -searchRadius; dLat <= searchRadius; dLat++) {
      for (let dLng = -searchRadius; dLng <= searchRadius; dLng++) {
        const cellKey = `${centerCellLat + dLat},${centerCellLng + dLng}`;
        const cellPoints = this.grid.get(cellKey);
        
        if (cellPoints) {
          nearbyPoints.push(...cellPoints);
        }
      }
    }
    
    return nearbyPoints;
  }

  /**
   * Clear the spatial grid
   */
  clear() {
    this.grid.clear();
  }

  /**
   * Get grid statistics
   * @returns {Object} Grid statistics
   */
  getStats() {
    let totalPoints = 0;
    let maxPointsPerCell = 0;
    
    for (const points of this.grid.values()) {
      totalPoints += points.length;
      maxPointsPerCell = Math.max(maxPointsPerCell, points.length);
    }
    
    return {
      cells: this.grid.size,
      totalPoints,
      avgPointsPerCell: totalPoints / this.grid.size || 0,
      maxPointsPerCell,
      cellSizeKm: this.cellSizeKm
    };
  }
}

/**
 * Location clustering for performance optimization
 */
class LocationClusterer {
  constructor(maxClusterRadius = 1) { // 1km default cluster radius
    this.maxClusterRadius = maxClusterRadius;
    this.distanceCalculator = new DistanceCalculator();
  }

  /**
   * Cluster nearby locations to reduce processing overhead
   * @param {Array} locations - Array of location objects with lat/lng
   * @param {number} threshold - Clustering threshold in km
   * @returns {Array} Clustered locations
   */
  clusterLocations(locations, threshold = this.maxClusterRadius) {
    if (locations.length === 0) return [];
    
    const clusters = [];
    const processed = new Set();
    
    for (let i = 0; i < locations.length; i++) {
      if (processed.has(i)) continue;
      
      const location = locations[i];
      const cluster = {
        center: { lat: location.lat, lng: location.lng },
        locations: [location],
        count: 1
      };
      
      // Find nearby locations to cluster
      for (let j = i + 1; j < locations.length; j++) {
        if (processed.has(j)) continue;
        
        const other = locations[j];
        const distance = this.distanceCalculator.calculate(
          location.lat, location.lng, other.lat, other.lng
        );
        
        if (distance !== null && distance <= threshold) {
          cluster.locations.push(other);
          cluster.count++;
          processed.add(j);
        }
      }
      
      // Update cluster center to centroid
      if (cluster.count > 1) {
        const centroid = this.calculateCentroid(cluster.locations);
        cluster.center = centroid;
      }
      
      clusters.push(cluster);
      processed.add(i);
    }
    
    return clusters;
  }

  /**
   * Calculate centroid of a group of locations
   * @param {Array} locations - Array of locations
   * @returns {Object} Centroid coordinates
   */
  calculateCentroid(locations) {
    const total = locations.reduce(
      (acc, loc) => ({
        lat: acc.lat + loc.lat,
        lng: acc.lng + loc.lng
      }),
      { lat: 0, lng: 0 }
    );
    
    return {
      lat: total.lat / locations.length,
      lng: total.lng / locations.length
    };
  }
}

/**
 * Main optimized location service
 */
class OptimizedLocationService {
  constructor() {
    this.distanceCalculator = new DistanceCalculator();
    this.boundingBoxCalculator = new BoundingBoxCalculator();
    this.spatialGrid = new SpatialGrid(5); // 5km grid cells
    this.locationClusterer = new LocationClusterer();
  }

  /**
   * High-performance nearby search with multiple optimizations
   * @param {number} centerLat - Search center latitude
   * @param {number} centerLng - Search center longitude
   * @param {Array} locations - Array of locations to search
   * @param {number} radiusKm - Search radius in kilometers
   * @param {Object} options - Search options
   * @returns {Array} Sorted nearby locations
   */
  findNearbyOptimized(centerLat, centerLng, locations, radiusKm, options = {}) {
    const {
      limit = 50,
      enableClustering = false,
      clusterThreshold = 1,
      accurateDistance = false
    } = options;

    // Step 1: Bounding box pre-filtering (fastest)
    const bbox = this.boundingBoxCalculator.calculateBoundingBox(
      centerLat, centerLng, radiusKm
    );
    
    const bboxFiltered = locations.filter(loc =>
      this.boundingBoxCalculator.isPointInBoundingBox(loc.lat, loc.lng, bbox)
    );

    if (bboxFiltered.length === 0) return [];

    // Step 2: Distance calculation with optimization
    const withDistances = bboxFiltered.map(loc => {
      const distance = this.distanceCalculator.calculate(
        centerLat, centerLng, loc.lat, loc.lng
      );
      
      return distance !== null && distance <= radiusKm
        ? { ...loc, distance, distanceKm: Math.round(distance * 100) / 100 }
        : null;
    }).filter(Boolean);

    // Step 3: Sort by distance
    withDistances.sort((a, b) => a.distance - b.distance);

    // Step 4: Apply limit early
    const limited = withDistances.slice(0, limit);

    // Step 5: Optional clustering for dense areas
    if (enableClustering && limited.length > 20) {
      const clustered = this.locationClusterer.clusterLocations(
        limited, clusterThreshold
      );
      
      return clustered.map(cluster => ({
        ...cluster.locations[0], // Use first location as representative
        isCluster: cluster.count > 1,
        clusterSize: cluster.count,
        clusterCenter: cluster.center
      }));
    }

    return limited;
  }

  /**
   * Batch distance calculations with optimization
   * @param {Array} pairs - Array of coordinate pairs
   * @returns {Array} Array of distances
   */
  batchCalculateDistances(pairs) {
    return pairs.map(([lat1, lng1, lat2, lng2]) =>
      this.distanceCalculator.calculate(lat1, lng1, lat2, lng2)
    );
  }

  /**
   * Get performance statistics
   * @returns {Object} Performance stats
   */
  getPerformanceStats() {
    return {
      distanceCache: this.distanceCalculator.getCacheStats(),
      spatialGrid: this.spatialGrid.getStats()
    };
  }

  /**
   * Clear all caches and reset
   */
  clearCaches() {
    this.distanceCalculator.clearCache();
    this.spatialGrid.clear();
  }
}

// Singleton instance for performance
let locationServiceInstance = null;

/**
 * Get optimized location service singleton
 * @returns {OptimizedLocationService}
 */
export function getLocationService() {
  if (!locationServiceInstance) {
    locationServiceInstance = new OptimizedLocationService();
  }
  return locationServiceInstance;
}

// Export all classes for advanced usage
export {
  DistanceCalculator,
  BoundingBoxCalculator,
  SpatialGrid,
  LocationClusterer,
  OptimizedLocationService
};

// Export convenient helper functions
export const optimizedDistance = (lat1, lng1, lat2, lng2) => {
  const service = getLocationService();
  return service.distanceCalculator.calculate(lat1, lng1, lat2, lng2);
};

export const findNearbyLocations = (centerLat, centerLng, locations, radiusKm, options) => {
  const service = getLocationService();
  return service.findNearbyOptimized(centerLat, centerLng, locations, radiusKm, options);
};

export default {
  getLocationService,
  optimizedDistance,
  findNearbyLocations,
  DistanceCalculator,
  BoundingBoxCalculator,
  SpatialGrid,
  LocationClusterer
};