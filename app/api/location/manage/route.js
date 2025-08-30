// app/api/location/manage/route.js - Advanced user-specific location management API
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import UserLocation from '@/models/UserLocation';
import LocationPreference from '@/models/LocationPreference';
import User from '@/models/User';

// Get user's location with user-specific identification
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const includeHistory = searchParams.get('includeHistory') === 'true';
    const silent = searchParams.get('silent') === 'true';
    const userId = session.user.id;
    
    // Get user data for identification
    const user = await User.findById(userId).select('name email username location');
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Try to get location from LocationPreference collection (primary)
    let locationPreference = await LocationPreference.findOne({ user: userId });
    
    // Fallback to UserLocation if LocationPreference doesn't exist
    let userLocation = null;
    try {
      userLocation = await UserLocation.findOne({ userId: userId });
    } catch (error) {
      console.debug('UserLocation not found (non-critical):', error);
    }
    
    // If no location data found in either collection
    if (!locationPreference && !userLocation) {
      return NextResponse.json({ 
        hasLocation: false,
        message: 'No location data found',
        shouldPrompt: !silent,
        userId: userId,
        userIdentifier: {
          name: user.name,
          email: user.email,
          username: user.username
        },
        fallbackLocation: user.location // From user document
      });
    }

    // Use LocationPreference as primary source, UserLocation as fallback
    const primaryLocation = locationPreference || userLocation;
    let currentLocation, lastUpdated, source;
    
    if (locationPreference) {
      currentLocation = {
        lat: locationPreference.currentLocation.lat,
        lng: locationPreference.currentLocation.lng,
        accuracy: locationPreference.currentLocation.accuracy
      };
      lastUpdated = locationPreference.lastLocationUpdate;
      source = 'location_preference';
      
      // Update access timestamp silently
      if (silent) {
        locationPreference.lastUpdated = new Date();
        await locationPreference.save();
      }
    } else if (userLocation) {
      currentLocation = {
        lat: userLocation.latitude,
        lng: userLocation.longitude,
        accuracy: userLocation.currentLocation?.accuracy
      };
      lastUpdated = userLocation.timestamps?.lastUpdated;
      source = 'user_location';
      
      // Update access timestamp for UserLocation
      if (silent && userLocation.timestamps) {
        userLocation.timestamps.lastAccessed = new Date();
        await userLocation.save();
      } else if (!silent && userLocation.recordUsage) {
        userLocation.recordUsage('access');
        await userLocation.save();
      }
    }

    const responseData = {
      hasLocation: true,
      userId: userId,
      userIdentifier: {
        name: user.name,
        email: user.email,
        username: user.username
      },
      currentLocation,
      address: {
        city: locationPreference?.currentLocation?.city || user.location?.city,
        state: locationPreference?.currentLocation?.state || user.location?.state,
        formatted: locationPreference?.currentLocation?.address
      },
      source,
      lastUpdated,
      needsUpdate: lastUpdated && (new Date() - new Date(lastUpdated)) > 30 * 60 * 1000, // 30 minutes
      isStale: lastUpdated && (new Date() - new Date(lastUpdated)) > 24 * 60 * 60 * 1000, // 24 hours
      locationAge: lastUpdated ? Date.now() - new Date(lastUpdated).getTime() : null,
      storage: {
        locationPreference: !!locationPreference,
        userLocation: !!userLocation,
        userDocument: !!user.location
      }
    };

    // Include history and preferences if requested
    if (includeHistory && locationPreference) {
      responseData.history = locationPreference.locationHistory || [];
      responseData.recentLocations = locationPreference.recentLocations || [];
      responseData.preferences = locationPreference.preferences;
      responseData.privacy = locationPreference.privacy;
    } else if (includeHistory && userLocation) {
      responseData.history = userLocation.history || [];
      responseData.usage = userLocation.usage || {};
    }

    if (!silent) {
      console.log(`📍 Retrieved location for user ${user.email} (${user.name}) from ${source}`);
    }

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('Location GET error:', error);
    return NextResponse.json({ 
      error: 'Failed to get location', 
      details: error.message 
    }, { status: 500 });
  }
}

