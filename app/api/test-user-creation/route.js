import { NextResponse } from 'next/server';
import connectDB from '../../../lib/db';
import User from '../../../models/User';

export async function POST(request) {
  try {
    await connectDB();
    
    const testUser = new User({
      name: 'Test User',
      username: 'testuser123',
      email: 'test@example.com',
      phone: '+919999999999',
      role: 'hirer',
      authMethod: 'email',
      passwordHash: 'testpassword123', // This should be hashed by pre-save middleware
      location: {
        city: 'Test City',
        state: 'Test State',
        lat: 0,
        lng: 0
      },
      privacy: {
        profileVisibility: 'public',
        showPhone: true,
        showEmail: false,
        showLocation: true,
        showRating: true,
        allowReviews: true,
        allowMessages: true,
        dataSharingConsent: true
      },
      preferences: {
        theme: 'light',
        language: 'en',
        currency: 'INR',
        timezone: 'Asia/Kolkata',
        emailNotifications: true,
        pushNotifications: true,
        jobUpdates: true,
        paymentUpdates: true
      },
      plan: {
        type: 'free',
        status: 'active',
        creditsUsed: 0,
        startDate: new Date()
      },
      isRegistered: true,
      isActive: true,
      banned: false,
      isVerified: false,
      emailVerified: false,
      providers: ['email']
    });

    console.log('🧪 Testing user creation...');
    const savedUser = await testUser.save();
    console.log('✅ User created successfully:', savedUser._id);
    
    // Clean up
    await User.findByIdAndDelete(savedUser._id);
    console.log('🧹 Test user cleaned up');

    return NextResponse.json({
      success: true,
      message: 'User model works correctly',
      hashedPassword: savedUser.passwordHash ? 'Password was hashed' : 'Password was not hashed'
    });

  } catch (error) {
    console.error('❌ Test user creation failed:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}