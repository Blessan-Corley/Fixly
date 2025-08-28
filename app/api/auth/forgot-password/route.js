// app/api/auth/forgot-password/route.js - Password reset system
import { NextResponse } from 'next/server';
import connectDB from '../../../../lib/db';
import User from '../../../../models/User';
import { rateLimit } from '../../../../utils/rateLimiting';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

export async function POST(request) {
  try {
    // ✅ STRICT RATE LIMITING: 3 attempts per 15 minutes
    const rateLimitResult = await rateLimit(request, 'forgot_password', 3, 15 * 60 * 1000);
    if (!rateLimitResult.success) {
      return NextResponse.json({
        success: false,
        error: 'Too many password reset attempts. Please wait 15 minutes before trying again.'
      }, { status: 429 });
    }

    const { email } = await request.json();

    // ✅ COMPREHENSIVE EMAIL VALIDATION
    if (!email || typeof email !== 'string') {
      return NextResponse.json({
        success: false,
        error: 'Email address is required'
      }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailRegex.test(cleanEmail)) {
      return NextResponse.json({
        success: false,
        error: 'Please enter a valid email address'
      }, { status: 400 });
    }

    await connectDB();

    // ✅ CHECK IF USER EXISTS AND IS COMPLETE
    const user = await User.findOne({ 
      email: cleanEmail,
      isRegistered: true // Only complete profiles can reset password
    });

    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'No account found with this email address. Please sign up first.',
        action: 'signup'
      }, { status: 404 });
    }

    // ✅ CHECK AUTHENTICATION METHOD
    if (user.authMethod === 'google' && !user.password) {
      return NextResponse.json({
        success: false,
        error: 'This account uses Google sign-in. Please use "Sign in with Google" instead.',
        action: 'google'
      }, { status: 400 });
    }

    // ✅ CHECK IF USER IS BANNED
    if (user.banned) {
      return NextResponse.json({
        success: false,
        error: 'Account is suspended. Please contact support.',
        action: 'support'
      }, { status: 403 });
    }

    // ✅ GENERATE SECURE RESET TOKEN
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const resetTokenExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Save reset token
    await User.findByIdAndUpdate(user._id, {
      passwordResetToken: resetTokenHash,
      passwordResetExpires: resetTokenExpiry,
      lastActivityAt: new Date()
    });

    // ✅ SEND PROFESSIONAL RESET EMAIL
    const resetLink = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${resetToken}`;
    
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

      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h2 style="color: #10B981; margin: 0;">🔧 Fixly</h2>
          </div>
          
          <h3 style="color: #333;">Reset Your Password</h3>
          
          <p>Hi ${user.name || 'there'},</p>
          <p>We received a request to reset your password. Click the button below to create a new password:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="display: inline-block; padding: 12px 24px; background: #10B981; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">Reset Password</a>
          </div>
          
          <p><strong>This link expires in 15 minutes</strong> for security.</p>
          <p>If you didn't request this, please ignore this email.</p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="font-size: 12px; color: #666;">© ${new Date().getFullYear()} Fixly. All rights reserved.</p>
        </div>
      `;

      await transporter.sendMail({
        from: `"Fixly Support" <${process.env.EMAIL_USER}>`,
        to: cleanEmail,
        subject: 'Reset Your Fixly Password',
        html: emailHtml
      });

      console.log('✅ Password reset email sent to:', cleanEmail);

      return NextResponse.json({
        success: true,
        message: 'Password reset link sent! Check your email (including spam folder).'
      });

    } catch (emailError) {
      console.error('❌ Failed to send reset email:', emailError);
      
      // Clean up token if email fails
      await User.findByIdAndUpdate(user._id, {
        $unset: {
          passwordResetToken: 1,
          passwordResetExpires: 1
        }
      });

      return NextResponse.json({
        success: false,
        error: 'Failed to send reset email. Please try again.'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ Forgot password error:', error);
    return NextResponse.json({
      success: false,
      error: 'Something went wrong. Please try again.'
    }, { status: 500 });
  }
}