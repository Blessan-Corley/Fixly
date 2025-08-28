#!/usr/bin/env node

// Comprehensive database index analysis and optimization
require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;

async function analyzeDatabaseIndexes() {
  console.log('🔍 MongoDB Atlas Index Analysis & Optimization');
  console.log('===============================================\n');
  
  if (!uri) {
    throw new Error('MONGODB_URI environment variable not found.');
  }
  
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB Atlas');
    
    const db = client.db('fixly');
    
    // Analyze all collections
    const collections = await db.listCollections().toArray();
    console.log(`📊 Found ${collections.length} collections\n`);
    
    for (const collectionInfo of collections) {
      const collectionName = collectionInfo.name;
      const collection = db.collection(collectionName);
      
      console.log(`📁 Collection: ${collectionName}`);
      console.log('─'.repeat(40));
      
      try {
        // Get document count
        const docCount = await collection.countDocuments();
        console.log(`Documents: ${docCount.toLocaleString()}`);
        
        // Get indexes
        const indexes = await collection.listIndexes().toArray();
        console.log(`Indexes: ${indexes.length}`);
        
        // Analyze each index
        for (const index of indexes) {
          const indexName = index.name;
          const indexKeys = Object.keys(index.key);
          const indexTypes = Object.values(index.key);
          
          // Check for geospatial indexes
          const isGeoIndex = indexTypes.includes('2dsphere') || indexTypes.includes('2d');
          const isCompound = indexKeys.length > 1;
          
          console.log(`  • ${indexName}:`);
          console.log(`    Keys: ${indexKeys.join(', ')}`);
          console.log(`    Types: ${indexTypes.join(', ')}`);
          
          if (isGeoIndex) {
            console.log(`    🌍 Geospatial Index ${isCompound ? '(Compound)' : '(Simple)'}`);
          }
          
          if (index.sparse) console.log(`    🔍 Sparse: ${index.sparse}`);
          if (index.unique) console.log(`    🔑 Unique: ${index.unique}`);
          if (index.background) console.log(`    ⚡ Background: ${index.background}`);
          if (index.partialFilterExpression) {
            console.log(`    🎯 Partial Filter: ${JSON.stringify(index.partialFilterExpression)}`);
          }
        }
        
        // Check for missing recommended indexes
        if (collectionName === 'jobs') {
          console.log('\n🎯 Jobs Collection Index Recommendations:');
          
          // Check for critical geospatial indexes
          const geoIndexes = indexes.filter(idx => 
            Object.values(idx.key).includes('2dsphere')
          );
          
          if (geoIndexes.length === 0) {
            console.log('  ❌ CRITICAL: No geospatial indexes found!');
            console.log('  📝 Add: db.jobs.createIndex({ location: "2dsphere" })');
          } else {
            console.log(`  ✅ Geospatial indexes: ${geoIndexes.length} found`);
            geoIndexes.forEach(idx => {
              console.log(`    • ${idx.name}: ${JSON.stringify(idx.key)}`);
            });
          }
          
          // Check for performance indexes
          const recommendedIndexes = [
            { keys: { isActive: 1, isDeleted: 1, createdAt: -1 }, name: 'Active jobs with date' },
            { keys: { postedBy: 1, createdAt: -1 }, name: 'User jobs listing' },
            { keys: { skills: 1, isActive: 1 }, name: 'Skills search' },
            { keys: { 'budget.min': 1, 'budget.max': 1 }, name: 'Budget filtering' }
          ];
          
          console.log('\n📈 Performance Index Analysis:');
          for (const rec of recommendedIndexes) {
            const exists = indexes.some(idx => {
              const idxKeys = Object.keys(idx.key);
              const recKeys = Object.keys(rec.keys);
              return recKeys.every(key => idxKeys.includes(key));
            });
            
            console.log(`  ${exists ? '✅' : '⚠️'} ${rec.name}: ${exists ? 'Exists' : 'Consider adding'}`);
          }
          
          // Test geospatial query performance
          console.log('\n⚡ Geospatial Query Performance Test:');
          
          const startTime = Date.now();
          const testQuery = await collection.aggregate([
            {
              $geoNear: {
                near: { type: 'Point', coordinates: [-122.4194, 37.7749] },
                distanceField: 'distance',
                maxDistance: 10000,
                spherical: true,
                key: 'location',
                query: { isActive: true, isDeleted: { $ne: true } }
              }
            },
            { $limit: 5 }
          ]).toArray();
          const queryTime = Date.now() - startTime;
          
          console.log(`  🚀 Query executed in ${queryTime}ms`);
          console.log(`  📊 Found ${testQuery.length} results`);
          
          if (queryTime < 100) {
            console.log('  ✅ Excellent performance (< 100ms)');
          } else if (queryTime < 500) {
            console.log('  ✅ Good performance (< 500ms)');
          } else {
            console.log('  ⚠️ Consider index optimization (> 500ms)');
          }
        }
        
        if (collectionName === 'users') {
          console.log('\n🎯 Users Collection Index Recommendations:');
          
          const userGeoIndexes = indexes.filter(idx => 
            Object.values(idx.key).includes('2dsphere')
          );
          
          if (userGeoIndexes.length === 0) {
            console.log('  ⚠️ No user location geospatial indexes');
            console.log('  📝 Consider: db.users.createIndex({ "locationData.coordinates": "2dsphere" })');
          } else {
            console.log(`  ✅ User geospatial indexes: ${userGeoIndexes.length} found`);
          }
          
          // Check for auth-related indexes
          const authIndexes = ['email', 'uid', 'googleId'].filter(field =>
            indexes.some(idx => idx.key[field])
          );
          
          console.log(`  📧 Authentication indexes: ${authIndexes.join(', ')}`);
        }
        
      } catch (error) {
        console.log(`  ❌ Error analyzing ${collectionName}: ${error.message}`);
      }
      
      console.log('\n');
    }
    
    // Overall recommendations
    console.log('🎯 OVERALL INDEX OPTIMIZATION SUMMARY');
    console.log('====================================');
    
    // Check total index count across all collections
    let totalIndexes = 0;
    let totalGeoIndexes = 0;
    
    for (const collectionInfo of collections) {
      const collection = db.collection(collectionInfo.name);
      const indexes = await collection.listIndexes().toArray();
      totalIndexes += indexes.length;
      
      const geoCount = indexes.filter(idx => 
        Object.values(idx.key).includes('2dsphere') || Object.values(idx.key).includes('2d')
      ).length;
      totalGeoIndexes += geoCount;
    }
    
    console.log(`📊 Total indexes across all collections: ${totalIndexes}`);
    console.log(`🌍 Total geospatial indexes: ${totalGeoIndexes}`);
    
    if (totalGeoIndexes >= 2) {
      console.log('✅ Geospatial indexing is properly configured');
    } else {
      console.log('⚠️ Consider adding more geospatial indexes for optimal performance');
    }
    
    console.log('\n💡 Index Best Practices Check:');
    console.log('  ✅ Use compound indexes for multi-field queries');
    console.log('  ✅ Put most selective fields first in compound indexes');
    console.log('  ✅ Use sparse indexes for optional fields');
    console.log('  ✅ Monitor index usage with db.collection.aggregate([{$indexStats:{}}])');
    console.log('  ✅ Remove unused indexes to improve write performance');
    
    console.log('\n🚀 MongoDB Atlas Geospatial Features:');
    console.log('  ✅ 2dsphere indexes for spherical geometry');
    console.log('  ✅ $geoNear aggregation for distance queries');
    console.log('  ✅ $geoWithin for area-based searches');
    console.log('  ✅ $near for proximity searches');
    
  } catch (error) {
    console.error('❌ Index analysis failed:', error.message);
    throw error;
  } finally {
    await client.close();
  }
}

// Run the analysis
if (require.main === module) {
  analyzeDatabaseIndexes()
    .then(() => {
      console.log('\n✅ Database index analysis completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Database index analysis failed:', error.message);
      process.exit(1);
    });
}

module.exports = { analyzeDatabaseIndexes };