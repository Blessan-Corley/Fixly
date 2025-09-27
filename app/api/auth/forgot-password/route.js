// app/api/auth/forgot-password/route.js - Professional password reset system
import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { rateLimit } from '@/utils/rateLimiting';
import { sendPasswordResetEmail } from '@/lib/email';

export async function POST(request) {
  try {
    // Strict rate limiting for password reset requests using Redis for consistency
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown';

    const rateLimitResult = await rateLimit(request, `forgot_password_${ip}`, 3, 15 * 60 * 1000); // 3 attempts per 15 minutes
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { 
          success: false,
          message: 'Too many password reset attempts. Please wait 15 minutes before trying again.',
          remainingTime: rateLimitResult.remainingTime
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
      return NextResponse.json({
        success: true,
        message: 'If an account with this email exists, you will receive a password reset link shortly.'
      });
    }

    // Check if user is banned
    if (user.banned) {
      return NextResponse.json({
        success: false,
        message: 'Account is suspended. Please contact support.'
      }, { status: 403 });
    }

    // Check if user uses Google OAuth
    if (user.authMethod === 'google' || user.googleId) {
      return NextResponse.json({
        success: false,
        message: 'This account uses Google Sign-In. Please use the "Sign in with Google" option instead.'
      });
    }

    // Generate password reset token using User model method
    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    // Send password reset email
    try {
      const resetUrl = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${resetToken}`;
      await sendPasswordResetEmail(user, resetUrl);
      
      
      return NextResponse.json({
        success: true,
        message: 'Password reset instructions have been sent to your email address.'
      });
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError);
      
      // Clear the reset token if email fails
      user.clearPasswordResetToken();
      await user.save({ validateBeforeSave: false });
      
      return NextResponse.json({
        success: false,
        message: 'Failed to send password reset email. Please try again later.'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({
      success: false,
      message: 'An error occurred. Please try again later.'
    }, { status: 500 });
  }
}