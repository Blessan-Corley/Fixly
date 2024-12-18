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
    const { idToken, phoneNumber } = body;

    if (!idToken) {
      return NextResponse.json(
        { message: 'Firebase ID token is required' },
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

    if (user.phoneVerified) {
      return NextResponse.json(
        { message: 'Phone number is already verified' },
        { status: 400 }
      );
    }

    try {
      // ✅ SECURE VERIFICATION: Verify the ID token sent from the client
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      
      // Ensure the token's phone number matches what we expect
      if (decodedToken.phone_number !== phoneNumber && decodedToken.phone_number !== `+91${phoneNumber}`) {
         return NextResponse.json(
          { message: 'Phone number mismatch' },
          { status: 400 }
        );
      }

      console.log('✅ Firebase phone ID token verified for:', decodedToken.phone_number);
      
      // Update user verification status
      user.phoneVerified = true;
      user.phoneVerifiedAt = new Date();
      user.lastActivityAt = new Date();
      
      // Normalize phone number if needed (e.g., store without +91)
      // user.phone = ... (logic depends on your storage preference)

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
      console.error('Firebase token verification error:', firebaseError);
      return NextResponse.json(
        { message: 'Invalid or expired verification token' },
        { status: 401 }
      );
    }

  } catch (error) {
    console.error('Phone verification server error:', error);
    return NextResponse.json(
      { message: 'Phone verification failed' },
      { status: 500 }
    );
  }
}