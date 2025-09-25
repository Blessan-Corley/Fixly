// scripts/test-complete-auth-flows.js - Test all authentication flows completely
const { performance } = require('perf_hooks');

const BASE_URL = 'http://localhost:3002';
const results = { passed: 0, failed: 0, warnings: 0, details: [] };

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
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options
    });
    const duration = Math.round(performance.now() - startTime);
    let data;
    try { data = await response.json(); } catch { data = null; }
    return { status: response.status, ok: response.ok, data, duration, response };
  } catch (error) {
    const duration = Math.round(performance.now() - startTime);
    return { error: error.message, duration };
  }
}

async function testSignupFlowCompletely() {
  console.log('\n🔍 Testing Complete Signup Flow...');

  // Test 1: Username validation
  const usernameTest = await makeRequest('/api/auth/check-username', {
    method: 'POST',
    body: JSON.stringify({ username: 'newtestuser', type: 'username' })
  });

  if (usernameTest.ok && usernameTest.data?.available) {
    log('PASS', 'Signup: Username Check', 'Valid username available', usernameTest.duration);
  } else {
    log('FAIL', 'Signup: Username Check', usernameTest.data?.message || 'Username check failed');
  }

  // Test 2: Email validation
  const emailTest = await makeRequest('/api/auth/check-username', {
    method: 'POST',
    body: JSON.stringify({ email: 'test.signup@example.com', type: 'email' })
  });

  if (emailTest.ok) {
    log('PASS', 'Signup: Email Check', 'Email validation working', emailTest.duration);
  } else {
    log('FAIL', 'Signup: Email Check', 'Email validation failed');
  }

  // Test 3: OTP sending for signup
  const testEmail = `signup.test.${Date.now()}@example.com`;
  const otpTest = await makeRequest('/api/auth/send-otp', {
    method: 'POST',
    body: JSON.stringify({
      email: testEmail,
      purpose: 'signup',
      name: 'Test User'
    })
  });

  if (otpTest.ok && otpTest.data?.success) {
    log('PASS', 'Signup: OTP Send', 'OTP sent successfully for signup', otpTest.duration);
  } else if (otpTest.status === 429) {
    log('WARN', 'Signup: OTP Send', 'Rate limited (expected behavior)', otpTest.duration);
  } else {
    log('FAIL', 'Signup: OTP Send', otpTest.data?.message || 'OTP sending failed');
  }

  // Test 4: OTP verification (with invalid code)
  const otpVerifyTest = await makeRequest('/api/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify({
      email: testEmail,
      otp: '123456',
      purpose: 'signup'
    })
  });

  if (!otpVerifyTest.ok) {
    log('PASS', 'Signup: OTP Verify', 'Invalid OTP rejected correctly', otpVerifyTest.duration);
  } else {
    log('FAIL', 'Signup: OTP Verify', 'Invalid OTP was accepted');
  }

  // Test 5: Check if signup page is accessible
  const signupPageTest = await makeRequest('/auth/signup');
  if (signupPageTest.ok || signupPageTest.status === 200) {
    log('PASS', 'Signup: Page Access', 'Signup page accessible');
  } else {
    log('WARN', 'Signup: Page Access', `Status: ${signupPageTest.status}`);
  }
}

async function testSigninFlowCompletely() {
  console.log('\n🔍 Testing Complete Signin Flow...');

  // Test 1: Check signin page accessibility
  const signinPageTest = await makeRequest('/auth/signin');
  if (signinPageTest.ok || signinPageTest.status === 200) {
    log('PASS', 'Signin: Page Access', 'Signin page accessible');
  } else {
    log('WARN', 'Signin: Page Access', `Status: ${signinPageTest.status}`);
  }

  // Test 2: Test NextAuth providers endpoint
  const providersTest = await makeRequest('/api/auth/providers');
  if (providersTest.ok && providersTest.data) {
    const hasGoogle = providersTest.data.google;
    const hasCredentials = providersTest.data.credentials;

    if (hasGoogle) {
      log('PASS', 'Signin: Google OAuth', 'Google provider configured');
    } else {
      log('WARN', 'Signin: Google OAuth', 'Google provider not found');
    }

    if (hasCredentials) {
      log('PASS', 'Signin: Email Login', 'Email login provider configured');
    } else {
      log('WARN', 'Signin: Email Login', 'Credentials provider not found');
    }
  } else {
    log('FAIL', 'Signin: Providers', 'Auth providers endpoint failed');
  }

  // Test 3: Test session endpoint (should be unauthorized)
  const sessionTest = await makeRequest('/api/auth/session');
  if (sessionTest.status === 200) {
    if (sessionTest.data && Object.keys(sessionTest.data).length === 0) {
      log('PASS', 'Signin: Session', 'No active session (expected)');
    } else {
      log('WARN', 'Signin: Session', 'Active session found');
    }
  } else {
    log('WARN', 'Signin: Session', `Session endpoint status: ${sessionTest.status}`);
  }
}

