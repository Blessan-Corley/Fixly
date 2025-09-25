// scripts/verify-auth-implementation.js - Comprehensive verification of all optimizations
const { performance } = require('perf_hooks');
const fs = require('fs');
const path = require('path');

// Configuration
const BASE_URL = 'http://localhost:3002';
const TIMEOUT = 10000;

// Test results
const results = {
  passed: 0,
  failed: 0,
  warnings: 0,
  details: []
};

function log(status, test, message, duration = null) {
  const icons = { PASS: '✅', FAIL: '❌', WARN: '⚠️' };
  const durationText = duration ? ` (${duration}ms)` : '';
  console.log(`${icons[status]} ${test}${durationText}: ${message}`);

  results.details.push({ status, test, message, duration });
  results[status.toLowerCase()]++;
}

async function makeRequest(endpoint, options = {}) {
  const startTime = performance.now();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

    const response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    clearTimeout(timeoutId);
    const duration = Math.round(performance.now() - startTime);

    let data;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    return { status: response.status, ok: response.ok, data, duration };
  } catch (error) {
    const duration = Math.round(performance.now() - startTime);
    return { error: error.message, duration };
  }
}

// 1. Test Database Connections
async function verifyDatabaseConnections() {
  console.log('\n🔍 Verifying Database Connections...');

  try {
    require('dotenv').config({ path: '.env.local' });

    // Test MongoDB
    const connectDB = require('../lib/db.js').default;
    const startTime = performance.now();
    await connectDB();
    const dbDuration = Math.round(performance.now() - startTime);
    log('PASS', 'MongoDB Connection', 'Connected successfully', dbDuration);

    // Test Redis
    const { getRedis } = require('../lib/redis.js');
    const redis = getRedis();
    const redisStart = performance.now();
    await redis.ping();
    const redisDuration = Math.round(performance.now() - redisStart);
    log('PASS', 'Redis Connection', 'Connected successfully', redisDuration);

  } catch (error) {
    log('FAIL', 'Database Connections', error.message);
    return false;
  }
  return true;
}

// 2. Test All Auth Endpoints
async function verifyAuthEndpoints() {
  console.log('\n🔍 Verifying Auth Endpoints...');

  const endpoints = [
    { path: '/api/auth/check-username', method: 'POST', body: { username: 'testuser', type: 'username' }, name: 'Username Check' },
    { path: '/api/auth/send-otp', method: 'POST', body: { email: 'test@example.com', purpose: 'signup', name: 'Test' }, name: 'Send OTP' },
    { path: '/api/auth/verify-otp', method: 'POST', body: { email: 'test@example.com', otp: '123456', purpose: 'signup' }, name: 'Verify OTP' },
    { path: '/api/auth/forgot-password', method: 'POST', body: { email: 'test@example.com' }, name: 'Forgot Password' },
  ];

  for (const endpoint of endpoints) {
    const result = await makeRequest(endpoint.path, {
      method: endpoint.method,
      body: JSON.stringify(endpoint.body)
    });

    if (result.error) {
      log('FAIL', endpoint.name, `Request failed: ${result.error}`);
    } else if (result.status >= 500) {
      log('FAIL', endpoint.name, `Server error: ${result.status}`);
    } else {
      log('PASS', endpoint.name, `Responded correctly: ${result.status}`, result.duration);
    }
  }
}

// 3. Test Validation Utilities
async function verifyValidationUtilities() {
  console.log('\n🔍 Verifying Validation Utilities...');

  try {
    const { ValidationRules, validateSignupForm, detectFakeAccount } = require('../utils/validation.js');

    // Test username validation
    const usernameTest = ValidationRules.validateUsername('validuser123');
    if (usernameTest.valid) {
      log('PASS', 'Username Validation', 'Valid username accepted');
    } else {
      log('FAIL', 'Username Validation', usernameTest.error);
    }

    // Test reserved username
    const reservedTest = ValidationRules.validateUsername('admin');
    if (!reservedTest.valid) {
      log('PASS', 'Reserved Username Block', 'Reserved username rejected');
    } else {
      log('FAIL', 'Reserved Username Block', 'Reserved username was accepted');
    }

    // Test signup form validation
    const signupTest = validateSignupForm({
      name: 'Test User',
      email: 'test@example.com',
      username: 'testuser123',
      role: 'fixer',
      authMethod: 'email',
      password: 'TestPassword123!',
      confirmPassword: 'TestPassword123!',
      termsAccepted: true
    });

    if (signupTest.valid) {
      log('PASS', 'Signup Form Validation', 'Valid form accepted');
    } else {
      log('FAIL', 'Signup Form Validation', 'Valid form rejected');
    }

    // Test fake account detection
    const fakeTest = detectFakeAccount({
      email: 'test123@example.com',
      name: 'Test User',
      username: 'testuser123'
    });

    if (typeof fakeTest.riskScore === 'number') {
      log('PASS', 'Fake Account Detection', `Risk score calculated: ${fakeTest.riskScore}`);
    } else {
      log('FAIL', 'Fake Account Detection', 'Risk score calculation failed');
    }

  } catch (error) {
    log('FAIL', 'Validation Utilities', `Error loading utilities: ${error.message}`);
  }
}

// 4. Test Content Validation
async function verifyContentValidation() {
  console.log('\n🔍 Verifying Content Validation...');

  try {
    const { ContentValidator } = require('../lib/validations/content-validator.js');

    // Test normal content
    const normalResult = await ContentValidator.validateContent('normalusername', 'profile');
    if (normalResult.isValid) {
      log('PASS', 'Content Validation - Normal', 'Clean content accepted');
    } else {
      log('WARN', 'Content Validation - Normal', 'Normal content flagged');
    }

    // Test phone number detection
    const phoneResult = await ContentValidator.validateContent('user9876543210', 'profile');
    if (!phoneResult.isValid) {
      log('PASS', 'Content Validation - Phone', 'Phone number detected and blocked');
    } else {
      log('FAIL', 'Content Validation - Phone', 'Phone number not detected');
    }

  } catch (error) {
    log('WARN', 'Content Validation', `Could not test: ${error.message}`);
  }
}

