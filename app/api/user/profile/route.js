// app/api/user/profile/route.js - CRITICAL API ROUTE
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { rateLimit } from '@/utils/rateLimiting';

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

    await connectDB();

    // Find user with all necessary fields
    const user = await User.findById(session.user.id).select(`
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
      firebaseUid
    `);

    if (!user) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
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
      id: user._id,
      name: user.name,
      username: user.username,
      email: user.email,
      phone: user.phone,
      role: user.role,
      profilePhoto: user.profilePhoto || null,
      isRegistered: user.isRegistered || false,
      banned: user.banned || false,
      
      // Location
      location: user.location || null,
      
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
      emailVerified: user.emailVerified || false,
      phoneVerified: user.phoneVerified || false,
      
      // Auth IDs (don't expose sensitive data)
      hasGoogleAuth: !!user.googleId,
      hasPhoneAuth: !!user.firebaseUid,
    };

    return NextResponse.json({
      success: true,
      user: profileData
    });

  } catch (error) {
    console.error('User profile fetch error:', error);
    
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

    await connectDB();

    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }

    if (user.banned) {
      return NextResponse.json(
        { message: 'Account suspended' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const allowedUpdates = [
      'name',
      'location',
      'skills',
      'preferences',
      'profilePhoto'
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
        updates[key] = value;
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { message: 'No valid updates provided' },
        { status: 400 }
      );
    }

    // Apply updates
    Object.assign(user, updates);
    await user.save();

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        location: user.location,
        skills: user.skills,
        preferences: user.preferences,
        profilePhoto: user.profilePhoto
      }
    });

  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json(
      { message: 'Failed to update profile' },
      { status: 500 }
    );
  }
}