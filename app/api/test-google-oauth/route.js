// app/api/test-google-oauth/route.js - Test Google OAuth configuration
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    console.log('🧪 Google OAuth test endpoint called');
    
    // Check if Google OAuth is properly configured
    const googleConfig = {
      hasClientId: !!process.env.GOOGLE_CLIENT_ID,
      hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
      clientId: process.env.GOOGLE_CLIENT_ID ? process.env.GOOGLE_CLIENT_ID.substring(0, 20) + '...' : 'Not set',
      callbackUrl: `${process.env.NEXTAUTH_URL}/api/auth/callback/google`
    };
    
    console.log('🔍 Google OAuth config:', googleConfig);
    
    // Test session
    const session = await getServerSession(authOptions);
    console.log('📋 Session test:', session ? {
      id: session.user?.id,
      email: session.user?.email,
      role: session.user?.role,
      isRegistered: session.user?.isRegistered
    } : 'No session');
    
    return NextResponse.json({
      success: true,
      googleOAuth: googleConfig,
      session: session ? {
        id: session.user?.id,
        email: session.user?.email,
        role: session.user?.role,
        isRegistered: session.user?.isRegistered
      } : null,
      message: session ? 'Session found' : 'No session found',
      instructions: {
        callbackUrl: googleConfig.callbackUrl,
        note: 'Make sure this callback URL is added to your Google OAuth configuration'
      }
    });
    
  } catch (error) {
    console.error('❌ Google OAuth test error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
} 