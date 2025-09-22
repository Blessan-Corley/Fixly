// app/api/validate-content/route.js - Comprehensive Content Validation API
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../lib/auth';
import { redisRateLimit } from '../../../lib/redis';
import { ContentValidator } from '../../../lib/validations/content-validator';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    // Get client IP for rate limiting
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown';

    // Redis-based rate limiting - 100 validations per minute per IP
    const rateLimitResult = await redisRateLimit(`content_validation:${ip}`, 100, 60);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          isValid: false,
          message: 'Too many validation requests. Please try again later.',
          resetTime: new Date(rateLimitResult.resetTime).toISOString()
        },
        { status: 429 }
      );
    }

    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { isValid: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch (jsonError) {
      return NextResponse.json({
        isValid: false,
        message: 'Invalid request body'
      }, { status: 400 });
    }

    const { content, context, userId } = body;

    if (!content || typeof content !== 'string') {
      return NextResponse.json({
        isValid: false,
        message: 'Content is required and must be a string'
      }, { status: 400 });
    }

    // Use ContentValidator for comprehensive validation
    const validationResult = await ContentValidator.validateContent(
      content,
      context || 'general',
      userId || session.user.id
    );

    console.log(`🔍 Content validation: "${content.substring(0, 50)}..." - Valid: ${validationResult.isValid}`);

    return NextResponse.json({
      isValid: validationResult.isValid,
      violations: validationResult.violations || [],
      suggestions: validationResult.suggestions || [],
      confidence: validationResult.confidence || 0.8,
      message: validationResult.isValid ? 'Content is appropriate' : 'Content contains inappropriate elements'
    });

  } catch (error) {
    console.error('❌ Content validation error:', error);
    return NextResponse.json({
      isValid: false,
      message: 'Validation failed. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}