// app/api/user/check-email/route.js
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

    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { available: false, message: 'Email is required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { available: false, message: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Check if email already exists (excluding current user)
    const existingUser = await User.findOne({
      email: email.toLowerCase(),
      _id: { $ne: session.user.id }
    });

    if (existingUser) {
      return NextResponse.json(
        { available: false, message: 'Email is already registered' },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { available: true, message: 'Email is available' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Check email error:', error);
    return NextResponse.json(
      { available: false, message: 'Failed to check email availability' },
      { status: 500 }
    );
  }
}