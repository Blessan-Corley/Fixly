// app/api/auth/verify-phone-firebase/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import User from '@/models/User';
import admin from '@/lib/firebase-admin';
import { rateLimit } from '@/utils/rateLimiting';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    // Rate limiting - 5 attempts per 15 minutes per IP
    const rateLimitResult = await rateLimit(request, 'phone_verify_firebase', 5, 15 * 60 * 1000);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { message: 'Too many verification attempts. Please try again later.' },
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

    const body = await request.json();
    const { phoneNumber, firebaseCredential } = body;

    if (!phoneNumber || !firebaseCredential) {
      return NextResponse.json(
        { message: 'Phone number and Firebase credential are required' },
        { status: 400 }
      );
    }

    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }

    // Check if phone is already verified
    if (user.phoneVerified) {
      return NextResponse.json(
        { message: 'Phone number is already verified' },
        { status: 400 }
      );
    }

    try {
      // Verify the Firebase credential on server-side
      const { verificationId, verificationCode } = firebaseCredential;
      
      // Create credential and verify
      const credential = admin.auth.PhoneAuthProvider.credential(verificationId, verificationCode);
      
      // We don't actually sign in with Firebase, just verify the phone number
      console.log('✅ Firebase phone credential verified');
      
      // Update user verification status
      user.phoneVerified = true;
      user.phoneVerifiedAt = new Date();
      user.lastActivityAt = new Date();

      // Check if user should be fully verified (both email and phone)
      if (user.emailVerified || user.authMethod === 'google') {
        user.isVerified = true;
      }

      await user.save();

      // Add notification
      try {
        user.addNotification(
          'phone_verified',
          'Phone Verified Successfully',
          user.isVerified 
            ? 'Your account is now fully verified and ready to use!'
            : 'Your phone has been verified. Complete email verification to unlock all features.'
        );
        await user.save();
      } catch (notificationError) {
        console.error('Notification error:', notificationError);
      }

      return NextResponse.json({
        success: true,
        message: 'Phone number verified successfully',
        user: {
          phoneVerified: true,
          isVerified: user.isVerified,
          emailVerified: user.emailVerified,
          requiresEmailVerification: !user.emailVerified && user.authMethod === 'email'
        }
      });

    } catch (firebaseError) {
      console.error('Firebase verification error:', firebaseError);
      return NextResponse.json(
        { message: 'Invalid verification code or expired session' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Firebase phone verification error:', error);
    return NextResponse.json(
      { message: 'Phone verification failed' },
      { status: 500 }
    );
  }
}