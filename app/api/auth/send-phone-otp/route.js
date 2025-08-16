// app/api/auth/send-phone-otp/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import User from '@/models/User';
import VerificationToken from '@/models/VerificationToken';
import { sendPhoneOTP } from '@/utils/smsService';
import { rateLimit } from '@/utils/rateLimiting';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    // Rate limiting - 3 SMS per 15 minutes per IP
    const rateLimitResult = await rateLimit(request, 'phone_verification', 3, 15 * 60 * 1000);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { message: 'Too many OTP requests. Please wait before requesting another.' },
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

    // Check if phone is already verified
    if (user.phoneVerified) {
      return NextResponse.json(
        { message: 'Phone number is already verified' },
        { status: 400 }
      );
    }

    if (!user.phone) {
      return NextResponse.json(
        { message: 'No phone number found. Please update your profile first.' },
        { status: 400 }
      );
    }

    // Get client info
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const ipAddress = forwardedFor?.split(',')[0] || realIp || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Check for existing valid tokens
    const existingToken = await VerificationToken.findOne({
      userId: user._id,
      type: 'phone',
      used: false,
      expiresAt: { $gt: new Date() }
    });

    if (existingToken) {
      // Check if we can resend (minimum 1 minute between sends)
      const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
      if (existingToken.createdAt > oneMinuteAgo) {
        const waitTime = Math.ceil((60 - (Date.now() - existingToken.createdAt.getTime()) / 1000));
        return NextResponse.json(
          { message: `Please wait ${waitTime} seconds before requesting another OTP` },
          { status: 429 }
        );
      }
    }

    // Clean up old tokens for this user
    await VerificationToken.deleteMany({
      userId: user._id,
      type: 'phone'
    });

    // Create new verification token
    const verificationToken = await VerificationToken.createVerificationToken(
      user._id,
      'phone',
      user.phone,
      ipAddress,
      userAgent
    );

    // Send SMS OTP
    const smsResult = await sendPhoneOTP(user.phone, verificationToken.token);

    if (!smsResult.success) {
      // Clean up token if SMS failed
      await VerificationToken.findByIdAndDelete(verificationToken._id);
      
      return NextResponse.json(
        { message: 'Failed to send OTP. Please try again.' },
        { status: 500 }
      );
    }

    // Add notification to user
    try {
      user.addNotification(
        'phone_otp_sent',
        'Phone OTP Sent',
        `A verification code has been sent to ${user.phone}`
      );
      await user.save();
    } catch (notificationError) {
      console.error('Notification error:', notificationError);
      // Continue even if notification fails
    }

    return NextResponse.json({
      success: true,
      message: 'OTP sent to your phone number',
      phone: user.phone.replace(/(\+91)(\d{2})(\d{6})(\d{2})/, '$1$2******$4'), // Mask phone
      expiresIn: '5 minutes',
      canResendIn: 60, // seconds
      mock: smsResult.mock || false // For development
    });

  } catch (error) {
    console.error('Send phone OTP error:', error);
    return NextResponse.json(
      { message: 'Failed to send OTP' },
      { status: 500 }
    );
  }
}