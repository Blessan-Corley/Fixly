// app/api/auth/check-username/route.js - COMPREHENSIVE FIELD VALIDATION WITH CONTENT FILTERING
import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { redisRateLimit, redisUtils } from '@/lib/redis';
import { ValidationRules } from '@/utils/validation';
import { ContentValidator } from '@/lib/validations/content-validator';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    // Get client IP for rate limiting
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown';

    // Redis-based rate limiting - 30 checks per minute per IP
    const rateLimitResult = await redisRateLimit(`field_validation:${ip}`, 30, 60);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          available: false,
          message: 'Too many validation requests. Please try again later.',
          resetTime: new Date(rateLimitResult.resetTime).toISOString()
        },
        { status: 429 }
      );
    }

    console.log('🔍 Field validation check started');

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

    const { username, email, phone, type, currentUserId } = body;

    // Determine validation type and field value
    let field, value, validationType;
    if (type) {
      // New API style with explicit type parameter
      validationType = type;
      value = type === 'username' ? username : type === 'email' ? email : phone;
      field = type;
    } else if (username) {
      // Legacy API style - username only (backward compatibility)
      validationType = 'username';
      value = username;
      field = 'username';
    } else {
      return NextResponse.json({
        available: false,
        message: 'Field value and type are required'
      }, { status: 400 });
    }

    if (!value || !['username', 'email', 'phone'].includes(validationType)) {
      return NextResponse.json({
        available: false,
        message: `Invalid ${validationType || 'field'} validation request`
      }, { status: 400 });
    }

    let cacheKey, query, successMessage, errorMessage;

    switch (validationType) {
      case 'username':
        // ✅ USERNAME VALIDATION USING EXISTING VALIDATORS

        // 1. Use ValidationRules for format validation
        const usernameValidation = ValidationRules.validateUsername(value);
        if (!usernameValidation.valid) {
          return NextResponse.json({
            available: false,
            message: usernameValidation.error
          });
        }

        const validatedUsername = usernameValidation.value;

        // 2. ENHANCED: Use ContentValidator for comprehensive content filtering
        try {
          const contentValidation = await ContentValidator.validateContent(
            validatedUsername,
            'profile',
            currentUserId
          );

          if (!contentValidation.isValid) {
            const primaryViolation = contentValidation.violations[0];
            let message = 'Invalid username';
            let code = 'CONTENT_VIOLATION';

            // Log the violation for monitoring (but don't expose details to user)
            console.log(`🚨 Username violation detected:`, {
              username: validatedUsername,
              violations: contentValidation.violations.map(v => ({ type: v.type, severity: v.severity })),
              score: contentValidation.score,
              userId: currentUserId
            });

            // Categorize violations for different responses
            if (primaryViolation) {
              switch (primaryViolation.type) {
                case 'profanity':
                case 'abuse':
                  message = 'Invalid username';
                  code = 'PROFANITY_DETECTED';
                  break;
                case 'phone_number':
                  message = 'Invalid username';
                  code = 'PHONE_NUMBER_DETECTED';
                  break;
                case 'email_address':
                  message = 'Invalid username';
                  code = 'EMAIL_DETECTED';
                  break;
                case 'social_media':
                  message = 'Invalid username';
                  code = 'SOCIAL_MEDIA_DETECTED';
                  break;
                case 'promotional':
                case 'spam':
                  message = 'Invalid username';
                  code = 'PROMOTIONAL_CONTENT';
                  break;
                case 'repetitive':
                  message = 'Invalid username';
                  code = 'REPETITIVE_PATTERN';
                  break;
                default:
                  message = 'Invalid username';
                  code = 'CONTENT_VIOLATION';
              }
            }

            return NextResponse.json({
              available: false,
              message,
              code,
              // Only provide suggestions if it's a mild violation
              suggestions: primaryViolation?.severity <= 2 ? contentValidation.suggestions : undefined
            });
          }
        } catch (contentError) {
          console.warn('⚠️ Content validation failed, proceeding with basic validation:', contentError.message);
          // Don't block username if content validator fails - fallback gracefully
        }

        cacheKey = `username_available:${validatedUsername}`;
        query = { username: validatedUsername };
        successMessage = 'Username is available!';
        errorMessage = 'Username is already taken';
        break;

      case 'email':
        // ✅ EMAIL VALIDATION
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          return NextResponse.json({
            available: false,
            message: 'Invalid email address'
          });
        }

        // Content validation for email local part
        const emailLocalPart = value.split('@')[0];
        const emailContentValidation = await ContentValidator.validateContent(
          emailLocalPart,
          'profile',
          currentUserId
        );

        if (!emailContentValidation.isValid) {
          return NextResponse.json({
            available: false,
            message: 'Invalid email address',
            suggestions: emailContentValidation.suggestions
          });
        }

        const normalizedEmail = value.toLowerCase();
        cacheKey = `email_available:${normalizedEmail}`;
        query = { email: normalizedEmail };
        successMessage = 'Email is available!';
        errorMessage = 'Email is already registered';
        break;

      case 'phone':
        // ✅ PHONE VALIDATION
        const cleanPhone = value.replace(/[^\d]/g, '');
        if (cleanPhone.length !== 10) {
          return NextResponse.json({
            available: false,
            message: 'Invalid phone number'
          });
        }

        if (!/^[6-9]/.test(cleanPhone)) {
          return NextResponse.json({
            available: false,
            message: 'Invalid phone number'
          });
        }

        // Check for repeated digits (like 1111111111)
        if (/^(\d)\1{9}$/.test(cleanPhone)) {
          return NextResponse.json({
            available: false,
            message: 'Invalid phone number'
          });
        }

        // Check multiple phone formats
        const phoneFormats = [
          cleanPhone,
          `+91${cleanPhone}`,
          `91${cleanPhone}`
        ];

        cacheKey = `phone_available:${cleanPhone}`;
        query = { phone: { $in: phoneFormats } };
        successMessage = 'Phone number is available!';
        errorMessage = 'Phone number is already registered';
        break;
    }

    // Check Redis cache first for faster response
    const cachedResult = await redisUtils.get(cacheKey);
    if (cachedResult !== null) {
      console.log(`🚀 ${validationType} check from cache`);
      return NextResponse.json(cachedResult);
    }

    await connectDB();

    // If updating existing user, exclude current user from check
    if (currentUserId) {
      query._id = { $ne: currentUserId };
    }

    // FAST database check with minimal fields
    const existingUser = await User.findOne(query).select('_id').lean();

    if (existingUser) {
      const result = {
        available: false,
        message: errorMessage
      };

      // Cache negative results for shorter time
      await redisUtils.set(cacheKey, result, 300);
      return NextResponse.json(result);
    }

    // ✅ SUCCESS: Field is available and valid
    const result = {
      available: true,
      message: successMessage
    };

    // Cache positive results for longer time
    await redisUtils.set(cacheKey, result, 600);
    console.log(`💾 ${validationType} check result cached`);

    return NextResponse.json(result);

  } catch (error) {
    console.error(`❌ Field validation error:`, error);

    // Handle specific MongoDB errors
    if (error.name === 'MongoNetworkError') {
      return NextResponse.json(
        {
          available: false,
          message: 'Database connection error. Please try again.'
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      available: false,
      message: 'Error checking field availability. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
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

    // Validate base username format using existing ValidationRules
    const baseValidation = ValidationRules.validateUsername(baseUsername);
    if (!baseValidation.valid) {
      return NextResponse.json({
        suggestions: [],
        message: baseValidation.error
      });
    }

    // Check content validation for base
    const contentValidation = await ContentValidator.validateContent(baseUsername, 'profile');
    if (!contentValidation.isValid) {
      return NextResponse.json({
        suggestions: [],
        message: 'Please use a more appropriate base username'
      });
    }

    await connectDB();

    const suggestions = [];
    const base = baseValidation.value;

    // Generate intelligent suggestions
    const suggestionsToTry = [
      `${base}_pro`,
      `${base}_fix`,
      `${base}_expert`,
      `${base}_${new Date().getFullYear()}`,
      `${base}_work`,
      `${base}_service`,
      `pro_${base}`,
      `fix_${base}`,
      `${base}123`,
      `${base}456`,
      `${base}_official`,
      `${base}_india`,
      `the_${base}`,
      `${base}_master`,
      `${base}_hero`
    ];

    // Add some random number variants
    for (let i = 1; i <= 20; i++) {
      const randomNum = Math.floor(Math.random() * 999) + 1;
      suggestionsToTry.push(`${base}${randomNum}`);
      suggestionsToTry.push(`${base}_${randomNum}`);
    }

    // Check each suggestion
    for (const suggestion of suggestionsToTry) {
      if (suggestions.length >= 8) break;

      // Skip if too long
      if (suggestion.length > 20) continue;

      // Validate each suggestion using our rules
      const suggestionValidation = ValidationRules.validateUsername(suggestion);
      if (!suggestionValidation.valid) continue;

      const suggestionContentValidation = await ContentValidator.validateContent(suggestion, 'profile');
      if (!suggestionContentValidation.isValid) continue;

      // Check if available
      const existing = await User.findOne({ username: suggestion }).select('_id').lean();
      if (!existing && !suggestions.includes(suggestion)) {
        suggestions.push(suggestion);
      }
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