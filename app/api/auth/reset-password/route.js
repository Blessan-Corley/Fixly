// app/api/auth/reset-password/route.js - Professional password reset completion
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { rateLimit } from '@/utils/rateLimiting';
import { transporter } from '@/lib/email';

export async function POST(request) {
  try {
    // Apply strict rate limiting for reset attempts
    const rateLimitResult = await rateLimit(request, 'reset_password', 5, 60 * 60 * 1000); // 5 attempts per hour
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { 
          success: false,
          message: 'Too many reset attempts. Please try again later.',
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

    const { token, password, confirmPassword } = body;

    // Validate required fields
    if (!token || !password || !confirmPassword) {
      return NextResponse.json({
        success: false,
        message: 'Token, password, and password confirmation are required',
        errors: [
          { field: 'token', error: !token ? 'Reset token is required' : null },
          { field: 'password', error: !password ? 'Password is required' : null },
          { field: 'confirmPassword', error: !confirmPassword ? 'Password confirmation is required' : null }
        ].filter(error => error.error !== null)
      }, { status: 400 });
    }

    // Validate password match
    if (password !== confirmPassword) {
      return NextResponse.json({
        success: false,
        message: 'Passwords do not match',
        errors: [{ field: 'confirmPassword', error: 'Passwords do not match' }]
      }, { status: 400 });
    }

    // Enhanced password validation
    if (password.length < 8) {
      return NextResponse.json({
        success: false,
        message: 'Password must be at least 8 characters long',
        errors: [{ field: 'password', error: 'Password must be at least 8 characters long' }]
      }, { status: 400 });
    }

    // Production password requirements
    if (process.env.NODE_ENV === 'production') {
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
      if (!passwordRegex.test(password)) {
        return NextResponse.json({
          success: false,
          message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
          errors: [{ field: 'password', error: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character' }]
        }, { status: 400 });
      }
    }

    await connectDB();

    // Find user and verify reset token using User model method
    const user = await User.findOne().select('+passwordResetToken +passwordResetExpires +passwordResetAttempts');
    
    // Search for user with matching reset token (hashed)
    const users = await User.find({
      passwordResetExpires: { $gt: Date.now() },
      passwordResetAttempts: { $lt: 3 }
    }).select('+passwordResetToken +passwordResetExpires +passwordResetAttempts');

    let matchedUser = null;
    for (const u of users) {
      if (u.verifyPasswordResetToken(token)) {
        matchedUser = u;
        break;
      }
    }

    if (!matchedUser) {
      return NextResponse.json({
        success: false,
        message: 'Invalid or expired reset token. Please request a new password reset.'
      }, { status: 400 });
    }

    // Check if user is banned
    if (matchedUser.banned) {
      return NextResponse.json({
        success: false,
        message: 'Account is suspended. Please contact support.'
      }, { status: 403 });
    }

    // Increment attempts to prevent brute force
    matchedUser.incrementPasswordResetAttempts();

    // Hash new password using User model pre-save middleware
    matchedUser.passwordHash = password; // Will be hashed by pre-save middleware

    // Clear reset token
    matchedUser.clearPasswordResetToken();

    // Update last activity
    matchedUser.lastActivityAt = new Date();

    await matchedUser.save();

    // Send professional confirmation email
    try {
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
      await transporter.sendMail({
        from: `"Fixly Team" <${process.env.EMAIL_USER}>`,
        to: matchedUser.email,
        subject: '✅ Your Fixly Password Has Been Reset Successfully',
        html: `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
              <h1 style="margin: 0; font-size: 28px;">✅ Password Reset Successful</h1>
              <p style="margin: 10px 0 0 0; font-size: 18px; opacity: 0.9;">Your account is now secure</p>
            </div>
            
            <div style="padding: 30px;">
              <h2 style="color: #1f2937; margin-bottom: 20px;">Hello ${matchedUser.name}!</h2>
              
              <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
                Your Fixly account password has been successfully reset. You can now sign in with your new password.
              </p>

              <div style="background: #ecfdf5; border-left: 4px solid #10b981; padding: 15px; margin-bottom: 25px;">
                <p style="color: #065f46; margin: 0; font-size: 14px;">
                  <strong>Security Reminder:</strong> If you didn't make this change, please contact our support team immediately at support@fixly.com
                </p>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${baseUrl}/auth/signin" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 16px;">
                  Sign In to Your Account →
                </a>
              </div>

              <p style="color: #4b5563; margin-top: 30px; font-size: 16px;">
                Welcome back to Fixly!<br>
                <strong>The Fixly Team</strong>
              </p>
            </div>
          </div>
        `
      });
      
    } catch (error) {
      console.error('Failed to send password reset confirmation email:', error);
      // Don't return error - password was still reset successfully
    }

    return NextResponse.json({
      success: true,
      message: 'Password reset successful! You can now sign in with your new password.'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json({
      success: false,
      message: 'An error occurred. Please try again.'
    }, { status: 500 });
  }
}