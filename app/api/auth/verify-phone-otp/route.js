// app/api/auth/verify-phone-otp/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import User from '@/models/User';
import VerificationToken from '@/models/VerificationToken';
import { sendWelcomeSMS } from '@/utils/smsService';
import { rateLimit } from '@/utils/rateLimiting';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    // Rate limiting - 5 attempts per 15 minutes per IP
    const rateLimitResult = await rateLimit(request, 'phone_verify', 5, 15 * 60 * 1000);
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
    const { otp } = body;

    if (!otp || otp.length !== 6) {
      return NextResponse.json(
        { message: 'Valid 6-digit OTP is required' },
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

    // Find the verification token
    const verificationRecord = await VerificationToken.findValidToken(
      user._id,
      'phone',
      otp
    );

    if (!verificationRecord) {
      // Increment failed attempts for existing tokens
      const existingToken = await VerificationToken.findOne({
        userId: user._id,
        type: 'phone',
        used: false,
        expiresAt: { $gt: new Date() }
      });

      if (existingToken) {
        await existingToken.incrementAttempts();
        
        const remainingAttempts = 3 - existingToken.attempts;
        if (remainingAttempts > 0) {
          return NextResponse.json(
            { message: `Invalid OTP. ${remainingAttempts} attempts remaining.` },
            { status: 400 }
          );
        } else {
          return NextResponse.json(
            { message: 'Maximum attempts reached. Please request a new OTP.' },
            { status: 400 }
          );
        }
      }

      return NextResponse.json(
        { message: 'Invalid or expired OTP' },
        { status: 400 }
      );
    }

    // Check if token can be used
    if (!verificationRecord.canAttempt()) {
      return NextResponse.json(
        { message: 'OTP has expired or reached maximum attempts' },
        { status: 400 }
      );
    }

    // Mark token as used
    await verificationRecord.markAsUsed();

    // Update user verification status
    user.phoneVerified = true;
    user.phoneVerifiedAt = new Date();
    user.lastActivityAt = new Date();

    // Check if user should be fully verified (both email and phone)
    if (user.emailVerified || user.authMethod === 'google') {
      user.isVerified = true;
    }

    await user.save();

    // Clean up all other phone verification tokens for this user
    await VerificationToken.deleteMany({
      userId: user._id,
      type: 'phone'
    });

    // Send welcome SMS if fully verified
    if (user.isVerified) {
      try {
        await sendWelcomeSMS(user.phone, user.name);
      } catch (smsError) {
        console.error('Welcome SMS error:', smsError);
        // Don't fail verification if welcome SMS fails
      }
    }

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

  } catch (error) {
    console.error('Phone OTP verification error:', error);
    return NextResponse.json(
      { message: 'Phone verification failed' },
      { status: 500 }
    );
  }
}