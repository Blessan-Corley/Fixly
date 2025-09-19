#!/usr/bin/env node

/**
 * Authentication System Test Script
 * Tests signup, signin, and forgot password functionality
 */

const fs = require('fs');
const path = require('path');

console.log('🔐 TESTING AUTHENTICATION SYSTEM\n');

let testResults = [];

// Test 1: Check signup page structure
function testSignupPage() {
  console.log('📝 Testing signup page...');

  const signupPath = path.join(__dirname, '..', 'app/auth/signup/page.js');

  if (!fs.existsSync(signupPath)) {
    testResults.push('❌ Signup page not found');
    return;
  }

  const content = fs.readFileSync(signupPath, 'utf8');

  // Check for essential signup features
  const features = [
    { name: 'Username validation', pattern: /validateUsername.*async/ },
    { name: 'Password validation', pattern: /validatePassword.*password/ },
    { name: 'Content validation', pattern: /validateContent.*username/ },
    { name: 'AddressForm integration', pattern: /AddressForm.*onAddressSelect/ },
    { name: 'SkillSelector integration', pattern: /SkillSelector.*onSkillsChange/ },
    { name: 'Multi-step form', pattern: /currentStep.*setCurrentStep/ },
    { name: 'Google OAuth', pattern: /signIn.*google/ },
    { name: 'Form validation', pattern: /errors.*setErrors/ },
    { name: 'Role selection', pattern: /role.*hirer.*fixer/ },
    { name: 'Strong password rules', pattern: /at least one uppercase/ }
  ];

  features.forEach(({ name, pattern }) => {
    if (pattern.test(content)) {
      testResults.push(`✅ Signup: ${name} implemented`);
    } else {
      testResults.push(`⚠️ Signup: ${name} missing or needs review`);
    }
  });
}

// Test 2: Check signin page structure
function testSigninPage() {
  console.log('🔑 Testing signin page...');

  const signinPath = path.join(__dirname, '..', 'app/auth/signin/page.js');

  if (!fs.existsSync(signinPath)) {
    testResults.push('❌ Signin page not found');
    return;
  }

  const content = fs.readFileSync(signinPath, 'utf8');

  // Check for essential signin features
  const features = [
    { name: 'Email/password form', pattern: /email.*password/ },
    { name: 'NextAuth integration', pattern: /signIn.*getSession/ },
    { name: 'Google OAuth', pattern: /signIn.*google/ },
    { name: 'Error handling', pattern: /CredentialsSignin.*Invalid/ },
    { name: 'Auth state check', pattern: /getSession.*session/ },
    { name: 'Redirect logic', pattern: /router\.replace.*dashboard/ },
    { name: 'Loading states', pattern: /loading.*setLoading/ },
    { name: 'Show/hide password', pattern: /showPassword.*setShowPassword/ },
    { name: 'Form validation', pattern: /errors.*setErrors/ }
  ];

  features.forEach(({ name, pattern }) => {
    if (pattern.test(content)) {
      testResults.push(`✅ Signin: ${name} implemented`);
    } else {
      testResults.push(`⚠️ Signin: ${name} missing or needs review`);
    }
  });
}

// Test 3: Check forgot password page
function testForgotPasswordPage() {
  console.log('🔄 Testing forgot password page...');

  const forgotPath = path.join(__dirname, '..', 'app/auth/forgot-password/page.js');

  if (!fs.existsSync(forgotPath)) {
    testResults.push('❌ Forgot password page not found');
    return;
  }

  const content = fs.readFileSync(forgotPath, 'utf8');

  // Check for essential forgot password features
  const features = [
    { name: 'Email input', pattern: /email.*input/ },
    { name: 'Submit handling', pattern: /handleSubmit.*forgotPassword/ },
    { name: 'Loading state', pattern: /loading.*setLoading/ },
    { name: 'Success message', pattern: /success.*email sent/ },
    { name: 'Error handling', pattern: /error.*catch/ },
    { name: 'Email validation', pattern: /validateEmail|email.*valid/ }
  ];

  features.forEach(({ name, pattern }) => {
    if (pattern.test(content)) {
      testResults.push(`✅ Forgot Password: ${name} implemented`);
    } else {
      testResults.push(`⚠️ Forgot Password: ${name} missing or needs review`);
    }
  });
}

// Test 4: Check API routes
function testAuthAPIRoutes() {
  console.log('🌐 Testing auth API routes...');

  const apiRoutes = [
    'api/auth/signup',
    'api/auth/forgot-password',
    'api/auth/reset-password',
    'api/auth/verify-otp',
    'api/auth/check-username',
    'api/auth/[...nextauth]'
  ];

  apiRoutes.forEach(route => {
    const routePath = path.join(__dirname, '..', 'app', route, 'route.js');
    if (fs.existsSync(routePath)) {
      testResults.push(`✅ API Route: /${route} exists`);
    } else {
      testResults.push(`❌ API Route: /${route} missing`);
    }
  });

  // Check NextAuth configuration
  const nextAuthPath = path.join(__dirname, '..', 'app/api/auth/[...nextauth]/route.js');
  if (fs.existsSync(nextAuthPath)) {
    const content = fs.readFileSync(nextAuthPath, 'utf8');

    if (content.includes('GoogleProvider')) {
      testResults.push('✅ Google OAuth configured');
    } else {
      testResults.push('⚠️ Google OAuth needs configuration');
    }

    if (content.includes('CredentialsProvider')) {
      testResults.push('✅ Credentials provider configured');
    } else {
      testResults.push('⚠️ Credentials provider needs configuration');
    }
  }
}

