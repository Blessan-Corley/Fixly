// app/api/auth/set-context/route.js
import { NextResponse } from 'next/server';
import { setAuthContext } from '@/lib/authContext';

export async function POST(req) {
  try {
    const { context } = await req.json();

    if (!context) {
      return NextResponse.json(
        { error: 'Context is required' },
        { status: 400 }
      );
    }

    if (context !== 'signup' && context !== 'signin') {
      return NextResponse.json(
        { error: 'Invalid context. Must be "signup" or "signin"' },
        { status: 400 }
      );
    }

    // Store context in a secure cookie that will be accessible server-side
    const response = NextResponse.json({ success: true });

    // Set a short-lived cookie (5 minutes) to track the auth context
    response.cookies.set('fixly_auth_context', context, {
      httpOnly: true, // Secure, not accessible from JavaScript
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 5 * 60, // 5 minutes
      path: '/'
    });

    return response;
  } catch (error) {
    console.error('Error setting auth context:', error);
    return NextResponse.json(
      { error: 'Failed to set auth context' },
      { status: 500 }
    );
  }
}