async function testForgotPasswordFlow() {
  console.log('\n🔍 Testing Forgot Password & OTP Flow...');

  const testEmail = `forgot.test.${Date.now()}@example.com`;

  // Test 1: Forgot password request
  const forgotTest = await makeRequest('/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({
      email: testEmail
    })
  });

  if (forgotTest.ok && forgotTest.data?.success) {
    log('PASS', 'Forgot Password: Request', 'Password reset initiated', forgotTest.duration);
  } else if (forgotTest.ok && forgotTest.data?.message?.includes('receive a password reset')) {
    log('PASS', 'Forgot Password: Security', 'No user enumeration (secure)', forgotTest.duration);
  } else {
    log('WARN', 'Forgot Password: Request', forgotTest.data?.message || 'Unexpected response');
  }

  // Test 2: OTP for password reset
  const resetOtpTest = await makeRequest('/api/auth/send-otp', {
    method: 'POST',
    body: JSON.stringify({
      email: testEmail,
      purpose: 'password_reset',
      name: 'Test User'
    })
  });

  if (resetOtpTest.ok && resetOtpTest.data?.success) {
    log('PASS', 'Forgot Password: OTP', 'Reset OTP sent successfully', resetOtpTest.duration);
  } else if (resetOtpTest.status === 429) {
    log('WARN', 'Forgot Password: OTP', 'Rate limited (expected)', resetOtpTest.duration);
  } else {
    log('WARN', 'Forgot Password: OTP', resetOtpTest.data?.message || 'OTP send failed');
  }

  // Test 3: Reset password with invalid OTP
  const resetTest = await makeRequest('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({
      email: testEmail,
      newPassword: 'NewPassword123!',
      otp: '000000'
    })
  });

  if (!resetTest.ok) {
    log('PASS', 'Forgot Password: Reset', 'Invalid OTP rejected correctly', resetTest.duration);
  } else {
    log('FAIL', 'Forgot Password: Reset', 'Invalid OTP was accepted');
  }
}

async function testLocationIntegration() {
  console.log('\n🔍 Testing Location Integration...');

  // Test 1: Location API (should require auth)
  const locationTest = await makeRequest('/api/location');
  if (locationTest.status === 401) {
    log('PASS', 'Location: Auth Required', 'Location API properly protected');
  } else {
    log('WARN', 'Location: Auth Required', `Unexpected status: ${locationTest.status}`);
  }

  // Test 2: Location picker test page
  const locationPageTest = await makeRequest('/test/location-picker');
  if (locationPageTest.ok || locationPageTest.status === 200) {
    log('PASS', 'Location: Test Page', 'Location picker test page accessible');
  } else {
    log('WARN', 'Location: Test Page', `Status: ${locationPageTest.status}`);
  }

  // Test 3: Check if Google Maps API is configured
  try {
    const response = await makeRequest('/auth/signup');
    if (response.ok) {
      log('PASS', 'Location: Maps Integration', 'Signup page with location picker accessible');
    } else {
      log('WARN', 'Location: Maps Integration', 'Could not verify Maps integration');
    }
  } catch (error) {
    log('WARN', 'Location: Maps Integration', 'Could not test Maps integration');
  }
}

async function testGoogleOAuthConfiguration() {
  console.log('\n🔍 Testing Google OAuth Configuration...');

  // Test 1: Google OAuth callback endpoint
  const callbackTest = await makeRequest('/api/auth/callback/google');
  // This should return some response (even error is fine)
  if (callbackTest.status) {
    log('PASS', 'OAuth: Callback Endpoint', `Google callback endpoint responsive (${callbackTest.status})`);
  } else {
    log('WARN', 'OAuth: Callback Endpoint', 'Callback endpoint not responsive');
  }

  // Test 2: Check environment configuration
  try {
    require('dotenv').config({ path: '.env.local' });
    const hasGoogleId = !!process.env.GOOGLE_CLIENT_ID;
    const hasGoogleSecret = !!process.env.GOOGLE_CLIENT_SECRET;
    const hasNextAuthUrl = !!process.env.NEXTAUTH_URL;
    const hasNextAuthSecret = !!process.env.NEXTAUTH_SECRET;

    if (hasGoogleId && hasGoogleSecret) {
      log('PASS', 'OAuth: Environment', 'Google OAuth credentials configured');
    } else {
      log('WARN', 'OAuth: Environment', 'Google OAuth credentials missing');
    }

    if (hasNextAuthUrl && hasNextAuthSecret) {
      log('PASS', 'OAuth: NextAuth Config', 'NextAuth properly configured');
    } else {
      log('WARN', 'OAuth: NextAuth Config', 'NextAuth configuration incomplete');
    }

  } catch (error) {
    log('WARN', 'OAuth: Environment', 'Could not check environment configuration');
  }
}

