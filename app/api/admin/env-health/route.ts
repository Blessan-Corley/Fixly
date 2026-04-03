import { respond, tooManyRequests } from '@/lib/api';
import { requireAdmin } from '@/lib/api/auth';
import { env } from '@/lib/env';
import { ENV_CONFIG, envHealthCheck } from '@/lib/env-validation';
import { logger } from '@/lib/logger';
import { rateLimit } from '@/utils/rateLimiting';

export const dynamic = 'force-dynamic';

type RecommendationLevel = 'critical' | 'warning' | 'info';

type Recommendation = {
  type: RecommendationLevel;
  message: string;
  action: string;
};

type EnvHealthSummary = {
  total: number;
  configured: number;
  missing: number;
  invalid: number;
};

type EnvHealthResult = {
  isHealthy: boolean;
  errors: string[];
  warnings: string[];
  summary: EnvHealthSummary;
};

type RuntimeChecks = {
  nodeEnv?: string;
  hasMongoUri: boolean;
  hasNextAuthSecret: boolean;
  hasAblyKeys: boolean;
  hasCloudinary: boolean;
  hasGoogleAuth: boolean;
  hasRedis: boolean;
};

type EnvVariableStatus = {
  name: string;
  scope: 'server' | 'client';
  status: 'present' | 'missing';
};

function generateRecommendations(runtimeChecks: RuntimeChecks): Recommendation[] {
  const recommendations: Recommendation[] = [];

  if (!runtimeChecks.hasMongoUri) {
    recommendations.push({
      type: 'critical',
      message: 'MongoDB connection string is missing. Database operations will fail.',
      action: 'Set MONGODB_URI environment variable',
    });
  }

  if (!runtimeChecks.hasNextAuthSecret) {
    recommendations.push({
      type: 'critical',
      message: 'NextAuth secret is missing. Authentication will fail.',
      action: 'Set NEXTAUTH_SECRET environment variable with a secure random string',
    });
  }

  if (!runtimeChecks.hasAblyKeys) {
    recommendations.push({
      type: 'warning',
      message: 'Ably keys are missing. Real-time features will be disabled.',
      action: 'Set ABLY_ROOT_KEY and NEXT_PUBLIC_ABLY_CLIENT_KEY environment variables',
    });
  }

  if (!runtimeChecks.hasCloudinary) {
    recommendations.push({
      type: 'warning',
      message: 'Cloudinary configuration is missing. File uploads will fail.',
      action: 'Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET',
    });
  }

  if (!runtimeChecks.hasGoogleAuth) {
    recommendations.push({
      type: 'info',
      message: 'Google OAuth is not configured. Google sign-in will not be available.',
      action: 'Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET for Google authentication',
    });
  }

  if (!runtimeChecks.hasRedis) {
    recommendations.push({
      type: 'critical',
      message:
        'Redis is not configured. Auth rate limiting and OTP verification cannot run safely in production.',
      action: 'Set REDIS_URL to a serverless-safe Redis instance and verify connectivity',
    });
  }

  if (env.NODE_ENV === 'production') {
    if (!env.NEXTAUTH_URL || !env.NEXTAUTH_URL.startsWith('https://')) {
      recommendations.push({
        type: 'critical',
        message: 'NEXTAUTH_URL must use HTTPS in production for security.',
        action: 'Set NEXTAUTH_URL to your production HTTPS URL',
      });
    }
  }

  return recommendations;
}

function getEnvVariableStatuses(): EnvVariableStatus[] {
  const envSource = env as unknown as Record<string, string | number | boolean | undefined>;
  const serverKeys: EnvVariableStatus[] = Object.keys(ENV_CONFIG.server).map((key) => ({
    name: key,
    scope: 'server' as const,
    status: envSource[key] ? ('present' as const) : ('missing' as const),
  }));
  const clientKeys: EnvVariableStatus[] = Object.keys(ENV_CONFIG.client).map((key) => ({
    name: key,
    scope: 'client' as const,
    status: envSource[key] ? ('present' as const) : ('missing' as const),
  }));

  return [...serverKeys, ...clientKeys];
}

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if ('error' in auth) {
    return auth.error;
  }

  try {
    const rateLimitResult = await rateLimit(request, 'admin_env_health', 20, 60 * 1000);
    if (!rateLimitResult.success) {
      return tooManyRequests('Too many requests. Please try again later.');
    }

    const healthCheck = envHealthCheck() as EnvHealthResult;

    const runtimeChecks: RuntimeChecks = {
      nodeEnv: env.NODE_ENV,
      hasMongoUri: Boolean(env.MONGODB_URI),
      hasNextAuthSecret: Boolean(env.NEXTAUTH_SECRET),
      hasAblyKeys: Boolean(env.ABLY_ROOT_KEY && env.NEXT_PUBLIC_ABLY_CLIENT_KEY),
      hasCloudinary: Boolean(env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY),
      hasGoogleAuth: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
      hasRedis: Boolean(env.REDIS_URL),
    };

    const checks = Object.entries(runtimeChecks).filter(([key]) => key !== 'nodeEnv');
    const passedChecks = checks.filter(([, value]) => value === true).length;
    const healthScore = checks.length > 0 ? Math.round((passedChecks / checks.length) * 100) : 0;
    const variables = getEnvVariableStatuses();

    return respond({
      success: true,
      health: {
        ...healthCheck,
        healthScore,
        runtimeChecks,
        variables,
        recommendations: generateRecommendations(runtimeChecks),
      },
    });
  } catch (error: unknown) {
    logger.error('Environment health check error:', error);
    return respond(
      {
        success: false,
        message: 'Environment health check failed',
        error: env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error',
      },
      500
    );
  }
}
