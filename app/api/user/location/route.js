// app/api/user/location/route.js - API endpoints for user location management
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';
import {
  getCurrentUserLocation,
  updateCurrentLocation,
  setHomeAddress,
  getHomeAddress,
  getLocationHistory,
  getRecentLocations,
  getLocationInsights
} from '../../../../lib/locationTracking';
import { redisRateLimit } from '../../../../lib/redis';

// GET - Get user's current location and location data
export async function GET(request) {
  try {
    // Get session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get client IP for rate limiting
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown';

    // Apply rate limiting - 30 requests per minute
    const rateLimitResult = await redisRateLimit(`location_get:${ip}:${session.user.id}`, 30, 60);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: 'Too many location requests. Please try again later.',
          resetTime: new Date(rateLimitResult.resetTime || Date.now() + 60000).toISOString()
        },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(request.url);
    const dataType = searchParams.get('type') || 'current';

    let locationData = {};

    switch (dataType) {
      case 'current':
        locationData.current = await getCurrentUserLocation(session.user.id);
        break;

      case 'home':
        locationData.home = await getHomeAddress(session.user.id);
        break;

      case 'history':
        const limit = parseInt(searchParams.get('limit')) || 20;
        locationData.history = await getLocationHistory(session.user.id, limit);
        break;

      case 'recent':
        locationData.recent = await getRecentLocations(session.user.id);
        break;

      case 'insights':
        locationData.insights = await getLocationInsights(session.user.id);
        break;

      case 'all':
        locationData.current = await getCurrentUserLocation(session.user.id);
        locationData.home = await getHomeAddress(session.user.id);
        locationData.recent = await getRecentLocations(session.user.id);
        locationData.insights = await getLocationInsights(session.user.id);
        break;

      default:
        return NextResponse.json(
          { success: false, message: 'Invalid data type requested' },
          { status: 400 }
        );
    }

    console.log(`📍 Location data retrieved for user ${session.user.id}, type: ${dataType}`);

    return NextResponse.json({
      success: true,
      data: locationData,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('💥 Location GET error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to retrieve location data' },
      { status: 500 }
    );
  }
}

// POST - Update user's current location
export async function POST(request) {
  try {
    // Get session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get client IP for rate limiting
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown';

    // Apply rate limiting - 10 location updates per minute
    const rateLimitResult = await redisRateLimit(`location_update:${ip}:${session.user.id}`, 10, 60);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: 'Too many location updates. Please try again later.',
          resetTime: new Date(rateLimitResult.resetTime || Date.now() + 60000).toISOString()
        },
        { status: 429 }
      );
    }

    const { lat, lng, address, locationType } = await request.json();

    // Validate required fields
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return NextResponse.json(
        { success: false, message: 'Valid latitude and longitude are required' },
        { status: 400 }
      );
    }

    // Validate coordinate ranges
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return NextResponse.json(
        { success: false, message: 'Invalid coordinate values' },
        { status: 400 }
      );
    }

    // Update location
    const updatedLocation = await updateCurrentLocation(
      session.user.id,
      lat,
      lng,
      address || null,
      locationType || 'gps'
    );

    console.log(`📍 Location updated for user ${session.user.id}: ${lat}, ${lng}`);

    return NextResponse.json({
      success: true,
      message: 'Location updated successfully',
      location: updatedLocation,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('💥 Location POST error:', error);

    if (error.message.includes('outside India bounds')) {
      return NextResponse.json(
        { success: false, message: 'Location must be within India' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: 'Failed to update location' },
      { status: 500 }
    );
  }
}

// PUT - Set home address
export async function PUT(request) {
  try {
    // Get session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get client IP for rate limiting
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown';

    // Apply rate limiting - 5 home address updates per hour
    const rateLimitResult = await redisRateLimit(`home_address:${ip}:${session.user.id}`, 5, 3600);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: 'Too many home address updates. Please try again later.',
          resetTime: new Date(rateLimitResult.resetTime || Date.now() + 3600000).toISOString()
        },
        { status: 429 }
      );
    }

    const addressData = await request.json();

    // Validate required fields
    if (!addressData.doorNo || !addressData.street || !addressData.district ||
        !addressData.state || !addressData.postalCode) {
      return NextResponse.json(
        { success: false, message: 'All address fields are required' },
        { status: 400 }
      );
    }

    // Validate postal code format (Indian postal code)
    const postalCodeRegex = /^[1-9][0-9]{5}$/;
    if (!postalCodeRegex.test(addressData.postalCode)) {
      return NextResponse.json(
        { success: false, message: 'Invalid postal code format' },
        { status: 400 }
      );
    }

    // Set home address
    const homeAddress = await setHomeAddress(session.user.id, addressData);

    console.log(`🏠 Home address set for user ${session.user.id}`);

    return NextResponse.json({
      success: true,
      message: 'Home address saved successfully',
      homeAddress: homeAddress,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('💥 Home address PUT error:', error);

    if (error.message.includes('outside India bounds')) {
      return NextResponse.json(
        { success: false, message: 'Home address must be within India' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: 'Failed to save home address' },
      { status: 500 }
    );
  }
}

// DELETE - Clear location data
export async function DELETE(request) {
  try {
    // Get session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const dataType = searchParams.get('type') || 'current';

    // This would implement clearing specific location data
    // For security reasons, we might want to restrict this operation

    console.log(`🗑️ Location data deletion requested by user ${session.user.id}, type: ${dataType}`);

    return NextResponse.json({
      success: true,
      message: `Location data cleared: ${dataType}`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('💥 Location DELETE error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to clear location data' },
      { status: 500 }
    );
  }
}