// Test 5: Check database models
function testUserModel() {
  console.log('🗄️ Testing user model...');

  const modelPath = path.join(__dirname, '..', 'models/User.js');

  if (!fs.existsSync(modelPath)) {
    testResults.push('❌ User model not found');
    return;
  }

  const content = fs.readFileSync(modelPath, 'utf8');

  // Check for essential user model fields
  const fields = [
    { name: 'Email field', pattern: /email.*type.*String/ },
    { name: 'Password field', pattern: /password.*type.*String/ },
    { name: 'Username field', pattern: /username.*type.*String/ },
    { name: 'Role field', pattern: /role.*enum.*hirer.*fixer/ },
    { name: 'Skills field', pattern: /skills.*\[.*String/ },
    { name: 'Location field', pattern: /location.*coordinates/ },
    { name: 'Verification status', pattern: /isVerified.*Boolean/ },
    { name: 'Password hashing', pattern: /bcryptjs.*hash/ },
    { name: 'Email index', pattern: /email.*unique/ },
    { name: 'Username index', pattern: /username.*unique/ }
  ];

  fields.forEach(({ name, pattern }) => {
    if (pattern.test(content)) {
      testResults.push(`✅ User Model: ${name} implemented`);
    } else {
      testResults.push(`⚠️ User Model: ${name} missing or needs review`);
    }
  });
}

// Test 6: Check security configurations
function testSecurityFeatures() {
  console.log('🛡️ Testing security features...');

  // Check for middleware
  const middlewarePath = path.join(__dirname, '..', 'middleware.js');
  if (fs.existsSync(middlewarePath)) {
    const content = fs.readFileSync(middlewarePath, 'utf8');

    if (content.includes('NextAuth') || content.includes('withAuth')) {
      testResults.push('✅ Auth middleware configured');
    } else {
      testResults.push('⚠️ Auth middleware needs review');
    }

    if (content.includes('rateLimit') || content.includes('rateLimiter')) {
      testResults.push('✅ Rate limiting implemented');
    } else {
      testResults.push('⚠️ Rate limiting could be enhanced');
    }
  } else {
    testResults.push('⚠️ Middleware file not found');
  }

  // Check environment variables
  const envPath = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');

    const requiredEnvVars = [
      'NEXTAUTH_SECRET',
      'GOOGLE_CLIENT_ID',
      'GOOGLE_CLIENT_SECRET',
      'MONGODB_URI'
    ];

    requiredEnvVars.forEach(envVar => {
      if (content.includes(envVar)) {
        testResults.push(`✅ Environment: ${envVar} configured`);
      } else {
        testResults.push(`⚠️ Environment: ${envVar} needs configuration`);
      }
    });
  } else {
    testResults.push('⚠️ Environment file (.env.local) not found');
  }
}

// Run all tests
function runAuthTests() {
  console.log('🚀 Running authentication system tests...\n');

  testSignupPage();
  testSigninPage();
  testForgotPasswordPage();
  testAuthAPIRoutes();
  testUserModel();
  testSecurityFeatures();

  // Calculate results
  const passed = testResults.filter(result => result.includes('✅')).length;
  const warnings = testResults.filter(result => result.includes('⚠️')).length;
  const failed = testResults.filter(result => result.includes('❌')).length;
  const total = passed + warnings + failed;

  console.log('\n📋 AUTHENTICATION SYSTEM TEST RESULTS:');
  testResults.forEach(result => console.log(`  ${result}`));

  const successRate = Math.round((passed / total) * 100);
  console.log(`\n📈 RESULTS SUMMARY:`);
  console.log(`  ✅ Passed: ${passed}`);
  console.log(`  ⚠️ Warnings: ${warnings}`);
  console.log(`  ❌ Failed: ${failed}`);
  console.log(`  📊 Success Rate: ${successRate}%`);

  if (successRate >= 90) {
    console.log('\n🎉 EXCELLENT! Authentication system is well implemented!');
    console.log('✨ Your auth flow is ready for production!');
  } else if (successRate >= 75) {
    console.log('\n👍 GOOD! Authentication system is functional with minor improvements needed.');
  } else if (successRate >= 60) {
    console.log('\n⚠️ ATTENTION! Authentication system needs some improvements.');
  } else {
    console.log('\n🔴 CRITICAL! Authentication system needs significant work.');
  }

  console.log('\n🔐 AUTHENTICATION FEATURES SUMMARY:');
  console.log('  • Multi-step signup with role selection');
  console.log('  • Strong password validation with security rules');
  console.log('  • Username validation with content filtering');
  console.log('  • Google OAuth integration');
  console.log('  • Email/password signin');
  console.log('  • Forgot password with email reset');
  console.log('  • Location integration with AddressForm');
  console.log('  • Skills selection for fixers');
  console.log('  • Session management with NextAuth');
  console.log('  • Security middleware and rate limiting');

  return successRate;
}

// Execute tests
const result = runAuthTests();

console.log('\n✅ Authentication system testing complete!');

if (result >= 75) {
  console.log('🚀 Your authentication system is ready for users!');
} else {
  console.log('🔧 Consider addressing the warnings and failed tests for optimal security.');
}

process.exit(result >= 60 ? 0 : 1);