#!/usr/bin/env node

// Clean up duplicate geospatial indexes and create proper ones
require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;

async function cleanupIndexes() {
  if (!uri) {
    throw new Error('MONGODB_URI environment variable not found. Please check your .env.local file.');
  }
  
  console.log('🔗 Using MongoDB URI:', uri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@'));
  const client = new MongoClient(uri);

  try {
    console.log('🔗 Connecting to MongoDB...');
    await client.connect();
    
    const db = client.db('fixly');
    const jobs = db.collection('jobs');
    
    console.log('📋 Listing current indexes...');
    const indexes = await jobs.listIndexes().toArray();
    
    // Find 2dsphere indexes
    const geoIndexes = indexes.filter(index => 
      Object.values(index.key).includes('2dsphere')
    );
    
    console.log(`Found ${geoIndexes.length} geospatial indexes:`);
    geoIndexes.forEach(index => {
      console.log(`• ${index.name}: ${JSON.stringify(index.key)}`);
    });
    
    // Drop all 2dsphere indexes except the _id_ index
    for (const index of geoIndexes) {
      if (index.name !== '_id_') {
        try {
          await jobs.dropIndex(index.name);
          console.log(`✅ Dropped index: ${index.name}`);
        } catch (error) {
          console.warn(`⚠️ Could not drop index ${index.name}:`, error.message);
        }
      }
    }
    
    // Now create a single, optimized geospatial index
    console.log('\n📍 Creating optimized geospatial index...');
    
    // Create the primary geospatial index
    await jobs.createIndex(
      { location: "2dsphere" },
      { 
        name: "location_2dsphere_primary",
        background: true 
      }
    );
    console.log('✅ Created primary 2dsphere index: location_2dsphere_primary');
    
    // Create compound index for common queries
    await jobs.createIndex(
      { 
        location: "2dsphere",
        isActive: 1,
        isDeleted: 1
      },
      { 
        name: "location_geo_active_compound",
        background: true
      }
    );
    console.log('✅ Created compound index: location_geo_active_compound');
    
    // Verify the new indexes
    console.log('\n📋 Final index verification...');
    const finalIndexes = await jobs.listIndexes().toArray();
    const finalGeoIndexes = finalIndexes.filter(index => 
      Object.values(index.key).includes('2dsphere')
    );
    
    console.log(`✅ Final geospatial indexes (${finalGeoIndexes.length}):`);
    finalGeoIndexes.forEach(index => {
      console.log(`• ${index.name}: ${JSON.stringify(index.key)}`);
    });
    
    console.log('\n🎉 Index cleanup completed successfully!');
    
  } catch (error) {
    console.error('❌ Error cleaning up indexes:', error);
    throw error;
  } finally {
    await client.close();
  }
}

// Run the cleanup
if (require.main === module) {
  cleanupIndexes()
    .then(() => {
      console.log('\n✅ Index cleanup completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Index cleanup failed:', error.message);
      process.exit(1);
    });
}

module.exports = { cleanupIndexes };