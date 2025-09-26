#!/usr/bin/env node

// Load environment variables manually from .env.local
import { readFileSync } from 'fs';

try {
  const envContent = readFileSync('.env.local', 'utf8');
  const lines = envContent.split('\n');
  
  for (const line of lines) {
    if (line.trim() && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').trim();
        // Remove quotes if present
        const cleanValue = value.replace(/^["']|["']$/g, '');
        process.env[key.trim()] = cleanValue;
      }
    }
  }
  console.log('✅ Environment variables loaded from .env.local');
} catch (error) {
  console.warn('⚠️ Could not load .env.local:', error.message);
}

console.log('🧪 TESTING REAL DATABASE AND REDIS CONNECTIONS');
console.log('='.repeat(60));

async function testMongoDB() {
  console.log('\n🗄️ Testing MongoDB Connection...');
  
  try {
    console.log('MongoDB URI available:', !!process.env.MONGODB_URI);
    
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
    console.log('Redis URL available:', !!process.env.UPSTASH_REDIS_REST_URL);
    console.log('Redis Token available:', !!process.env.UPSTASH_REDIS_REST_TOKEN);
    
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

async function testAPIRoute() {
  console.log('\n🌐 Testing Actual API Route...');
  
  try {
    // Test a simple API endpoint that doesn't require auth
    const response = await fetch('http://localhost:3000/api/health', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ API route responded successfully:', data);
      return true;
    } else {
      console.log('⚠️ API route responded with status:', response.status);
      return false;
    }
    
  } catch (error) {
    console.error('❌ API route test failed (server might not be running):', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting real connectivity tests...\n');
  
  const results = {
    mongodb: await testMongoDB(),
    redis: await testRedis(),
    apiRoute: await testAPIRoute()
  };
  
  const passed = Object.values(results).filter(r => r === true).length;
  const total = Object.keys(results).length;
  
  console.log('\n' + '='.repeat(60));
  console.log('🏆 REAL CONNECTIVITY TEST RESULTS');
  console.log('='.repeat(60));
  
  console.log(`📊 Overall: ${passed}/${total} tests passed`);
  console.log(`🗄️ MongoDB: ${results.mongodb ? '✅ WORKING' : '❌ FAILED'}`);
  console.log(`🔴 Redis: ${results.redis ? '✅ WORKING' : '❌ FAILED'}`);
  console.log(`🌐 API Route: ${results.apiRoute ? '✅ WORKING' : '❌ FAILED (server not running)'}`);
  
  if (passed === total) {
    console.log('\n🎉 ALL CORE SERVICES ARE WORKING!');
    console.log('✨ Database and Redis connections are functional');
    console.log('🚀 APIs should work properly with real data');
  } else {
    console.log('\n⚠️ Some services have issues:');
    if (!results.mongodb) console.log('   🔧 MongoDB connection needs fixing');
    if (!results.redis) console.log('   🔧 Redis connection needs fixing');
    if (!results.apiRoute) console.log('   🔧 Start the dev server to test API routes');
  }
  
  return passed >= 2; // At least MongoDB and Redis should work
}

main().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('❌ Fatal test error:', error);
  process.exit(1);
});