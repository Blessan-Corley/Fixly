// app/api/user/location/history/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import {
  getUserLocationHistory,
  getUserJobSuggestions,
  updateUserLocation,
  startUserLocationTracking,
  stopUserLocationTracking
} from '@/lib/services/locationHistoryService';
import { rateLimit } from '@/utils/rateLimiting';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit')) || 20;
    const includeSuggestions = searchParams.get('includeSuggestions') === 'true';

    // Get location history
    const locationData = await getUserLocationHistory(session.user.id, limit);

    // Get job suggestions if requested
    let suggestions = null;
    if (includeSuggestions) {
      suggestions = await getUserJobSuggestions(session.user.id);
    }

    return NextResponse.json({
      success: true,
      data: {
        ...locationData,
        suggestions
      }
    });

  } catch (error) {
    console.error('Location history error:', error);
    return NextResponse.json(
      { message: 'Failed to get location history' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    // Apply rate limiting for location updates
    const rateLimitResult = await rateLimit(request, 'location_update', 120, 60 * 60 * 1000); // 120 updates per hour
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { message: 'Too many location updates. Please try again later.' },
        { status: 429 }
      );
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { action, location } = body;

    switch (action) {
      case 'update':
        if (!location?.latitude || !location?.longitude) {
          return NextResponse.json(
            { message: 'Valid coordinates are required' },
            { status: 400 }
          );
        }

        const updatedLocation = await updateUserLocation(session.user.id, location);

        return NextResponse.json({
          success: true,
          message: 'Location updated successfully',
          data: {
            location: updatedLocation
          }
        });

      case 'start_tracking':
        await startUserLocationTracking(session.user.id, location);

        return NextResponse.json({
          success: true,
          message: 'Location tracking started'
        });

      case 'stop_tracking':
        await stopUserLocationTracking(session.user.id);

        return NextResponse.json({
          success: true,
          message: 'Location tracking stopped'
        });

      default:
        return NextResponse.json(
          { message: 'Invalid action specified' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Location update error:', error);
    return NextResponse.json(
      { message: 'Failed to process location request' },
      { status: 500 }
    );
  }
}