#!/usr/bin/env node

// Check current indexes
require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;

async function checkIndexes() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db('fixly');
    const jobs = db.collection('jobs');
    
    console.log('📋 All indexes on jobs collection:');
    const indexes = await jobs.listIndexes().toArray();
    
    const geoIndexes = [];
    
    indexes.forEach(index => {
      const isGeo = Object.values(index.key).includes('2dsphere');
      if (isGeo) geoIndexes.push(index);
      
      console.log(`${isGeo ? '📍' : '•'} ${index.name}: ${JSON.stringify(index.key)}`);
    });
    
    console.log(`\n📍 Found ${geoIndexes.length} geospatial indexes:`);
    geoIndexes.forEach(index => {
      console.log(`• ${index.name}: ${JSON.stringify(index.key)}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

checkIndexes();