#!/usr/bin/env node

console.log('🧪 TESTING REAL DATABASE AND REDIS CONNECTIONS');
console.log('='.repeat(60));

async function testMongoDB() {
  console.log('\n🗄️ Testing MongoDB Connection...');
  
  try {
    // Import the database manager
    const databaseManager = await import('./lib/core/DatabaseManager.js');
    
    // Try to connect
    await databaseManager.default.connectMongoose();
    console.log('✅ MongoDB connection successful');
    
    // Try to import and use a model
    const { default: User } = await import('./models/User.js');
    
    // Test basic query (count documents - doesn't require actual data)
    const userCount = await User.countDocuments({});
    console.log(`✅ MongoDB query successful - found ${userCount} users in database`);
    
    return true;
    
  } catch (error) {
    console.error('❌ MongoDB test failed:', error.message);
    return false;
  }
}

async function testRedis() {
  console.log('\n🔴 Testing Redis Connection...');
  
  try {
    // Import the Redis manager
    const redisManager = await import('./lib/core/RedisManager.js');
    
    // Test basic Redis operation
    const testKey = 'test_connection_' + Date.now();
    const testValue = 'connection_test_value';
    
    // Try to set a value
    await redisManager.default.set(testKey, testValue, 30); // 30 seconds expiry
    console.log('✅ Redis SET operation successful');
    
    // Try to get the value back
    const retrievedValue = await redisManager.default.get(testKey);
    
    if (retrievedValue === testValue) {
      console.log('✅ Redis GET operation successful - value matches');
    } else {
      console.log('⚠️ Redis GET returned different value:', retrievedValue);
    }
    
    // Clean up
    await redisManager.default.del(testKey);
    console.log('✅ Redis DELETE operation successful');
    
    return true;
    
  } catch (error) {
    console.error('❌ Redis test failed:', error.message);
    return false;
  }
}

async function testRateLimiting() {
  console.log('\n🛡️ Testing Rate Limiting Service...');
  
  try {
    const rateLimitingService = await import('./lib/core/RateLimiting.js');
    
    // Test rate limiting check
    const result = await rateLimitingService.default.checkRateLimit(
      'test_user_123',
      'test_operation',
      {
        config: {
          rate: 10,
          burst: 15,
          windowSec: 60
        }
      }
    );
    
    console.log('✅ Rate limiting service operational');
    console.log(`   Allowed: ${result.allowed}, Remaining: ${result.remaining || 'N/A'}`);
    
    return true;
    
  } catch (error) {
    console.error('❌ Rate limiting test failed:', error.message);
    return false;
  }
}

async function testAuthentication() {
  console.log('\n🔐 Testing Authentication Configuration...');
  
  try {
    // Import auth options
    const authModule = await import('./lib/auth.js');
    
    if (authModule.authOptions) {
      console.log('✅ Auth options loaded successfully');
      
      // Check providers
      const providerCount = authModule.authOptions.providers.length;
      console.log(`✅ Found ${providerCount} authentication provider(s)`);
      
      // Check required configurations
      const hasCredentials = authModule.authOptions.providers.some(p => p.name === 'credentials');
      console.log(`✅ Credentials provider: ${hasCredentials ? 'Configured' : 'Not configured'}`);
      
      return true;
    } else {
      console.log('❌ Auth options not found');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Authentication test failed:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting real connectivity tests...\n');
  
  const results = {
    mongodb: await testMongoDB(),
    redis: await testRedis(),
    rateLimiting: await testRateLimiting(),
    authentication: await testAuthentication()
  };
  
  const passed = Object.values(results).filter(r => r === true).length;
  const total = Object.keys(results).length;
  
  console.log('\n' + '='.repeat(60));
  console.log('🏆 REAL CONNECTIVITY TEST RESULTS');
  console.log('='.repeat(60));
  
  console.log(`📊 Overall: ${passed}/${total} tests passed`);
  console.log(`🗄️ MongoDB: ${results.mongodb ? '✅ WORKING' : '❌ FAILED'}`);
  console.log(`🔴 Redis: ${results.redis ? '✅ WORKING' : '❌ FAILED'}`);
  console.log(`🛡️ Rate Limiting: ${results.rateLimiting ? '✅ WORKING' : '❌ FAILED'}`);
  console.log(`🔐 Authentication: ${results.authentication ? '✅ WORKING' : '❌ FAILED'}`);
  
  if (passed === total) {
    console.log('\n🎉 ALL CORE SERVICES ARE WORKING!');
    console.log('✨ Database and Redis connections are functional');
    console.log('🚀 APIs should work properly with real data');
  } else {
    console.log('\n⚠️ Some services have issues that need fixing');
    console.log('🔧 APIs may not work properly until these are resolved');
  }
  
  return passed === total;
}

main().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('❌ Fatal test error:', error);
  process.exit(1);
});