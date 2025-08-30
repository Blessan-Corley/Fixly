// app/api/admin/locations/secure/route.js - Secure admin-only location access
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import LocationPreference from '@/models/LocationPreference';
import User from '@/models/User';

// Middleware to verify admin access
async function verifyAdminAccess(session) {
  if (!session?.user?.id) {
    throw new Error('Authentication required');
  }

  const user = await User.findById(session.user.id).select('role email name');
  if (user.role !== 'admin') {
    console.warn(`🚫 Unauthorized location access attempt by ${user.email} (${user.role})`);
    throw new Error('Admin access required');
  }

  return user;
}

// Get precise location data for a specific user (admin only)
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    const adminUser = await verifyAdminAccess(session);
    
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const includeHistory = searchParams.get('history') === 'true';
    const includePrecise = searchParams.get('precise') === 'true';
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    // Get user information
    const targetUser = await User.findById(userId).select('name email username role location lastActivityAt createdAt');
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get precise location data from LocationPreference
    const locationPreference = await LocationPreference.findOne({ user: userId });
    
    if (!locationPreference) {
      return NextResponse.json({
        hasLocation: false,
        user: {
          id: targetUser._id,
          name: targetUser.name,
          email: targetUser.email,
          username: targetUser.username,
          role: targetUser.role,
          lastActivity: targetUser.lastActivityAt,
          joinedAt: targetUser.createdAt
        },
        fallbackLocation: targetUser.location,
        message: 'No precise location data available'
      });
    }

    const response = {
      hasLocation: true,
      user: {
        id: targetUser._id,
        name: targetUser.name,
        email: targetUser.email,
        username: targetUser.username,
        role: targetUser.role,
        lastActivity: targetUser.lastActivityAt,
        joinedAt: targetUser.createdAt
      },
      currentLocation: {
        // Precise coordinates with full decimal precision
        lat: locationPreference.currentLocation.lat,
        lng: locationPreference.currentLocation.lng,
        accuracy: locationPreference.currentLocation.accuracy,
        precisionLevel: locationPreference.currentLocation.precisionLevel || '10-50m',
        address: {
          formatted: locationPreference.currentLocation.address,
          city: locationPreference.currentLocation.city,
          state: locationPreference.currentLocation.state,
          pincode: locationPreference.currentLocation.pincode
        }
      },
      locationMetadata: {
        lastUpdated: locationPreference.lastLocationUpdate,
        locationAge: locationPreference.lastLocationUpdate 
          ? Date.now() - locationPreference.lastLocationUpdate.getTime() 
          : null,
        updateCount: locationPreference.recentLocations?.length || 0,
        isRecent: locationPreference.lastLocationUpdate && 
          (Date.now() - locationPreference.lastLocationUpdate.getTime()) < 3600000 // 1 hour
      },
      preferences: {
        locationSharingConsent: locationPreference.preferences.locationSharingConsent,
        autoLocationEnabled: locationPreference.preferences.autoLocationEnabled,
        maxTravelDistance: locationPreference.preferences.maxTravelDistance,
        trackLocationHistory: locationPreference.privacy.trackLocationHistory
      }
    };

    // Include location history only for admin with explicit request
    if (includeHistory && locationPreference.privacy.trackLocationHistory) {
      response.locationHistory = locationPreference.locationHistory.map(entry => ({
        lat: entry.lat,
        lng: entry.lng,
        timestamp: entry.timestamp,
        accuracy: entry.accuracy,
        source: entry.source,
        city: entry.city,
        state: entry.state,
        isSignificantMove: entry.isSignificantMove,
        distanceFromPrevious: entry.distanceFromPrevious
      }));
    }

    // Include recent locations for tracking patterns
    if (includePrecise) {
      response.recentLocations = locationPreference.recentLocations.map(loc => ({
        lat: loc.lat,
        lng: loc.lng,
        city: loc.city,
        state: loc.state,
        timestamp: loc.timestamp,
        usageCount: loc.usageCount
      }));
    }

    console.log(`🔐 Admin ${adminUser.email} accessed precise location data for ${targetUser.email}`);

    return NextResponse.json(response);

  } catch (error) {
    console.error('Secure location access error:', error);
    
    if (error.message === 'Authentication required') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    if (error.message === 'Admin access required') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    
    return NextResponse.json({ 
      error: 'Failed to access location data', 
      details: error.message 
    }, { status: 500 });
  }
}

