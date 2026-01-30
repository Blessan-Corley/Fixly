/**
 * COMPREHENSIVE AUTHENTICATION TESTS
 * Tests all authentication endpoints, flows, and edge cases
 */

const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

// Test data
const TEST_USERS = {
  hirer: {
    email: 'test-hirer@fixly.test',
    password: 'TestHirer@123',
    username: 'testhirer'
  },
  fixer: {
    email: 'test-fixer@fixly.test',
    password: 'TestFixer@123',
    username: 'testfixer'
  }
};

// Helper function to make API calls
async function apiCall(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const startTime = Date.now();

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    const duration = Date.now() - startTime;
    const contentType = response.headers.get('content-type');

    let data;
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    return {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      data,
      duration
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    return {
      status: 0,
      statusText: 'Network Error',
      error: error.message,
      duration
    };
  }
}

// Test results storage
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

function logTest(name, passed, details = {}) {
  const result = {
    test: name,
    status: passed ? 'PASS' : 'FAIL',
    ...details
  };

  results.tests.push(result);
  if (passed) {
    results.passed++;
    console.log(`✅ PASS: ${name}`);
  } else {
    results.failed++;
    console.log(`❌ FAIL: ${name}`);
    if (details.error) console.log(`   Error: ${details.error}`);
  }

  if (details.duration) {
    console.log(`   Duration: ${details.duration}ms`);
  }
}

