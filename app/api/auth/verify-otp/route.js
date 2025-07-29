// app/api/auth/verify-otp/route.js
import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';
import { rateLimit } from '@/utils/rateLimiting';
import connectDB from '@/lib/db';
import User from '@/models/User';

export async function POST(request) {
  try {
    // Apply rate limiting for OTP verification
    const rateLimitResult = await rateLimit(request, 'otp_verify', 10, 60 * 1000); // 10 attempts per minute
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { message: 'Too many verification attempts. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { phoneNumber, firebaseUid, action = 'signup' } = body;

    console.log('📱 OTP verification request:', { phoneNumber, firebaseUid, action });

    // Validate required fields
    if (!phoneNumber || !firebaseUid) {
      return NextResponse.json(
        { message: 'Phone number and Firebase UID are required' },
        { status: 400 }
      );
    }

    // Validate phone number format
    const phoneRegex = /^(\+91)?[6-9]\d{9}$/;
    const cleanPhone = phoneNumber.replace(/[^\d]/g, '');
    if (!phoneRegex.test(cleanPhone)) {
      return NextResponse.json(
        { message: 'Invalid phone number format' },
        { status: 400 }
      );
    }

    const formattedPhone = `+91${cleanPhone}`;

    try {
      // Verify the Firebase UID and get user record
      const firebaseUser = await adminAuth.getUser(firebaseUid);
      
      // Verify that the phone number matches
      if (firebaseUser.phoneNumber !== formattedPhone) {
        return NextResponse.json(
          { message: 'Phone number mismatch' },
          { status: 400 }
        );
      }

      // Connect to database
      await connectDB();

      if (action === 'signup') {
        // For signup: Check if phone number is already registered
        const existingUser = await User.findOne({ phone: formattedPhone });
        if (existingUser) {
          return NextResponse.json(
            { message: 'Phone number is already registered' },
            { status: 409 }
          );
        }

        // Phone verification successful for signup
        return NextResponse.json({
          success: true,
          message: 'Phone number verified successfully',
          phoneNumber: formattedPhone,
          firebaseUid: firebaseUid,
          verified: true
        });

      } else if (action === 'signin') {
        // For signin: Find user with this phone number
        const user = await User.findOne({ 
          phone: formattedPhone,
          authMethod: 'phone'
        });

        if (!user) {
          return NextResponse.json(
            { message: 'No account found with this phone number' },
            { status: 404 }
          );
        }

        if (user.banned) {
          return NextResponse.json(
            { message: 'Account has been suspended' },
            { status: 403 }
          );
        }

        // Update user's last login and phone verification status
        user.phoneVerified = true;
        user.lastActive = new Date();
        await user.save();

        return NextResponse.json({
          success: true,
          message: 'Phone number verified successfully',
          user: {
            id: user._id.toString(),
            name: user.name,
            username: user.username,
            email: user.email,
            role: user.role,
            isVerified: user.isVerified,
            authMethod: user.authMethod
          },
          verified: true
        });

      } else {
        return NextResponse.json(
          { message: 'Invalid action' },
          { status: 400 }
        );
      }

    } catch (firebaseError) {
      console.error('🔥 Firebase verification error:', firebaseError);
      
      // Handle specific Firebase errors
      if (firebaseError.code === 'auth/user-not-found') {
        return NextResponse.json(
          { message: 'Invalid verification session' },
          { status: 400 }
        );
      }
      
      if (firebaseError.code === 'auth/invalid-uid') {
        return NextResponse.json(
          { message: 'Invalid verification data' },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { message: 'Phone verification failed. Please try again.' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('💥 OTP verification error:', error);
    return NextResponse.json(
      { message: 'Verification failed. Please try again.' },
      { status: 500 }
    );
  }
}

// GET endpoint to check phone number availability
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const phoneNumber = searchParams.get('phone');

    if (!phoneNumber) {
      return NextResponse.json(
        { message: 'Phone number is required' },
        { status: 400 }
      );
    }

    // Validate phone number format
    const phoneRegex = /^(\+91)?[6-9]\d{9}$/;
    const cleanPhone = phoneNumber.replace(/[^\d]/g, '');
    if (!phoneRegex.test(cleanPhone)) {
      return NextResponse.json(
        { message: 'Invalid phone number format' },
        { status: 400 }
      );
    }

    const formattedPhone = `+91${cleanPhone}`;

    await connectDB();

    // Check if phone number exists
    const existingUser = await User.findOne({ phone: formattedPhone });

    return NextResponse.json({
      available: !existingUser,
      exists: !!existingUser,
      phone: formattedPhone
    });

  } catch (error) {
    console.error('📱 Phone check error:', error);
    return NextResponse.json(
      { message: 'Failed to check phone number' },
      { status: 500 }
    );
  }
}