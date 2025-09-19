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

    const { email, purpose, name } = await request.json();

    // Validate input
    if (!email || !purpose) {
      return NextResponse.json(
        { message: 'Email and purpose are required' },
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
    if (!['signup', 'password_reset'].includes(purpose)) {
      return NextResponse.json(
        { message: 'Invalid purpose specified' },
        { status: 400 }
      );
    }

    console.log(`📧 OTP request - Email: ${email}, Purpose: ${purpose}`);

    await connectDB();

    if (purpose === 'signup') {
      // For signup, check if email is already registered
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        return NextResponse.json(
          { message: 'An account with this email already exists. Please sign in instead.' },
          { status: 409 }
        );
      }

      // Send signup OTP
      const result = await sendSignupOTP(email, name);

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

    } else if (purpose === 'password_reset') {
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
    }

  } catch (error) {
    console.error('💥 Send OTP error:', error);
    return NextResponse.json(
      { message: 'Failed to send verification code. Please try again.' },
      { status: 500 }
    );
  }
}