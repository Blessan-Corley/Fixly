#!/usr/bin/env node

const fetch = require('node-fetch');

async function quickPerformanceTest() {
  console.log('⚡ Quick Performance Test - Optimized Lazy Loading');
  console.log('=================================================\n');
  
  const tests = [
    {
      name: 'Nearby jobs (small)',
      url: 'http://localhost:3000/api/jobs/nearby',
      method: 'POST',
      body: {
        latitude: 37.7749,
        longitude: -122.4194,
        radius: 25,
        limit: 10
      }
    },
    {
      name: 'Nearby jobs (medium)',
      url: 'http://localhost:3000/api/jobs/nearby', 
      method: 'POST',
      body: {
        latitude: 37.7749,
        longitude: -122.4194,
        radius: 50,
        limit: 20
      }
    },
    {
      name: 'General jobs',
      url: 'http://localhost:3000/api/jobs?page=1&limit=15',
      method: 'GET'
    }
  ];
  
  for (const test of tests) {
    const start = Date.now();
    
    try {
      const response = await fetch(test.url, {
        method: test.method,
        headers: { 'Content-Type': 'application/json' },
        ...(test.body && { body: JSON.stringify(test.body) })
      });
      
      const time = Date.now() - start;
      
      if (response.ok) {
        const data = await response.json();
        const jobCount = data.pagination?.returned || data.jobs?.length || 0;
        const hasMore = data.pagination?.hasMore;
        
        console.log(`✅ ${test.name}: ${jobCount} jobs in ${time}ms (hasMore: ${hasMore})`);
      } else {
        console.log(`❌ ${test.name}: Failed with status ${response.status}`);
      }
    } catch (error) {
      console.log(`❌ ${test.name}: Error - ${error.message}`);
    }
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log('\n🎯 Performance after optimization completed!');
}

quickPerformanceTest();