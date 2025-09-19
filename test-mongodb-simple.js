// Simple MongoDB connection test
const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function testMongoDB() {
  const uri = process.env.MONGODB_URI;

  console.log('🔍 Testing MongoDB Connection...');
  console.log('URI configured:', !!uri);

  if (!uri) {
    console.error('❌ MONGODB_URI not found in environment variables');
    return;
  }

  const client = new MongoClient(uri, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
  });

  try {
    console.log('🔄 Connecting to MongoDB...');
    await client.connect();
    console.log('✅ Connected to MongoDB successfully!');

    // Test database operations
    const db = client.db();
    console.log('📊 Database name:', db.databaseName);

    // List collections
    const collections = await db.listCollections().toArray();
    console.log('📁 Collections found:', collections.map(c => c.name));

    // Test user collection specifically
    const usersCollection = db.collection('users');
    const userCount = await usersCollection.countDocuments();
    console.log('👥 Total users in database:', userCount);

    if (userCount > 0) {
      const sampleUser = await usersCollection.findOne({}, {
        projection: { email: 1, role: 1, authMethod: 1, createdAt: 1 }
      });
      console.log('👤 Sample user:', sampleUser);
    }

  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    console.error('Details:', error);
  } finally {
    await client.close();
    console.log('🔌 Connection closed');
  }
}

testMongoDB();