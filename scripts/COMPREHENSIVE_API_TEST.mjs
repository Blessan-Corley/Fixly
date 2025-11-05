/**
 * COMPREHENSIVE API TESTING SCRIPT
 * Tests all endpoints systematically
 * Finds issues, documents them, and verifies fixes
 */

import fetch from 'node-fetch';
import { writeFile } from 'fs/promises';

const BASE_URL = 'http://localhost:3000';
const TEST_RESULTS = {
  totalTests: 0,
  passed: 0,
  failed: 0,
  tests: [],
  issues: []
};

// Helper: API call with detailed logging
async function testAPI(testName, endpoint, options = {}) {
  TEST_RESULTS.totalTests++;
  const startTime = Date.now();

  console.log(`\n🧪 TEST: ${testName}`);
  console.log(`   Endpoint: ${endpoint}`);
  console.log(`   Method: ${options.method || 'GET'}`);

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    const duration = Date.now() - startTime;
    const contentType = response.headers.get('content-type');

    let data;
    if (contentType?.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    console.log(`   Status: ${response.status}`);
    console.log(`   Duration: ${duration}ms`);
    console.log(`   Response:`, JSON.stringify(data).substring(0, 200));

    const result = {
      test: testName,
      endpoint,
      method: options.method || 'GET',
      status: response.status,
      duration,
      response: data
    };

    TEST_RESULTS.tests.push(result);
    return result;

  } catch (error) {
    const duration = Date.now() - startTime;
    console.log(`   ❌ ERROR: ${error.message}`);

    const result = {
      test: testName,
      endpoint,
      method: options.method || 'GET',
      status: 0,
      duration,
      error: error.message
    };

    TEST_RESULTS.tests.push(result);
    TEST_RESULTS.issues.push({
      test: testName,
      error: error.message
    });

    return result;
  }
}

// Helper: Assert condition
function assert(condition, testName, message) {
  if (condition) {
    TEST_RESULTS.passed++;
    console.log(`   ✅ PASS: ${message}`);
    return true;
  } else {
    TEST_RESULTS.failed++;
    console.log(`   ❌ FAIL: ${message}`);
    TEST_RESULTS.issues.push({
      test: testName,
      assertion: message
    });
    return false;
  }
}

// PHASE 1: SYSTEM HEALTH TESTS
async function testSystemHealth() {
  console.log('\n' + '='.repeat(70));
  console.log('PHASE 1: SYSTEM HEALTH TESTS');
  console.log('='.repeat(70));

  // Test 1: System health endpoint
  const health = await testAPI(
    'System Health Check',
    '/api/test-system',
    { method: 'GET' }
  );

  assert(health.status === 200, 'System Health', 'Health endpoint returns 200');
  assert(health.response?.overall === 'PASS', 'System Health', 'All systems operational');
  assert(health.response?.tests?.mongodb?.status === 'PASS', 'System Health', 'MongoDB connected');
  assert(health.response?.tests?.redis?.status === 'PASS', 'System Health', 'Redis connected');
  assert(health.response?.tests?.environment?.status === 'PASS', 'System Health', 'Environment configured');

  // Test 2: Ably configuration
  const ably = await testAPI(
    'Ably Configuration Check',
    '/api/check-ably',
    { method: 'GET' }
  );

  assert(ably.status === 200, 'Ably Config', 'Ably endpoint accessible');
  assert(ably.response?.fullyConfigured === true, 'Ably Config', 'Ably fully configured');
}

