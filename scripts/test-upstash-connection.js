#!/usr/bin/env node
// scripts/test-upstash-connection.js - Test Upstash Redis connection directly

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env.local') });

console.log('🧪 UPSTASH REDIS CONNECTION TEST');
console.log('=================================\n');

async function testUpstashConnection() {
  try {
    // Check environment variables
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    
    console.log('📋 Environment Variables:');
    console.log('UPSTASH_REDIS_REST_URL:', url ? `✅ ${url.substring(0, 30)}...` : '❌ Not set');
    console.log('UPSTASH_REDIS_REST_TOKEN:', token ? `✅ ${token.substring(0, 20)}...` : '❌ Not set');
    console.log('');

    if (!url || !token) {
      console.log('❌ Upstash credentials are missing. Please check your .env.local file.');
      process.exit(1);
    }

    // Try direct import
    const { Redis } = await import('@upstash/redis');
    console.log('📦 Upstash Redis module imported successfully');

    // Create client
    const client = new Redis({
      url: url,
      token: token,
    });
    console.log('🔗 Redis client created');

    // Test different operations
    console.log('\n🧪 Testing Redis operations...\n');

    // 1. Ping test
    try {
      console.log('1️⃣ Testing PING...');
      const pingResult = await client.ping();
      console.log('   ✅ PING successful:', pingResult);
    } catch (error) {
      console.log('   ❌ PING failed:', error.message);
      throw error;
    }

    // 2. SET test
    try {
      console.log('2️⃣ Testing SET...');
      const setResult = await client.set('test:upstash:' + Date.now(), 'Hello Upstash!');
      console.log('   ✅ SET successful:', setResult);
    } catch (error) {
      console.log('   ❌ SET failed:', error.message);
      throw error;
    }

    // 3. GET test
    try {
      console.log('3️⃣ Testing GET...');
      const testKey = 'test:get:' + Date.now();
      await client.set(testKey, 'Test value', { ex: 60 });
      const getValue = await client.get(testKey);
      console.log('   ✅ GET successful:', getValue);
    } catch (error) {
      console.log('   ❌ GET failed:', error.message);
      throw error;
    }

    // 4. Hash operations test
    try {
      console.log('4️⃣ Testing HSET/HGET...');
      const hashKey = 'test:hash:' + Date.now();
      await client.hset(hashKey, 'name', 'Upstash Test');
      const hashValue = await client.hget(hashKey, 'name');
      console.log('   ✅ HASH operations successful:', hashValue);
    } catch (error) {
      console.log('   ❌ HASH operations failed:', error.message);
      throw error;
    }

    // 5. List operations test
    try {
      console.log('5️⃣ Testing LPUSH/LPOP...');
      const listKey = 'test:list:' + Date.now();
      await client.lpush(listKey, 'item1', 'item2');
      const listValue = await client.lpop(listKey);
      console.log('   ✅ LIST operations successful:', listValue);
    } catch (error) {
      console.log('   ❌ LIST operations failed:', error.message);
      throw error;
    }

    console.log('\n🎉 ALL UPSTASH TESTS PASSED!');
    console.log('✅ Your Upstash Redis connection is working perfectly.');
    
  } catch (error) {
    console.error('\n❌ UPSTASH CONNECTION FAILED');
    console.error('Error details:', error.message);
    
    if (error.message.includes('WRONGPASS')) {
      console.error('\n💡 SOLUTION: Invalid credentials detected');
      console.error('   1. Check your Upstash dashboard (https://console.upstash.com/)');
      console.error('   2. Verify your Redis database URL and token');
      console.error('   3. Make sure the token has the correct permissions');
      console.error('   4. Try regenerating the token if needed');
    } else if (error.message.includes('ENOTFOUND')) {
      console.error('\n💡 SOLUTION: Network connection issue');
      console.error('   1. Check your internet connection');
      console.error('   2. Verify the Redis URL is correct');
      console.error('   3. Try accessing the Upstash console in your browser');
    } else if (error.message.includes('timeout')) {
      console.error('\n💡 SOLUTION: Connection timeout');
      console.error('   1. Check your network connection');
      console.error('   2. Try again in a few moments');
      console.error('   3. Verify your firewall settings');
    }
    
    process.exit(1);
  }
}

// Run the test
testUpstashConnection();