// Advanced search with precise location data (admin only)
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    const adminUser = await verifyAdminAccess(session);
    
    await connectDB();
    
    const body = await request.json();
    const {
      searchType = 'comprehensive',
      filters = {},
      sortBy = 'lastUpdated',
      sortOrder = 'desc',
      limit = 50,
      includeInactive = false,
      radiusSearch = null // { lat, lng, radiusKm }
    } = body;

    let query = {};
    let sort = {};

    // Build query based on filters
    if (filters.email) {
      query['userIdentifier.email'] = new RegExp(filters.email, 'i');
    }
    if (filters.username) {
      query['userIdentifier.username'] = new RegExp(filters.username, 'i');
    }
    if (filters.name) {
      query['userIdentifier.name'] = new RegExp(filters.name, 'i');
    }
    if (filters.role) {
      query['userIdentifier.role'] = filters.role;
    }
    if (filters.city) {
      query['currentLocation.city'] = new RegExp(filters.city, 'i');
    }
    if (filters.state) {
      query['currentLocation.state'] = new RegExp(filters.state, 'i');
    }

    // Time-based filters
    if (filters.locationAge) {
      const ageThreshold = new Date(Date.now() - filters.locationAge * 60 * 60 * 1000);
      query.lastLocationUpdate = { $gte: ageThreshold };
    }

    // Location sharing consent filter
    if (filters.sharingConsent !== undefined) {
      query['preferences.locationSharingConsent'] = filters.sharingConsent;
    }

    // Build sort
    const sortField = sortBy === 'lastUpdated' ? 'lastLocationUpdate' :
                     sortBy === 'name' ? 'userIdentifier.name' :
                     sortBy === 'role' ? 'userIdentifier.role' :
                     sortBy === 'city' ? 'currentLocation.city' :
                     'lastLocationUpdate';
                     
    sort[sortField] = sortOrder === 'asc' ? 1 : -1;

    let results;

    // Handle radius search separately
    if (radiusSearch && radiusSearch.lat && radiusSearch.lng) {
      results = await LocationPreference.findNearbyUsers(
        radiusSearch.lat,
        radiusSearch.lng,
        radiusSearch.radiusKm || 10,
        filters.role || null
      );
      
      // Apply additional filters to radius results
      if (Object.keys(query).length > 0) {
        const additionalQuery = { ...query };
        delete additionalQuery['userIdentifier.role']; // Already filtered in findNearbyUsers
        
        if (Object.keys(additionalQuery).length > 0) {
          const resultIds = results.map(r => r._id);
          results = await LocationPreference.find({
            _id: { $in: resultIds },
            ...additionalQuery
          }).sort(sort).limit(limit);
        }
      }
    } else {
      // Regular query
      results = await LocationPreference.find(query)
        .sort(sort)
        .limit(limit);
    }

    // Format results with precise location data
    const formattedResults = results.map(location => ({
      userId: location.user,
      userIdentifier: location.userIdentifier,
      currentLocation: {
        // Full precision coordinates for admin
        lat: location.currentLocation.lat,
        lng: location.currentLocation.lng,
        accuracy: location.currentLocation.accuracy,
        address: {
          formatted: location.currentLocation.address,
          city: location.currentLocation.city,
          state: location.currentLocation.state,
          pincode: location.currentLocation.pincode
        }
      },
      locationMetadata: {
        lastUpdated: location.lastLocationUpdate,
        locationAge: location.lastLocationUpdate 
          ? Date.now() - location.lastLocationUpdate.getTime()
          : null,
        updateCount: location.recentLocations?.length || 0,
        hasLocationHistory: location.locationHistory?.length > 0
      },
      preferences: {
        locationSharingConsent: location.preferences.locationSharingConsent,
        autoLocationEnabled: location.preferences.autoLocationEnabled,
        trackLocationHistory: location.privacy.trackLocationHistory
      },
      // Include recent movement pattern for admin
      recentActivity: {
        recentLocationCount: location.recentLocations?.length || 0,
        lastSignificantMove: location.locationHistory
          ?.filter(h => h.isSignificantMove)
          ?.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))?.[0]?.timestamp
      }
    }));

    const response = {
      results: formattedResults,
      count: formattedResults.length,
      searchCriteria: {
        searchType,
        filters,
        sortBy,
        sortOrder,
        radiusSearch
      },
      metadata: {
        totalPossible: await LocationPreference.countDocuments(query),
        searchedBy: {
          name: adminUser.name,
          email: adminUser.email
        },
        searchedAt: new Date().toISOString()
      }
    };

    console.log(`🔍 Admin ${adminUser.email} performed secure location search: ${formattedResults.length} results`);

    return NextResponse.json(response);

  } catch (error) {
    console.error('Secure location search error:', error);
    
    if (error.message === 'Authentication required') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    if (error.message === 'Admin access required') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    
    return NextResponse.json({ 
      error: 'Failed to search locations', 
      details: error.message 
    }, { status: 500 });
  }
}