// app/api/auth/forgot-password/route.js - OTP-based password reset (SIMPLIFIED)
import { NextResponse } from 'next/server';
import connectDB from '../../../../lib/db';
import User from '../../../../models/User';
import { redisRateLimit } from '../../../../lib/redis';
import { sendPasswordResetOTP } from '../../../../lib/otpService';

export async function POST(request) {
  try {
    // Strict rate limiting for password reset requests
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown';

    // Apply Redis-based rate limiting - max 3 attempts per 15 minutes
    const rateLimitResult = await redisRateLimit(`forgot_password:${ip}`, 3, 900); // 15 minutes
    if (!rateLimitResult.success) {
      const resetTime = new Date(rateLimitResult.resetTime || Date.now() + 900000);
      return NextResponse.json(
        { 
          success: false,
          message: 'Too many password reset attempts. Please wait 15 minutes before trying again.',
          resetTime: resetTime.toISOString(),
          remaining: rateLimitResult.remaining
        },
        { status: 429 }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch (jsonError) {
      return NextResponse.json({
        success: false,
        message: 'Invalid request body'
      }, { status: 400 });
    }

    const { email } = body;

    // Validate email
    if (!email || typeof email !== 'string') {
      return NextResponse.json({
        success: false,
        message: 'Email address is required',
        errors: [{ field: 'email', error: 'Email address is required' }]
      }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailRegex.test(cleanEmail)) {
      return NextResponse.json({
        success: false,
        message: 'Please enter a valid email address',
        errors: [{ field: 'email', error: 'Please enter a valid email address' }]
      }, { status: 400 });
    }

    await connectDB();

    // Find user by email
    const user = await User.findOne({ 
      email: cleanEmail,
      authMethod: 'email' // Only allow password reset for email users
    });

    if (!user) {
      // Security: Always return success to prevent email enumeration
      console.log(`⚠️ Password reset requested for non-existent email: ${cleanEmail}`);
      return NextResponse.json({
        success: true,
        message: 'If an account with this email exists, you will receive a password reset code shortly.'
      });
    }

    // Check if user is banned
    if (user.banned) {
      return NextResponse.json({
        success: false,
        message: 'Account is suspended. Please contact support.'
      }, { status: 403 });
    }

    // Check if user is inactive
    if (!user.isActive || user.deletedAt) {
      return NextResponse.json({
        success: false,
        message: 'Account is inactive. Please contact support.'
      }, { status: 403 });
    }

    // Check if user uses Google OAuth
    if (user.authMethod === 'google' || user.googleId) {
      return NextResponse.json({
        success: false,
        message: 'This account uses Google Sign-In. Please use the "Sign in with Google" option instead.'
      });
    }

    // Send password reset OTP
    console.log(`🔄 Sending password reset OTP to: ${cleanEmail}`);
    const otpResult = await sendPasswordResetOTP(cleanEmail, user.name);

    if (otpResult.success) {
      console.log(`✅ Password reset OTP sent successfully to ${cleanEmail}`);
      return NextResponse.json({
        success: true,
        message: 'A verification code has been sent to your email address. Please check your inbox.',
        expiresIn: 300 // 5 minutes
      });
    } else {
      console.error(`❌ Failed to send password reset OTP to ${cleanEmail}`);
      return NextResponse.json({
        success: false,
        message: 'Failed to send verification code. Please try again later.'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('💥 Forgot password error:', error);
    return NextResponse.json({
      success: false,
      message: 'An error occurred. Please try again later.'
    }, { status: 500 });
  }
}