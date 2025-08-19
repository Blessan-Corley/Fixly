// Test Redis and Socket.io connectivity
const { createClient } = require('redis');
const io = require('socket.io-client');
require('dotenv').config({ path: '.env.local' });

let redisClient = null;
let socketClient = null;

// Test Results Storage
const results = {
  redis: {
    connection: false,
    operations: false,
    analytics: false,
    cache: false,
    counters: false,
    sortedSets: false,
    errors: []
  },
  socket: {
    connection: false,
    authentication: false,
    rooms: false,
    messaging: false,
    realtime: false,
    errors: []
  }
};

// Color codes for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Test Redis Connection and Operations
async function testRedis() {
  log('\n=== TESTING REDIS CONNECTIVITY ===', 'bold');
  
  try {
    // 1. Test Redis Connection
    log('📡 Testing Redis connection...', 'blue');
    
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    const redisConfig = {
      url: redisUrl,
      socket: {
        connectTimeout: 10000,
        commandTimeout: 5000
      }
    };

    // Add TLS for Upstash
    if (redisUrl.includes('upstash.io')) {
      redisConfig.socket.tls = true;
      redisConfig.socket.rejectUnauthorized = false;
    }

    redisClient = createClient(redisConfig);
    
    redisClient.on('error', (err) => {
      results.redis.errors.push(`Connection Error: ${err.message}`);
    });

    await redisClient.connect();
    results.redis.connection = true;
    log('✅ Redis connected successfully', 'green');

    // 2. Test Basic Operations
    log('🔧 Testing basic Redis operations...', 'blue');
    
    await redisClient.set('test:basic', 'hello');
    const value = await redisClient.get('test:basic');
    if (value === 'hello') {
      results.redis.operations = true;
      log('✅ Basic operations working', 'green');
    }

    // 3. Test Cache Operations
    log('🗄️ Testing cache operations...', 'blue');
    
    await redisClient.setEx('cache:test', 60, JSON.stringify({ test: 'data' }));
    const cacheValue = await redisClient.get('cache:test');
    if (cacheValue) {
      const parsed = JSON.parse(cacheValue);
      if (parsed.test === 'data') {
        results.redis.cache = true;
        log('✅ Cache operations working', 'green');
      }
    }

    // 4. Test Counter Operations
    log('🔢 Testing counter operations...', 'blue');
    
    await redisClient.incrBy('counter:test', 5);
    const count = await redisClient.get('counter:test');
    if (parseInt(count) >= 5) {
      results.redis.counters = true;
      log('✅ Counter operations working', 'green');
    }

    // 5. Test Sorted Sets (for analytics)
    log('📊 Testing sorted set operations...', 'blue');
    
    await redisClient.zAdd('sortedset:test', { score: Date.now(), value: 'test-data' });
    const setData = await redisClient.zRange('sortedset:test', 0, -1);
    if (setData.length > 0) {
      results.redis.sortedSets = true;
      log('✅ Sorted set operations working', 'green');
    }

    // 6. Test Analytics Functions
    log('📈 Testing analytics functions...', 'blue');
    
    const testKey = `analytics:test:${Date.now()}`;
    await redisClient.incr(testKey);
    await redisClient.expire(testKey, 300);
    const analyticsValue = await redisClient.get(testKey);
    if (parseInt(analyticsValue) >= 1) {
      results.redis.analytics = true;
      log('✅ Analytics functions working', 'green');
    }

    // Clean up test data
    await redisClient.del('test:basic', 'cache:test', 'counter:test');
    await redisClient.del('sortedset:test', testKey);
    
    log('✅ Redis tests completed successfully', 'green');

  } catch (error) {
    results.redis.errors.push(error.message);
    log(`❌ Redis test failed: ${error.message}`, 'red');
  } finally {
    if (redisClient) {
      await redisClient.disconnect();
    }
  }
}

