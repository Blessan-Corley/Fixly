// app/api/auth/send-otp/route.js - Send OTP for email verification
import { NextResponse } from 'next/server';
import { sendSignupOTP, sendPasswordResetOTP } from '../../../../lib/otpService';
import { redisRateLimit } from '../../../../lib/redis';
import { rateLimit } from '../../../../utils/rateLimiting';
import connectDB from '../../../../lib/db';
import User from '../../../../models/User';

export async function POST(request) {
  try {
    // Get client IP for rate limiting
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown';

    // Apply enhanced Redis-based rate limiting - max 3 OTP requests per hour per IP
    const rateLimitResult = await redisRateLimit(`send_otp:${ip}`, 3, 3600); // 3 requests per hour
    if (!rateLimitResult.success) {
      const resetTime = new Date(rateLimitResult.resetTime || Date.now() + 3600000);
      return NextResponse.json(
        {
          message: 'Too many OTP requests. Please try again later.',
          resetTime: resetTime.toISOString(),
          remaining: rateLimitResult.remaining
        },
        { status: 429 }
      );
    }

    const { email, purpose, name, type, username, currentEmail } = await request.json();
    const otpPurpose = purpose || type; // Support both 'purpose' and 'type' for backward compatibility

    // Validate input
    if (!email || !otpPurpose) {
      return NextResponse.json(
        { message: 'Email and purpose/type are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { message: 'Please enter a valid email address' },
        { status: 400 }
      );
    }

    // Validate purpose
    if (!['signup', 'password_reset', 'username_change', 'email_change'].includes(otpPurpose)) {
      return NextResponse.json(
        { message: 'Invalid purpose specified' },
        { status: 400 }
      );
    }

    console.log(`📧 OTP request - Email: ${email}, Purpose: ${otpPurpose}`);

    await connectDB();

    if (otpPurpose === 'signup') {
      // For signup, check if email is already registered
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        return NextResponse.json(
          { message: 'An account with this email already exists. Please sign in instead.' },
          { status: 409 }
        );
      }

      // Generate OTP first
      const { generateOTP, storeOTP } = await import('../../../../lib/otpService');
      const otp = generateOTP();

      // Store OTP in Redis
      const storeResult = await storeOTP(email, otp, 'signup');
      if (!storeResult.success) {
        return NextResponse.json(
          { message: 'Failed to generate verification code. Please try again.' },
          { status: 500 }
        );
      }

      // Send signup OTP with the generated OTP
      const result = await sendSignupOTP(email, name, otp);

      if (result.success) {
        return NextResponse.json({
          success: true,
          message: 'Verification code sent to your email address. Please check your inbox.',
          expiresIn: 300 // 5 minutes in seconds
        });
      } else {
        return NextResponse.json(
          { message: result.message },
          { status: 500 }
        );
      }

    } else if (otpPurpose === 'password_reset') {
      // For password reset, check if email exists
      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        // Don't reveal that email doesn't exist for security
        return NextResponse.json({
          success: true,
          message: 'If an account with this email exists, a password reset code has been sent.'
        });
      }

      // Send password reset OTP
      const result = await sendPasswordResetOTP(email, user.name);

      if (result.success) {
        return NextResponse.json({
          success: true,
          message: 'Password reset code sent to your email address. Please check your inbox.',
          expiresIn: 300 // 5 minutes in seconds
        });
      } else {
        return NextResponse.json(
          { message: result.message },
          { status: 500 }
        );
      }
    } else if (otpPurpose === 'username_change') {
      // For username change, verify current user email and send OTP
      const { getServerSession } = await import('next-auth/next');
      const { authOptions } = await import('../../../../lib/auth');
      const session = await getServerSession(authOptions);

      if (!session) {
        return NextResponse.json(
          { message: 'Authentication required' },
          { status: 401 }
        );
      }

      const user = await User.findById(session.user.id);
      if (!user || user.email !== email) {
        return NextResponse.json(
          { message: 'Invalid email' },
          { status: 400 }
        );
      }

      // Generate and store OTP
      const { generateOTP, storeOTP } = await import('../../../../lib/otpService');
      const otp = generateOTP();
      const storeResult = await storeOTP(email, otp, 'username_change');

      if (!storeResult.success) {
        return NextResponse.json(
          { message: 'Failed to generate verification code' },
          { status: 500 }
        );
      }

      // Send email
      const { sendEmail } = await import('../../../../utils/emailService');
      const emailResult = await sendEmail(
        email,
        'Username Change Verification',
        `Your verification code to change username to "${username}" is: ${otp}. This code expires in 5 minutes.`
      );

      if (emailResult.success) {
        return NextResponse.json({
          success: true,
          message: 'Verification code sent to your email',
          expiresIn: 300
        });
      } else {
        return NextResponse.json(
          { message: 'Failed to send verification email' },
          { status: 500 }
        );
      }

    } else if (otpPurpose === 'email_change') {
      // For email change, send OTP to new email
      const { getServerSession } = await import('next-auth/next');
      const { authOptions } = await import('../../../../lib/auth');
      const session = await getServerSession(authOptions);

      if (!session) {
        return NextResponse.json(
          { message: 'Authentication required' },
          { status: 401 }
        );
      }

      // Check if new email is already taken
      const existingUser = await User.findOne({
        email: email.toLowerCase(),
        _id: { $ne: session.user.id }
      });

      if (existingUser) {
        return NextResponse.json(
          { message: 'Email is already registered' },
          { status: 400 }
        );
      }

      // Generate and store OTP
      const { generateOTP, storeOTP } = await import('../../../../lib/otpService');
      const otp = generateOTP();
      const storeResult = await storeOTP(email, otp, 'email_change');

      if (!storeResult.success) {
        return NextResponse.json(
          { message: 'Failed to generate verification code' },
          { status: 500 }
        );
      }

      // Send email to new email address
      const { sendEmail } = await import('../../../../utils/emailService');
      const emailResult = await sendEmail(
        email,
        'Email Change Verification',
        `Your verification code to change your email address is: ${otp}. This code expires in 5 minutes.`
      );

      if (emailResult.success) {
        return NextResponse.json({
          success: true,
          message: `Verification code sent to ${email}`,
          expiresIn: 300
        });
      } else {
        return NextResponse.json(
          { message: 'Failed to send verification email' },
          { status: 500 }
        );
      }
    }

  } catch (error) {
    console.error('💥 Send OTP error:', error);
    return NextResponse.json(
      { message: 'Failed to send verification code. Please try again.' },
      { status: 500 }
    );
  }
}