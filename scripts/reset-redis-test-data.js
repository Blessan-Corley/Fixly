// Reset Redis test data and rate limits
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '..', '.env.local') });

import { getRedis, redisUtils } from '../lib/redis.js';

async function resetTestData() {
  console.log('🧹 Resetting Redis test data and rate limits...\n');

  try {
    const redis = getRedis();
    if (!redis) {
      console.error('❌ Redis not available');
      return false;
    }

    // Clear rate limit keys for testing
    const rateLimitKeys = [
      'rate_limit:send_otp:127.0.0.1',
      'rate_limit:send_otp:::1',
      'rate_limit:send_otp:localhost',
      'rate_limit:verify_otp:127.0.0.1',
      'rate_limit:verify_otp:::1',
      'rate_limit:verify_otp:localhost',
      'rate_limit:test:rate:limit'
    ];

    console.log('🗑️ Clearing rate limit keys...');
    for (const key of rateLimitKeys) {
      await redisUtils.del(key);
      console.log(`   ✅ Cleared: ${key}`);
    }

    // Clear test OTP keys
    console.log('\n🗑️ Clearing test OTP keys...');
    const otpKeys = [
      'otp:test@example.com:signup',
      'otp:test@example.com:password_reset',
      'otp:test0@example.com:signup',
      'otp:test1@example.com:signup',
      'otp:test2@example.com:signup',
      'otp:test3@example.com:signup',
      'otp:test4@example.com:signup'
    ];

    for (const key of otpKeys) {
      await redisUtils.del(key);
      console.log(`   ✅ Cleared: ${key}`);
    }

    // Clear any other test keys
    console.log('\n🗑️ Clearing misc test keys...');
    const miscKeys = [
      'test:connection',
      'test:hash',
      'session:test_session'
    ];

    for (const key of miscKeys) {
      await redisUtils.del(key);
      console.log(`   ✅ Cleared: ${key}`);
    }

    console.log('\n✅ All test data cleared successfully!');
    console.log('🎯 Redis is ready for fresh testing');

    return true;

  } catch (error) {
    console.error('\n💥 Error resetting test data:', error);
    return false;
  }
}

// Run cleanup
async function runCleanup() {
  console.log('🚀 Starting Redis Test Data Reset');
  console.log('='.repeat(50));

  const success = await resetTestData();

  console.log('\n' + '='.repeat(50));
  if (success) {
    console.log('✅ Test data reset completed successfully');
  } else {
    console.log('❌ Test data reset failed');
  }

  process.exit(success ? 0 : 1);
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run the cleanup
runCleanup();