// Test Socket.io Connection and Operations
async function testSocket() {
  log('\n=== TESTING SOCKET.IO CONNECTIVITY ===', 'bold');
  
  return new Promise((resolve) => {
    try {
      // 1. Test Socket Connection
      log('🔌 Testing Socket.io connection...', 'blue');
      
      socketClient = io('http://localhost:3000', {
        transports: ['websocket', 'polling'],
        timeout: 10000,
        auth: {
          token: generateTestToken()
        }
      });

      socketClient.on('connect', () => {
        results.socket.connection = true;
        log('✅ Socket.io connected successfully', 'green');
        runSocketTests();
      });

      socketClient.on('connect_error', (error) => {
        results.socket.errors.push(`Connection Error: ${error.message}`);
        log(`❌ Socket connection failed: ${error.message}`, 'red');
        resolve();
      });

      socketClient.on('disconnect', (reason) => {
        log(`🔌 Socket disconnected: ${reason}`, 'yellow');
        resolve();
      });

      // Socket test functions
      function runSocketTests() {
        let testCount = 0;
        const maxTests = 4;

        function checkComplete() {
          testCount++;
          if (testCount >= maxTests) {
            log('✅ Socket.io tests completed', 'green');
            socketClient.disconnect();
            resolve();
          }
        }

        // 2. Test Authentication
        log('🔐 Testing Socket authentication...', 'blue');
        socketClient.emit('authenticate', { token: generateTestToken() });
        
        socketClient.on('authenticated', () => {
          results.socket.authentication = true;
          log('✅ Socket authentication working', 'green');
          checkComplete();
        });

        socketClient.on('authentication_error', (error) => {
          results.socket.errors.push(`Auth Error: ${error}`);
          log(`❌ Socket authentication failed: ${error}`, 'red');
          checkComplete();
        });

        // 3. Test Room Operations
        log('🏠 Testing room operations...', 'blue');
        const testRoom = `test_room_${Date.now()}`;
        
        socketClient.emit('join_room', { room: testRoom });
        socketClient.on('room_joined', (data) => {
          if (data.room === testRoom) {
            results.socket.rooms = true;
            log('✅ Room operations working', 'green');
            
            // Leave room
            socketClient.emit('leave_room', { room: testRoom });
          }
          checkComplete();
        });

        // 4. Test Real-time Messaging
        log('💬 Testing real-time messaging...', 'blue');
        const testMessage = `test_message_${Date.now()}`;
        
        socketClient.emit('test_message', { message: testMessage });
        socketClient.on('message_received', (data) => {
          if (data.message === testMessage) {
            results.socket.messaging = true;
            results.socket.realtime = true;
            log('✅ Real-time messaging working', 'green');
          }
          checkComplete();
        });

        // 5. Test Notification System
        log('🔔 Testing notification system...', 'blue');
        socketClient.emit('test_notification', { type: 'test', data: 'test notification' });
        
        socketClient.on('notification', (notification) => {
          if (notification.type === 'test') {
            log('✅ Notification system working', 'green');
          }
          checkComplete();
        });

        // Timeout fallback
        setTimeout(() => {
          if (testCount < maxTests) {
            log('⏰ Socket tests timed out', 'yellow');
            socketClient.disconnect();
            resolve();
          }
        }, 15000);
      }

    } catch (error) {
      results.socket.errors.push(error.message);
      log(`❌ Socket test failed: ${error.message}`, 'red');
      resolve();
    }
  });
}

// Generate test JWT token
function generateTestToken() {
  const jwt = require('jsonwebtoken');
  const secret = process.env.NEXTAUTH_SECRET || 'test-secret';
  
  return jwt.sign({
    sub: 'test-user-123',
    name: 'Test User',
    email: 'test@example.com',
    role: 'fixer'
  }, secret, { expiresIn: '1h' });
}

