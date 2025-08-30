import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import LocationPreference from '@/models/LocationPreference';
import User from '@/models/User';
import { processLocationData, validateLocationUpdate, getLocationForContext, LOCATION_PRECISION } from '@/utils/locationPrecision';
import { addSecurityHeaders } from '@/utils/validation';

// Rate limiting for location updates
const locationUpdateAttempts = new Map();
const MAX_UPDATES_PER_HOUR = 20;

function checkRateLimit(userId) {
  const now = Date.now();
  const userAttempts = locationUpdateAttempts.get(userId) || [];
  
  // Remove attempts older than 1 hour
  const recentAttempts = userAttempts.filter(time => now - time < 60 * 60 * 1000);
  
  if (recentAttempts.length >= MAX_UPDATES_PER_HOUR) {
    return false;
  }
  
  recentAttempts.push(now);
  locationUpdateAttempts.set(userId, recentAttempts);
  return true;
}

// GET - Get user location preferences
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' }, 
        { status: 401 }
      );
    }

    await connectDB();

    const locationPrefs = await LocationPreference.findOne({ 
      user: session.user.id 
    }).select('-locationHistory -ipLocation'); // Don't return sensitive data

    if (!locationPrefs) {
      return NextResponse.json({
        success: true,
        data: {
          hasLocation: false,
          preferences: {
            maxTravelDistance: 25,
            autoLocationEnabled: false,
            locationSharingConsent: false
          }
        }
      });
    }

    // Use new location precision system
    const contextualLocation = getLocationForContext(
      locationPrefs.currentLocation, 
      { id: session.user.id }, 
      'profile'
    );

    const response = NextResponse.json({
      success: true,
      data: {
        hasLocation: !!(locationPrefs.currentLocation?.lat && locationPrefs.currentLocation?.lng),
        currentLocation: contextualLocation,
        preferences: locationPrefs.preferences,
        privacy: locationPrefs.privacy,
        lastUpdated: locationPrefs.lastLocationUpdate,
        isRecent: locationPrefs.isLocationRecent(),
        precisionLevel: locationPrefs.currentLocation?.precisionLevel || LOCATION_PRECISION.MEDIUM
      }
    });

    return addSecurityHeaders(response);

  } catch (error) {
    console.error('Error fetching location preferences:', error.name);
    const response = NextResponse.json(
      { success: false, message: 'Failed to fetch location preferences' },
      { status: 500 }
    );
    return addSecurityHeaders(response);
  }
}

// POST - Update user location with enhanced precision and security
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      const response = NextResponse.json(
        { success: false, message: 'Unauthorized' }, 
        { status: 401 }
      );
      return addSecurityHeaders(response);
    }

    const body = await request.json();
    const { 
      lat, lng, accuracy, address, city, state, pincode, consent,
      silent = false, // For background updates
      source = 'gps',
      backgroundUpdate = false,
      precisionLevel = LOCATION_PRECISION.MEDIUM
    } = body;

    // Enhanced validation using new location system
    const validation = validateLocationUpdate(body, { id: session.user.id });
    if (!validation.valid) {
      const response = NextResponse.json(
        { success: false, message: validation.error },
        { status: 400 }
      );
      return addSecurityHeaders(response);
    }
    
    // Skip rate limiting for background updates
    if (!backgroundUpdate && !checkRateLimit(session.user.id)) {
      return NextResponse.json(
        { success: false, message: 'Rate limit exceeded. Too many location updates.' },
        { status: 429 }
      );
    }

    // Validate required fields
    if (!lat || !lng) {
      return NextResponse.json(
        { success: false, message: 'Latitude and longitude are required' },
        { status: 400 }
      );
    }

    // Validate coordinates
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return NextResponse.json(
        { success: false, message: 'Invalid coordinates' },
        { status: 400 }
      );
    }

    // Validate consent (skip for background updates from already consented users)
    if (!consent && !backgroundUpdate) {
      return NextResponse.json(
        { success: false, message: 'Location sharing consent is required' },
        { status: 400 }
      );
    }

    await connectDB();

    // Find or create location preferences
    let locationPrefs = await LocationPreference.findOne({ 
      user: session.user.id 
    });

    if (!locationPrefs) {
      locationPrefs = new LocationPreference({
        user: session.user.id,
        preferences: {
          maxTravelDistance: 25,
          autoLocationEnabled: true,
          locationSharingConsent: true
        },
        privacy: {
          shareExactLocation: false,
          shareApproximateLocation: true,
          trackLocationHistory: false
        }
      });
    }

    // Process location with enhanced precision system
    const processedLocation = processLocationData(
      { lat, lng, address, city, state, pincode },
      precisionLevel,
      {
        source,
        accuracy: accuracy ? parseFloat(accuracy) : null,
        timestamp: new Date(),
        userConsent: consent || backgroundUpdate
      }
    );

    // Update location using new format
    await locationPrefs.updateLocation(processedLocation);

    // Update consent (only if not a background update)
    if (!backgroundUpdate) {
      locationPrefs.preferences.locationSharingConsent = consent || true;
      locationPrefs.preferences.autoLocationEnabled = true;
    }
    
    await locationPrefs.save();

    // Also update the user's basic location for quick access
    await User.findByIdAndUpdate(session.user.id, {
      'location.lat': parseFloat(lat),
      'location.lng': parseFloat(lng),
      'location.city': city,
      'location.state': state,
      lastActivityAt: new Date()
    });

    // Log success (only for non-silent updates)
    if (!silent) {
      console.log(`✅ Location updated for user ${session.user.email}: ${city || `${lat}, ${lng}`} (${source})`);
    }

    const response = NextResponse.json({
      success: true,
      message: backgroundUpdate ? 'Location updated in background' : 'Location updated successfully',
      data: {
        hasLocation: true,
        lastUpdated: locationPrefs.lastLocationUpdate,
        city: processedLocation.city,
        state: processedLocation.state,
        precisionLevel: processedLocation.precisionLevel,
        source: source,
        backgroundUpdate: backgroundUpdate,
        privacy: processedLocation.privacy
      }
    });

    return addSecurityHeaders(response);

  } catch (error) {
    console.error('Error updating location:', error.name, error.message);
    const response = NextResponse.json(
      { success: false, message: 'Failed to update location' },
      { status: 500 }
    );
    return addSecurityHeaders(response);
  }
}

