// app/api/test-auth/route.js - Test authentication flow
import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import bcrypt from 'bcryptjs';

export async function POST(request) {
  try {
    console.log('🧪 Test auth endpoint called');
    
    await connectDB();
    console.log('✅ Database connected');
    
    const { action, email, password } = await request.json();
    
    if (action === 'create') {
      // Create a test user with proper password hashing
      const hashedPassword = await bcrypt.hash(password || 'testpassword123', 12);
      
      const testUser = new User({
        name: 'Test User',
        email: email || 'test@example.com',
        username: 'testuser_' + Date.now().toString().slice(-4),
        phone: '+919999999999',
        passwordHash: hashedPassword,
        authMethod: 'email',
        isVerified: true,
        emailVerified: true,
        role: 'fixer',
        plan: {
          type: 'free',
          status: 'active',
          creditsUsed: 0
        },
        lastLoginAt: new Date(),
        lastActivityAt: new Date()
      });
      
      await testUser.save();
      console.log('✅ Test user created:', testUser._id);
      
      return NextResponse.json({
        success: true,
        user: {
          id: testUser._id,
          email: testUser.email,
          username: testUser.username
        },
        message: 'Test user created successfully'
      });
    }
    
    if (action === 'verify') {
      // Test password verification
      const user = await User.findOne({ email: email }).select('+passwordHash');
      
      if (!user) {
        return NextResponse.json({
          success: false,
          error: 'User not found'
        }, { status: 404 });
      }
      
      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      
      return NextResponse.json({
        success: true,
        userFound: !!user,
        passwordValid: isValidPassword,
        user: {
          id: user._id,
          email: user.email,
          username: user.username,
          hasPassword: !!user.passwordHash
        }
      });
    }
    
    return NextResponse.json({
      success: false,
      error: 'Invalid action'
    }, { status: 400 });
    
  } catch (error) {
    console.error('❌ Test auth error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
} 