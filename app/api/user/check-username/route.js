// app/api/user/check-username/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';
import connectDB from '../../../../lib/db';
import User from '../../../../models/User';

export const dynamic = 'force-dynamic';

export async function POST(request) {
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
        { available: false, message: 'Username is required' },
        { status: 400 }
      );
    }

    // Validate username format
    if (username.length < 3 || username.length > 20) {
      return NextResponse.json(
        { available: false, message: 'Username must be 3-20 characters long' },
        { status: 400 }
      );
    }

    if (!/^[a-z0-9_]+$/.test(username)) {
      return NextResponse.json(
        { available: false, message: 'Username can only contain lowercase letters, numbers, and underscores' },
        { status: 400 }
      );
    }

    // Check if username already exists (excluding current user)
    const existingUser = await User.findOne({
      username: username,
      _id: { $ne: session.user.id }
    });

    if (existingUser) {
      return NextResponse.json(
        { available: false, message: 'Username is already taken' },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { available: true, message: 'Username is available' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Check username error:', error);
    return NextResponse.json(
      { available: false, message: 'Failed to check username availability' },
      { status: 500 }
    );
  }
}