// app/api/auth/send-email-verification/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import User from '@/models/User';
import VerificationToken from '@/models/VerificationToken';
import { sendVerificationEmail } from '@/utils/emailService';
import { rateLimit } from '@/utils/rateLimiting';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    // Rate limiting - 3 emails per 15 minutes per IP
    const rateLimitResult = await rateLimit(request, 'email_verification', 3, 15 * 60 * 1000);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { message: 'Too many verification emails sent. Please wait before requesting another.' },
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

    const user = await User.findById(session.user.id);
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

    // Check if user signed up with Google (email is automatically verified)
    if (user.authMethod === 'google' || user.providers?.includes('google')) {
      // Update user to mark email as verified if not already
      if (!user.emailVerified) {
        user.emailVerified = true;
        user.emailVerifiedAt = new Date();
        if (user.phoneVerified) {
          user.isVerified = true;
        }
        await user.save();
      }
      
      return NextResponse.json(
        { message: 'Email is already verified through Google authentication' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { method = 'link' } = body; // 'link' or 'otp'

    // Get client info
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const ipAddress = forwardedFor?.split(',')[0] || realIp || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Check for existing valid tokens
    const existingToken = await VerificationToken.findOne({
      userId: user._id,
      type: method === 'otp' ? 'email_otp' : 'email',
      used: false,
      expiresAt: { $gt: new Date() }
    });

    if (existingToken) {
      // Check if we can resend (minimum 1 minute between sends)
      const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
      if (existingToken.createdAt > oneMinuteAgo) {
        const waitTime = Math.ceil((60 - (Date.now() - existingToken.createdAt.getTime()) / 1000));
        return NextResponse.json(
          { message: `Please wait ${waitTime} seconds before requesting another verification email` },
          { status: 429 }
        );
      }
    }

    // Clean up old tokens for this user
    await VerificationToken.deleteMany({
      userId: user._id,
      type: method === 'otp' ? 'email_otp' : 'email'
    });

    // Create new verification token
    const verificationToken = await VerificationToken.createVerificationToken(
      user._id,
      method === 'otp' ? 'email_otp' : 'email',
      user.email,
      ipAddress,
      userAgent
    );

    // Send verification email
    const emailResult = await sendVerificationEmail(
      user.email,
      user.name,
      verificationToken.token,
      method === 'otp'
    );

    if (!emailResult.success) {
      // Clean up token if email failed
      await VerificationToken.findByIdAndDelete(verificationToken._id);
      
      return NextResponse.json(
        { message: 'Failed to send verification email. Please try again.' },
        { status: 500 }
      );
    }

    // Add notification to user
    try {
      user.addNotification(
        'email_verification_sent',
        'Email Verification Sent',
        `A verification ${method === 'otp' ? 'code' : 'link'} has been sent to ${user.email}`
      );
      await user.save();
    } catch (notificationError) {
      console.error('Notification error:', notificationError);
      // Continue even if notification fails
    }

    return NextResponse.json({
      success: true,
      message: method === 'otp' 
        ? 'Verification code sent to your email'
        : 'Verification link sent to your email',
      method,
      email: user.email.replace(/(.{2})(.*)(@.*)/, '$1***$3'), // Mask email
      expiresIn: method === 'otp' ? '5 minutes' : '24 hours'
    });

  } catch (error) {
    console.error('Send email verification error:', error);
    return NextResponse.json(
      { message: 'Failed to send verification email' },
      { status: 500 }
    );
  }
}