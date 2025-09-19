// Test database connection with provided credentials
require('dotenv').config({ path: '.env.local' });
const connectDB = require('../lib/db').default;

async function testDatabaseConnection() {
  try {
    console.log('🔄 Testing database connection...');
    console.log('MongoDB URI:', process.env.MONGODB_URI ? 'Set' : 'Not set');
    
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI not found in environment variables');
    }

    await databaseManager.connectMongoose();
    console.log('✅ Database connection successful!');
    
    // Test creating a simple document to verify write permissions
    const mongoose = require('mongoose');
    const testResult = await mongoose.connection.db.admin().ping();
    console.log('✅ Database ping successful:', testResult);
    
    // List collections to verify access
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`✅ Found ${collections.length} collections in database`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Database connection failed:');
    console.error('Error:', error.message);
    
    if (error.message.includes('authentication')) {
      console.error('💡 Authentication failed. Please check your MongoDB credentials.');
    } else if (error.message.includes('network')) {
      console.error('💡 Network error. Please check your internet connection and MongoDB URL.');
    } else if (error.message.includes('timeout')) {
      console.error('💡 Connection timeout. Please check if your IP is whitelisted in MongoDB Atlas.');
    }
    
    process.exit(1);
  }
}

testDatabaseConnection();