import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth';
import connectDB from '../../../lib/mongodb';
import LocationPreference from '../../../models/LocationPreference';
import User from '../../../models/User';

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

    return NextResponse.json({
      success: true,
      data: {
        hasLocation: !!(locationPrefs.currentLocation?.lat && locationPrefs.currentLocation?.lng),
        currentLocation: locationPrefs.privacy.shareApproximateLocation ? {
          city: locationPrefs.currentLocation?.city,
          state: locationPrefs.currentLocation?.state,
          lat: locationPrefs.privacy.shareExactLocation ? locationPrefs.currentLocation?.lat : undefined,
          lng: locationPrefs.privacy.shareExactLocation ? locationPrefs.currentLocation?.lng : undefined
        } : null,
        preferences: locationPrefs.preferences,
        privacy: locationPrefs.privacy,
        lastUpdated: locationPrefs.lastLocationUpdate,
        isRecent: locationPrefs.isLocationRecent()
      }
    });

  } catch (error) {
    console.error('Error fetching location preferences:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch location preferences' },
      { status: 500 }
    );
  }
}

// POST - Update user location
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' }, 
        { status: 401 }
      );
    }

    // Rate limiting
    if (!checkRateLimit(session.user.id)) {
      return NextResponse.json(
        { success: false, message: 'Rate limit exceeded. Too many location updates.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { lat, lng, accuracy, address, city, state, pincode, consent } = body;

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

    // Validate consent
    if (!consent) {
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

    // Update location
    await locationPrefs.updateLocation({
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      accuracy: accuracy ? parseFloat(accuracy) : undefined,
      address: address || undefined,
      city: city || undefined,
      state: state || undefined,
      pincode: pincode || undefined,
      source: 'gps'
    });

    // Update consent
    locationPrefs.preferences.locationSharingConsent = true;
    locationPrefs.preferences.autoLocationEnabled = true;
    await locationPrefs.save();

    return NextResponse.json({
      success: true,
      message: 'Location updated successfully',
      data: {
        hasLocation: true,
        lastUpdated: locationPrefs.lastLocationUpdate,
        city: locationPrefs.currentLocation?.city,
        state: locationPrefs.currentLocation?.state
      }
    });

  } catch (error) {
    console.error('Error updating location:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update location' },
      { status: 500 }
    );
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