// app/api/user/change-password/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';
import connectDB from '../../../../lib/db';
import User from '../../../../models/User';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

export async function PUT(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      );
    }

    await connectDB();

    const { newPassword, otp, email } = await request.json();

    if (!newPassword || !otp || !email) {
      return NextResponse.json(
        { message: 'New password, OTP, and email are required' },
        { status: 400 }
      );
    }

    // Verify OTP first
    try {
      const { verifyOTP } = await import('../../../../lib/otpService');
      const otpVerification = await verifyOTP(email, otp, 'password_reset');

      if (!otpVerification.success) {
        return NextResponse.json(
          { message: otpVerification.message || 'Invalid OTP' },
          { status: 400 }
        );
      }
    } catch (error) {
      console.error('OTP verification error:', error);
      return NextResponse.json(
        { message: 'Failed to verify OTP' },
        { status: 500 }
      );
    }

    // Find current user
    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }

    // Verify email matches
    if (user.email !== email) {
      return NextResponse.json(
        { message: 'Email does not match' },
        { status: 400 }
      );
    }

    // OTP verification already ensures the user is authorized to change password

    // Validate new password strength
    const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return NextResponse.json(
        { message: 'New password must be at least 8 characters and contain letters, numbers, and special characters' },
        { status: 400 }
      );
    }

    // Note: Since we're using OTP verification instead of current password,
    // we'll allow users to set the same password (they have verified via email)

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    user.password = hashedPassword;
    user.lastPasswordChange = new Date();
    await user.save();

    // Add notification
    await user.addNotification(
      'security_update',
      'Password Changed',
      'Your account password has been successfully updated.'
    );

    return NextResponse.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json(
      {
        message: 'Failed to change password',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}