// PHASE 2: AUTHENTICATION ENDPOINT TESTS
async function testAuthentication() {
  console.log('\n' + '='.repeat(70));
  console.log('PHASE 2: AUTHENTICATION ENDPOINT TESTS');
  console.log('='.repeat(70));

  // Test 1: Check valid username
  const usernameCheck1 = await testAPI(
    'Check Username - Valid Format',
    '/api/auth/check-username',
    {
      method: 'POST',
      body: JSON.stringify({ username: 'validuser' })
    }
  );

  assert(
    usernameCheck1.status === 200,
    'Username Check - Valid',
    'Returns 200 for valid username'
  );

  // Test 2: Check taken username
  const usernameCheck2 = await testAPI(
    'Check Username - Already Taken',
    '/api/auth/check-username',
    {
      method: 'POST',
      body: JSON.stringify({ username: 'testhirer' })
    }
  );

  assert(
    usernameCheck2.response?.available === false,
    'Username Check - Taken',
    'Returns unavailable for taken username'
  );

  // Test 3: Invalid format - too short
  const usernameCheck3 = await testAPI(
    'Check Username - Too Short',
    '/api/auth/check-username',
    {
      method: 'POST',
      body: JSON.stringify({ username: 'ab' })
    }
  );

  assert(
    usernameCheck3.response?.available === false,
    'Username Check - Too Short',
    'Rejects username < 3 characters'
  );

  // Test 4: Invalid format - special characters
  const usernameCheck4 = await testAPI(
    'Check Username - Special Characters',
    '/api/auth/check-username',
    {
      method: 'POST',
      body: JSON.stringify({ username: 'test@user!' })
    }
  );

  assert(
    usernameCheck4.response?.available === false,
    'Username Check - Special Chars',
    'Rejects username with special characters'
  );

  // Test 5: Reserved word
  const usernameCheck5 = await testAPI(
    'Check Username - Reserved Word',
    '/api/auth/check-username',
    {
      method: 'POST',
      body: JSON.stringify({ username: 'admin' })
    }
  );

  assert(
    usernameCheck5.response?.available === false,
    'Username Check - Reserved',
    'Rejects reserved usernames'
  );

  // Test 6: Missing username
  const usernameCheck6 = await testAPI(
    'Check Username - Missing Field',
    '/api/auth/check-username',
    {
      method: 'POST',
      body: JSON.stringify({})
    }
  );

  assert(
    usernameCheck6.status === 400,
    'Username Check - Missing',
    'Returns 400 for missing username'
  );

  // Test 7: Rate limiting (30 requests/minute)
  console.log('\n📝 Testing Rate Limiting (making 35 requests)...');
  let rateLimited = false;
  for (let i = 0; i < 35; i++) {
    const result = await testAPI(
      `Rate Limit Test ${i + 1}/35`,
      '/api/auth/check-username',
      {
        method: 'POST',
        body: JSON.stringify({ username: `ratetest${i}` })
      }
    );

    if (result.status === 429) {
      rateLimited = true;
      console.log(`   Rate limit triggered at request ${i + 1}`);
      break;
    }
  }

  assert(
    rateLimited,
    'Rate Limiting',
    'Rate limit enforced (30 req/min)'
  );

  // Test 8: Username suggestions
  const suggestions = await testAPI(
    'Username Suggestions',
    '/api/auth/check-username?base=newuser',
    { method: 'GET' }
  );

  assert(
    suggestions.status === 200,
    'Username Suggestions',
    'Suggestions endpoint accessible'
  );

  assert(
    Array.isArray(suggestions.response?.suggestions),
    'Username Suggestions',
    'Returns array of suggestions'
  );
}

// PHASE 3: USER ENDPOINT TESTS
async function testUserEndpoints() {
  console.log('\n' + '='.repeat(70));
  console.log('PHASE 3: USER ENDPOINT TESTS');
  console.log('='.repeat(70));

  // Test 1: Get user profile (public)
  const profile = await testAPI(
    'Get User Profile - Public',
    '/api/user/profile/testhirer',
    { method: 'GET' }
  );

  assert(
    profile.status === 200 || profile.status === 401,
    'User Profile',
    'Profile endpoint accessible'
  );

  // Test 2: Check email availability
  const emailCheck = await testAPI(
    'Check Email - New',
    '/api/user/check-email',
    {
      method: 'POST',
      body: JSON.stringify({ email: 'newemail@test.com' })
    }
  );

  assert(
    emailCheck.status === 200 || emailCheck.status === 404,
    'Email Check',
    'Email check endpoint exists'
  );
}

