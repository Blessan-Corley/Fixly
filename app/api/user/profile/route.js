// app/api/user/profile/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';
import connectDB from '../../../../lib/db';
import User from '../../../../models/User';
import { rateLimit } from '../../../../utils/rateLimiting';

export async function GET(request) {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimit(request, 'user_profile', 60, 60); // 60 requests per minute
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

    const user = await User.findById(session.user.id).select('-passwordHash').lean();
    if (!user) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(user);

  } catch (error) {
    console.error('Get user profile error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimit(request, 'update_profile', 10, 60); // 10 updates per minute
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { message: 'Too many update requests. Please try again later.' },
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
    const {
      name,
      bio,
      location,
      skills,
      availableNow,
      workRadius,
      preferences
    } = body;

    // Validate and update allowed fields
    const updateData = {};

    if (name !== undefined) {
      if (!name.trim()) {
        return NextResponse.json(
          { message: 'Name cannot be empty' },
          { status: 400 }
        );
      }
      updateData.name = name.trim();
    }

    if (bio !== undefined) {
      if (bio.length > 500) {
        return NextResponse.json(
          { message: 'Bio cannot exceed 500 characters' },
          { status: 400 }
        );
      }
      updateData.bio = bio.trim();
    }

    if (location !== undefined && location) {
      updateData.location = {
        city: location.city?.trim(),
        state: location.state?.trim(),
        lat: location.lat,
        lng: location.lng
      };
    }

    if (skills !== undefined && user.role === 'fixer') {
      if (!Array.isArray(skills)) {
        return NextResponse.json(
          { message: 'Skills must be an array' },
          { status: 400 }
        );
      }
      updateData.skills = skills.map(skill => skill.toLowerCase().trim());
    }

    if (availableNow !== undefined && user.role === 'fixer') {
      updateData.availableNow = Boolean(availableNow);
    }

    if (workRadius !== undefined && user.role === 'fixer') {
      const radius = Number(workRadius);
      if (radius < 1 || radius > 50) {
        return NextResponse.json(
          { message: 'Work radius must be between 1 and 50 kilometers' },
          { status: 400 }
        );
      }
      updateData.workRadius = radius;
    }

    if (preferences !== undefined) {
      updateData.preferences = {
        ...user.preferences,
        ...preferences
      };
    }

    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-passwordHash');

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser
    });

  } catch (error) {
    console.error('Update profile error:', error);
    
    if (error.name === 'ValidationError') {
      return NextResponse.json(
        { message: Object.values(error.errors)[0].message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: 'Failed to update profile' },
      { status: 500 }
    );
  }
}