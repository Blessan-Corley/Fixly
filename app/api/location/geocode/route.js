import { NextResponse } from 'next/server';

const GEOCODING_SERVICES = [
  {
    name: 'nominatim',
    url: 'https://nominatim.openstreetmap.org/search',
    params: (address) => ({
      q: address,
      format: 'json',
      limit: 1,
      addressdetails: 1
    }),
    parseResponse: (data) => {
      if (!data || !data[0]) throw new Error('No results found');
      const result = data[0];
      return {
        latitude: parseFloat(result.lat),
        longitude: parseFloat(result.lon),
        accuracy: 1000,
        city: result.address?.city || result.address?.town || result.address?.village,
        region: result.address?.state || result.address?.county,
        country: result.address?.country,
        formatted_address: result.display_name
      };
    }
  },
  {
    name: 'geocoding-api',
    url: 'https://api.geocoding.earth/v1/search',
    params: (address) => ({
      text: address,
      size: 1
    }),
    parseResponse: (data) => {
      if (!data?.features || !data.features[0]) throw new Error('No results found');
      const feature = data.features[0];
      const coords = feature.geometry.coordinates;
      return {
        latitude: coords[1],
        longitude: coords[0],
        accuracy: 500,
        city: feature.properties.locality,
        region: feature.properties.region,
        country: feature.properties.country,
        formatted_address: feature.properties.label
      };
    }
  }
];

