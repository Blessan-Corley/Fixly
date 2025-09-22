// app/api/user/update-email/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';
import connectDB from '../../../../lib/db';
import User from '../../../../models/User';

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

    const { email, otp, currentEmail } = await request.json();

    if (!email || !otp || !currentEmail) {
      return NextResponse.json(
        { message: 'Email, OTP, and current email are required' },
        { status: 400 }
      );
    }

    // Verify OTP first
    try {
      const { verifyOTP } = await import('../../../../lib/otpService');
      const otpVerification = await verifyOTP(email, otp, 'email_change'); // OTP was sent to the new email

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

    // Verify current email matches
    if (user.email !== currentEmail) {
      return NextResponse.json(
        { message: 'Current email does not match' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { message: 'Invalid email format' },
        { status: 400 }
      );
    }

    const cleanEmail = email.toLowerCase().trim();

    // Check if email is already taken (double-check)
    const existingUser = await User.findOne({
      email: cleanEmail,
      _id: { $ne: session.user.id }
    });

    if (existingUser) {
      return NextResponse.json(
        { message: 'This email is already registered' },
        { status: 400 }
      );
    }

    // Check if it's the same email
    if (user.email === cleanEmail) {
      return NextResponse.json(
        { message: 'This is already your current email' },
        { status: 400 }
      );
    }

    // Update email
    const oldEmail = user.email;
    user.email = cleanEmail;
    user.emailVerified = new Date(); // Mark as verified since OTP was verified
    user.lastEmailChange = new Date();

    await user.save();

    // Add notification
    await user.addNotification(
      'settings_updated',
      'Email Address Updated',
      `Your email address has been changed from ${oldEmail} to ${cleanEmail}.`
    );

    return NextResponse.json({
      success: true,
      message: 'Email updated successfully',
      user: {
        id: user._id.toString(),
        email: user.email,
        emailVerified: user.emailVerified
      }
    });

  } catch (error) {
    console.error('Update email error:', error);
    return NextResponse.json(
      {
        message: 'Failed to update email',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}