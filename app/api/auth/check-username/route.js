// app/api/auth/check-username/route.js - ENHANCED VERSION
import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { rateLimit } from '@/utils/rateLimiting';
import { ValidationRules } from '@/utils/validation';

export async function POST(request) {
  try {
    // Apply rate limiting - 30 checks per minute
    const rateLimitResult = await rateLimit(request, 'username_check', 30, 60 * 1000);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { 
          available: false, 
          message: 'Too many username checks. Please slow down.' 
        },
        { status: 429 }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch (jsonError) {
      return NextResponse.json({
        available: false,
        message: 'Invalid request body'
      }, { status: 400 });
    }
    
    const { username } = body;

    if (!username) {
      return NextResponse.json({
        available: false,
        message: 'Username is required'
      }, { status: 400 });
    }

    // ✅ USE ENHANCED VALIDATION
    const validation = ValidationRules.validateUsername(username);
    if (!validation.valid) {
      return NextResponse.json({
        available: false,
        message: validation.error,
        errors: [{ field: 'username', error: validation.error }]
      });
    }

    const validatedUsername = validation.value;

    await connectDB();

    // Check if username exists in database
    const existingUser = await User.findOne({
      username: validatedUsername
    });

    if (existingUser) {
      return NextResponse.json({
        available: false,
        message: 'Username is already taken'
      });
    }

    // ✅ ADDITIONAL CHECKS: Reserved usernames and patterns
    const reservedUsernames = [
      // System reserved
      'admin', 'administrator', 'root', 'superuser', 'moderator', 'mod',
      'support', 'help', 'api', 'www', 'mail', 'email', 'ftp', 'blog',
      'shop', 'store', 'news', 'forum', 'dashboard', 'settings',
      
      // Fixly specific
      'fixly', 'system', 'jobs', 'job', 'hirer', 'fixer', 'worker',
      'service', 'services', 'auth', 'oauth', 'login', 'signup', 'register',
      
      // Legal pages
      'about', 'contact', 'privacy', 'terms', 'legal',
      
      // Common patterns
      'null', 'undefined', 'user', 'users', 'profile', 'account'
    ];

    if (reservedUsernames.includes(validatedUsername)) {
      return NextResponse.json({
        available: false,
        message: 'This username is reserved'
      });
    }

    // ✅ CHECK FOR SUSPICIOUS PATTERNS
    const suspiciousPatterns = [
      /^(user|temp|test|demo|fake|sample)\d*$/,
      /^[a-z]{1,2}\d{3,}$/, // Single/double letter followed by many numbers
      /^fixly/i,
      /admin/i,
      /support/i
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(validatedUsername)) {
        return NextResponse.json({
          available: false,
          message: 'Please choose a more unique username'
        });
      }
    }

    // ✅ SUCCESS: Username is available and valid
    return NextResponse.json({
      available: true,
      message: 'Username is available!',
      suggestion: null
    });

  } catch (error) {
    console.error('Username check error:', error);
    return NextResponse.json({
      available: false,
      message: 'Error checking username availability'
    }, { status: 500 });
  }
}

// ✅ BONUS: GET endpoint for username suggestions
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const baseUsername = searchParams.get('base');

    if (!baseUsername) {
      return NextResponse.json(
        { message: 'Base username required' },
        { status: 400 }
      );
    }

    // Validate base username
    const validation = ValidationRules.validateUsername(baseUsername);
    if (!validation.valid) {
      return NextResponse.json({
        suggestions: [],
        message: validation.error
      });
    }

    await connectDB();

    const suggestions = [];
    const base = validation.value;

    // Generate suggestions
    for (let i = 1; i <= 5; i++) {
      const variants = [
        `${base}${i}`,
        `${base}_${i}`,
        `${base}${String(Math.floor(Math.random() * 99) + 1).padStart(2, '0')}`,
        `${base}_pro`,
        `${base}_fix`
      ];

      for (const variant of variants) {
        if (suggestions.length >= 5) break;

        // Check if variant is available
        const existing = await User.findOne({ username: variant });
        if (!existing && !suggestions.includes(variant)) {
          suggestions.push(variant);
        }
      }

      if (suggestions.length >= 5) break;
    }

    return NextResponse.json({
      suggestions,
      message: suggestions.length > 0 ? 'Here are some available alternatives' : 'No suggestions available'
    });

  } catch (error) {
    console.error('Username suggestions error:', error);
    return NextResponse.json({
      suggestions: [],
      message: 'Error generating suggestions'
    }, { status: 500 });
  }
}