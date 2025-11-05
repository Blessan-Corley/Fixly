// app/api/user/profile/route.js - CRITICAL API ROUTE
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { rateLimit } from '@/utils/rateLimiting';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimit(request, 'user_profile', 100, 60 * 1000);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { message: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      );
    }

    // ✅ CRITICAL FIX: Handle temporary session IDs and missing user data
    const userId = session.user?.id;
    if (!userId) {
      console.log('⚠️ No user ID in session:', session.user);
      return NextResponse.json(
        { 
          message: 'Invalid session. Please sign in again.',
          needsReauth: true
        },
        { status: 401 }
      );
    }
    
    if (userId.startsWith('temp_')) {
      console.log('⚠️ Temporary session detected:', userId);
      return NextResponse.json(
        { 
          message: 'Session not properly established. Please complete signup.',
          needsReauth: true,
          needsSignup: true
        },
        { status: 401 }
      );
    }

    await connectDB();

    // ✅ CRITICAL FIX: Handle Google users vs MongoDB users
    const isGoogleUser = !userId.match(/^[0-9a-fA-F]{24}$/);

    let user;

    if (isGoogleUser) {
      console.log('🔍 Google user profile request (non-ObjectId):', userId);
      // For Google users, find by googleId instead of _id
      user = await User.findOne({ googleId: userId }).select(`
        name
        username
        email
        phone
        role
        profilePhoto
        isRegistered
        isVerified
        emailVerified
        phoneVerified
        authMethod
        picture
        location
        skills
        rating
        jobsCompleted
        totalEarnings
        privacy
        preferences
        banned
        isActive
        lastLoginAt
        createdAt
        plan
      `);

      if (!user) {
        console.log('❌ Google user not found in database:', userId);
        return NextResponse.json(
          { message: 'User not found. Please complete signup first.' },
          { status: 404 }
        );
      }

      // Check if Google user needs to complete profile
      if (!user.isRegistered || user.username?.startsWith('temp_')) {
        console.log('⚠️ Google user profile incomplete:', user.username);
        return NextResponse.json(
          {
            message: 'Profile incomplete. Please complete signup first.',
            needsCompletion: true,
            user: {
              name: user.name,
              email: user.email,
              authMethod: user.authMethod
            }
          },
          { status: 200 } // Return 200 so frontend can handle properly
        );
      }
    } else {
      // Find MongoDB user with all necessary fields
      user = await User.findById(userId).select(`
      name
      username
      email
      phone
      role
      profilePhoto
      isRegistered
      banned
      location
      skills
      rating
      jobsCompleted
      totalEarnings
      plan
      notifications
      preferences
      createdAt
      lastLoginAt
      authMethod
      emailVerified
      phoneVerified
      googleId
    `);
    }

    if (!user) {
      console.error('❌ User not found for ID:', userId);
      console.error('📧 Session email:', session.user?.email);

      // Try to find by email as fallback
      if (session.user?.email) {
        console.log('🔍 Attempting to find user by email:', session.user.email);
        user = await User.findOne({ email: session.user.email }).select(`
          name
          username
          email
          phone
          role
          profilePhoto
          picture
          isRegistered
          banned
          location
          skills
          rating
          jobsCompleted
          totalEarnings
          plan
          notifications
          preferences
          createdAt
          lastLoginAt
          authMethod
          emailVerified
          phoneVerified
          googleId
        `);

        if (user) {
          console.log('✅ User found by email, session ID mismatch fixed');
          // The session will be updated on next request
        }
      }

      if (!user) {
        return NextResponse.json(
          { message: 'User not found. Please sign out and sign in again.' },
          { status: 404 }
        );
      }
    }

    // Check if user is banned
    if (user.banned) {
      return NextResponse.json(
        { 
          message: 'Account suspended. Please contact support.',
          banned: true 
        },
        { status: 403 }
      );
    }

    // Update last login time
    user.lastLoginAt = new Date();
    await user.save();

    // Calculate unread notifications count
    const unreadNotifications = user.notifications?.filter(n => !n.read)?.length || 0;

    // Prepare response data
    const profileData = {
      _id: user._id,
      id: user._id,
      name: user.name,
      username: user.username,
      email: user.email,
      phone: user.phone,
      role: user.role,
      profilePhoto: user.profilePhoto?.url || user.picture || null,
      photoURL: user.profilePhoto?.url || user.picture || null, // Support both field names
      isRegistered: user.isRegistered || false,
      banned: user.banned || false,
      
      // Location
      location: user.location || null,
      locationHistory: user.locationHistory?.slice(0, 5) || [], // Return last 5 location entries
      
      // Role-specific data
      skills: user.role === 'fixer' ? (user.skills || []) : undefined,
      
      // Stats
      rating: user.rating || { average: 0, count: 0 },
      jobsCompleted: user.jobsCompleted || 0,
      totalEarnings: user.totalEarnings || 0,
      
      // Subscription
      plan: user.plan || { type: 'free', status: 'active' },
      
      // Notifications
      unreadNotifications,
      
      // Preferences
      preferences: user.preferences || {
        emailNotifications: true,
        smsNotifications: true,
        jobAlerts: true
      },
      
      // Account info
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
      authMethod: user.authMethod || 'email',
      emailVerified: user.emailVerified !== false, // Default to true unless explicitly false
      phoneVerified: user.phoneVerified || false,
      
      // Auth IDs (don't expose sensitive data)
      hasGoogleAuth: !!user.googleId,
      hasPhoneAuth: !!user.firebaseUid,
    };

    console.log('✅ User profile fetched successfully');

    // Add cache headers for better performance
    return NextResponse.json({
      success: true,
      user: profileData
    }, {
      headers: {
        'Cache-Control': 'private, max-age=30, stale-while-revalidate=60',
        'CDN-Cache-Control': 'max-age=60',
        'Vary': 'Cookie'
      }
    });

  } catch (error) {
    console.error('❌ User profile fetch error:', error);
    
    // Check for specific database errors
    if (error.name === 'CastError') {
      return NextResponse.json(
        { message: 'Invalid user ID format' },
        { status: 400 }
      );
    }
    
    if (error.name === 'MongoNetworkError') {
      return NextResponse.json(
        { message: 'Database connection error' },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { 
        message: 'Failed to fetch user profile',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimit(request, 'update_profile', 20, 60 * 1000);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { message: 'Too many update attempts. Please try again later.' },
        { status: 429 }
      );
    }

    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      );
    }

    // ✅ CRITICAL FIX: Handle temporary session IDs and missing user data
    const userId = session.user?.id;
    if (!userId) {
      console.log('⚠️ No user ID in session for PUT:', session.user);
      return NextResponse.json(
        { 
          message: 'Invalid session. Please sign in again.',
          needsReauth: true
        },
        { status: 401 }
      );
    }
    
    if (userId.startsWith('temp_')) {
      console.log('⚠️ Temporary session detected for PUT:', userId);
      return NextResponse.json(
        { 
          message: 'Session not properly established. Please complete signup.',
          needsReauth: true,
          needsSignup: true
        },
        { status: 401 }
      );
    }

    await connectDB();

    // ✅ CRITICAL FIX: Handle Google users vs MongoDB users
    const isGoogleUser = !userId.match(/^[0-9a-fA-F]{24}$/);

    let user;

    if (isGoogleUser) {
      console.log('🔍 Google user profile update (non-ObjectId):', userId);
      // For Google users, find by googleId instead of _id
      user = await User.findOne({ googleId: userId });

      if (!user) {
        console.log('❌ Google user not found in database:', userId);
        return NextResponse.json(
          { message: 'User not found. Please complete signup first.' },
          { status: 404 }
        );
      }
    } else {
      // Find MongoDB user
      user = await User.findById(userId);

      if (!user) {
        return NextResponse.json(
          { message: 'User not found' },
          { status: 404 }
        );
      }
    }

    if (user.banned) {
      return NextResponse.json(
        { message: 'Account suspended' },
        { status: 403 }
      );
    }

    let body;
    try {
      body = await request.json();
      console.log('📝 Profile update request body:', body);
    } catch (error) {
      console.error('❌ Failed to parse request body:', error);
      return NextResponse.json(
        { message: 'Invalid request body' },
        { status: 400 }
      );
    }

    const allowedUpdates = [
      'name',
      'bio',
      'location',
      'skills',
      'preferences',
      'profilePhoto',
      'availableNow',
      'serviceRadius'
    ];

    // Validate and update allowed fields
    const updates = {};
    for (const [key, value] of Object.entries(body)) {
      if (allowedUpdates.includes(key)) {
        if (key === 'skills' && user.role !== 'fixer') {
          continue; // Skip skills for non-fixers
        }
        if (key === 'name' && (!value || value.trim().length < 2)) {
          return NextResponse.json(
            { message: 'Name must be at least 2 characters' },
            { status: 400 }
          );
        }
        if (key === 'bio' && value && value.length > 500) {
          return NextResponse.json(
            { message: 'Bio must be less than 500 characters' },
            { status: 400 }
          );
        }
        if (key === 'serviceRadius' && (value < 1 || value > 50)) {
          return NextResponse.json(
            { message: 'Service radius must be between 1 and 50 km' },
            { status: 400 }
          );
        }
        updates[key] = value;
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { message: 'No valid updates provided' },
        { status: 400 }
      );
    }

    // ✅ CRITICAL: 24-hour rate limit for location changes
    if (updates.location) {
      const now = Date.now();
      const twentyFourHours = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

      if (user.lastLocationUpdate) {
        const timeSinceLastUpdate = now - user.lastLocationUpdate.getTime();

        if (timeSinceLastUpdate < twentyFourHours) {
          const timeRemaining = twentyFourHours - timeSinceLastUpdate;
          const hoursRemaining = Math.floor(timeRemaining / (60 * 60 * 1000));
          const minutesRemaining = Math.floor((timeRemaining % (60 * 60 * 1000)) / (60 * 1000));

          console.log('⏱️ Location update rate limit hit:', {
            userId: user._id,
            lastUpdate: user.lastLocationUpdate,
            hoursRemaining,
            minutesRemaining
          });

          return NextResponse.json(
            {
              message: `You can only update your location once every 24 hours. Please try again in ${hoursRemaining}h ${minutesRemaining}m.`,
              rateLimited: true,
              retryAfter: timeRemaining,
              hoursRemaining,
              minutesRemaining
            },
            { status: 429 }
          );
        }
      }

      console.log('✅ Location update allowed, updating lastLocationUpdate timestamp');
    }

    // Apply updates with special handling for location
    let locationActuallyUpdated = false;

    for (const [key, value] of Object.entries(updates)) {
      if (key === 'location') {
        // ✅ CRITICAL FIX: Only update location if it has valid coordinates
        if (value && value.lat && value.lng) {
          // Update main location
          user.location = {
            ...user.location,
            city: value.city || value.name || '',
            state: value.state || '',
            accuracy: value.accuracy,
            timestamp: new Date(),
            source: value.source || 'manual',
            homeAddress: {
              doorNo: value.doorNo || user.location?.homeAddress?.doorNo || '',
              street: value.street || value.route || '',
              district: value.district || value.locality || '',
              state: value.state || '',
              postalCode: value.postalCode || value.postal_code || '',
              formattedAddress: value.formatted_address || value.address || `${value.city || ''}, ${value.state || ''}`.trim().replace(/^,\s*|,\s*$/g, ''),
              coordinates: {
                latitude: value.lat,
                longitude: value.lng
              },
              setAt: new Date()
            }
          };

          // Add to location history (limit to last 10 entries)
          if (!user.locationHistory) {
            user.locationHistory = [];
          }

          user.locationHistory.unshift({
            coordinates: {
              latitude: value.lat,
              longitude: value.lng
            },
            address: value.formatted_address || value.address || `${value.city || ''}, ${value.state || ''}`.trim().replace(/^,\s*|,\s*$/g, ''),
            city: value.city || value.name || '',
            state: value.state || '',
            source: value.source || 'manual',
            accuracy: value.accuracy,
            timestamp: new Date(),
            deviceInfo: {
              type: 'web',
              userAgent: 'Location update from profile'
            }
          });

          // Keep only last 10 location history entries
          if (user.locationHistory.length > 10) {
            user.locationHistory = user.locationHistory.slice(0, 10);
          }

          locationActuallyUpdated = true;
        } else {
          // ✅ CRITICAL FIX: Skip location update if no valid coordinates
          // This prevents validation errors when saving profile without location changes
          console.log('⏭️ Skipping location update - no valid coordinates provided');
        }
      } else {
        user[key] = value;
      }
    }

    // ✅ CRITICAL: Update lastLocationUpdate timestamp only if location was actually changed
    if (locationActuallyUpdated) {
      user.lastLocationUpdate = new Date();
      console.log('📍 Location update timestamp set:', user.lastLocationUpdate);
    }

    await user.save();

    console.log('✅ Profile updated successfully for user:', user._id);

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        bio: user.bio,
        location: user.location,
        locationHistory: user.locationHistory?.slice(0, 5) || [], // Return last 5 location entries
        skills: user.skills,
        preferences: user.preferences,
        profilePhoto: user.profilePhoto,
        availableNow: user.availableNow,
        serviceRadius: user.serviceRadius
      }
    });

  } catch (error) {
    console.error('❌ Profile update error:', error);
    
    // Handle specific MongoDB errors
    if (error.name === 'ValidationError') {
      return NextResponse.json(
        { message: 'Invalid data provided', details: error.message },
        { status: 400 }
      );
    }
    
    if (error.name === 'CastError') {
      return NextResponse.json(
        { message: 'Invalid data format' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        message: 'Failed to update profile',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}