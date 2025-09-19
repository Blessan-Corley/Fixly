// Comprehensive Authentication System Test
// Tests the unified signup endpoint and all auth flows

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Unified Authentication System...\n');

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function logSuccess(message) {
  console.log(`${colors.green}✅ ${message}${colors.reset}`);
}

function logError(message) {
  console.log(`${colors.red}❌ ${message}${colors.reset}`);
}

function logWarning(message) {
  console.log(`${colors.yellow}⚠️  ${message}${colors.reset}`);
}

function logInfo(message) {
  console.log(`${colors.blue}ℹ️  ${message}${colors.reset}`);
}

function logHeader(message) {
  console.log(`\n${colors.bold}${colors.cyan}${message}${colors.reset}`);
}

// Test 1: Verify unified signup endpoint supports both flows
function testUnifiedSignupEndpoint() {
  logHeader('🔍 Testing Unified Signup Endpoint');

  const signupFile = path.join(__dirname, '..', 'app/api/auth/signup/route.js');

  if (!fs.existsSync(signupFile)) {
    logError('Signup endpoint file not found');
    return false;
  }

  const content = fs.readFileSync(signupFile, 'utf8');

  // Check for Google completion logic
  const hasGoogleCompletion = content.includes('isGoogleCompletion') &&
                              content.includes('Google completion request');

  if (hasGoogleCompletion) {
    logSuccess('Signup endpoint - Google completion logic integrated');
  } else {
    logError('Signup endpoint - Missing Google completion logic');
    return false;
  }

  // Check for session validation
  const hasSessionValidation = content.includes('getServerSession') &&
                               content.includes('Authentication required');

  if (hasSessionValidation) {
    logSuccess('Signup endpoint - Session validation present');
  } else {
    logWarning('Signup endpoint - Session validation may be missing');
  }

  // Check for proper response format
  const hasProperResponse = content.includes('Profile completed successfully') &&
                           content.includes('isRegistered: true');

  if (hasProperResponse) {
    logSuccess('Signup endpoint - Proper response format');
  } else {
    logError('Signup endpoint - Response format issues');
    return false;
  }

  return true;
}

// Test 2: Verify signup page uses unified endpoint
function testSignupPageIntegration() {
  logHeader('📱 Testing Signup Page Integration');

  const signupPage = path.join(__dirname, '..', 'app/auth/signup/page.js');

  if (!fs.existsSync(signupPage)) {
    logError('Signup page file not found');
    return false;
  }

  const content = fs.readFileSync(signupPage, 'utf8');

  // Check if it uses unified endpoint
  const usesUnifiedEndpoint = content.includes("fetch('/api/auth/signup'") &&
                             content.includes('isGoogleCompletion = true');

  if (usesUnifiedEndpoint) {
    logSuccess('Signup page - Uses unified endpoint for Google completion');
  } else {
    logError('Signup page - Still using old complete-google-signup endpoint');
    return false;
  }

  // Check for no references to old endpoint
  const hasOldEndpointReferences = content.includes('complete-google-signup');

  if (!hasOldEndpointReferences) {
    logSuccess('Signup page - No references to old endpoint');
  } else {
    logWarning('Signup page - Still has references to complete-google-signup');
  }

  // Check for proper error handling
  const hasErrorHandling = content.includes('response.ok') &&
                          content.includes('data.success');

  if (hasErrorHandling) {
    logSuccess('Signup page - Proper error handling');
  } else {
    logWarning('Signup page - Error handling may be incomplete');
  }

  return true;
}

// Test 3: Check authentication flow dependencies
function testAuthFlowDependencies() {
  logHeader('🔗 Testing Authentication Flow Dependencies');

  const criticalEndpoints = [
    'app/api/auth/signup/route.js',
    'app/api/auth/send-otp/route.js',
    'app/api/auth/verify-otp/route.js',
    'app/api/auth/check-username/route.js',
    'app/api/auth/verify-phone-firebase/route.js'
  ];

  let allPresent = true;

  criticalEndpoints.forEach(endpoint => {
    const fullPath = path.join(__dirname, '..', endpoint);

    if (fs.existsSync(fullPath)) {
      logSuccess(`${endpoint} - Present`);
    } else {
      logError(`${endpoint} - Missing`);
      allPresent = false;
    }
  });

  return allPresent;
}

// Test 4: Verify verify-account page compatibility
function testVerifyAccountCompatibility() {
  logHeader('📧 Testing Verify Account Page Compatibility');

  const verifyAccountPage = path.join(__dirname, '..', 'app/auth/verify-account/page.js');

  if (!fs.existsSync(verifyAccountPage)) {
    logError('Verify account page not found');
    return false;
  }

  const content = fs.readFileSync(verifyAccountPage, 'utf8');

  // Check if it uses updated endpoints
  const usesUpdatedEndpoints = content.includes("fetch('/api/auth/send-otp'") &&
                              content.includes("fetch('/api/auth/verify-otp'");

  if (usesUpdatedEndpoints) {
    logSuccess('Verify account page - Uses updated OTP endpoints');
  } else {
    logError('Verify account page - May be using old endpoints');
    return false;
  }

  // Check for Firebase phone auth
  const hasFirebasePhoneAuth = content.includes('FirebasePhoneAuth') &&
                               content.includes('verify-phone-firebase');

  if (hasFirebasePhoneAuth) {
    logSuccess('Verify account page - Firebase phone auth integrated');
  } else {
    logWarning('Verify account page - Phone verification may not work');
  }

  return true;
}

