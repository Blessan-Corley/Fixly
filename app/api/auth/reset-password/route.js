// app/api/auth/reset-password/route.js - Password reset completion
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '../../../../lib/db';
import User from '../../../../models/User';
import { rateLimit } from '../../../../utils/rateLimiting';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

export async function POST(request) {
  try {
    // ✅ RATE LIMITING: 10 attempts per hour
    const rateLimitResult = await rateLimit(request, 'reset_password', 10, 60 * 60 * 1000);
    if (!rateLimitResult.success) {
      return NextResponse.json({
        success: false,
        error: 'Too many password reset attempts. Please try again later.'
      }, { status: 429 });
    }

    const { token, password, confirmPassword } = await request.json();

    // ✅ VALIDATE TOKEN
    if (!token) {
      return NextResponse.json({
        success: false,
        error: 'Reset token is required'
      }, { status: 400 });
    }

    // ✅ VALIDATE PASSWORD
    if (!password) {
      return NextResponse.json({
        success: false,
        error: 'New password is required'
      }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({
        success: false,
        error: 'Password must be at least 8 characters long'
      }, { status: 400 });
    }

    if (password !== confirmPassword) {
      return NextResponse.json({
        success: false,
        error: 'Passwords do not match'
      }, { status: 400 });
    }

    // ✅ PASSWORD STRENGTH VALIDATION
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;
    if (!passwordRegex.test(password)) {
      return NextResponse.json({
        success: false,
        error: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
      }, { status: 400 });
    }

    await connectDB();

    // ✅ FIND USER BY RESET TOKEN
    const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');
    
    const user = await User.findOne({
      passwordResetToken: resetTokenHash,
      passwordResetExpires: { $gt: Date.now() }, // Token not expired
      isRegistered: true
    });

    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Invalid or expired reset token. Please request a new password reset.',
        expired: true
      }, { status: 400 });
    }

    // ✅ CHECK IF USER IS BANNED
    if (user.banned) {
      return NextResponse.json({
        success: false,
        error: 'Account is suspended. Please contact support.'
      }, { status: 403 });
    }

    // ✅ HASH NEW PASSWORD
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // ✅ UPDATE PASSWORD AND CLEAR RESET TOKEN
    await User.findByIdAndUpdate(user._id, {
      password: hashedPassword,
      $unset: {
        passwordResetToken: 1,
        passwordResetExpires: 1
      },
      passwordChangedAt: new Date(),
      lastActivityAt: new Date(),
      updatedAt: new Date()
    });

    // ✅ SEND CONFIRMATION EMAIL
    try {
      const transporter = nodemailer.createTransporter({
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT),
        secure: false,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD
        }
      });

      await transporter.sendMail({
        from: `"Fixly Support" <${process.env.EMAIL_USER}>`,
        to: user.email,
        subject: '✅ Password Reset Successful',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h2 style="color: #10B981; margin: 0;">🔧 Fixly</h2>
            </div>
            
            <h3 style="color: #333;">Password Reset Successful!</h3>
            
            <p>Hi ${user.name || 'there'},</p>
            <p>Your password has been successfully reset. You can now sign in with your new password.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.NEXTAUTH_URL}/auth/signin" style="display: inline-block; padding: 12px 24px; background: #10B981; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">Sign In Now</a>
            </div>
            
            <p style="color: #dc2626; font-size: 14px;"><strong>Security Note:</strong> If you didn't make this change, please contact support immediately.</p>
            
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
            <p style="font-size: 12px; color: #666;">© ${new Date().getFullYear()} Fixly. All rights reserved.</p>
          </div>
        `
      });
    } catch (emailError) {
      console.error('❌ Failed to send confirmation email:', emailError);
      // Don't fail the request - password was still reset
    }

    console.log('✅ Password reset successful for:', user.email);

    return NextResponse.json({
      success: true,
      message: 'Password reset successful! You can now sign in with your new password.'
    });

  } catch (error) {
    console.error('❌ Reset password error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(e => e.message);
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        details: errors
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: false,
      error: 'Something went wrong. Please try again.'
    }, { status: 500 });
  }
}

// ✅ GET REQUEST: Verify reset token validity
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({
        success: false,
        error: 'Reset token is required'
      }, { status: 400 });
    }

    await connectDB();

    // Check if token is valid
    const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');
    
    const user = await User.findOne({
      passwordResetToken: resetTokenHash,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Invalid or expired reset token',
        expired: true
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Token is valid',
      email: user.email.replace(/(.{2}).*@/, '$1***@') // Partially hide email
    });

  } catch (error) {
    console.error('❌ Token verification error:', error);
    return NextResponse.json({
      success: false,
      error: 'Something went wrong'
    }, { status: 500 });
  }
}