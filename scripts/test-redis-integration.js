#!/usr/bin/env node
// scripts/test-redis-integration.js - Comprehensive Redis Integration Test

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env.local') });

console.log('🧪 COMPREHENSIVE REDIS INTEGRATION TEST');
console.log('=======================================\n');

// Check environment variables first
console.log('📋 Environment Check:');
console.log('UPSTASH_REDIS_REST_URL:', process.env.UPSTASH_REDIS_REST_URL ? '✅ Set' : '❌ Missing');
console.log('UPSTASH_REDIS_REST_TOKEN:', process.env.UPSTASH_REDIS_REST_TOKEN ? '✅ Set' : '❌ Missing');
console.log('REDIS_URL (fallback):', process.env.REDIS_URL ? '✅ Set' : '❌ Missing');
console.log('');

async function runTests() {
  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

  const test = async (name, fn) => {
    totalTests++;
    try {
      console.log(`🧪 Testing: ${name}`);
      await fn();
      console.log(`✅ PASS: ${name}\n`);
      passedTests++;
    } catch (error) {
      console.error(`❌ FAIL: ${name}`);
      console.error(`   Error: ${error.message}\n`);
      failedTests++;
    }
  };

  try {
    // Import modules after env is loaded
    const redisModule = await import('../lib/redis.js');
    const redis = redisModule.default;

    const cacheModule = await import('../lib/cache/RedisCache.js');
    const redisCache = cacheModule.default;

    const queueModule = await import('../lib/queue/RedisQueue.js');
    const { emailQueue, notificationQueue } = queueModule;

    const integrationModule = await import('../lib/redis-integration.js');
    const redisIntegration = integrationModule.default;

    // Test 1: Basic Redis Connection
    await test('Redis Connection & Ping', async () => {
      const pong = await redis.ping();
      const connectionInfo = redis.getConnectionInfo();
      
      console.log(`   Connection Type: ${connectionInfo.connectionType}`);
      console.log(`   Client: ${connectionInfo.client}`);
      console.log(`   Ping Response: ${pong}`);
      
      if (!connectionInfo.isConnected) {
        throw new Error('Redis is not connected');
      }
      
      if (connectionInfo.connectionType === 'memory') {
        console.log(`   ⚠️  WARNING: Using in-memory fallback. Check your Upstash credentials.`);
      }
    });

    // Test 2: Basic Redis Operations
    await test('Basic Redis Operations (GET/SET/DEL)', async () => {
      const testKey = 'test:basic:' + Date.now();
      const testData = { message: 'Hello Redis!', timestamp: Date.now() };
      
      // Set data
      const setResult = await redis.set(testKey, testData, { ex: 60 });
      console.log(`   SET result: ${setResult}`);
      
      // Get data
      const getData = await redis.get(testKey);
      console.log(`   GET result: ${JSON.stringify(getData)}`);
      
      if (!getData || getData.message !== testData.message) {
        throw new Error('Data mismatch in GET operation');
      }
      
      // Check existence
      const exists = await redis.exists(testKey);
      console.log(`   EXISTS result: ${exists}`);
      
      // Delete data
      const delResult = await redis.del(testKey);
      console.log(`   DEL result: ${delResult}`);
      
      // Verify deletion
      const deletedData = await redis.get(testKey);
      if (deletedData !== null) {
        throw new Error('Data was not properly deleted');
      }
    });

    // Test 3: Hash Operations
    await test('Hash Operations (HSET/HGET/HGETALL)', async () => {
      const hashKey = 'test:hash:' + Date.now();
      const userData = {
        name: 'John Doe',
        email: 'john@example.com',
        role: 'fixer'
      };
      
      // Set hash fields
      for (const [field, value] of Object.entries(userData)) {
        await redis.hset(hashKey, field, value);
      }
      console.log(`   HSET completed for ${Object.keys(userData).length} fields`);
      
      // Get single field
      const name = await redis.hget(hashKey, 'name');
      console.log(`   HGET name: ${name}`);
      
      // Get all fields
      const allData = await redis.hgetall(hashKey);
      console.log(`   HGETALL result: ${JSON.stringify(allData)}`);
      
      if (allData.email !== userData.email) {
        throw new Error('Hash data mismatch');
      }
      
      // Cleanup
      await redis.del(hashKey);
    });

    // Test 4: List Operations
    await test('List Operations (LPUSH/RPUSH/LPOP)', async () => {
      const listKey = 'test:list:' + Date.now();
      const messages = ['msg1', 'msg2', 'msg3'];
      
      // Push to left
      await redis.lpush(listKey, ...messages);
      console.log(`   LPUSH completed for ${messages.length} items`);
      
      // Get list length
      const length = await redis.llen(listKey);
      console.log(`   LLEN result: ${length}`);
      
      if (length !== messages.length) {
        throw new Error(`List length mismatch. Expected: ${messages.length}, Got: ${length}`);
      }
      
      // Pop from left
      const poppedMsg = await redis.lpop(listKey);
      console.log(`   LPOP result: ${poppedMsg}`);
      
      if (poppedMsg !== 'msg3') { // Last pushed should be first popped
        throw new Error('LPOP returned incorrect item');
      }
      
      // Cleanup
      await redis.del(listKey);
    });

    // Test 5: Set Operations
    await test('Set Operations (SADD/SMEMBERS/SISMEMBER)', async () => {
      const setKey = 'test:set:' + Date.now();
      const users = ['user1', 'user2', 'user3'];
      
      // Add to set
      await redis.sadd(setKey, ...users);
      console.log(`   SADD completed for ${users.length} members`);
      
      // Get all members
      const members = await redis.smembers(setKey);
      console.log(`   SMEMBERS result: ${JSON.stringify(members)}`);
      
      // Check membership
      const isMember = await redis.sismember(setKey, 'user2');
      console.log(`   SISMEMBER user2: ${isMember}`);
      
      if (!isMember) {
        throw new Error('Set membership check failed');
      }
      
      // Cleanup
      await redis.del(setKey);
    });

    // Test 6: Sorted Set Operations (for queues)
    await test('Sorted Set Operations (ZADD/ZRANGE/ZPOPMIN)', async () => {
      const zsetKey = 'test:zset:' + Date.now();
      const jobs = [
        { score: 1, value: 'job1' },
        { score: 3, value: 'job3' },
        { score: 2, value: 'job2' }
      ];
      
      // Add to sorted set
      for (const job of jobs) { await redis.zadd(zsetKey, job.score, job.value);
       }
      console.log(`   ZADD completed for ${jobs.length} jobs`);
      
      // Get range (should be sorted by score)
      const range = await redis.zrange(zsetKey, 0, -1);
      console.log(`   ZRANGE result: ${JSON.stringify(range)}`);
      
      if (range[0] !== 'job1') {
        throw new Error('Sorted set ordering is incorrect');
      }
      
      // Pop minimum
      const popped = await redis.zpopmin(zsetKey);
      console.log(`   ZPOPMIN result: ${JSON.stringify(popped)}`);
      
      if (popped[0] !== 'job1') {
        throw new Error('ZPOPMIN returned incorrect item');
      }
      
      // Cleanup
      await redis.del(zsetKey);
    });

    // Test 7: Cache System
    await test('Redis Cache System', async () => {
      const jobData = {
        id: 'job123',
        title: 'Fix my kitchen sink',
        budget: 150,
        location: 'New York, NY',
        skills: ['plumbing', 'repair']
      };
      
      // Cache job data
      const cacheResult = await redisCache.cacheJobDetails('job123', jobData, 300);
      console.log(`   Cache SET result: ${cacheResult}`);
      
      // Retrieve cached data
      const cachedData = await redisCache.getCachedJobDetails('job123');
      console.log(`   Cache GET result: ${cachedData ? 'Found' : 'Not found'}`);
      
      if (!cachedData || cachedData.title !== jobData.title) {
        throw new Error('Cached data mismatch');
      }
      
      if (cachedData._cache) {
        console.log(`   Cache metadata: hit=${cachedData._cache.hit}, age=${cachedData._cache.age}ms`);
      }
      
      // Test cache invalidation
      const invalidated = await redisCache.invalidateJobCache('job123');
      console.log(`   Cache invalidation result: ${invalidated}`);
    });

    // Test 8: Queue System
    await test('Redis Queue System', async () => {
      let jobProcessed = false;
      let processedData = null;
      
      // Register a test processor
      emailQueue.process('test_email', async (data) => {
        console.log(`   Processing test email: ${data.email}`);
        processedData = data;
        jobProcessed = true;
        return { sent: true, email: data.email };
      });
      
      // Add job to queue
      const jobId = await emailQueue.add('test_email', {
        email: 'test@example.com',
        subject: 'Redis Test Email'
      });
      console.log(`   Job added with ID: ${jobId}`);
      
      // Wait for processing
      await new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          if (jobProcessed) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);
        
        // Timeout after 5 seconds
        setTimeout(() => {
          clearInterval(checkInterval);
          resolve();
        }, 5000);
      });
      
      if (!jobProcessed) { throw new Error('job was not processed within timeout');
       }
      
      console.log(`   Job processed successfully: ${processedData.email}`);
      
      // Get queue stats
      const stats = await emailQueue.getStats();
      console.log(`   Queue stats: ${JSON.stringify(stats.counts || {})}`);
    });

    // Test 9: Integration System
    await test('Complete Integration System', async () => {
      // Test health check
      const health = await redisIntegration.healthCheck();
      console.log(`   Health status: ${health.status}`);
      console.log(`   Redis connection type: ${health.redis?.connection?.connectionType}`);
      
      if (health.status !== 'healthy') {
        throw new Error('Integration system is not healthy');
      }
      
      // Test integrated caching
      await redisIntegration.cacheApiResponse('integration:test', {
        message: 'Integration test successful',
        timestamp: Date.now()
      }, 60);
      
      const cached = await redisIntegration.getCachedApiResponse('integration:test');
      if (!cached || cached.message !== 'Integration test successful') {
        throw new Error('Integration caching failed');
      }
      
      console.log(`   Integration caching: Working`);
      console.log(`   Cache hit rate: ${health.cache?.hitRate?.toFixed(2)}%`);
    });

    // Test 10: Location-Based Operations (Preparation for location system)
    await test('Location Data Caching', async () => {
      const locationData = {
        coordinates: [-74.006, 40.7128], // NYC coordinates
        address: '123 Main St, New York, NY 10001',
        city: 'New York',
        state: 'NY',
        country: 'US',
        nearby_jobs: []
      };
      
      // Cache location-based data
      const locationKey = `location:${locationData.coordinates.join(',')}`;
      await redis.set(locationKey, locationData, { ex: 1800 }); // 30 minutes
      
      // Retrieve location data
      const cachedLocation = await redis.get(locationKey);
      console.log(`   Location cache: ${cachedLocation ? 'Working' : 'Failed'}`);
      
      if (!cachedLocation || cachedLocation.city !== locationData.city) {
        throw new Error('Location data caching failed');
      }
      
      console.log(`   Cached location: ${cachedLocation.city}, ${cachedLocation.state}`);
      
      // Cleanup
      await redis.del(locationKey);
    });

  } catch (importError) {
    console.error('❌ Failed to import modules:', importError.message);
    failedTests++;
    totalTests++;
  }

  // Final Results
  console.log('\n📊 TEST RESULTS');
  console.log('================');
  console.log(`Total Tests: ${totalTests}`);
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${failedTests}`);
  console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  console.log('');

  if (failedTests === 0) {
    console.log('🎉 ALL TESTS PASSED! Redis integration is working perfectly.');
    
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      console.log('✅ Using production Upstash Redis.');
    } else {
      console.log('⚠️  Using in-memory fallback. Add Upstash credentials for production Redis.');
    }
  } else {
    console.log('⚠️  Some tests failed. Check your Redis configuration.');
    process.exit(1);
  }
}

// Performance test
async function performanceTest() {
  console.log('\n🚀 PERFORMANCE TEST');
  console.log('===================\n');

  try {
    const redisModule = await import('../lib/redis.js');
    const redis = redisModule.default;

    const iterations = 100;
    const testData = { message: 'Performance test data', value: Math.random() };

    // Test SET performance
    console.log(`🧪 Testing SET performance (${iterations} operations)...`);
    const setStart = Date.now();
    
    for (let i = 0; i < iterations; i++) {
      await redis.set(`perf:test:${i}`, { ...testData, index: i }, { ex: 60 });
    }
    
    const setDuration = Date.now() - setStart;
    const setOpsPerSecond = Math.round((iterations / setDuration) * 1000);
    console.log(`   SET: ${setDuration}ms total, ${setOpsPerSecond} ops/sec`);

    // Test GET performance
    console.log(`🧪 Testing GET performance (${iterations} operations)...`);
    const getStart = Date.now();
    
    for (let i = 0; i < iterations; i++) {
      await redis.get(`perf:test:${i}`);
    }
    
    const getDuration = Date.now() - getStart;
    const getOpsPerSecond = Math.round((iterations / getDuration) * 1000);
    console.log(`   GET: ${getDuration}ms total, ${getOpsPerSecond} ops/sec`);

    // Cleanup
    console.log('🧹 Cleaning up performance test data...');
    for (let i = 0; i < iterations; i++) {
      await redis.del(`perf:test:${i}`);
    }

    console.log('✅ Performance test completed successfully!');
    
  } catch (error) {
    console.error('❌ Performance test failed:', error.message);
  }
}

// Run all tests
runTests()
  .then(() => performanceTest())
  .then(() => {
    console.log('\n🏁 All tests completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Test suite failed:', error);
    process.exit(1);
  });