// Create or update user-specific location with optimized storage
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    await connectDB();
    
    const body = await request.json();
    const { 
      lat, lng, accuracy, 
      source = 'gps', 
      address = {},
      silent = false,
      backgroundUpdate = false,
      precisionMode = 'optimized',
      storageVersion = '2.0'
    } = body;

    if (!lat || !lng) {
      return NextResponse.json({ error: 'Coordinates required' }, { status: 400 });
    }

    // Validate coordinates with higher precision
    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 });
    }

    // Get user data for identification
    const user = await User.findById(session.user.id).select('name email username');
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userId = session.user.id;
    const userIdentifier = {
      id: userId,
      name: user.name,
      email: user.email,
      username: user.username
    };

    // Optimized location data with 1-meter precision
    const precision = 6; // 6 decimal places = ~1.1 meter precision
    const optimizedLat = parseFloat(lat.toFixed(precision));
    const optimizedLng = parseFloat(lng.toFixed(precision));
    const optimizedAccuracy = accuracy ? Math.round(accuracy) : null;
    const precisionMeters = Math.round(111320 * Math.cos(lat * Math.PI / 180) / Math.pow(10, precision));

    const locationData = { 
      lat: optimizedLat, 
      lng: optimizedLng, 
      accuracy: optimizedAccuracy 
    };
    
    const metadata = {
      source,
      address: {
        city: address?.city || null,
        state: address?.state || null,
        country: address?.country || 'India',
        formatted: address?.formatted || `${optimizedLat.toFixed(4)}, ${optimizedLng.toFixed(4)}`
      },
      changeReason: backgroundUpdate ? 'background_update' : 'user_update',
      precision,
      storageVersion,
      userIdentifier
    };

    // Update/Create in UserLocation collection (if exists)
    let userLocation = null;
    try {
      if (UserLocation.createOrUpdate) {
        userLocation = await UserLocation.createOrUpdate(userId, locationData, metadata);
      }
    } catch (error) {
      console.debug('UserLocation update failed (non-critical):', error);
    }

    // Update/Create in LocationPreference collection with complete user identification
    let locationPreference;
    try {
      locationPreference = await LocationPreference.findOne({ user: userId });
      
      if (!locationPreference) {
        // Create new location preference with comprehensive user identification
        locationPreference = new LocationPreference({
          user: userId, // MongoDB ObjectId reference
          
          // User identification fields stored directly for easy searching
          userIdentifier: {
            name: userIdentifier.name,
            email: userIdentifier.email.toLowerCase(),
            username: userIdentifier.username,
            role: 'fixer' // Default role, will be updated from user document if available
          },
          
          currentLocation: {
            lat: optimizedLat,
            lng: optimizedLng,
            accuracy: optimizedAccuracy,
            address: metadata.address.formatted,
            city: metadata.address.city,
            state: metadata.address.state
          },
          
          preferences: {
            autoLocationEnabled: true,
            locationSharingConsent: true,
            maxTravelDistance: 25
          },
          
          privacy: {
            shareApproximateLocation: true,
            shareExactLocation: false,
            trackLocationHistory: false
          },
          
          lastLocationUpdate: new Date()
        });
        
        // Update role from user document
        const userDoc = await User.findById(userId).select('role');
        if (userDoc?.role) {
          locationPreference.userIdentifier.role = userDoc.role;
        }
        
        await locationPreference.save();
        
        if (!silent) {
          console.log(`🆕 Created location preference for ${userIdentifier.name} (${userIdentifier.email}) - ${metadata.address.city || 'coordinates'}`);
        }
      } else {
        // Update existing location and ensure user identifier is current
        locationPreference.userIdentifier = {
          name: userIdentifier.name,
          email: userIdentifier.email.toLowerCase(),
          username: userIdentifier.username,
          role: locationPreference.userIdentifier.role // Keep existing role or update if needed
        };
        
        // Update role if it has changed
        const userDoc = await User.findById(userId).select('role');
        if (userDoc?.role && userDoc.role !== locationPreference.userIdentifier.role) {
          locationPreference.userIdentifier.role = userDoc.role;
        }
        
        // Update location using the model's method
        await locationPreference.updateLocation({
          lat: optimizedLat,
          lng: optimizedLng,
          accuracy: optimizedAccuracy,
          source,
          city: metadata.address.city,
          state: metadata.address.state,
          address: metadata.address.formatted
        });
        
        if (!silent) {
          console.log(`📍 Updated location for ${userIdentifier.name} (${userIdentifier.email}): ${metadata.address.city || 'coordinates'}`);
        }
      }
    } catch (error) {
      console.error('LocationPreference update failed:', error);
      // Don't fail the request if location preference update fails
    }

    // Update user's basic location for quick access (non-blocking, with user identification)
    User.findByIdAndUpdate(userId, {
      'location.lat': optimizedLat,
      'location.lng': optimizedLng,
      'location.city': metadata.address.city,
      'location.state': metadata.address.state,
      lastActivityAt: new Date()
    }, { 
      new: true,
      select: 'name email location' // Only return essential fields
    }).exec().then(updatedUser => {
      if (!silent && updatedUser) {
        console.log(`👤 User location synced: ${updatedUser.name} (${updatedUser.email}) at ${updatedUser.location?.city || 'coordinates'}`);
      }
    }).catch(error => {
      console.debug('User location sync failed (non-critical):', error);
    });

    // Return success response with user identification
    return NextResponse.json({
      success: true,
      userId: userId,
      userIdentifier: {
        name: userIdentifier.name,
        email: userIdentifier.email
      },
      location: {
        lat: optimizedLat,
        lng: optimizedLng,
        accuracy: optimizedAccuracy,
        city: metadata.address.city,
        state: metadata.address.state,
        lastUpdated: new Date().toISOString(),
        precision: '6_decimal_places',
        source
      },
      backgroundUpdate,
      storage: {
        locationPreference: !!locationPreference,
        userLocation: !!userLocation,
        userDocument: true
      }
    });

  } catch (error) {
    console.error('Location POST error:', error);
    return NextResponse.json({ 
      error: 'Failed to update location', 
      details: error.message 
    }, { status: 500 });
  }
}

// Background refresh for multiple users (system endpoint)
export async function PATCH(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    await connectDB();
    
    // Find locations that need updates
    const staleLocations = await UserLocation.findStaleLocations();
    const updated = [];
    
    for (const location of staleLocations) {
      location.flags.needsUpdate = true;
      await location.save();
      updated.push(location.userId);
    }

    return NextResponse.json({
      success: true,
      message: `Marked ${updated.length} locations for update`,
      userIds: updated
    });

  } catch (error) {
    console.error('Location batch update error:', error);
    return NextResponse.json({ error: 'Failed to update locations' }, { status: 500 });
  }
}