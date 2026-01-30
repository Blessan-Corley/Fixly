const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });
const mongoose = require('mongoose');
const { Redis } = require('@upstash/redis');
const Ably = require('ably');

async function verifyEnv() {
  console.log('🔍 Verifying Environment Configuration...\n');

  // 1. Check Keys Present
  const keys = {
    MONGODB_URI: process.env.MONGODB_URI,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    ABLY_ROOT_KEY: process.env.ABLY_ROOT_KEY
  };

  let missing = false;
  for (const [key, val] of Object.entries(keys)) {
    if (!val) {
      console.error(`❌ Missing ${key}`);
      missing = true;
    } else {
      console.log(`✅ ${key} is set (Length: ${val.length})`);
    }
  }

  if (missing) {
    console.error('\n❌ Please check .env.local file.');
    // Don't exit, try what we can
  }

  // 2. Verify MongoDB
  if (keys.MONGODB_URI) {
    console.log('\nmongo: Connecting...');
    try {
      await mongoose.connect(keys.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
      console.log('✅ MongoDB Connected Successfully!');
      await mongoose.connection.close();
    } catch (error) {
      console.error('❌ MongoDB Connection Failed:', error.message);
    }
  }

  // 3. Verify Redis (Upstash)
  if (keys.UPSTASH_REDIS_REST_URL && keys.UPSTASH_REDIS_REST_TOKEN) {
    console.log('\nredis: Pinging...');
    try {
      const redis = new Redis({
        url: keys.UPSTASH_REDIS_REST_URL,
        token: keys.UPSTASH_REDIS_REST_TOKEN,
      });
      const pong = await redis.ping();
      if (pong === 'PONG') {
        console.log('✅ Redis (Upstash) Connected & Pinged!');
      } else {
        console.error('❌ Redis Ping Unexpected Response:', pong);
      }
    } catch (error) {
      console.error('❌ Redis Connection Failed:', error.message);
    }
  }

  // 4. Verify Ably
  if (keys.ABLY_ROOT_KEY) {
    console.log('\nably: Authenticating...');
    try {
      // Use REST for verification as it's simpler in script
      const ably = new Ably.Rest(keys.ABLY_ROOT_KEY);
      const time = await ably.time();
      console.log(`✅ Ably Authenticated! Server Time: ${new Date(time).toISOString()}`);
    } catch (error) {
      console.error('❌ Ably Connection Failed:', error.message);
    }
  }

  console.log('\n🏁 Verification Complete');
}

verifyEnv().catch(console.error);
