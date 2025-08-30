// Enhanced Location Tracking API with Username Mapping
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { rateLimit } from '@/utils/rateLimiting';
import { addSecurityHeaders } from '@/utils/validation';
import locationTracker from '@/utils/locationTracker';

export const dynamic = 'force-dynamic';

// POST /api/location/track - Track user location with precision
export async function POST(request) {
  try {
    // Rate limiting
    const rateLimitResult = await rateLimit(request, 'location_tracking', 30, 60 * 60 * 1000);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { success: false, message: 'Too many location updates. Please try again later.' },
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

    const body = await request.json();
    const {
      latitude,
      longitude,
      accuracy,
      address = {},
      source = 'manual',
      notes
    } = body;

    // Validation
    if (!latitude || !longitude) {
      return NextResponse.json(
        { success: false, message: 'Latitude and longitude are required' },
        { status: 400 }
      );
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return NextResponse.json(
        { success: false, message: 'Invalid coordinates' },
        { status: 400 }
      );
    }

    // Get device and session info
    const userAgent = request.headers.get('user-agent');
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : request.headers.get('x-real-ip');

    // Track location
    const locationData = await locationTracker.trackUserLocation(
      session.user.id,
      {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        accuracy: accuracy ? parseFloat(accuracy) : null,
        address,
        source,
        notes
      },
      {
        sessionId: session.user.id + '_' + Date.now(),
        deviceInfo: {
          userAgent,
          ip
        }
      }
    );

    const response = NextResponse.json({
      success: true,
      message: 'Location tracked successfully',
      location: locationData,
      timestamp: new Date().toISOString()
    });

    return addSecurityHeaders(response);

  } catch (error) {
    console.error('Location tracking error:', error);
    const response = NextResponse.json(
      { 
        success: false, 
        message: 'Failed to track location',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      },
      { status: 500 }
    );
    return addSecurityHeaders(response);
  }
}

// GET /api/location/track - Get user's location history
export async function GET(request) {
  try {
    // Rate limiting
    const rateLimitResult = await rateLimit(request, 'api_requests', 100, 15 * 60 * 1000);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { success: false, message: 'Too many requests' },
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
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const includeInactive = searchParams.get('includeInactive') === 'true';

    // Get user's location history
    const history = await locationTracker.getUserLocationHistory(
      session.user.id,
      { limit, includeInactive }
    );

    const response = NextResponse.json({
      success: true,
      history,
      count: history.length,
      timestamp: new Date().toISOString()
    });

    return addSecurityHeaders(response);

  } catch (error) {
    console.error('Location history error:', error);
    const response = NextResponse.json(
      { 
        success: false, 
        message: 'Failed to get location history',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      },
      { status: 500 }
    );
    return addSecurityHeaders(response);
  }
}