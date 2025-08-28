#!/usr/bin/env node

// Setup MongoDB Geospatial Indexes for Real Production Use
require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');

async function setupGeospatialIndexes() {
  const uri = process.env.MONGODB_URI;
  
  if (!uri) {
    throw new Error('MONGODB_URI environment variable not found. Please check your .env file.');
  }
  
  console.log('🔗 Using MongoDB URI:', uri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@'));
  const client = new MongoClient(uri);

  try {
    console.log('🔗 Connecting to MongoDB...');
    await client.connect();
    
    const db = client.db('fixly');
    
    console.log('📍 Setting up geospatial indexes...');
    
    // 1. Create 2dsphere index for jobs collection
    const jobs = db.collection('jobs');
    
    // Create the geospatial index
    await jobs.createIndex({ location: "2dsphere" });
    console.log('✅ Created 2dsphere index on jobs.location');
    
    // Also create compound indexes for better performance
    await jobs.createIndex({ 
      location: "2dsphere", 
      isActive: 1, 
      isDeleted: 1,
      createdAt: -1
    });
    console.log('✅ Created compound geospatial index on jobs');
    
    // 2. Create index for users location if needed
    const users = db.collection('users');
    await users.createIndex({ "locationData.coordinates": "2dsphere" });
    console.log('✅ Created 2dsphere index on users.locationData.coordinates');
    
    // 3. Verify the indexes were created
    console.log('\n📋 Verifying indexes...');
    const jobIndexes = await jobs.listIndexes().toArray();
    const userIndexes = await users.listIndexes().toArray();
    
    console.log('Jobs collection indexes:');
    jobIndexes.forEach(index => {
      console.log(`  - ${index.name}: ${JSON.stringify(index.key)}`);
    });
    
    console.log('Users collection indexes:');
    userIndexes.forEach(index => {
      console.log(`  - ${index.name}: ${JSON.stringify(index.key)}`);
    });
    
    // 4. Test the geospatial functionality
    console.log('\n🧪 Testing geospatial queries...');
    
    // Insert a test job if none exist
    const jobCount = await jobs.countDocuments();
    if (jobCount === 0) {
      console.log('📝 Creating test job with location...');
      await jobs.insertOne({
        title: 'Test Job - San Francisco',
        description: 'Test job for geospatial indexing',
        location: {
          type: 'Point',
          coordinates: [-122.4194, 37.7749] // [longitude, latitude]
        },
        address: {
          city: 'San Francisco',
          state: 'CA',
          country: 'USA'
        },
        isActive: true,
        isDeleted: false,
        createdAt: new Date(),
        postedBy: 'system',
        salary: { min: 50000, max: 80000 },
        skills: ['JavaScript', 'Node.js']
      });
      console.log('✅ Test job created');
    }
    
    // Test $geoNear query
    const nearbyJobs = await jobs.aggregate([
      {
        $geoNear: {
          near: {
            type: 'Point',
            coordinates: [-122.4194, 37.7749] // San Francisco
          },
          distanceField: 'distance',
          maxDistance: 10000, // 10km
          query: { 
            isActive: true,
            isDeleted: { $ne: true }
          },
          spherical: true
        }
      },
      { $limit: 5 }
    ]).toArray();
    
    console.log(`✅ Geospatial query successful! Found ${nearbyJobs.length} jobs within 10km`);
    
    if (nearbyJobs.length > 0) {
      console.log('Sample result:', {
        title: nearbyJobs[0].title,
        distance: Math.round(nearbyJobs[0].distance) + ' meters',
        location: nearbyJobs[0].location
      });
    }
    
    console.log('\n🎉 MongoDB geospatial setup completed successfully!');
    console.log('🚀 The /api/jobs/nearby endpoint will now use real geospatial queries');
    
  } catch (error) {
    console.error('❌ Error setting up geospatial indexes:', error);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\n💡 Troubleshooting:');
      console.log('1. Make sure MongoDB is running');
      console.log('2. Check your MONGODB_URI environment variable');
      console.log('3. For MongoDB Atlas, ensure network access is configured');
    }
    
    throw error;
  } finally {
    await client.close();
  }
}

// Run the setup
if (require.main === module) {
  setupGeospatialIndexes()
    .then(() => {
      console.log('\n✅ Setup completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Setup failed:', error.message);
      process.exit(1);
    });
}

module.exports = { setupGeospatialIndexes };