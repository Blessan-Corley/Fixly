import { NextResponse } from 'next/server';

const REVERSE_GEOCODING_SERVICES = [
  {
    name: 'nominatim',
    url: 'https://nominatim.openstreetmap.org/reverse',
    params: (lat, lng) => ({
      lat: lat,
      lon: lng,
      format: 'json',
      addressdetails: 1,
      zoom: 18
    }),
    parseResponse: (data) => {
      if (!data || !data.address) throw new Error('No address found');
      const addr = data.address;
      return {
        street: [addr.house_number, addr.road].filter(Boolean).join(' '),
        city: addr.city || addr.town || addr.village || addr.municipality,
        state: addr.state || addr.county,
        country: addr.country,
        postalCode: addr.postcode,
        formatted: data.display_name
      };
    }
  }
];

export async function POST(request) {
  try {
    const { latitude, longitude } = await request.json();

    // Validate coordinates
    if (latitude === undefined || latitude === null || longitude === undefined || longitude === null) {
      return NextResponse.json(
        { error: 'Latitude and longitude are required' },
        { status: 400 }
      );
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lng)) {
      return NextResponse.json(
        { error: 'Invalid coordinates format' },
        { status: 400 }
      );
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return NextResponse.json(
        { error: 'Coordinates out of valid range' },
        { status: 400 }
      );
    }

    // Try each reverse geocoding service
    let lastError = null;
    for (const service of REVERSE_GEOCODING_SERVICES) {
      try {
        console.log(`Trying ${service.name} for coordinates: ${lat}, ${lng}`);
        
        const params = service.params(lat, lng);
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

        console.log(`Successfully reverse geocoded with ${service.name}`);
        
        return NextResponse.json({
          success: true,
          service: service.name,
          address: result
        });

      } catch (error) {
        console.warn(`${service.name} failed:`, error.message);
        lastError = error;
        continue;
      }
    }

    // If all services failed, try local fallback
    const fallbackResult = tryLocalReverseFallback(lat, lng);
    if (fallbackResult) {
      return NextResponse.json({
        success: true,
        service: 'local_fallback',
        address: fallbackResult
      });
    }

    // All services failed
    console.error('All reverse geocoding services failed:', lastError?.message);
    return NextResponse.json(
      { 
        error: 'Failed to reverse geocode coordinates', 
        details: lastError?.message,
        coordinates: { latitude: lat, longitude: lng }
      },
      { status: 404 }
    );

  } catch (error) {
    console.error('Reverse geocoding API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Local fallback for reverse geocoding based on coordinate ranges
function tryLocalReverseFallback(lat, lng) {
  // US state/region boundaries (approximate)
  const regions = [
    {
      name: 'New York',
      bounds: { north: 45.0, south: 40.5, east: -71.9, west: -79.8 },
      state: 'NY',
      country: 'USA'
    },
    {
      name: 'California',
      bounds: { north: 42.0, south: 32.5, east: -114.1, west: -124.4 },
      state: 'CA',
      country: 'USA'
    },
    {
      name: 'Texas',
      bounds: { north: 36.5, south: 25.8, east: -93.5, west: -106.6 },
      state: 'TX',
      country: 'USA'
    },
    {
      name: 'Florida',
      bounds: { north: 31.0, south: 24.4, east: -80.0, west: -87.6 },
      state: 'FL',
      country: 'USA'
    },
    {
      name: 'Illinois',
      bounds: { north: 42.5, south: 37.0, east: -87.0, west: -91.5 },
      state: 'IL',
      country: 'USA'
    },
    {
      name: 'Pennsylvania',
      bounds: { north: 42.3, south: 39.7, east: -74.7, west: -80.5 },
      state: 'PA',
      country: 'USA'
    },
    {
      name: 'Ohio',
      bounds: { north: 42.3, south: 38.4, east: -80.5, west: -84.8 },
      state: 'OH',
      country: 'USA'
    },
    {
      name: 'Georgia',
      bounds: { north: 35.0, south: 30.4, east: -81.0, west: -85.6 },
      state: 'GA',
      country: 'USA'
    },
    {
      name: 'North Carolina',
      bounds: { north: 36.6, south: 33.8, east: -75.5, west: -84.3 },
      state: 'NC',
      country: 'USA'
    },
    {
      name: 'Michigan',
      bounds: { north: 48.3, south: 41.7, east: -82.1, west: -90.4 },
      state: 'MI',
      country: 'USA'
    },
    {
      name: 'Washington',
      bounds: { north: 49.0, south: 45.5, east: -116.9, west: -124.8 },
      state: 'WA',
      country: 'USA'
    },
    {
      name: 'Arizona',
      bounds: { north: 37.0, south: 31.3, east: -109.0, west: -114.8 },
      state: 'AZ',
      country: 'USA'
    },
    {
      name: 'Massachusetts',
      bounds: { north: 42.9, south: 41.2, east: -69.9, west: -73.5 },
      state: 'MA',
      country: 'USA'
    },
    {
      name: 'Tennessee',
      bounds: { north: 36.7, south: 34.9, east: -81.6, west: -90.3 },
      state: 'TN',
      country: 'USA'
    },
    {
      name: 'Indiana',
      bounds: { north: 41.8, south: 37.8, east: -84.8, west: -88.1 },
      state: 'IN',
      country: 'USA'
    },
    {
      name: 'Missouri',
      bounds: { north: 40.6, south: 36.0, east: -89.1, west: -95.8 },
      state: 'MO',
      country: 'USA'
    },
    {
      name: 'Maryland',
      bounds: { north: 39.7, south: 37.9, east: -75.0, west: -79.5 },
      state: 'MD',
      country: 'USA'
    },
    {
      name: 'Wisconsin',
      bounds: { north: 47.1, south: 42.5, east: -86.2, west: -92.9 },
      state: 'WI',
      country: 'USA'
    },
    {
      name: 'Minnesota',
      bounds: { north: 49.4, south: 43.5, east: -89.5, west: -97.2 },
      state: 'MN',
      country: 'USA'
    },
    {
      name: 'Colorado',
      bounds: { north: 41.0, south: 37.0, east: -102.0, west: -109.1 },
      state: 'CO',
      country: 'USA'
    },
    {
      name: 'Alabama',
      bounds: { north: 35.0, south: 30.2, east: -84.9, west: -88.5 },
      state: 'AL',
      country: 'USA'
    },
    {
      name: 'Louisiana',
      bounds: { north: 33.0, south: 28.9, east: -88.8, west: -94.0 },
      state: 'LA',
      country: 'USA'
    },
    {
      name: 'Kentucky',
      bounds: { north: 39.1, south: 36.5, east: -81.9, west: -89.6 },
      state: 'KY',
      country: 'USA'
    },
    {
      name: 'Oregon',
      bounds: { north: 46.3, south: 41.9, east: -116.5, west: -124.6 },
      state: 'OR',
      country: 'USA'
    },
    {
      name: 'Oklahoma',
      bounds: { north: 37.0, south: 33.6, east: -94.4, west: -103.0 },
      state: 'OK',
      country: 'USA'
    },
    {
      name: 'Connecticut',
      bounds: { north: 42.1, south: 40.9, east: -71.8, west: -73.7 },
      state: 'CT',
      country: 'USA'
    },
    {
      name: 'Iowa',
      bounds: { north: 43.5, south: 40.4, east: -90.1, west: -96.6 },
      state: 'IA',
      country: 'USA'
    },
    {
      name: 'Nevada',
      bounds: { north: 42.0, south: 35.0, east: -114.0, west: -120.0 },
      state: 'NV',
      country: 'USA'
    },
    {
      name: 'Arkansas',
      bounds: { north: 36.5, south: 33.0, east: -89.6, west: -94.6 },
      state: 'AR',
      country: 'USA'
    },
    {
      name: 'Kansas',
      bounds: { north: 40.0, south: 37.0, east: -94.6, west: -102.1 },
      state: 'KS',
      country: 'USA'
    },
    {
      name: 'Utah',
      bounds: { north: 42.0, south: 37.0, east: -109.0, west: -114.1 },
      state: 'UT',
      country: 'USA'
    },
    {
      name: 'Nebraska',
      bounds: { north: 43.0, south: 40.0, east: -95.3, west: -104.1 },
      state: 'NE',
      country: 'USA'
    },
    {
      name: 'West Virginia',
      bounds: { north: 40.6, south: 37.2, east: -77.7, west: -82.6 },
      state: 'WV',
      country: 'USA'
    },
    {
      name: 'Idaho',
      bounds: { north: 49.0, south: 42.0, east: -111.0, west: -117.2 },
      state: 'ID',
      country: 'USA'
    },
    {
      name: 'Hawaii',
      bounds: { north: 28.4, south: 18.9, east: -154.8, west: -178.3 },
      state: 'HI',
      country: 'USA'
    },
    {
      name: 'New Hampshire',
      bounds: { north: 45.3, south: 42.7, east: -70.6, west: -72.6 },
      state: 'NH',
      country: 'USA'
    },
    {
      name: 'Maine',
      bounds: { north: 47.5, south: 43.1, east: -66.9, west: -71.1 },
      state: 'ME',
      country: 'USA'
    },
    {
      name: 'Rhode Island',
      bounds: { north: 42.0, south: 41.1, east: -71.1, west: -71.9 },
      state: 'RI',
      country: 'USA'
    },
    {
      name: 'Montana',
      bounds: { north: 49.0, south: 44.4, east: -104.0, west: -116.1 },
      state: 'MT',
      country: 'USA'
    },
    {
      name: 'Delaware',
      bounds: { north: 39.8, south: 38.4, east: -75.0, west: -75.8 },
      state: 'DE',
      country: 'USA'
    },
    {
      name: 'South Dakota',
      bounds: { north: 45.9, south: 42.5, east: -96.4, west: -104.1 },
      state: 'SD',
      country: 'USA'
    },
    {
      name: 'North Dakota',
      bounds: { north: 49.0, south: 45.9, east: -96.6, west: -104.1 },
      state: 'ND',
      country: 'USA'
    },
    {
      name: 'Alaska',
      bounds: { north: 71.5, south: 54.0, east: -129.0, west: -179.0 },
      state: 'AK',
      country: 'USA'
    },
    {
      name: 'Vermont',
      bounds: { north: 45.0, south: 42.7, east: -71.5, west: -73.4 },
      state: 'VT',
      country: 'USA'
    },
    {
      name: 'Wyoming',
      bounds: { north: 45.0, south: 41.0, east: -104.1, west: -111.1 },
      state: 'WY',
      country: 'USA'
    }
  ];

  // Find matching region
  for (const region of regions) {
    const { bounds } = region;
    if (lat >= bounds.south && lat <= bounds.north && 
        lng >= bounds.west && lng <= bounds.east) {
      return {
        street: '',
        city: 'Unknown City',
        state: region.state,
        country: region.country,
        postalCode: '',
        formatted: `${region.name}, ${region.country}`
      };
    }
  }

  // If no region match, provide generic response
  let country = 'Unknown Country';
  let region = 'Unknown Region';

  // Basic country detection
  if (lat >= 24.7 && lat <= 49.4 && lng >= -125.0 && lng <= -66.9) {
    country = 'USA';
    region = 'United States';
  } else if (lat >= 41.7 && lat <= 83.1 && lng >= -141.0 && lng <= -52.6) {
    country = 'Canada';
    region = 'Canada';
  } else if (lat >= 14.5 && lat <= 32.7 && lng >= -118.4 && lng <= -86.7) {
    country = 'Mexico';
    region = 'Mexico';
  }

  return {
    street: '',
    city: 'Unknown Location',
    state: region,
    country: country,
    postalCode: '',
    formatted: `${region}, ${country}`
  };
}