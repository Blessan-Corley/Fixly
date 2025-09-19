// app/api/auth/reset-password/route.js - OTP-based password reset completion
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '../../../../lib/db';
import User from '../../../../models/User';
import { redisRateLimit } from '../../../../lib/redis';
import { verifyOTP } from '../../../../lib/otpService';

export async function POST(request) {
  try {
    // Get client IP for rate limiting
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown';

    // Apply Redis-based rate limiting - max 5 password reset attempts per hour per IP
    const rateLimitResult = await redisRateLimit(`reset_password:${ip}`, 5, 3600); // 5 attempts per hour
    if (!rateLimitResult.success) {
      const resetTime = new Date(rateLimitResult.resetTime || Date.now() + 3600000);
      return NextResponse.json(
        {
          success: false,
          message: 'Too many password reset attempts. Please try again later.',
          resetTime: resetTime.toISOString(),
          remaining: rateLimitResult.remaining
        },
        { status: 429 }
      );
    }

    const { email, newPassword, otp } = await request.json();

    // Validate required fields
    if (!email || !newPassword || !otp) {
      return NextResponse.json({
        success: false,
        message: 'Email, new password, and OTP are required'
      }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({
        success: false,
        message: 'Please enter a valid email address'
      }, { status: 400 });
    }

    // Validate OTP format (6 digits)
    if (!/^\d{6}$/.test(otp)) {
      return NextResponse.json({
        success: false,
        message: 'OTP must be 6 digits'
      }, { status: 400 });
    }

    // Enhanced password validation
    if (newPassword.length < 8) {
      return NextResponse.json({
        success: false,
        message: 'Password must be at least 8 characters long'
      }, { status: 400 });
    }

    // Strong password requirements
    if (!/[A-Z]/.test(newPassword)) {
      return NextResponse.json({
        success: false,
        message: 'Password must contain at least one uppercase letter'
      }, { status: 400 });
    }

    if (!/[a-z]/.test(newPassword)) {
      return NextResponse.json({
        success: false,
        message: 'Password must contain at least one lowercase letter'
      }, { status: 400 });
    }

    if (!/\d/.test(newPassword)) {
      return NextResponse.json({
        success: false,
        message: 'Password must contain at least one number'
      }, { status: 400 });
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword)) {
      return NextResponse.json({
        success: false,
        message: 'Password must contain at least one special character'
      }, { status: 400 });
    }

    console.log(`🔄 Password reset attempt - Email: ${email}`);

    // Verify OTP first
    const otpResult = await verifyOTP(email, otp, 'password_reset');
    if (!otpResult.success) {
      console.log(`❌ OTP verification failed for ${email}: ${otpResult.message}`);
      return NextResponse.json({
        success: false,
        message: otpResult.message || 'Invalid or expired verification code'
      }, { status: 400 });
    }

    console.log(`✅ OTP verified for password reset: ${email}`);

    await connectDB();

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
    if (!user) {
      return NextResponse.json({
        success: false,
        message: 'User not found'
      }, { status: 404 });
    }

    // Check if user is banned or inactive
    if (user.banned) {
      return NextResponse.json({
        success: false,
        message: 'Account is suspended. Please contact support.'
      }, { status: 403 });
    }

    if (!user.isActive || user.deletedAt) {
      return NextResponse.json({
        success: false,
        message: 'Account is inactive. Please contact support.'
      }, { status: 403 });
    }

    // Hash new password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update user password
    user.passwordHash = hashedPassword;
    user.lastActivityAt = new Date();

    // Clear any existing password reset tokens if they exist
    if (user.passwordResetToken) {
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      user.passwordResetAttempts = 0;
    }

    await user.save();

    console.log(`✅ Password reset successful for ${email}`);

    return NextResponse.json({
      success: true,
      message: 'Password reset successful! You can now sign in with your new password.'
    });

  } catch (error) {
    console.error('💥 Reset password error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to reset password. Please try again.'
    }, { status: 500 });
  }
}