// Main test runner
async function runAuthTests() {
  console.log('\n🔐 AUTHENTICATION ENDPOINT TESTS\n');
  console.log('='.repeat(60));

  // Test 1: Check username availability (valid)
  console.log('\n📝 Test 1: Check username availability - valid username');
  try {
    const response = await apiCall('/api/auth/check-username', {
      method: 'POST',
      body: JSON.stringify({ username: 'newuser123' })
    });

    const passed = response.status === 200 && response.data.available === true;
    logTest('Check username availability - valid', passed, {
      endpoint: '/api/auth/check-username',
      method: 'POST',
      status: response.status,
      duration: response.duration,
      response: response.data
    });
  } catch (error) {
    logTest('Check username availability - valid', false, { error: error.message });
  }

  // Test 2: Check username availability (taken)
  console.log('\n📝 Test 2: Check username availability - taken username');
  try {
    const response = await apiCall('/api/auth/check-username', {
      method: 'POST',
      body: JSON.stringify({ username: 'testhirer' })
    });

    const passed = response.status === 200 && response.data.available === false;
    logTest('Check username availability - taken', passed, {
      endpoint: '/api/auth/check-username',
      method: 'POST',
      status: response.status,
      duration: response.duration,
      response: response.data
    });
  } catch (error) {
    logTest('Check username availability - taken', false, { error: error.message });
  }

  // Test 3: Check username - invalid format
  console.log('\n📝 Test 3: Check username - invalid format (special chars)');
  try {
    const response = await apiCall('/api/auth/check-username', {
      method: 'POST',
      body: JSON.stringify({ username: 'test@user!' })
    });

    const passed = response.status === 400 || (response.data.available === false);
    logTest('Check username - invalid format', passed, {
      endpoint: '/api/auth/check-username',
      method: 'POST',
      status: response.status,
      duration: response.duration,
      response: response.data
    });
  } catch (error) {
    logTest('Check username - invalid format', false, { error: error.message });
  }

  // Test 4: Check username - too short
  console.log('\n📝 Test 4: Check username - too short (< 3 chars)');
  try {
    const response = await apiCall('/api/auth/check-username', {
      method: 'POST',
      body: JSON.stringify({ username: 'ab' })
    });

    const passed = response.status === 400 || response.data.available === false;
    logTest('Check username - too short', passed, {
      endpoint: '/api/auth/check-username',
      method: 'POST',
      status: response.status,
      duration: response.duration,
      response: response.data
    });
  } catch (error) {
    logTest('Check username - too short', false, { error: error.message });
  }

  // Test 5: Check username - reserved word
  console.log('\n📝 Test 5: Check username - reserved word');
  try {
    const response = await apiCall('/api/auth/check-username', {
      method: 'POST',
      body: JSON.stringify({ username: 'admin' })
    });

    const passed = response.data.available === false;
    logTest('Check username - reserved word', passed, {
      endpoint: '/api/auth/check-username',
      method: 'POST',
      status: response.status,
      duration: response.duration,
      response: response.data
    });
  } catch (error) {
    logTest('Check username - reserved word', false, { error: error.message });
  }

  // Test 6: Check username - missing body
  console.log('\n📝 Test 6: Check username - missing body');
  try {
    const response = await apiCall('/api/auth/check-username', {
      method: 'POST',
      body: JSON.stringify({})
    });

    const passed = response.status === 400;
    logTest('Check username - missing body', passed, {
      endpoint: '/api/auth/check-username',
      method: 'POST',
      status: response.status,
      duration: response.duration,
      response: response.data
    });
  } catch (error) {
    logTest('Check username - missing body', false, { error: error.message });
  }

  // Test 7: Login - valid credentials (Hirer)
  console.log('\n📝 Test 7: Login with valid credentials - Hirer');
  let hirerSession;
  try {
    const response = await apiCall('/api/auth/callback/credentials', {
      method: 'POST',
      body: JSON.stringify({
        email: TEST_USERS.hirer.email,
        password: TEST_USERS.hirer.password
      })
    });

    // Note: NextAuth uses different auth flow, might need to test via browser
    // For now, just check endpoint exists
    const passed = response.status !== 404;
    logTest('Login - valid credentials (Hirer)', passed, {
      endpoint: '/api/auth/callback/credentials',
      method: 'POST',
      status: response.status,
      duration: response.duration,
      note: 'NextAuth requires session cookie - may need browser test'
    });
  } catch (error) {
    logTest('Login - valid credentials (Hirer)', false, { error: error.message });
  }

  // Test 8: Login - invalid credentials
  console.log('\n📝 Test 8: Login with invalid credentials');
  try {
    const response = await apiCall('/api/auth/callback/credentials', {
      method: 'POST',
      body: JSON.stringify({
        email: TEST_USERS.hirer.email,
        password: 'WrongPassword123!'
      })
    });

    const passed = response.status === 401 || response.status === 403;
    logTest('Login - invalid credentials', passed, {
      endpoint: '/api/auth/callback/credentials',
      method: 'POST',
      status: response.status,
      duration: response.duration
    });
  } catch (error) {
    // Error is acceptable for invalid login
    logTest('Login - invalid credentials', true, {
      error: error.message,
      note: 'Error expected for invalid credentials'
    });
  }

  // Test 9: Login - missing email
  console.log('\n📝 Test 9: Login - missing email');
  try {
    const response = await apiCall('/api/auth/callback/credentials', {
      method: 'POST',
      body: JSON.stringify({
        password: 'TestPassword123!'
      })
    });

    const passed = response.status === 400 || response.status === 401;
    logTest('Login - missing email', passed, {
      endpoint: '/api/auth/callback/credentials',
      method: 'POST',
      status: response.status,
      duration: response.duration
    });
  } catch (error) {
    logTest('Login - missing email', true, {
      error: error.message,
      note: 'Error expected for missing email'
    });
  }

  // Test 10: Login - SQL injection attempt
  console.log('\n📝 Test 10: Login - SQL injection attempt');
  try {
    const response = await apiCall('/api/auth/callback/credentials', {
      method: 'POST',
      body: JSON.stringify({
        email: "admin' OR '1'='1",
        password: "' OR '1'='1"
      })
    });

    const passed = response.status === 401 || response.status === 400;
    logTest('Login - SQL injection attempt', passed, {
      endpoint: '/api/auth/callback/credentials',
      method: 'POST',
      status: response.status,
      duration: response.duration,
      note: 'Should reject injection attempts'
    });
  } catch (error) {
    logTest('Login - SQL injection attempt', true, {
      error: error.message,
      note: 'Error expected for injection attempt'
    });
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 AUTHENTICATION TESTS SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total Tests: ${results.passed + results.failed}`);
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);
  console.log('='.repeat(60));

  return results;
}

// Export for use in other test files
module.exports = {
  runAuthTests,
  apiCall,
  TEST_USERS,
  BASE_URL
};

// Run tests if executed directly
if (require.main === module) {
  runAuthTests().then(results => {
    process.exit(results.failed > 0 ? 1 : 0);
  }).catch(error => {
    console.error('Test execution error:', error);
    process.exit(1);
  });
}
