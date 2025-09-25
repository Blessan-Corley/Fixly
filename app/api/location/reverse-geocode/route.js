// app/api/location/reverse-geocode/route.js
import { NextResponse } from 'next/server';
import { redisUtils } from '@/lib/redis';

export async function POST(request) {
  try {
    const body = await request.json();
    const { latitude, longitude } = body;

    if (!latitude || !longitude) {
      return NextResponse.json(
        { message: 'Latitude and longitude are required' },
        { status: 400 }
      );
    }

    const cacheKey = `geocode:${latitude.toFixed(4)},${longitude.toFixed(4)}`;

    // Try to get from cache first
    try {
      const cached = await redisUtils.get(cacheKey);
      if (cached) {
        return NextResponse.json(JSON.parse(cached));
      }
    } catch (cacheError) {
      console.log('Cache miss for geocoding');
    }

    // Use Google Maps API if available
    if (process.env.GOOGLE_MAPS_API_KEY) {
      try {
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${process.env.GOOGLE_MAPS_API_KEY}`
        );

        if (response.ok) {
          const data = await response.json();

          if (data.results && data.results.length > 0) {
            const result = data.results[0];
            const components = result.address_components;

            const locationData = {
              formatted_address: result.formatted_address,
              city: '',
              locality: '',
              area: '',
              state: '',
              country: '',
              postal_code: ''
            };

            // Extract location components
            components.forEach(component => {
              const types = component.types;

              if (types.includes('locality')) {
                locationData.city = component.long_name;
                locationData.locality = component.long_name;
              } else if (types.includes('sublocality') || types.includes('sublocality_level_1')) {
                locationData.area = component.long_name;
              } else if (types.includes('administrative_area_level_1')) {
                locationData.state = component.long_name;
              } else if (types.includes('country')) {
                locationData.country = component.long_name;
              } else if (types.includes('postal_code')) {
                locationData.postal_code = component.long_name;
              }
            });

            // Fallback for city if locality not found
            if (!locationData.city) {
              const fallbackCity = components.find(c =>
                c.types.includes('administrative_area_level_2') ||
                c.types.includes('administrative_area_level_3')
              );
              if (fallbackCity) {
                locationData.city = fallbackCity.long_name;
              }
            }

            // Cache for 24 hours
            try {
              await redisUtils.setex(cacheKey, 86400, JSON.stringify(locationData));
            } catch (cacheError) {
              console.error('Failed to cache geocoding result:', cacheError);
            }

            return NextResponse.json(locationData);
          }
        }
      } catch (googleError) {
        console.error('Google Maps API error:', googleError);
      }
    }

    // Fallback to alternative geocoding service
    try {
      const response = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
      );

      if (response.ok) {
        const data = await response.json();

        const locationData = {
          formatted_address: data.locality || data.city || 'Unknown location',
          city: data.city || data.locality || '',
          locality: data.locality || data.city || '',
          area: data.principalSubdivision || '',
          state: data.principalSubdivision || '',
          country: data.countryName || '',
          postal_code: data.postcode || ''
        };

        // Cache for 24 hours
        try {
          await redisUtils.setex(cacheKey, 86400, JSON.stringify(locationData));
        } catch (cacheError) {
          console.error('Failed to cache geocoding result:', cacheError);
        }

        return NextResponse.json(locationData);
      }
    } catch (fallbackError) {
      console.error('Fallback geocoding error:', fallbackError);
    }

    // If all else fails, return basic location
    const basicLocation = {
      formatted_address: 'Unknown location',
      city: '',
      locality: '',
      area: '',
      state: '',
      country: 'India',
      postal_code: ''
    };

    return NextResponse.json(basicLocation);

  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return NextResponse.json(
      {
        message: 'Failed to get location details',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}