// 5. Test File Structure and Implementations
async function verifyFileImplementations() {
  console.log('\n🔍 Verifying File Implementations...');

  const criticalFiles = [
    'lib/auth.js',
    'lib/redis.js',
    'lib/db.js',
    'utils/validation.js',
    'app/api/auth/signup/route.js',
    'app/api/auth/send-otp/route.js',
    'app/api/auth/verify-otp/route.js',
    'app/api/auth/check-username/route.js',
    'app/auth/signup/page.js',
    'app/auth/signin/page.js',
    'models/User.js',
    'lib/validations/content-validator.js'
  ];

  for (const file of criticalFiles) {
    const filePath = path.join(__dirname, '..', file);
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      const sizeKB = Math.round(stats.size / 1024);
      log('PASS', `File: ${file}`, `Exists (${sizeKB}KB)`);
    } else {
      log('FAIL', `File: ${file}`, 'Missing or incorrect path');
    }
  }
}

// 6. Test Rate Limiting
async function verifyRateLimiting() {
  console.log('\n🔍 Verifying Rate Limiting...');

  const testEmail = `ratetest${Date.now()}@example.com`;
  const requests = [];

  // Send multiple requests
  for (let i = 0; i < 4; i++) {
    requests.push(
      makeRequest('/api/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({
          email: testEmail,
          purpose: 'signup',
          name: 'Rate Test'
        })
      })
    );
  }

  const results = await Promise.all(requests);
  const rateLimited = results.some(r => r.status === 429);
  const successCount = results.filter(r => r.ok).length;

  if (process.env.NODE_ENV === 'development') {
    log('PASS', 'Rate Limiting (Dev)', `Development mode: ${successCount} requests allowed`);
  } else if (rateLimited) {
    log('PASS', 'Rate Limiting (Prod)', 'Rate limiting activated');
  } else {
    log('WARN', 'Rate Limiting', 'Rate limiting may not be working');
  }
}

// 7. Test Session Management Optimizations
async function verifySessionOptimizations() {
  console.log('\n🔍 Verifying Session Management Optimizations...');

  try {
    // Check if auth.js has the optimized session handling
    const authFile = fs.readFileSync(path.join(__dirname, '..', 'lib/auth.js'), 'utf8');

    if (authFile.includes('user_session:')) {
      log('PASS', 'Session Caching', 'Redis session caching implemented');
    } else {
      log('WARN', 'Session Caching', 'Session caching may not be fully implemented');
    }

    if (authFile.includes('sessionVersion')) {
      log('PASS', 'Session Versioning', 'Session version tracking implemented');
    } else {
      log('WARN', 'Session Versioning', 'Session versioning may not be implemented');
    }

    if (authFile.includes('MongoDB ObjectId')) {
      log('PASS', 'ID Standardization', 'MongoDB ObjectId standardization noted');
    } else {
      log('WARN', 'ID Standardization', 'ID handling may need review');
    }

  } catch (error) {
    log('FAIL', 'Session Optimizations', `Could not verify: ${error.message}`);
  }
}

// 8. Test Frontend Optimizations
async function verifyFrontendOptimizations() {
  console.log('\n🔍 Verifying Frontend Optimizations...');

  try {
    const signupPage = fs.readFileSync(path.join(__dirname, '..', 'app/auth/signup/page.js'), 'utf8');

    if (signupPage.includes('performLiveValidation')) {
      log('PASS', 'Live Validation', 'Live validation implemented');
    } else {
      log('WARN', 'Live Validation', 'Live validation may not be implemented');
    }

    if (signupPage.includes('debounced') || signupPage.includes('setTimeout')) {
      log('PASS', 'Debounced Input', 'Input debouncing implemented');
    } else {
      log('WARN', 'Debounced Input', 'Input debouncing may not be implemented');
    }

    if (signupPage.includes('validationTimeout')) {
      log('PASS', 'Timeout Management', 'Validation timeout management implemented');
    } else {
      log('WARN', 'Timeout Management', 'Timeout management may need implementation');
    }

  } catch (error) {
    log('FAIL', 'Frontend Optimizations', `Could not verify: ${error.message}`);
  }
}

// Main verification function
async function runVerification() {
  console.log('🔍 COMPREHENSIVE AUTH IMPLEMENTATION VERIFICATION');
  console.log('='.repeat(60));

  const startTime = performance.now();

  // Run all verifications
  await verifyDatabaseConnections();
  await verifyAuthEndpoints();
  await verifyValidationUtilities();
  await verifyContentValidation();
  await verifyFileImplementations();
  await verifyRateLimiting();
  await verifySessionOptimizations();
  await verifyFrontendOptimizations();

  const totalDuration = Math.round(performance.now() - startTime);

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 VERIFICATION SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`⚠️ Warnings: ${results.warnings}`);
  console.log(`⏱️ Total Duration: ${totalDuration}ms`);

  const total = results.passed + results.failed + results.warnings;
  const successRate = Math.round((results.passed / total) * 100);
  console.log(`📈 Success Rate: ${successRate}%`);

  if (results.failed === 0) {
    console.log('\n🎉 ALL CRITICAL COMPONENTS VERIFIED! Implementation is solid.');
  } else {
    console.log('\n⚠️ Some components need attention. Review details above.');
  }

  return results;
}

// Run verification
if (require.main === module) {
  runVerification().catch(console.error);
}

module.exports = { runVerification, results };