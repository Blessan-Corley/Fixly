// app/api/test-user/route.js - Test user creation
import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';

export async function POST(request) {
  try {
    console.log('🧪 Test user creation endpoint called');
    
    await connectDB();
    console.log('✅ Database connected');
    
    // Test user data (similar to what Google OAuth would create)
    const testUserData = {
      name: 'Test User',
      email: 'test' + Date.now() + '@example.com', // Make email unique
      googleId: 'test_google_id_' + Date.now(),
      picture: 'https://example.com/avatar.jpg',
      authMethod: 'google',
      providers: ['google'],
      isVerified: true,
      emailVerified: true,
      username: 'testuser_' + Date.now().toString().slice(-4),
      phone: '+919999999999',
      role: 'fixer',
      // Don't set location - let user fill it in later
      plan: {
        type: 'free',
        status: 'active',
        creditsUsed: 0
      },
      lastLoginAt: new Date(),
      lastActivityAt: new Date()
    };
    
    console.log('🔄 Creating test user with data:', testUserData);
    
    const newUser = new User(testUserData);
    await newUser.save();
    
    console.log('✅ Test user created successfully:', newUser._id);
    
    return NextResponse.json({
      success: true,
      user: {
        id: newUser._id,
        email: newUser.email,
        role: newUser.role,
        username: newUser.username
      },
      message: 'Test user created successfully'
    });
    
  } catch (error) {
    console.error('❌ Test user creation error:', error);
    console.error('❌ Error name:', error.name);
    console.error('❌ Error message:', error.message);
    
    if (error.name === 'ValidationError') {
      console.error('❌ Validation errors:', error.errors);
    }
    
    return NextResponse.json({
      success: false,
      error: error.message,
      details: error.name === 'ValidationError' ? error.errors : null
    }, { status: 500 });
  }
} 