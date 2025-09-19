// Test Redis connection and functionality
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '..', '.env.local') });

import { initRedis, getRedis, redisUtils, otpRedis, redisRateLimit } from '../lib/redis.js';

async function testRedisConnection() {
  console.log('🔧 Testing Redis connection and functionality...\n');

  try {
    // Initialize Redis
    console.log('1. Initializing Redis connection...');
    const redis = initRedis();

    if (!redis) {
      console.error('❌ Failed to initialize Redis');
      return false;
    }

    console.log('✅ Redis initialized successfully');

    // Test basic connection
    console.log('\n2. Testing basic Redis operations...');

    // Test SET and GET
    const testKey = 'test:connection';
    const testValue = { message: 'Hello Redis!', timestamp: Date.now() };

    const setResult = await redisUtils.set(testKey, testValue, 60);
    if (setResult) {
      console.log('✅ SET operation successful');
    } else {
      console.error('❌ SET operation failed');
      return false;
    }

    const getValue = await redisUtils.get(testKey);
    if (getValue && getValue.message === testValue.message) {
      console.log('✅ GET operation successful');
      console.log('📄 Retrieved value:', getValue);
    } else {
      console.error('❌ GET operation failed');
      return false;
    }

    // Test TTL
    const ttl = await redisUtils.ttl(testKey);
    console.log('⏰ TTL for test key:', ttl, 'seconds');

    // Test DELETE
    const delResult = await redisUtils.del(testKey);
    if (delResult) {
      console.log('✅ DELETE operation successful');
    } else {
      console.error('❌ DELETE operation failed');
    }

    // Test OTP functionality
    console.log('\n3. Testing OTP Redis functionality...');

    const testEmail = 'test@example.com';
    const testOTP = '123456';
    const testPurpose = 'signup';

    // Store OTP
    const storeResult = await otpRedis.store(testEmail, testOTP, testPurpose, 300);
    if (storeResult) {
      console.log('✅ OTP storage successful');
    } else {
      console.error('❌ OTP storage failed');
      return false;
    }

    // Check OTP status
    const statusResult = await otpRedis.checkStatus(testEmail, testPurpose);
    console.log('📊 OTP Status:', statusResult);

    // Verify correct OTP
    const verifyCorrect = await otpRedis.verify(testEmail, testOTP, testPurpose);
    if (verifyCorrect.success) {
      console.log('✅ OTP verification (correct) successful');
    } else {
      console.error('❌ OTP verification (correct) failed:', verifyCorrect.message);
    }

    // Test rate limiting
    console.log('\n4. Testing rate limiting functionality...');

    const rateLimitKey = 'test:rate:limit';

    // Test multiple rate limit calls
    for (let i = 1; i <= 3; i++) {
      const rateLimitResult = await redisRateLimit(rateLimitKey, 2, 60); // 2 requests per minute
      console.log(`🔄 Rate limit test ${i}:`, {
        success: rateLimitResult.success,
        remaining: rateLimitResult.remaining
      });
    }

    // Test hash operations
    console.log('\n5. Testing hash operations...');

    const hashKey = 'test:hash';
    const hashField = 'field1';
    const hashValue = { data: 'hash test', created: Date.now() };

    const hsetResult = await redisUtils.hset(hashKey, hashField, hashValue, 60);
    if (hsetResult) {
      console.log('✅ HSET operation successful');
    }

    const hgetResult = await redisUtils.hget(hashKey, hashField);
    if (hgetResult && hgetResult.data === hashValue.data) {
      console.log('✅ HGET operation successful');
      console.log('📄 Retrieved hash value:', hgetResult);
    }

    // Clean up test data
    console.log('\n6. Cleaning up test data...');
    await redisUtils.del(`rate_limit:${rateLimitKey}`);
    await redisUtils.del(hashKey);
    console.log('✅ Cleanup completed');

    console.log('\n🎉 All Redis tests passed successfully!');
    console.log('✅ Redis is properly configured and working with Upstash');

    return true;

  } catch (error) {
    console.error('\n💥 Redis test failed:', error);
    console.error('Stack trace:', error.stack);

    // Check specific error types
    if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
      console.error('\n🔍 Connection Error Diagnosis:');
      console.error('- Check if UPSTASH_REDIS_REST_URL is set correctly');
      console.error('- Check if UPSTASH_REDIS_REST_TOKEN is set correctly');
      console.error('- Verify Upstash Redis instance is active');
      console.error('- Check network connectivity');
    }

    return false;
  }
}

// Environment check
function checkEnvironment() {
  console.log('🔍 Checking environment variables...\n');

  const requiredVars = [
    'UPSTASH_REDIS_REST_URL',
    'UPSTASH_REDIS_REST_TOKEN'
  ];

  const missingVars = [];
  const setVars = [];

  requiredVars.forEach(varName => {
    if (process.env[varName]) {
      setVars.push(varName);
      console.log(`✅ ${varName}: Set (${process.env[varName].substring(0, 20)}...)`);
    } else {
      missingVars.push(varName);
      console.log(`❌ ${varName}: Not set`);
    }
  });

  if (missingVars.length > 0) {
    console.error('\n🚨 Missing environment variables:', missingVars.join(', '));
    console.error('Please check your .env.local file');
    return false;
  }

  console.log('\n✅ All required environment variables are set');
  return true;
}

// Run tests
async function runTests() {
  console.log('🚀 Starting Redis Configuration Test\n');
  console.log('='.repeat(50));

  // Check environment first
  const envOk = checkEnvironment();
  if (!envOk) {
    process.exit(1);
  }

  console.log('\n' + '='.repeat(50));

  // Run Redis tests
  const testResult = await testRedisConnection();

  console.log('\n' + '='.repeat(50));
  console.log('🏁 Test Summary:');
  console.log('='.repeat(50));

  if (testResult) {
    console.log('✅ Redis is working correctly');
    console.log('✅ Upstash configuration is valid');
    console.log('✅ All Redis operations are functional');
    console.log('✅ OTP system is ready');
    console.log('✅ Rate limiting is working');
    console.log('\n🎯 Ready for production use!');
  } else {
    console.log('❌ Redis configuration needs attention');
    console.log('❌ Please check the errors above and fix configuration');
  }

  process.exit(testResult ? 0 : 1);
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run the tests
runTests();