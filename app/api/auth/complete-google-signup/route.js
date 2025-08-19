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
        { message: 'Authentication required' },
        { status: 401 }
      );
    }

    const { role, phone, location, skills } = await request.json();

    if (!role || !['hirer', 'fixer'].includes(role)) {
      return NextResponse.json(
        { message: 'Valid role is required' },
        { status: 400 }
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

    // Update user with complete profile
    const updateData = {
      role,
      isRegistered: true,
      profileCompletedAt: new Date(),
      lastActivityAt: new Date()
    };

    if (phone) updateData.phone = phone;
    if (location) updateData.location = location;
    if (skills && role === 'fixer') updateData.skills = skills;

    const updatedUser = await User.findByIdAndUpdate(
      session.user.id,
      updateData,
      { new: true }
    );

    console.log('✅ Google signup completion successful');

    return NextResponse.json({
      success: true,
      message: 'Profile completed successfully',
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        username: updatedUser.username,
        email: updatedUser.email,
        role: updatedUser.role,
        isRegistered: true
      }
    });

  } catch (error) {
    console.error('Complete Google signup error:', error);
    return NextResponse.json(
      { message: 'Failed to complete signup' },
      { status: 500 }
    );
  }
}