export async function POST(request) {
  try {
    const { address } = await request.json();

    if (!address || typeof address !== 'string') {
      return NextResponse.json(
        { error: 'Address is required and must be a string' },
        { status: 400 }
      );
    }

    const cleanAddress = address.trim();
    if (cleanAddress.length < 2) {
      return NextResponse.json(
        { error: 'Address must be at least 2 characters long' },
        { status: 400 }
      );
    }

    // Try each geocoding service until one succeeds
    let lastError = null;
    for (const service of GEOCODING_SERVICES) {
      try {
        console.log(`Trying ${service.name} for address: ${cleanAddress}`);
        
        const params = service.params(cleanAddress);
        const url = new URL(service.url);
        
        // Add parameters to URL
        Object.entries(params).forEach(([key, value]) => {
          url.searchParams.append(key, value);
        });

        const response = await fetch(url.toString(), {
          method: 'GET',
          headers: {
            'User-Agent': 'Fixly-Location-Service/1.0',
            'Accept': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        const result = service.parseResponse(data);

        // Validate the result
        if (!result.latitude || !result.longitude) {
          throw new Error('Invalid coordinates received');
        }

        if (result.latitude < -90 || result.latitude > 90 || 
            result.longitude < -180 || result.longitude > 180) {
          throw new Error('Coordinates out of valid range');
        }

        console.log(`Successfully geocoded with ${service.name}`);
        
        return NextResponse.json({
          success: true,
          service: service.name,
          ...result
        });

      } catch (error) {
        console.warn(`${service.name} failed:`, error.message);
        lastError = error;
        continue;
      }
    }

    // If all services failed, try local fallback
    const fallbackResult = tryLocalFallback(cleanAddress);
    if (fallbackResult) {
      return NextResponse.json({
        success: true,
        service: 'local_fallback',
        ...fallbackResult
      });
    }

    // All services failed
    console.error('All geocoding services failed:', lastError?.message);
    return NextResponse.json(
      { 
        error: 'Failed to geocode address', 
        details: lastError?.message,
        address: cleanAddress
      },
      { status: 404 }
    );

  } catch (error) {
    console.error('Geocoding API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Local fallback for common cities/locations
function tryLocalFallback(address) {
  const normalizedAddress = address.toLowerCase().trim();
  
  // Major US cities database
  const cityDatabase = {
    'new york': { lat: 40.7128, lng: -74.0060, city: 'New York', region: 'NY', country: 'USA' },
    'new york city': { lat: 40.7128, lng: -74.0060, city: 'New York', region: 'NY', country: 'USA' },
    'nyc': { lat: 40.7128, lng: -74.0060, city: 'New York', region: 'NY', country: 'USA' },
    'los angeles': { lat: 34.0522, lng: -118.2437, city: 'Los Angeles', region: 'CA', country: 'USA' },
    'la': { lat: 34.0522, lng: -118.2437, city: 'Los Angeles', region: 'CA', country: 'USA' },
    'chicago': { lat: 41.8781, lng: -87.6298, city: 'Chicago', region: 'IL', country: 'USA' },
    'houston': { lat: 29.7604, lng: -95.3698, city: 'Houston', region: 'TX', country: 'USA' },
    'phoenix': { lat: 33.4484, lng: -112.0740, city: 'Phoenix', region: 'AZ', country: 'USA' },
    'philadelphia': { lat: 39.9526, lng: -75.1652, city: 'Philadelphia', region: 'PA', country: 'USA' },
    'san antonio': { lat: 29.4241, lng: -98.4936, city: 'San Antonio', region: 'TX', country: 'USA' },
    'san diego': { lat: 32.7157, lng: -117.1611, city: 'San Diego', region: 'CA', country: 'USA' },
    'dallas': { lat: 32.7767, lng: -96.7970, city: 'Dallas', region: 'TX', country: 'USA' },
    'san jose': { lat: 37.3382, lng: -121.8863, city: 'San Jose', region: 'CA', country: 'USA' },
    'austin': { lat: 30.2672, lng: -97.7431, city: 'Austin', region: 'TX', country: 'USA' },
    'jacksonville': { lat: 30.3322, lng: -81.6557, city: 'Jacksonville', region: 'FL', country: 'USA' },
    'san francisco': { lat: 37.7749, lng: -122.4194, city: 'San Francisco', region: 'CA', country: 'USA' },
    'sf': { lat: 37.7749, lng: -122.4194, city: 'San Francisco', region: 'CA', country: 'USA' },
    'columbus': { lat: 39.9612, lng: -82.9988, city: 'Columbus', region: 'OH', country: 'USA' },
    'fort worth': { lat: 32.7555, lng: -97.3308, city: 'Fort Worth', region: 'TX', country: 'USA' },
    'indianapolis': { lat: 39.7684, lng: -86.1581, city: 'Indianapolis', region: 'IN', country: 'USA' },
    'charlotte': { lat: 35.2271, lng: -80.8431, city: 'Charlotte', region: 'NC', country: 'USA' },
    'seattle': { lat: 47.6062, lng: -122.3321, city: 'Seattle', region: 'WA', country: 'USA' },
    'denver': { lat: 39.7392, lng: -104.9903, city: 'Denver', region: 'CO', country: 'USA' },
    'washington': { lat: 38.9072, lng: -77.0369, city: 'Washington', region: 'DC', country: 'USA' },
    'washington dc': { lat: 38.9072, lng: -77.0369, city: 'Washington', region: 'DC', country: 'USA' },
    'dc': { lat: 38.9072, lng: -77.0369, city: 'Washington', region: 'DC', country: 'USA' },
    'boston': { lat: 42.3601, lng: -71.0589, city: 'Boston', region: 'MA', country: 'USA' },
    'el paso': { lat: 31.7619, lng: -106.4850, city: 'El Paso', region: 'TX', country: 'USA' },
    'detroit': { lat: 42.3314, lng: -83.0458, city: 'Detroit', region: 'MI', country: 'USA' },
    'nashville': { lat: 36.1627, lng: -86.7816, city: 'Nashville', region: 'TN', country: 'USA' },
    'portland': { lat: 45.5152, lng: -122.6784, city: 'Portland', region: 'OR', country: 'USA' },
    'memphis': { lat: 35.1495, lng: -90.0490, city: 'Memphis', region: 'TN', country: 'USA' },
    'oklahoma city': { lat: 35.4676, lng: -97.5164, city: 'Oklahoma City', region: 'OK', country: 'USA' },
    'las vegas': { lat: 36.1699, lng: -115.1398, city: 'Las Vegas', region: 'NV', country: 'USA' },
    'vegas': { lat: 36.1699, lng: -115.1398, city: 'Las Vegas', region: 'NV', country: 'USA' },
    'louisville': { lat: 38.2527, lng: -85.7585, city: 'Louisville', region: 'KY', country: 'USA' },
    'baltimore': { lat: 39.2904, lng: -76.6122, city: 'Baltimore', region: 'MD', country: 'USA' },
    'milwaukee': { lat: 43.0389, lng: -87.9065, city: 'Milwaukee', region: 'WI', country: 'USA' },
    'albuquerque': { lat: 35.0844, lng: -106.6504, city: 'Albuquerque', region: 'NM', country: 'USA' },
    'tucson': { lat: 32.2226, lng: -110.9747, city: 'Tucson', region: 'AZ', country: 'USA' },
    'fresno': { lat: 36.7378, lng: -119.7871, city: 'Fresno', region: 'CA', country: 'USA' },
    'sacramento': { lat: 38.5816, lng: -121.4944, city: 'Sacramento', region: 'CA', country: 'USA' },
    'mesa': { lat: 33.4152, lng: -111.8315, city: 'Mesa', region: 'AZ', country: 'USA' },
    'kansas city': { lat: 39.0997, lng: -94.5786, city: 'Kansas City', region: 'MO', country: 'USA' },
    'atlanta': { lat: 33.7490, lng: -84.3880, city: 'Atlanta', region: 'GA', country: 'USA' },
    'long beach': { lat: 33.7701, lng: -118.1937, city: 'Long Beach', region: 'CA', country: 'USA' },
    'colorado springs': { lat: 38.8339, lng: -104.8214, city: 'Colorado Springs', region: 'CO', country: 'USA' },
    'raleigh': { lat: 35.7796, lng: -78.6382, city: 'Raleigh', region: 'NC', country: 'USA' },
    'omaha': { lat: 41.2524, lng: -95.9980, city: 'Omaha', region: 'NE', country: 'USA' },
    'miami': { lat: 25.7617, lng: -80.1918, city: 'Miami', region: 'FL', country: 'USA' },
    'oakland': { lat: 37.8044, lng: -122.2711, city: 'Oakland', region: 'CA', country: 'USA' },
    'minneapolis': { lat: 44.9778, lng: -93.2650, city: 'Minneapolis', region: 'MN', country: 'USA' },
    'tulsa': { lat: 36.1540, lng: -95.9928, city: 'Tulsa', region: 'OK', country: 'USA' },
    'cleveland': { lat: 41.4993, lng: -81.6944, city: 'Cleveland', region: 'OH', country: 'USA' },
    'wichita': { lat: 37.6872, lng: -97.3301, city: 'Wichita', region: 'KS', country: 'USA' },
    'arlington': { lat: 32.7357, lng: -97.1081, city: 'Arlington', region: 'TX', country: 'USA' }
  };

  // Check for exact match
  if (cityDatabase[normalizedAddress]) {
    const city = cityDatabase[normalizedAddress];
    return {
      latitude: city.lat,
      longitude: city.lng,
      accuracy: 5000,
      city: city.city,
      region: city.region,
      country: city.country,
      formatted_address: `${city.city}, ${city.region}, ${city.country}`
    };
  }

  // Check for partial matches
  for (const [key, city] of Object.entries(cityDatabase)) {
    if (normalizedAddress.includes(key) || key.includes(normalizedAddress)) {
      return {
        latitude: city.lat,
        longitude: city.lng,
        accuracy: 5000,
        city: city.city,
        region: city.region,
        country: city.country,
        formatted_address: `${city.city}, ${city.region}, ${city.country}`
      };
    }
  }

  return null;
}