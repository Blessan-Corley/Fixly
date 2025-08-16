// app/api/user/update-username/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import User from '@/models/User';

export const dynamic = 'force-dynamic';

export async function PUT(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      );
    }

    await connectDB();

    const { username } = await request.json();

    if (!username) {
      return NextResponse.json(
        { message: 'Username is required' },
        { status: 400 }
      );
    }

    // Find current user
    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user has reached username change limit
    if (user.usernameChangeCount >= 3) {
      return NextResponse.json(
        { message: 'You have reached the maximum limit of 3 username changes' },
        { status: 400 }
      );
    }

    // Validate username format
    const cleanUsername = username.toLowerCase().trim();
    
    // Basic validation
    if (cleanUsername.length < 3 || cleanUsername.length > 20) {
      return NextResponse.json(
        { message: 'Username must be between 3 and 20 characters' },
        { status: 400 }
      );
    }

    if (!/^[a-z0-9_]+$/.test(cleanUsername)) {
      return NextResponse.json(
        { message: 'Username can only contain lowercase letters, numbers, and underscores' },
        { status: 400 }
      );
    }

    // Check if username is already taken
    const existingUser = await User.findOne({ 
      username: cleanUsername,
      _id: { $ne: session.user.id }
    });

    if (existingUser) {
      return NextResponse.json(
        { message: 'This username is already taken' },
        { status: 400 }
      );
    }

    // Check if it's the same username
    if (user.username === cleanUsername) {
      return NextResponse.json(
        { message: 'This is already your current username' },
        { status: 400 }
      );
    }

    // Update username and increment change count
    user.username = cleanUsername;
    user.usernameChangeCount = (user.usernameChangeCount || 0) + 1;
    user.lastUsernameChange = new Date();
    
    await user.save();

    // Add notification
    await user.addNotification(
      'settings_updated',
      'Username Updated',
      `Your username has been changed to @${cleanUsername}. You have ${3 - user.usernameChangeCount} changes remaining.`
    );

    return NextResponse.json({
      success: true,
      message: 'Username updated successfully',
      user: {
        id: user._id.toString(),
        username: user.username,
        usernameChangeCount: user.usernameChangeCount,
        changesRemaining: 3 - user.usernameChangeCount
      }
    });

  } catch (error) {
    console.error('Update username error:', error);
    return NextResponse.json(
      { 
        message: 'Failed to update username',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}