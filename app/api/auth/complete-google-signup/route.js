// app/api/auth/complete-google-signup/route.js - Complete Google OAuth signup
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';
import connectDB from '../../../../lib/db';
import User from '../../../../models/User';

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { role, username, phone, location, skills } = await request.json();

    // ✅ STRICT VALIDATION: All fields required for complete signup
    if (!role || !['hirer', 'fixer'].includes(role)) {
      return NextResponse.json(
        { error: 'Valid role (hirer or fixer) is required' },
        { status: 400 }
      );
    }

    if (!username || username.length < 3) {
      return NextResponse.json(
        { error: 'Username must be at least 3 characters' },
        { status: 400 }
      );
    }

    if (!phone || phone.length < 10) {
      return NextResponse.json(
        { error: 'Valid phone number is required' },
        { status: 400 }
      );
    }

    if (!location || !location.city || !location.lat || !location.lng) {
      return NextResponse.json(
        { error: 'Complete location is required' },
        { status: 400 }
      );
    }

    if (role === 'fixer' && (!skills || skills.length === 0)) {
      return NextResponse.json(
        { error: 'At least one skill is required for fixers' },
        { status: 400 }
      );
    }

    await connectDB();

    // Check for existing username/phone conflicts
    const existingConflict = await User.findOne({
      _id: { $ne: session.user.id },
      $or: [
        { username: username.toLowerCase() },
        { phone: phone }
      ]
    });

    if (existingConflict) {
      if (existingConflict.username === username.toLowerCase()) {
        return NextResponse.json(
          { error: 'Username already taken. Please choose another.' },
          { status: 409 }
        );
      }
      if (existingConflict.phone === phone) {
        return NextResponse.json(
          { error: 'Phone number already registered.' },
          { status: 409 }
        );
      }
    }

    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // ✅ COMPLETE PROFILE UPDATE: All required fields
    const updateData = {
      role,
      username: username.toLowerCase(),
      phone,
      location,
      isRegistered: true,
      profileCompletedAt: new Date(),
      lastActivityAt: new Date(),
      updatedAt: new Date()
    };

    // Add skills for fixers
    if (role === 'fixer' && skills) {
      updateData.skills = skills;
    }

    const updatedUser = await User.findByIdAndUpdate(
      session.user.id,
      updateData,
      { new: true }
    );

    console.log('✅ Google signup completion successful for:', updatedUser.email);

    return NextResponse.json({
      success: true,
      message: 'Profile completed successfully! Welcome to Fixly.',
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        username: updatedUser.username,
        email: updatedUser.email,
        role: updatedUser.role,
        phone: updatedUser.phone,
        location: updatedUser.location,
        isRegistered: true
      }
    });

  } catch (error) {
    console.error('❌ Complete Google signup error:', error);
    
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return NextResponse.json(
        { error: `${field} already exists. Please use a different value.` },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to complete signup. Please try again.' },
      { status: 500 }
    );
  }
}