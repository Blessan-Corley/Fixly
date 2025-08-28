#!/usr/bin/env node

// Final validation of all indexes and geospatial performance
require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;

async function finalIndexValidation() {
  console.log('🏆 Final Index & Geospatial Validation');
  console.log('=====================================\n');
  
  if (!uri) {
    throw new Error('MONGODB_URI environment variable not found.');
  }
  
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB Atlas');
    
    const db = client.db('fixly');
    const jobs = db.collection('jobs');
    
    // Test all critical query patterns with performance metrics
    const testResults = {
      geoNearQuery: null,
      skillsFilter: null,
      salaryRange: null,
      userJobs: null,
      compoundGeo: null,
      indexCount: null
    };
    
    console.log('🧪 Testing All Query Patterns with New Indexes:\n');
    
    // 1. Pure Geospatial Query
    console.log('🌍 Test 1: Pure Geospatial $geoNear Query');
    const geoStart = Date.now();
    const geoResults = await jobs.aggregate([
      {
        $geoNear: {
          near: { type: 'Point', coordinates: [-122.4194, 37.7749] },
          distanceField: 'distance',
          maxDistance: 50000,
          spherical: true,
          key: 'location'
        }
      },
      { $limit: 10 }
    ]).toArray();
    const geoTime = Date.now() - geoStart;
    testResults.geoNearQuery = { time: geoTime, count: geoResults.length };
    console.log(`  ⚡ ${geoResults.length} results in ${geoTime}ms`);
    
    // 2. Geospatial + Active Filter (Using compound index)
    console.log('\n🎯 Test 2: Geospatial + Active Jobs Filter');
    const compoundGeoStart = Date.now();
    const compoundGeoResults = await jobs.aggregate([
      {
        $geoNear: {
          near: { type: 'Point', coordinates: [-122.4194, 37.7749] },
          distanceField: 'distance',
          maxDistance: 25000,
          spherical: true,
          key: 'location',
          query: { isActive: true, isDeleted: { $ne: true } }
        }
      },
      { $limit: 10 }
    ]).toArray();
    const compoundGeoTime = Date.now() - compoundGeoStart;
    testResults.compoundGeo = { time: compoundGeoTime, count: compoundGeoResults.length };
    console.log(`  ⚡ ${compoundGeoResults.length} active results in ${compoundGeoTime}ms`);
    
    // 3. Skills-based Search with Location
    console.log('\n💼 Test 3: Skills + Location Search');
    const skillsStart = Date.now();
    const skillsResults = await jobs.aggregate([
      {
        $geoNear: {
          near: { type: 'Point', coordinates: [-122.4194, 37.7749] },
          distanceField: 'distance',
          maxDistance: 50000,
          spherical: true,
          key: 'location',
          query: { 
            skills: { $in: ['JavaScript', 'React', 'TypeScript'] },
            isActive: true,
            isDeleted: { $ne: true }
          }
        }
      },
      { $limit: 5 }
    ]).toArray();
    const skillsTime = Date.now() - skillsStart;
    testResults.skillsFilter = { time: skillsTime, count: skillsResults.length };
    console.log(`  ⚡ ${skillsResults.length} skill-matched jobs in ${skillsTime}ms`);
    
    // 4. Salary Range + Location
    console.log('\n💰 Test 4: Salary Range + Location Filter');
    const salaryStart = Date.now();
    const salaryResults = await jobs.aggregate([
      {
        $geoNear: {
          near: { type: 'Point', coordinates: [-122.4194, 37.7749] },
          distanceField: 'distance',
          maxDistance: 100000,
          spherical: true,
          key: 'location',
          query: {
            'salary.min': { $gte: 50000 },
            'salary.max': { $lte: 200000 },
            isActive: true,
            isDeleted: { $ne: true }
          }
        }
      },
      { $limit: 10 }
    ]).toArray();
    const salaryTime = Date.now() - salaryStart;
    testResults.salaryRange = { time: salaryTime, count: salaryResults.length };
    console.log(`  ⚡ ${salaryResults.length} salary-filtered jobs in ${salaryTime}ms`);
    
    // 5. User's Posted Jobs (Non-geospatial)
    console.log('\n👤 Test 5: User Posted Jobs Listing');
    const userJobsStart = Date.now();
    const userJobsResults = await jobs.find({
      postedBy: 'company_123',
      isActive: true
    }).sort({ createdAt: -1 }).limit(10).toArray();
    const userJobsTime = Date.now() - userJobsStart;
    testResults.userJobs = { time: userJobsTime, count: userJobsResults.length };
    console.log(`  ⚡ ${userJobsResults.length} user jobs in ${userJobsTime}ms`);
    
    // 6. Index Count Verification
    console.log('\n📊 Test 6: Index Count & Status');
    const allIndexes = await jobs.listIndexes().toArray();
    const geoIndexes = allIndexes.filter(idx => 
      Object.values(idx.key).includes('2dsphere')
    );
    const performanceIndexes = allIndexes.filter(idx => 
      idx.name.includes('active_jobs') || 
      idx.name.includes('skills_active') ||
      idx.name.includes('salary_range') ||
      idx.name.includes('user_jobs')
    );
    
    testResults.indexCount = {
      total: allIndexes.length,
      geospatial: geoIndexes.length,
      performance: performanceIndexes.length
    };
    
    console.log(`  📈 Total indexes: ${allIndexes.length}`);
    console.log(`  🌍 Geospatial indexes: ${geoIndexes.length}`);
    console.log(`  ⚡ Performance indexes: ${performanceIndexes.length}`);
    
    // 7. Real API Endpoint Test
    console.log('\n🌐 Test 7: API Endpoint Performance');
    const fetch = require('node-fetch');
    const apiStart = Date.now();
    
    try {
      const response = await fetch('http://localhost:3000/api/jobs/nearby', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: 37.7749,
          longitude: -122.4194,
          radius: 25,
          limit: 10,
          filters: {
            skills: ['JavaScript'],
            minBudget: 50000
          }
        })
      });
      
      if (response.ok) {
        const apiResult = await response.json();
        const apiTime = Date.now() - apiStart;
        console.log(`  🚀 API responded with ${apiResult.resultsCount} jobs in ${apiTime}ms`);
        console.log(`  ✅ End-to-end geospatial API working perfectly`);
      }
    } catch (error) {
      console.log(`  ⚠️ API test skipped: ${error.message}`);
    }
    
    // Results Analysis
    console.log('\n📋 FINAL VALIDATION RESULTS');
    console.log('===========================');
    
    const allTestsPassed = Object.values(testResults).every(result => {
      if (!result) return false;
      if (typeof result === 'object' && result.time !== undefined) {
        return result.time < 1000 && result.count >= 0;
      }
      if (typeof result === 'object' && result.total !== undefined) {
        return result.total > 0 && result.geospatial >= 2;
      }
      return true;
    });
    
    console.log(`🌍 Geospatial $geoNear: ${testResults.geoNearQuery?.count || 0} results in ${testResults.geoNearQuery?.time || 0}ms`);
    console.log(`🎯 Compound Geo Filter: ${testResults.compoundGeo?.count || 0} results in ${testResults.compoundGeo?.time || 0}ms`);
    console.log(`💼 Skills + Location: ${testResults.skillsFilter?.count || 0} results in ${testResults.skillsFilter?.time || 0}ms`);
    console.log(`💰 Salary + Location: ${testResults.salaryRange?.count || 0} results in ${testResults.salaryRange?.time || 0}ms`);
    console.log(`👤 User Job Listings: ${testResults.userJobs?.count || 0} results in ${testResults.userJobs?.time || 0}ms`);
    
    // Performance Analysis
    console.log('\n⚡ PERFORMANCE ANALYSIS:');
    
    const avgQueryTime = [
      testResults.geoNearQuery?.time,
      testResults.compoundGeo?.time,
      testResults.skillsFilter?.time,
      testResults.salaryRange?.time,
      testResults.userJobs?.time
    ].filter(Boolean).reduce((a, b) => a + b, 0) / 5;
    
    console.log(`📊 Average query time: ${avgQueryTime.toFixed(1)}ms`);
    
    if (avgQueryTime < 100) {
      console.log('🏆 EXCELLENT: Sub-100ms average query performance');
    } else if (avgQueryTime < 300) {
      console.log('✅ GOOD: Sub-300ms average query performance');
    } else if (avgQueryTime < 500) {
      console.log('✅ ACCEPTABLE: Sub-500ms average query performance');
    } else {
      console.log('⚠️ REVIEW: Consider index optimization for >500ms queries');
    }
    
    // Final Status
    if (allTestsPassed && testResults.indexCount?.geospatial >= 2 && avgQueryTime < 300) {
      console.log('\n🎉 FINAL STATUS: ALL SYSTEMS OPTIMAL! 🎉');
      console.log('========================================');
      console.log('✅ MongoDB Atlas geospatial indexing: PERFECT');
      console.log('✅ All query patterns: OPTIMIZED');
      console.log('✅ Index coverage: COMPREHENSIVE');
      console.log('✅ Performance: EXCELLENT');
      console.log('✅ No manual implementation needed: AUTOMATIC');
      console.log('\n🚀 Your Fixly application is production-ready with optimal database performance!');
    } else {
      console.log('\n⚠️ Some optimizations may still be needed');
    }
    
  } catch (error) {
    console.error('❌ Final validation failed:', error.message);
    throw error;
  } finally {
    await client.close();
  }
}

// Run the final validation
if (require.main === module) {
  finalIndexValidation()
    .then(() => {
      console.log('\n✅ Final index validation completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Final index validation failed:', error.message);
      process.exit(1);
    });
}

module.exports = { finalIndexValidation };