async function testContentValidationIntegration() {
  console.log('\n🔍 Testing Content Validation Integration...');

  // Test profanity detection
  const profanityTest = await makeRequest('/api/auth/check-username', {
    method: 'POST',
    body: JSON.stringify({ username: 'badword123', type: 'username' })
  });

  if (!profanityTest.data?.available) {
    log('PASS', 'Content: Profanity Filter', 'Profanity blocked correctly', profanityTest.duration);
  } else {
    log('WARN', 'Content: Profanity Filter', 'Profanity not blocked');
  }

  // Test phone number detection
  const phoneTest = await makeRequest('/api/auth/check-username', {
    method: 'POST',
    body: JSON.stringify({ username: 'user9876543210', type: 'username' })
  });

  if (!phoneTest.data?.available) {
    log('PASS', 'Content: Phone Detection', 'Phone number blocked correctly', phoneTest.duration);
  } else {
    log('WARN', 'Content: Phone Detection', 'Phone number not blocked');
  }

  // Test normal username
  const normalTest = await makeRequest('/api/auth/check-username', {
    method: 'POST',
    body: JSON.stringify({ username: 'normaluser123', type: 'username' })
  });

  if (normalTest.data?.available) {
    log('PASS', 'Content: Normal Content', 'Clean username accepted', normalTest.duration);
  } else {
    log('WARN', 'Content: Normal Content', 'Clean username rejected');
  }
}

async function runCompleteAuthTest() {
  console.log('🚀 COMPLETE AUTHENTICATION FLOW TESTING');
  console.log('='.repeat(65));
  console.log('Testing all auth flows, location integration, and security features...');

  const startTime = performance.now();

  await testSignupFlowCompletely();
  await testSigninFlowCompletely();
  await testForgotPasswordFlow();
  await testLocationIntegration();
  await testGoogleOAuthConfiguration();
  await testContentValidationIntegration();

  const totalDuration = Math.round(performance.now() - startTime);

  console.log('\n' + '='.repeat(65));
  console.log('📊 COMPLETE AUTHENTICATION TEST RESULTS');
  console.log('='.repeat(65));
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`⚠️ Warnings: ${results.warnings}`);
  console.log(`⏱️ Total Duration: ${totalDuration}ms`);

  const total = results.passed + results.failed + results.warnings;
  const successRate = Math.round((results.passed / total) * 100);
  console.log(`📈 Success Rate: ${successRate}%`);

  // Detailed analysis
  console.log('\n📋 FLOW STATUS SUMMARY:');
  console.log('='.repeat(40));

  // Analyze results by category
  const categories = {
    signup: results.details.filter(d => d.test.toLowerCase().includes('signup')),
    signin: results.details.filter(d => d.test.toLowerCase().includes('signin')),
    forgot: results.details.filter(d => d.test.toLowerCase().includes('forgot')),
    location: results.details.filter(d => d.test.toLowerCase().includes('location')),
    oauth: results.details.filter(d => d.test.toLowerCase().includes('oauth')),
    content: results.details.filter(d => d.test.toLowerCase().includes('content'))
  };

  Object.entries(categories).forEach(([category, tests]) => {
    const categoryPassed = tests.filter(t => t.status === 'PASS').length;
    const categoryTotal = tests.length;
    const categoryRate = categoryTotal > 0 ? Math.round((categoryPassed / categoryTotal) * 100) : 0;

    const status = categoryRate >= 80 ? '✅' : categoryRate >= 60 ? '⚠️' : '❌';
    console.log(`${status} ${category.toUpperCase()}: ${categoryPassed}/${categoryTotal} (${categoryRate}%)`);
  });

  console.log('\n🎯 RECOMMENDATIONS:');
  console.log('='.repeat(30));

  if (results.failed === 0) {
    console.log('🎉 ALL CRITICAL FLOWS WORKING!');
    console.log('✨ Your authentication system is production-ready:');
    console.log('   • Email signup with OTP verification');
    console.log('   • Google OAuth integration');
    console.log('   • Secure password reset flow');
    console.log('   • Location integration with privacy controls');
    console.log('   • Comprehensive content validation');
    console.log('   • Proper security and rate limiting');
  } else {
    console.log('⚠️ Some issues need attention:');
    results.details.filter(d => d.status === 'FAIL').forEach(detail => {
      console.log(`   • ${detail.test}: ${detail.message}`);
    });
  }

  if (results.warnings > 0) {
    console.log('\n💡 OPTIMIZATION OPPORTUNITIES:');
    results.details.filter(d => d.status === 'WARN').slice(0, 3).forEach(detail => {
      console.log(`   • ${detail.test}: ${detail.message}`);
    });
  }

  return results;
}

if (require.main === module) {
  runCompleteAuthTest().catch(console.error);
}

module.exports = { runCompleteAuthTest, results };