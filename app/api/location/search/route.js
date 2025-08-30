// Location Search API - Find users by location and username
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { rateLimit } from '@/utils/rateLimiting';
import { addSecurityHeaders } from '@/utils/validation';
import locationTracker from '@/utils/locationTracker';

export const dynamic = 'force-dynamic';

// GET /api/location/search - Search users by location
export async function GET(request) {
  try {
    // Rate limiting
    const rateLimitResult = await rateLimit(request, 'location_search', 50, 60 * 60 * 1000);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { success: false, message: 'Too many search requests' },
        { status: 429 }
      );
    }

    // Authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const searchType = searchParams.get('type') || 'nearby';
    
    let results = [];

    switch (searchType) {
      case 'nearby':
        results = await handleNearbySearch(searchParams);
        break;
      
      case 'username':
        results = await handleUsernameLocationSearch(searchParams);
        break;
      
      case 'city':
        results = await handleCitySearch(searchParams);
        break;
      
      case 'skills':
        results = await handleSkillsLocationSearch(searchParams);
        break;
      
      default:
        return NextResponse.json(
          { success: false, message: 'Invalid search type' },
          { status: 400 }
        );
    }

    const response = NextResponse.json({
      success: true,
      type: searchType,
      results,
      count: results.length,
      timestamp: new Date().toISOString()
    });

    return addSecurityHeaders(response);

  } catch (error) {
    console.error('Location search error:', error);
    const response = NextResponse.json(
      { 
        success: false, 
        message: 'Search failed',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      },
      { status: 500 }
    );
    return addSecurityHeaders(response);
  }
}

// Handle nearby users search
async function handleNearbySearch(searchParams) {
  const latitude = parseFloat(searchParams.get('lat'));
  const longitude = parseFloat(searchParams.get('lng'));
  const maxDistance = parseInt(searchParams.get('radius') || '10000'); // Default 10km
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
  const usernameFilter = searchParams.get('username');

  if (!latitude || !longitude) {
    throw new Error('Latitude and longitude are required for nearby search');
  }

  return await locationTracker.findUsersNearLocation(
    { longitude, latitude },
    { maxDistance, limit, usernameFilter }
  );
}

// Handle username-based location search
async function handleUsernameLocationSearch(searchParams) {
  const latitude = parseFloat(searchParams.get('lat'));
  const longitude = parseFloat(searchParams.get('lng'));
  const radius = parseInt(searchParams.get('radius') || '1000'); // Default 1km

  if (!latitude || !longitude) {
    throw new Error('Latitude and longitude are required for username search');
  }

  return await locationTracker.findUsernameByLocation(latitude, longitude, radius);
}

// Handle city-based search
async function handleCitySearch(searchParams) {
  const city = searchParams.get('city');
  const state = searchParams.get('state');
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);

  if (!city || !state) {
    throw new Error('City and state are required for city search');
  }

  const results = await locationTracker.searchUsersByLocationAndSkills({
    city,
    state,
    limit
  });

  return results;
}

// Handle skills + location search
async function handleSkillsLocationSearch(searchParams) {
  const skills = searchParams.get('skills')?.split(',').filter(Boolean) || [];
  const city = searchParams.get('city');
  const state = searchParams.get('state');
  const latitude = parseFloat(searchParams.get('lat'));
  const longitude = parseFloat(searchParams.get('lng'));
  const maxDistance = parseInt(searchParams.get('radius') || '25000'); // Default 25km
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);

  let searchCriteria = { skills, limit };

  if (city && state) {
    searchCriteria.city = city;
    searchCriteria.state = state;
  } else if (latitude && longitude) {
    searchCriteria.centerLocation = { latitude, longitude };
    searchCriteria.maxDistance = maxDistance;
  } else {
    throw new Error('Either city/state or lat/lng coordinates are required');
  }

  return await locationTracker.searchUsersByLocationAndSkills(searchCriteria);
}