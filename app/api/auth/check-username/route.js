// app/api/auth/check-username/route.js
import { NextResponse } from 'next/server';
import connectDB from '../../../../lib/db';
import User from '../../../../models/User';
import { rateLimit } from '../../../../utils/rateLimiting';

export async function POST(request) {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimit(request, 'username_check', 30, 60); // 30 checks per minute
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { message: 'Too many username checks. Please slow down.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { username } = body;

    if (!username) {
      return NextResponse.json(
        { available: false, message: 'Username is required' },
        { status: 400 }
      );
    }

    // Validate username format
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!usernameRegex.test(username)) {
      return NextResponse.json({
        available: false,
        message: 'Username must be 3-20 characters long and contain only letters, numbers, and underscores'
      });
    }

    // Check for reserved usernames
    const reservedUsernames = [
      'admin', 'administrator', 'root', 'superuser', 'moderator', 'mod',
      'support', 'help', 'api', 'www', 'mail', 'email', 'ftp', 'blog',
      'shop', 'store', 'news', 'forum', 'test', 'demo', 'example',
      'fixly', 'system', 'null', 'undefined', 'user', 'users', 'profile',
      'account', 'login', 'signup', 'register', 'auth', 'oauth', 'about',
      'contact', 'privacy', 'terms', 'legal', 'jobs', 'job', 'hirer',
      'fixer', 'worker', 'service', 'services', 'dashboard', 'settings'
    ];

    if (reservedUsernames.includes(username.toLowerCase())) {
      return NextResponse.json({
        available: false,
        message: 'This username is reserved'
      });
    }

    await connectDB();

    // Check if username exists
    const existingUser = await User.findOne({ 
      username: username.toLowerCase() 
    });

    if (existingUser) {
      return NextResponse.json({
        available: false,
        message: 'Username is already taken'
      });
    }

    return NextResponse.json({
      available: true,
      message: 'Username is available'
    });

  } catch (error) {
    console.error('Username check error:', error);
    return NextResponse.json(
      { 
        available: false, 
        message: 'Error checking username availability' 
      },
      { status: 500 }
    );
  }
}