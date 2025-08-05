// app/api/test/route.js - Test endpoint for debugging
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import User from '@/models/User';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    console.log('🧪 Test endpoint called');
    
    // Test database connection
    await connectDB();
    console.log('✅ Database connected');
    
    // Test session
    const session = await getServerSession(authOptions);
    console.log('📋 Session:', session ? {
      id: session.user?.id,
      email: session.user?.email,
      role: session.user?.role
    } : 'No session');
    
    // Test user lookup if session exists
    if (session?.user?.id) {
      const user = await User.findById(session.user.id);
      console.log('👤 User found:', user ? {
        id: user._id,
        email: user.email,
        role: user.role,
        username: user.username
      } : 'No user found');
      
      return NextResponse.json({
        success: true,
        session: {
          id: session.user.id,
          email: session.user.email,
          role: session.user.role
        },
        user: user ? {
          id: user._id,
          email: user.email,
          role: user.role,
          username: user.username
        } : null
      });
    }
    
    return NextResponse.json({
      success: true,
      session: null,
      user: null,
      message: 'No session found'
    });
    
  } catch (error) {
    console.error('❌ Test endpoint error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
} 