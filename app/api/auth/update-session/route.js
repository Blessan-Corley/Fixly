// app/api/auth/update-session/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import User from '@/models/User';

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'No active session found' },
        { status: 401 }
      );
    }

    await connectDB();
    
    // Fetch updated user data from database
    const user = await User.findById(session.user.id);
    
    if (!user) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }

    // Session update requested

    // Return updated user data for session refresh
    return NextResponse.json({
      success: true,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        username: user.username,
        role: user.role,
        photoURL: user.profilePhoto?.url || user.picture || null,
        isVerified: user.isVerified,
        isRegistered: !!(user.role && user.location && user.username && !user.username.startsWith('temp_')),
        authMethod: user.authMethod
      }
    });

  } catch (error) {
    console.error('Session update error:', error);
    return NextResponse.json(
      { message: 'Failed to update session' },
      { status: 500 }
    );
  }
}