// PHASE 4: JOB ENDPOINT TESTS
async function testJobEndpoints() {
  console.log('\n' + '='.repeat(70));
  console.log('PHASE 4: JOB ENDPOINT TESTS');
  console.log('='.repeat(70));

  // Test 1: Browse jobs (public)
  const browse = await testAPI(
    'Browse Jobs - Public',
    '/api/jobs/browse?page=1&limit=10',
    { method: 'GET' }
  );

  assert(
    browse.status === 200,
    'Browse Jobs',
    'Jobs browse endpoint works'
  );

  assert(
    browse.response?.success || Array.isArray(browse.response?.jobs),
    'Browse Jobs',
    'Returns jobs array'
  );

  // Test 2: Job stats
  const stats = await testAPI(
    'Job Statistics',
    '/api/jobs/stats',
    { method: 'GET' }
  );

  assert(
    stats.status === 200 || stats.status === 401,
    'Job Stats',
    'Stats endpoint accessible'
  );
}

// PHASE 5: PERFORMANCE TESTS
async function testPerformance() {
  console.log('\n' + '='.repeat(70));
  console.log('PHASE 5: PERFORMANCE TESTS');
  console.log('='.repeat(70));

  // Test 1: Response times
  console.log('\n📊 Testing Response Times...');

  const endpoints = [
    { name: 'System Health', url: '/api/test-system', target: 3000 },
    { name: 'Check Username', url: '/api/auth/check-username', method: 'POST', body: { username: 'perftest' }, target: 1000 },
    { name: 'Browse Jobs', url: '/api/jobs/browse?page=1&limit=10', target: 2000 }
  ];

  for (const ep of endpoints) {
    const result = await testAPI(
      `Performance - ${ep.name}`,
      ep.url,
      ep.method ? {
        method: ep.method,
        body: JSON.stringify(ep.body)
      } : {}
    );

    assert(
      result.duration < ep.target,
      `Performance - ${ep.name}`,
      `Response time < ${ep.target}ms (actual: ${result.duration}ms)`
    );
  }

  // Test 2: Redis caching effectiveness
  console.log('\n💾 Testing Redis Caching...');

  // First request (cache MISS)
  const cacheMiss = await testAPI(
    'Dashboard Stats - Cache MISS',
    '/api/dashboard/stats',
    { method: 'GET' }
  );

  const missTime = cacheMiss.duration;
  const cacheHeader1 = cacheMiss.response?.cached ? 'HIT' : 'MISS';

  // Second request (cache HIT)
  const cacheHit = await testAPI(
    'Dashboard Stats - Cache HIT',
    '/api/dashboard/stats',
    { method: 'GET' }
  );

  const hitTime = cacheHit.duration;
  const cacheHeader2 = cacheHit.response?.cached ? 'HIT' : 'MISS';

  console.log(`   First request (MISS): ${missTime}ms`);
  console.log(`   Second request (HIT): ${hitTime}ms`);
  console.log(`   Speed improvement: ${((missTime - hitTime) / missTime * 100).toFixed(1)}%`);

  assert(
    hitTime < missTime || cacheHeader2 === 'HIT',
    'Redis Caching',
    'Caching improves performance'
  );
}

