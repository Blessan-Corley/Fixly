// app/api/auth/verify-otp/route.js - Verify email OTP
import { NextResponse } from 'next/server';
import { verifyOTP } from '../../../../lib/otpService';
import { redisRateLimit } from '../../../../lib/redis';

export async function POST(request) {
  try {
    // Get client IP for rate limiting
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown';

    // Apply enhanced Redis-based rate limiting - max 10 verification attempts per hour per IP
    const rateLimitResult = await redisRateLimit(`verify_otp:${ip}`, 10, 3600); // 10 attempts per hour
    if (!rateLimitResult.success) {
      const resetTime = new Date(rateLimitResult.resetTime || Date.now() + 3600000);
      return NextResponse.json(
        {
          message: 'Too many verification attempts. Please try again later.',
          resetTime: resetTime.toISOString(),
          remaining: rateLimitResult.remaining
        },
        { status: 429 }
      );
    }

    const { email, otp, purpose } = await request.json();

    // Validate input
    if (!email || !otp || !purpose) {
      return NextResponse.json(
        { message: 'Email, OTP, and purpose are required' },
        { status: 400 }
      );
    }

    // Validate OTP format (6 digits)
    if (!/^\d{6}$/.test(otp)) {
      return NextResponse.json(
        { message: 'OTP must be 6 digits' },
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

    console.log(`🔍 OTP verification - Email: ${email}, Purpose: ${purpose}`);

    // Verify OTP using Redis
    const result = await verifyOTP(email, otp, purpose);

    if (result.success) {
      console.log(`✅ OTP verified successfully for ${email} (${purpose})`);

      return NextResponse.json({
        success: true,
        message: result.message,
        verified: true
      });
    } else {
      console.log(`❌ OTP verification failed for ${email}: ${result.message}`);

      return NextResponse.json(
        {
          success: false,
          message: result.message,
          verified: false
        },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('💥 Verify OTP error:', error);
    return NextResponse.json(
      { message: 'Failed to verify OTP. Please try again.' },
      { status: 500 }
    );
  }
}