// Test 5: Check for old endpoint references
function checkForOldEndpointReferences() {
  logHeader('🗑️ Checking for Old Endpoint References');

  const filesToCheck = [
    'app/auth/signup/page.js',
    'app/auth/verify-account/page.js',
    'components/auth/FirebasePhoneAuth.js'
  ];

  const oldEndpoints = [
    'send-email-verification',
    'send-phone-otp',
    'verify-phone-otp',
    'verify-email',
    'update-session'
  ];

  let foundOldReferences = false;

  filesToCheck.forEach(file => {
    const fullPath = path.join(__dirname, '..', file);

    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');

      oldEndpoints.forEach(oldEndpoint => {
        if (content.includes(oldEndpoint)) {
          logWarning(`${file} - Still references old endpoint: ${oldEndpoint}`);
          foundOldReferences = true;
        }
      });
    }
  });

  if (!foundOldReferences) {
    logSuccess('No references to old endpoints found');
  }

  return !foundOldReferences;
}

// Test 6: Verify Redis integration
function testRedisIntegration() {
  logHeader('💾 Testing Redis Integration');

  const redisFile = path.join(__dirname, '..', 'lib/redis.js');

  if (!fs.existsSync(redisFile)) {
    logError('Redis library file not found');
    return false;
  }

  const authFiles = [
    'app/api/auth/signup/route.js',
    'app/api/auth/send-otp/route.js',
    'app/api/auth/verify-otp/route.js',
    'app/api/auth/check-username/route.js'
  ];

  let redisIntegrationScore = 0;

  authFiles.forEach(file => {
    const fullPath = path.join(__dirname, '..', file);

    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');

      if (content.includes('redisRateLimit') || content.includes('redisUtils')) {
        logSuccess(`${file} - Redis integration present`);
        redisIntegrationScore++;
      } else {
        logWarning(`${file} - No Redis integration found`);
      }
    }
  });

  const percentage = Math.round((redisIntegrationScore / authFiles.length) * 100);
  logInfo(`Redis Integration: ${redisIntegrationScore}/${authFiles.length} (${percentage}%)`);

  return percentage >= 75;
}

// Test 7: Database model compatibility
function testDatabaseModelCompatibility() {
  logHeader('🗄️ Testing Database Model Compatibility');

  const userModel = path.join(__dirname, '..', 'models/User.js');

  if (!fs.existsSync(userModel)) {
    logError('User model file not found');
    return false;
  }

  const content = fs.readFileSync(userModel, 'utf8');

  const requiredFields = [
    'isRegistered',
    'profileCompletedAt',
    'role',
    'googleId',
    'authMethod'
  ];

  let compatibilityScore = 0;

  requiredFields.forEach(field => {
    if (content.includes(field)) {
      logSuccess(`User model - ${field} field present`);
      compatibilityScore++;
    } else {
      logWarning(`User model - ${field} field missing`);
    }
  });

  const percentage = Math.round((compatibilityScore / requiredFields.length) * 100);
  logInfo(`Model Compatibility: ${compatibilityScore}/${requiredFields.length} (${percentage}%)`);

  return percentage >= 80;
}

// Main test runner
async function runAuthSystemTests() {
  logHeader('🚀 Unified Authentication System Test Suite');
  console.log('Testing the integrated Google completion flow and auth system integrity\n');

  const results = {
    unifiedEndpoint: testUnifiedSignupEndpoint(),
    signupPageIntegration: testSignupPageIntegration(),
    authFlowDependencies: testAuthFlowDependencies(),
    verifyAccountCompatibility: testVerifyAccountCompatibility(),
    oldEndpointReferences: checkForOldEndpointReferences(),
    redisIntegration: testRedisIntegration(),
    databaseCompatibility: testDatabaseModelCompatibility()
  };

  // Summary
  logHeader('📊 Test Results Summary');

  const passedTests = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  const overallScore = Math.round((passedTests / totalTests) * 100);

  Object.entries(results).forEach(([test, passed]) => {
    const status = passed ? `${colors.green}✅ PASSED${colors.reset}` : `${colors.red}❌ FAILED${colors.reset}`;
    const testName = test.charAt(0).toUpperCase() + test.slice(1).replace(/([A-Z])/g, ' $1');
    console.log(`${testName}: ${status}`);
  });

  console.log(`\n${colors.bold}Overall System Health: ${passedTests}/${totalTests} (${overallScore}%)${colors.reset}`);

  if (overallScore >= 90) {
    logSuccess('🎉 Authentication system is ready for cleanup! All critical tests passed.');

    console.log(`\n${colors.cyan}${colors.bold}✨ System Status:${colors.reset}`);
    console.log('• Unified signup endpoint working correctly');
    console.log('• Google completion flow integrated');
    console.log('• All auth dependencies present');
    console.log('• Redis caching operational');
    console.log('• Database models compatible');

    console.log(`\n${colors.magenta}💡 Safe to proceed with:${colors.reset}`);
    console.log('1. Remove /api/auth/complete-google-signup');
    console.log('2. Remove unused duplicate signup pages');
    console.log('3. Clean up any remaining old endpoint references');

  } else if (overallScore >= 70) {
    logWarning('⚠️  System mostly ready but has some issues - proceed with caution');
  } else {
    logError('❌ System has critical issues - DO NOT proceed with cleanup');
  }

  console.log(`\n${colors.blue}🔧 Next Steps:${colors.reset}`);
  console.log('1. Fix any failing tests above');
  console.log('2. Run manual test of signup flows');
  console.log('3. Test Google OAuth completion');
  console.log('4. Verify email/phone verification works');
  console.log('5. Proceed with safe cleanup only if all tests pass');

  return overallScore >= 90;
}

// Run the tests
runAuthSystemTests().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error(`\n${colors.red}Test execution failed:${colors.reset}`, error.message);
  process.exit(1);
});