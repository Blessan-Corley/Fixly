// app/api/user/change-email/route.js - Email change with OTP verification
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { rateLimit } from '@/utils/rateLimiting';
import { generateOTP, verifyOTP } from '@/lib/otpService';

export async function POST(request) {
  try {
    // Rate limiting - 3 email change attempts per hour
    const rateLimitResult = await rateLimit(request, 'change_email', 3, 60 * 60 * 1000);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: 'Too many email change attempts. Please try again later.',
          resetTime: new Date(Date.now() + 60 * 60 * 1000).toISOString()
        },
        { status: 429 }
      );
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { newEmail, otp, step } = body;

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      return NextResponse.json({
        success: false,
        message: 'Please enter a valid email address'
      }, { status: 400 });
    }

    await connectDB();

    // Check if new email is already in use (using existing validation logic)
    const existingUser = await User.findOne({
      email: newEmail.toLowerCase().trim(),
      _id: { $ne: session.user.id }
    }).select('_id').lean();

    if (existingUser) {
      return NextResponse.json({
        success: false,
        message: 'This email address is already registered to another account'
      }, { status: 400 });
    }

    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({
        success: false,
        message: 'User not found'
      }, { status: 404 });
    }

    if (step === 'send_otp') {
      // Step 1: Send OTP to new email
      try {
        const otpResult = await generateOTP(newEmail, 'email_change', {
          userName: user.name,
          currentEmail: user.email
        });

        if (!otpResult.success) {
          return NextResponse.json({
            success: false,
            message: otpResult.message || 'Failed to send verification code'
          }, { status: 400 });
        }

        console.log(`✅ Email change OTP sent to: ${newEmail}`);

        return NextResponse.json({
          success: true,
          message: 'Verification code sent to your new email address. Please check your inbox.',
          expiresAt: otpResult.expiresAt
        });

      } catch (error) {
        console.error('Email change OTP generation error:', error);
        return NextResponse.json({
          success: false,
          message: 'Failed to send verification code. Please try again.'
        }, { status: 500 });
      }

    } else if (step === 'verify_and_change') {
      // Step 2: Verify OTP and change email
      if (!otp) {
        return NextResponse.json({
          success: false,
          message: 'Verification code is required'
        }, { status: 400 });
      }

      // Verify OTP
      const otpResult = await verifyOTP(newEmail, otp, 'email_change');
      if (!otpResult.success) {
        return NextResponse.json({
          success: false,
          message: otpResult.message || 'Invalid or expired verification code'
        }, { status: 400 });
      }

      // Update user email
      const updatedUser = await User.findByIdAndUpdate(
        session.user.id,
        {
          email: newEmail.toLowerCase().trim(),
          emailVerified: true, // Mark new email as verified
          lastActivityAt: new Date()
        },
        { new: true, runValidators: true }
      );

      console.log(`✅ Email changed successfully for user: ${session.user.id}`);

      return NextResponse.json({
        success: true,
        message: 'Email address changed successfully!',
        user: {
          id: updatedUser._id,
          email: updatedUser.email,
          emailVerified: updatedUser.emailVerified
        }
      });

    } else {
      return NextResponse.json({
        success: false,
        message: 'Invalid step parameter'
      }, { status: 400 });
    }

  } catch (error) {
    console.error('Change email error:', error);
    return NextResponse.json({
      success: false,
      message: 'An error occurred while changing email address'
    }, { status: 500 });
  }
}