// app/api/auth/verify-email/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import User from '@/models/User';
import VerificationToken from '@/models/VerificationToken';
import { sendWelcomeEmail } from '@/utils/emailService';
import { rateLimit } from '@/utils/rateLimiting';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    // Rate limiting - 5 attempts per 15 minutes per IP
    const rateLimitResult = await rateLimit(request, 'email_verify', 5, 15 * 60 * 1000);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { message: 'Too many verification attempts. Please try again later.' },
        { status: 429 }
      );
    }

    await connectDB();

    const body = await request.json();
    const { token, method = 'link' } = body;

    if (!token) {
      return NextResponse.json(
        { message: 'Verification token is required' },
        { status: 400 }
      );
    }

    // For link verification, token might come from URL query
    let userId = null;
    
    // If session exists, use it to get user
    const session = await getServerSession(authOptions);
    if (session) {
      userId = session.user.id;
    }

    // Find the verification token
    let verificationRecord;
    if (userId) {
      verificationRecord = await VerificationToken.findValidToken(
        userId,
        method === 'otp' ? 'email_otp' : 'email',
        token
      );
    } else {
      // For link verification without session, find by token
      const hashedToken = VerificationToken.hashToken(token);
      verificationRecord = await VerificationToken.findOne({
        hashedToken,
        type: 'email',
        used: false,
        expiresAt: { $gt: new Date() },
        attempts: { $lt: 3 }
      }).populate('userId');
    }

    if (!verificationRecord) {
      return NextResponse.json(
        { message: 'Invalid or expired verification token' },
        { status: 400 }
      );
    }

    // Check if token can be used
    if (!verificationRecord.canAttempt()) {
      return NextResponse.json(
        { message: 'Verification token has expired or reached maximum attempts' },
        { status: 400 }
      );
    }

    // Get user
    const user = await User.findById(verificationRecord.userId);
    if (!user) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }

    // Check if email is already verified
    if (user.emailVerified) {
      return NextResponse.json(
        { message: 'Email is already verified' },
        { status: 400 }
      );
    }

    // Mark token as used
    await verificationRecord.markAsUsed();

    // Update user verification status
    user.emailVerified = true;
    user.emailVerifiedAt = new Date();
    user.lastActivityAt = new Date();

    // Check if user should be fully verified (both email and phone if required)
    if (user.phoneVerified || user.authMethod === 'google' || !user.phone) {
      user.isVerified = true;
    }

    await user.save();

    // Clean up all other email verification tokens for this user
    await VerificationToken.deleteMany({
      userId: user._id,
      type: { $in: ['email', 'email_otp'] }
    });

    // Send welcome email if fully verified
    if (user.isVerified) {
      try {
        await sendWelcomeEmail(user.email, user.name);
      } catch (emailError) {
        console.error('Welcome email error:', emailError);
        // Don't fail verification if welcome email fails
      }
    }

    // Add notification
    try {
      user.addNotification(
        'email_verified',
        'Email Verified Successfully',
        user.isVerified 
          ? 'Your account is now fully verified and ready to use!'
          : 'Your email has been verified. Complete phone verification to unlock all features.'
      );
      await user.save();
    } catch (notificationError) {
      console.error('Notification error:', notificationError);
    }

    return NextResponse.json({
      success: true,
      message: 'Email verified successfully',
      user: {
        emailVerified: true,
        isVerified: user.isVerified,
        phoneVerified: user.phoneVerified,
        requiresPhoneVerification: !user.phoneVerified && user.phone && user.authMethod === 'email'
      }
    });

  } catch (error) {
    console.error('Email verification error:', error);
    return NextResponse.json(
      { message: 'Email verification failed' },
      { status: 500 }
    );
  }
}

// GET method for link-based verification
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.redirect(new URL('/auth/error?error=missing_token', request.url));
    }

    // Use POST method logic for verification
    const verificationResult = await POST(new Request(request.url, {
      method: 'POST',
      headers: request.headers,
      body: JSON.stringify({ token, method: 'link' })
    }));

    const result = await verificationResult.json();

    if (result.success) {
      return NextResponse.redirect(new URL('/auth/verified?type=email', request.url));
    } else {
      return NextResponse.redirect(new URL(`/auth/error?error=${encodeURIComponent(result.message)}`, request.url));
    }

  } catch (error) {
    console.error('Email verification GET error:', error);
    return NextResponse.redirect(new URL('/auth/error?error=verification_failed', request.url));
  }
}