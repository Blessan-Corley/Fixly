// app/api/test-oauth/route.js - Test OAuth configuration
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    console.log('🧪 OAuth test endpoint called');
    
    // Check environment variables
    const envCheck = {
      GOOGLE_CLIENT_ID: !!process.env.GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET: !!process.env.GOOGLE_CLIENT_SECRET,
      NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
      NEXTAUTH_URL: process.env.NEXTAUTH_URL,
      MONGODB_URI: !!process.env.MONGODB_URI
    };
    
    console.log('🔍 Environment check:', envCheck);
    
    // Test session
    const session = await getServerSession(authOptions);
    console.log('📋 Session test:', session ? {
      id: session.user?.id,
      email: session.user?.email,
      role: session.user?.role
    } : 'No session');
    
    return NextResponse.json({
      success: true,
      environment: envCheck,
      session: session ? {
        id: session.user?.id,
        email: session.user?.email,
        role: session.user?.role,
        isRegistered: session.user?.isRegistered
      } : null,
      message: session ? 'Session found' : 'No session found'
    });
    
  } catch (error) {
    console.error('❌ OAuth test error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
} 