// PHASE 6: EDGE CASES & SECURITY
async function testEdgeCases() {
  console.log('\n' + '='.repeat(70));
  console.log('PHASE 6: EDGE CASES & SECURITY TESTS');
  console.log('='.repeat(70));

  // Test 1: SQL Injection attempt
  const sqlInjection = await testAPI(
    'Security - SQL Injection',
    '/api/auth/check-username',
    {
      method: 'POST',
      body: JSON.stringify({ username: "admin' OR '1'='1" })
    }
  );

  assert(
    sqlInjection.response?.available === false,
    'SQL Injection',
    'Rejects SQL injection attempts'
  );

  // Test 2: XSS attempt
  const xss = await testAPI(
    'Security - XSS Attempt',
    '/api/auth/check-username',
    {
      method: 'POST',
      body: JSON.stringify({ username: '<script>alert("xss")</script>' })
    }
  );

  assert(
    xss.response?.available === false,
    'XSS Prevention',
    'Rejects XSS attempts'
  );

  // Test 3: Very long input
  const longInput = await testAPI(
    'Validation - Long Input',
    '/api/auth/check-username',
    {
      method: 'POST',
      body: JSON.stringify({ username: 'a'.repeat(100) })
    }
  );

  assert(
    longInput.response?.available === false,
    'Long Input',
    'Rejects excessively long usernames'
  );

  // Test 4: Empty request
  const empty = await testAPI(
    'Validation - Empty Request',
    '/api/auth/check-username',
    {
      method: 'POST',
      body: '{}'
    }
  );

  assert(
    empty.status === 400,
    'Empty Request',
    'Returns 400 for empty request'
  );

  // Test 5: Malformed JSON
  const malformed = await testAPI(
    'Validation - Malformed JSON',
    '/api/auth/check-username',
    {
      method: 'POST',
      body: 'not valid json'
    }
  );

  assert(
    malformed.status === 400,
    'Malformed JSON',
    'Handles malformed JSON gracefully'
  );
}

// MAIN TEST EXECUTION
async function runAllTests() {
  console.log('\n' + '█'.repeat(70));
  console.log('   COMPREHENSIVE API TESTING - FIXLY PLATFORM');
  console.log('█'.repeat(70));
  console.log(`\nStarting comprehensive testing at ${new Date().toISOString()}`);
  console.log(`Server: ${BASE_URL}\n`);

  const startTime = Date.now();

  try {
    await testSystemHealth();
    await testAuthentication();
    await testUserEndpoints();
    await testJobEndpoints();
    await testPerformance();
    await testEdgeCases();

  } catch (error) {
    console.error('\n❌ CRITICAL ERROR:', error);
    TEST_RESULTS.issues.push({
      critical: true,
      error: error.message
    });
  }

  const duration = Date.now() - startTime;

  // FINAL REPORT
  console.log('\n' + '█'.repeat(70));
  console.log('   FINAL TEST REPORT');
  console.log('█'.repeat(70));

  console.log(`\n📊 STATISTICS:`);
  console.log(`   Total Tests: ${TEST_RESULTS.totalTests}`);
  console.log(`   ✅ Passed: ${TEST_RESULTS.passed}`);
  console.log(`   ❌ Failed: ${TEST_RESULTS.failed}`);
  console.log(`   Success Rate: ${((TEST_RESULTS.passed / TEST_RESULTS.totalTests) * 100).toFixed(1)}%`);
  console.log(`   Duration: ${(duration / 1000).toFixed(2)}s`);

  if (TEST_RESULTS.issues.length > 0) {
    console.log(`\n⚠️  ISSUES FOUND (${TEST_RESULTS.issues.length}):`);
    TEST_RESULTS.issues.forEach((issue, i) => {
      console.log(`\n${i + 1}. ${issue.test || 'General'}`);
      console.log(`   ${issue.error || issue.assertion}`);
    });
  }

  console.log('\n' + '█'.repeat(70));
  console.log(`Testing completed at ${new Date().toISOString()}`);
  console.log('█'.repeat(70) + '\n');

  // Save results to file
  await writeFile(
    'TEST_RESULTS.json',
    JSON.stringify(TEST_RESULTS, null, 2)
  );
  console.log('📁 Detailed results saved to: TEST_RESULTS.json\n');

  return TEST_RESULTS;
}

// Run tests
runAllTests().then(results => {
  process.exit(results.failed > 0 ? 1 : 0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
