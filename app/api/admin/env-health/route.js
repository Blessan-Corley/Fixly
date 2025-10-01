// app/api/admin/env-health/route.js - Environment health check endpoint
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { envHealthCheck } from '@/lib/env-validation';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    // Check authentication and admin role
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      );
    }

    // For security, only allow admins to access environment health
    if (session.user.role !== 'admin') {
      return NextResponse.json(
        { message: 'Admin access required' },
        { status: 403 }
      );
    }

    // Perform environment health check
    const healthCheck = envHealthCheck();

    // Add additional runtime checks
    const runtimeChecks = {
      nodeEnv: process.env.NODE_ENV,
      hasMongoUri: !!process.env.MONGODB_URI,
      hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
      hasAblyKeys: !!(process.env.ABLY_ROOT_KEY && process.env.NEXT_PUBLIC_ABLY_CLIENT_KEY),
      hasCloudinary: !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY),
      hasGoogleAuth: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
      hasRedis: !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
    };

    // Calculate overall health score
    const totalChecks = Object.keys(runtimeChecks).length - 1; // Exclude nodeEnv
    const passedChecks = Object.entries(runtimeChecks)
      .filter(([key, value]) => key !== 'nodeEnv' && value === true)
      .length;
    const healthScore = Math.round((passedChecks / totalChecks) * 100);

    return NextResponse.json({
      success: true,
      health: {
        ...healthCheck,
        healthScore,
        runtimeChecks,
        recommendations: generateRecommendations(healthCheck, runtimeChecks)
      }
    });

  } catch (error) {
    console.error('❌ Environment health check error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Environment health check failed',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      },
      { status: 500 }
    );
  }
}

function generateRecommendations(healthCheck, runtimeChecks) {
  const recommendations = [];

  if (!runtimeChecks.hasMongoUri) {
    recommendations.push({
      type: 'critical',
      message: 'MongoDB connection string is missing. Database operations will fail.',
      action: 'Set MONGODB_URI environment variable'
    });
  }

  if (!runtimeChecks.hasNextAuthSecret) {
    recommendations.push({
      type: 'critical',
      message: 'NextAuth secret is missing. Authentication will fail.',
      action: 'Set NEXTAUTH_SECRET environment variable with a secure random string'
    });
  }

  if (!runtimeChecks.hasAblyKeys) {
    recommendations.push({
      type: 'warning',
      message: 'Ably keys are missing. Real-time features will be disabled.',
      action: 'Set ABLY_ROOT_KEY and NEXT_PUBLIC_ABLY_CLIENT_KEY environment variables'
    });
  }

  if (!runtimeChecks.hasCloudinary) {
    recommendations.push({
      type: 'warning',
      message: 'Cloudinary configuration is missing. File uploads will fail.',
      action: 'Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET'
    });
  }

  if (!runtimeChecks.hasGoogleAuth) {
    recommendations.push({
      type: 'info',
      message: 'Google OAuth is not configured. Google sign-in will not be available.',
      action: 'Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET for Google authentication'
    });
  }

  if (!runtimeChecks.hasRedis) {
    recommendations.push({
      type: 'info',
      message: 'Redis is not configured. Caching and rate limiting will use in-memory storage.',
      action: 'Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN for better performance'
    });
  }

  if (process.env.NODE_ENV === 'production') {
    if (!process.env.NEXTAUTH_URL || !process.env.NEXTAUTH_URL.startsWith('https://')) {
      recommendations.push({
        type: 'critical',
        message: 'NEXTAUTH_URL must use HTTPS in production for security.',
        action: 'Set NEXTAUTH_URL to your production HTTPS URL'
      });
    }
  }

  return recommendations;
}