// Print comprehensive test results
function printResults() {
  log('\n=== COMPREHENSIVE TEST RESULTS ===', 'bold');
  
  // Redis Results
  log('\n📊 REDIS RESULTS:', 'blue');
  log(`Connection: ${results.redis.connection ? '✅ PASS' : '❌ FAIL'}`, results.redis.connection ? 'green' : 'red');
  log(`Basic Operations: ${results.redis.operations ? '✅ PASS' : '❌ FAIL'}`, results.redis.operations ? 'green' : 'red');
  log(`Cache Operations: ${results.redis.cache ? '✅ PASS' : '❌ FAIL'}`, results.redis.cache ? 'green' : 'red');
  log(`Counter Operations: ${results.redis.counters ? '✅ PASS' : '❌ FAIL'}`, results.redis.counters ? 'green' : 'red');
  log(`Sorted Sets: ${results.redis.sortedSets ? '✅ PASS' : '❌ FAIL'}`, results.redis.sortedSets ? 'green' : 'red');
  log(`Analytics: ${results.redis.analytics ? '✅ PASS' : '❌ FAIL'}`, results.redis.analytics ? 'green' : 'red');
  
  if (results.redis.errors.length > 0) {
    log('\nRedis Errors:', 'red');
    results.redis.errors.forEach(error => log(`  - ${error}`, 'red'));
  }

  // Socket Results
  log('\n🔌 SOCKET.IO RESULTS:', 'blue');
  log(`Connection: ${results.socket.connection ? '✅ PASS' : '❌ FAIL'}`, results.socket.connection ? 'green' : 'red');
  log(`Authentication: ${results.socket.authentication ? '✅ PASS' : '❌ FAIL'}`, results.socket.authentication ? 'green' : 'red');
  log(`Room Operations: ${results.socket.rooms ? '✅ PASS' : '❌ FAIL'}`, results.socket.rooms ? 'green' : 'red');
  log(`Messaging: ${results.socket.messaging ? '✅ PASS' : '❌ FAIL'}`, results.socket.messaging ? 'green' : 'red');
  log(`Real-time Features: ${results.socket.realtime ? '✅ PASS' : '❌ FAIL'}`, results.socket.realtime ? 'green' : 'red');
  
  if (results.socket.errors.length > 0) {
    log('\nSocket.io Errors:', 'red');
    results.socket.errors.forEach(error => log(`  - ${error}`, 'red'));
  }

  // Overall Status
  const redisPass = results.redis.connection && results.redis.operations && results.redis.cache;
  const socketPass = results.socket.connection;
  
  log('\n=== OVERALL STATUS ===', 'bold');
  log(`Redis Status: ${redisPass ? '🟢 HEALTHY' : '🔴 ISSUES DETECTED'}`, redisPass ? 'green' : 'red');
  log(`Socket.io Status: ${socketPass ? '🟢 HEALTHY' : '🔴 ISSUES DETECTED'}`, socketPass ? 'green' : 'red');
  
  if (redisPass && socketPass) {
    log('\n🎉 ALL SYSTEMS OPERATIONAL - Ready for production!', 'green');
  } else {
    log('\n⚠️ Issues detected - Check configurations and connections', 'yellow');
  }

  // Resource Usage Recommendations
  log('\n=== RESOURCE OPTIMIZATION RECOMMENDATIONS ===', 'bold');
  log('💡 To optimize resource usage:', 'blue');
  log('  - Implement connection pooling for Redis');
  log('  - Use Redis connection timeout for inactive users');
  log('  - Implement Socket.io room cleanup for empty rooms');
  log('  - Set up TTL for temporary data in Redis');
  log('  - Monitor connection counts and implement limits');
}

// Main test runner
async function runTests() {
  log('🚀 Starting comprehensive Redis and Socket.io tests...', 'bold');
  log('⚠️  Make sure your Fixly server is running on localhost:3000', 'yellow');
  
  await testRedis();
  await testSocket();
  
  printResults();
  process.exit(0);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  log('\n🛑 Tests interrupted by user', 'yellow');
  if (redisClient) redisClient.disconnect();
  if (socketClient) socketClient.disconnect();
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  log(`🚨 Uncaught Exception: ${error.message}`, 'red');
  process.exit(1);
});

// Run the tests
runTests().catch(error => {
  log(`🚨 Test runner failed: ${error.message}`, 'red');
  process.exit(1);
});