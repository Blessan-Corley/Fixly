// app/api/location/user/[userId]/route.js - Get location by user ID for admin/search
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import LocationPreference from '@/models/LocationPreference';
import User from '@/models/User';

export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    await connectDB();
    
    const { userId } = params;
    const { searchParams } = new URL(request.url);
    const includeHistory = searchParams.get('includeHistory') === 'true';
    
    // Only allow admin users or users accessing their own location
    const currentUser = await User.findById(session.user.id);
    if (currentUser.role !== 'admin' && session.user.id !== userId) {
      return NextResponse.json({ error: 'Unauthorized access' }, { status: 403 });
    }

    // Get user data for identification
    const targetUser = await User.findById(userId).select('name email username location role');
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get location preference data with user identifier
    const locationPreference = await LocationPreference.findOne({ user: userId });
    
    if (!locationPreference) {
      return NextResponse.json({ 
        hasLocation: false,
        message: 'No location data found for this user',
        userId: userId,
        userIdentifier: {
          name: targetUser.name,
          email: targetUser.email,
          username: targetUser.username,
          role: targetUser.role
        },
        fallbackLocation: targetUser.location
      });
    }

    const responseData = {
      hasLocation: true,
      userId: userId,
      userIdentifier: {
        name: targetUser.name,
        email: targetUser.email,
        username: targetUser.username,
        role: targetUser.role
      },
      currentLocation: {
        lat: locationPreference.currentLocation.lat,
        lng: locationPreference.currentLocation.lng,
        accuracy: locationPreference.currentLocation.accuracy
      },
      address: {
        city: locationPreference.currentLocation.city,
        state: locationPreference.currentLocation.state,
        formatted: locationPreference.currentLocation.address,
        pincode: locationPreference.currentLocation.pincode
      },
      lastUpdated: locationPreference.lastLocationUpdate,
      locationAge: locationPreference.lastLocationUpdate 
        ? Date.now() - locationPreference.lastLocationUpdate.getTime() 
        : null,
      preferences: locationPreference.preferences,
      privacy: locationPreference.privacy,
      recentLocations: locationPreference.recentLocations || []
    };

    // Include detailed history only for admin users or explicit requests
    if (includeHistory && (currentUser.role === 'admin' || session.user.id === userId)) {
      responseData.locationHistory = locationPreference.locationHistory || [];
    }

    // Add usage analytics for admin users
    if (currentUser.role === 'admin') {
      responseData.analytics = {
        totalLocationUpdates: locationPreference.locationHistory?.length || 0,
        recentLocationCount: locationPreference.recentLocations?.length || 0,
        locationTrackingEnabled: locationPreference.privacy.trackLocationHistory,
        lastActivity: targetUser.lastActivityAt
      };
    }

    console.log(`📍 Location lookup: ${targetUser.email} (${targetUser.name}) by ${currentUser.email} (${currentUser.role})`);

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('Location user lookup error:', error);
    return NextResponse.json({ 
      error: 'Failed to get user location', 
      details: error.message 
    }, { status: 500 });
  }
}

// Enhanced search locations by user identifiers (admin only)
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    await connectDB();
    
    const currentUser = await User.findById(session.user.id);
    if (currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { 
      email, 
      username, 
      name, 
      city, 
      state, 
      role, 
      hasRecentLocation,
      searchType = 'advanced' // 'email', 'username', 'name', 'city', 'role', 'nearby', 'advanced'
    } = body;

    let results = [];
    let searchMethod = '';

    try {
      // Use optimized search methods based on search type
      switch (searchType) {
        case 'email':
          if (!email) throw new Error('Email required for email search');
          results = await LocationPreference.findByEmail(email);
          searchMethod = 'Direct email search';
          break;
          
        case 'username':
          if (!username) throw new Error('Username required for username search');
          results = await LocationPreference.findByUsername(username);
          searchMethod = 'Direct username search';
          break;
          
        case 'name':
          if (!name) throw new Error('Name required for name search');
          results = await LocationPreference.findByName(name);
          searchMethod = 'Text search by name';
          break;
          
        case 'city':
          if (!city) throw new Error('City required for city search');
          results = await LocationPreference.findByCity(city);
          searchMethod = 'City-based search';
          break;
          
        case 'state':
          if (!state) throw new Error('State required for state search');
          results = await LocationPreference.findByState(state);
          searchMethod = 'State-based search';
          break;
          
        case 'role':
          if (!role) throw new Error('Role required for role search');
          results = await LocationPreference.findByRoleAndLocation(role, city, state);
          searchMethod = 'Role-based search';
          break;
          
        case 'advanced':
        default:
          // Use the advanced search method with all criteria
          results = await LocationPreference.searchUsers({
            email,
            username,
            name,
            city,
            state,
            role,
            hasRecentLocation
          });
          searchMethod = 'Advanced multi-criteria search';
          break;
      }
    } catch (searchError) {
      console.error('Search method failed:', searchError);
      return NextResponse.json({ 
        error: 'Search failed', 
        details: searchError.message 
      }, { status: 400 });
    }

    if (results.length === 0) {
      return NextResponse.json({ 
        results: [], 
        count: 0,
        message: 'No users found matching criteria',
        searchMethod,
        searchCriteria: { email, username, name, city, state, role, hasRecentLocation }
      });
    }

    // Format results for response
    const formattedResults = results.map(locationPref => ({
      userId: locationPref.user,
      userIdentifier: locationPref.userIdentifier,
      hasLocation: true,
      currentLocation: {
        lat: locationPref.currentLocation.lat,
        lng: locationPref.currentLocation.lng,
        city: locationPref.currentLocation.city,
        state: locationPref.currentLocation.state,
        address: locationPref.currentLocation.address
      },
      lastUpdated: locationPref.lastLocationUpdate,
      locationAge: locationPref.lastLocationUpdate 
        ? Date.now() - locationPref.lastLocationUpdate.getTime() 
        : null,
      preferences: {
        locationSharingConsent: locationPref.preferences?.locationSharingConsent,
        autoLocationEnabled: locationPref.preferences?.autoLocationEnabled
      },
      recentLocationCount: locationPref.recentLocations?.length || 0
    }));

    // Sort by most recent location update
    formattedResults.sort((a, b) => {
      if (!a.lastUpdated) return 1;
      if (!b.lastUpdated) return -1;
      return new Date(b.lastUpdated) - new Date(a.lastUpdated);
    });

    // Limit results for performance (max 50)
    const limitedResults = formattedResults.slice(0, 50);

    console.log(`🔍 Admin location search by ${currentUser.email} using ${searchMethod}: found ${limitedResults.length}/${formattedResults.length} users`);

    return NextResponse.json({
      results: limitedResults,
      count: limitedResults.length,
      totalFound: formattedResults.length,
      searchMethod,
      searchCriteria: { email, username, name, city, state, role, hasRecentLocation },
      performance: {
        searchType,
        resultsLimited: formattedResults.length > 50,
        executionTime: 'optimized_direct_query'
      }
    });

  } catch (error) {
    console.error('Location search error:', error);
    return NextResponse.json({ 
      error: 'Failed to search locations', 
      details: error.message 
    }, { status: 500 });
  }
}