// PUT - Update location preferences
export async function PUT(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' }, 
        { status: 401 }
      );
    }

    const body = await request.json();
    const { 
      maxTravelDistance, 
      autoLocationEnabled, 
      locationSharingConsent,
      shareExactLocation,
      shareApproximateLocation,
      trackLocationHistory 
    } = body;

    await connectDB();

    let locationPrefs = await LocationPreference.findOne({ 
      user: session.user.id 
    });

    if (!locationPrefs) {
      locationPrefs = new LocationPreference({
        user: session.user.id
      });
    }

    // Update preferences
    if (maxTravelDistance !== undefined) {
      locationPrefs.preferences.maxTravelDistance = Math.max(1, Math.min(100, parseInt(maxTravelDistance)));
    }
    
    if (autoLocationEnabled !== undefined) {
      locationPrefs.preferences.autoLocationEnabled = Boolean(autoLocationEnabled);
    }
    
    if (locationSharingConsent !== undefined) {
      locationPrefs.preferences.locationSharingConsent = Boolean(locationSharingConsent);
      
      // If consent is withdrawn, clear location data
      if (!locationSharingConsent) {
        locationPrefs.currentLocation = {};
        locationPrefs.locationHistory = [];
      }
    }

    // Update privacy settings
    if (shareExactLocation !== undefined) {
      locationPrefs.privacy.shareExactLocation = Boolean(shareExactLocation);
    }
    
    if (shareApproximateLocation !== undefined) {
      locationPrefs.privacy.shareApproximateLocation = Boolean(shareApproximateLocation);
    }
    
    if (trackLocationHistory !== undefined) {
      locationPrefs.privacy.trackLocationHistory = Boolean(trackLocationHistory);
      
      // If tracking disabled, clear history
      if (!trackLocationHistory) {
        locationPrefs.locationHistory = [];
      }
    }

    await locationPrefs.save();

    return NextResponse.json({
      success: true,
      message: 'Location preferences updated successfully',
      data: {
        preferences: locationPrefs.preferences,
        privacy: locationPrefs.privacy
      }
    });

  } catch (error) {
    console.error('Error updating location preferences:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update location preferences' },
      { status: 500 }
    );
  }
}

// DELETE - Clear location data
export async function DELETE(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' }, 
        { status: 401 }
      );
    }

    await connectDB();

    const locationPrefs = await LocationPreference.findOne({ 
      user: session.user.id 
    });

    if (locationPrefs) {
      // Clear location data but keep preferences
      locationPrefs.currentLocation = {};
      locationPrefs.locationHistory = [];
      locationPrefs.preferences.locationSharingConsent = false;
      locationPrefs.preferences.autoLocationEnabled = false;
      await locationPrefs.save();
    }

    return NextResponse.json({
      success: true,
      message: 'Location data cleared successfully'
    });

  } catch (error) {
    console.error('Error clearing location data:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to clear location data' },
      { status: 500 }
    );
  }
}