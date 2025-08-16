// app/api/user/update-phone/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import User from '@/models/User';

export const dynamic = 'force-dynamic';

export async function PUT(request) {
  try {
    console.log('Update phone API called');
    
    const session = await getServerSession(authOptions);
    if (!session) {
      console.log('No session found');
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      );
    }

    console.log('Session user:', session.user?.id);

    await connectDB();
    console.log('Database connected');

    const body = await request.json();
    console.log('Request body:', body);
    
    const { phoneNumber } = body;

    if (!phoneNumber) {
      return NextResponse.json(
        { message: 'Phone number is required' },
        { status: 400 }
      );
    }

    // Validate phone number format
    const cleanPhone = phoneNumber.replace(/[^\d]/g, '');
    
    // Basic validation
    if (cleanPhone.length < 10) {
      return NextResponse.json(
        { message: 'Phone number must be at least 10 digits' },
        { status: 400 }
      );
    }
    
    // Format phone number
    let formattedPhone;
    if (cleanPhone.startsWith('91') && cleanPhone.length === 12) {
      formattedPhone = `+${cleanPhone}`;
    } else if (cleanPhone.length === 10) {
      formattedPhone = `+91${cleanPhone}`;
    } else {
      return NextResponse.json(
        { message: 'Please enter a valid 10-digit phone number' },
        { status: 400 }
      );
    }
    
    // Check for Indian phone number format (for production)
    if (process.env.NODE_ENV === 'production') {
      const indianPhoneRegex = /^\+91[6-9]\d{9}$/;
      if (!indianPhoneRegex.test(formattedPhone)) {
        return NextResponse.json(
          { message: 'Please enter a valid Indian phone number (starting with 6-9)' },
          { status: 400 }
        );
      }
    }

    // Check if phone number is already used by another user
    const existingUser = await User.findOne({ 
      phone: formattedPhone,
      _id: { $ne: session.user.id }
    });

    if (existingUser) {
      return NextResponse.json(
        { message: 'This phone number is already registered with another account' },
        { status: 400 }
      );
    }

    // Update user's phone number and reset phone verification
    console.log('Finding user with ID:', session.user.id);
    const user = await User.findById(session.user.id);
    if (!user) {
      console.log('User not found');
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }

    console.log('User found, updating phone...');
    user.phone = formattedPhone;
    user.phoneVerified = false;
    user.phoneVerifiedAt = null;
    
    // Update overall verification status
    user.isVerified = user.emailVerified && user.phoneVerified;
    
    console.log('Adding notification...');
    // Add notification
    try {
      await user.addNotification(
        'settings_updated',
        'Phone Number Updated',
        `Your phone number has been updated to ${formattedPhone}. Please verify your new number.`
      );
      console.log('Notification added successfully');
    } catch (notificationError) {
      console.error('Notification error:', notificationError);
      // Continue even if notification fails
    }

    return NextResponse.json({
      success: true,
      message: 'Phone number updated successfully. Please verify your new number.',
      user: {
        id: user._id.toString(),
        phone: user.phone,
        phoneVerified: user.phoneVerified,
        isVerified: user.isVerified
      }
    });

  } catch (error) {
    console.error('Update phone error:', error);
    console.error('Error stack:', error.stack);
    return NextResponse.json(
      { 
        message: 'Failed to update phone number',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}