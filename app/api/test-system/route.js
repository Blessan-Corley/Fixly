import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { redis } from '@/lib/redis';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * Comprehensive System Test Endpoint
 * Tests all critical services
 */
export async function GET() {
  const results = {
    timestamp: new Date().toISOString(),
    tests: {},
    overall: 'PENDING'
  };

  // Test 1: MongoDB Connection
  try {
    await connectDB();
    const mongoStatus = mongoose.connection.readyState;

    results.tests.mongodb = {
      status: mongoStatus === 1 ? 'PASS' : 'FAIL',
      connected: mongoStatus === 1,
      database: mongoose.connection.name,
      host: mongoose.connection.host,
      readyState: mongoStatus,
      message: mongoStatus === 1 ? 'MongoDB connected successfully' : 'MongoDB not connected'
    };
  } catch (error) {
    results.tests.mongodb = {
      status: 'FAIL',
      connected: false,
      error: error.message,
      message: 'MongoDB connection failed'
    };
  }

  // Test 2: Redis Connection
  try {
    const testKey = `test:system:${Date.now()}`;
    const testValue = 'test-data-' + Date.now();

    // Write test
    const writeSuccess = await redisUtils.set(testKey, testValue, 60);

    // Read test
    const retrieved = await redisUtils.get(testKey);

    // Delete test
    const deleteSuccess = await redisUtils.del(testKey);

    // Check data integrity
    const dataMatches = retrieved === testValue;

    results.tests.redis = {
      status: (writeSuccess && dataMatches && deleteSuccess) ? 'PASS' : 'FAIL',
      connected: true,
      writeSuccess: writeSuccess,
      readSuccess: retrieved !== null,
      deleteSuccess: deleteSuccess,
      dataIntegrity: dataMatches,
      expectedValue: testValue,
      retrievedValue: retrieved,
      message: dataMatches ? 'Redis working perfectly' : `Redis data mismatch: expected "${testValue}", got "${retrieved}"`
    };
  } catch (error) {
    results.tests.redis = {
      status: 'FAIL',
      connected: false,
      error: error.message,
      message: 'Redis connection/operation failed'
    };
  }

  // Test 3: Environment Variables
  const requiredEnvVars = [
    'MONGODB_URI',
    'NEXTAUTH_SECRET',
    'NEXTAUTH_URL',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'UPSTASH_REDIS_REST_URL',
    'UPSTASH_REDIS_REST_TOKEN',
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET'
  ];

  const envStatus = {};
  let allEnvPresent = true;

  requiredEnvVars.forEach(key => {
    const present = !!process.env[key];
    envStatus[key] = present ? 'CONFIGURED' : 'MISSING';
    if (!present) allEnvPresent = false;
  });

  // Check for Ably configuration (actual keys used in codebase)
  const hasAblyServer = process.env.ABLY_ROOT_KEY;
  const hasAblyClient = process.env.NEXT_PUBLIC_ABLY_CLIENT_KEY;

  if (hasAblyServer && hasAblyClient) {
    envStatus['ABLY_CONFIGURED'] = 'CONFIGURED';
  } else {
    envStatus['ABLY_KEYS'] = 'MISSING';
    allEnvPresent = false;
  }

  results.tests.environment = {
    status: allEnvPresent ? 'PASS' : 'FAIL',
    variables: envStatus,
    totalRequired: requiredEnvVars.length,
    configured: Object.values(envStatus).filter(v => v === 'CONFIGURED').length,
    missing: Object.values(envStatus).filter(v => v === 'MISSING').length,
    message: allEnvPresent ? 'All environment variables configured' : 'Some environment variables missing'
  };

  // Overall Status
  const allPassed = Object.values(results.tests).every(test => test.status === 'PASS');
  results.overall = allPassed ? 'PASS' : 'FAIL';

  // Summary
  results.summary = {
    totalTests: Object.keys(results.tests).length,
    passed: Object.values(results.tests).filter(t => t.status === 'PASS').length,
    failed: Object.values(results.tests).filter(t => t.status === 'FAIL').length,
    message: allPassed
      ? '✅ All systems operational'
      : '⚠️ Some systems need attention'
  };

  return NextResponse.json(results, {
    status: allPassed ? 200 : 500
  });
}
