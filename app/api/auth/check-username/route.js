// app/api/auth/check-username/route.js - ENHANCED WITH REDIS CACHING
import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { redisRateLimit, redisUtils } from '@/lib/redis';
import { ValidationRules } from '@/utils/validation';

export async function POST(request) {
  try {
    // Get client IP for rate limiting
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown';

    // Redis-based rate limiting - 30 checks per minute per IP
    const rateLimitResult = await redisRateLimit(`username_check:${ip}`, 30, 60);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          available: false,
          message: 'Too many username checks. Please try again later.',
          resetTime: new Date(rateLimitResult.resetTime).toISOString()
        },
        { status: 429 }
      );
    }

    console.log('🔍 Username check started');

    let body;
    try {
      body = await request.json();
    } catch (jsonError) {
      console.log('❌ JSON parse error:', jsonError);
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

    // Check Redis cache first for faster response
    const cacheKey = `username_available:${validatedUsername}`;
    const cachedResult = await redisUtils.get(cacheKey);

    if (cachedResult !== null) {
      console.log('🚀 Username check from cache');
      return NextResponse.json(cachedResult);
    }

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
    const result = {
      available: true,
      message: 'Username is available!',
      suggestion: null
    };

    // Cache the result for 10 minutes to improve performance
    await redisUtils.set(cacheKey, result, 600);
    console.log('💾 Username check result cached');

    return NextResponse.json(result);

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