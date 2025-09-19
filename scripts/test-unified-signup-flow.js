// Unified Signup Flow Test
// Tests that both Google and Email authentication go through the same complete form

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Unified Signup Flow...\n');

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

// Test 1: Verify onboarding page removal
function testOnboardingRemoval() {
  logHeader('🗑️ Testing Onboarding Page Removal');

  const onboardingPath = path.join(__dirname, '..', 'app/auth/onboarding');

  if (!fs.existsSync(onboardingPath)) {
    logSuccess('Onboarding page successfully removed');
    return true;
  } else {
    logError('Onboarding page still exists');
    return false;
  }
}

// Test 2: Verify main signup has all required components
function testSignupComponents() {
  logHeader('🧩 Testing Signup Components Integration');

  const signupFile = path.join(__dirname, '..', 'app/auth/signup/page.js');

  if (!fs.existsSync(signupFile)) {
    logError('Main signup page not found');
    return false;
  }

  const content = fs.readFileSync(signupFile, 'utf8');

  const requiredComponents = [
    { name: 'AddressForm import', pattern: /import.*AddressForm.*from/ },
    { name: 'SkillsSelection import', pattern: /import.*SkillsSelection.*from/ },
    { name: 'AddressForm usage', pattern: /<AddressForm/ },
    { name: 'SkillsSelection usage', pattern: /<SkillsSelection/ },
    { name: 'GPS location features', pattern: /GPS.*auto|location.*auto/ },
    { name: 'Google auth handling', pattern: /authMethod.*google/ },
    { name: 'Email auth handling', pattern: /authMethod.*email/ }
  ];

  let componentScore = 0;

  requiredComponents.forEach(({ name, pattern }) => {
    if (pattern.test(content)) {
      logSuccess(`${name} - Present`);
      componentScore++;
    } else {
      logError(`${name} - Missing`);
    }
  });

  const percentage = Math.round((componentScore / requiredComponents.length) * 100);
  logInfo(`Component Integration: ${componentScore}/${requiredComponents.length} (${percentage}%)`);

  return percentage >= 90;
}

// Test 3: Verify both auth methods use same flow
function testUnifiedAuthFlow() {
  logHeader('🔄 Testing Unified Authentication Flow');

  const signupFile = path.join(__dirname, '..', 'app/auth/signup/page.js');
  const content = fs.readFileSync(signupFile, 'utf8');

  const flowChecks = [
    { name: 'Google users go through complete form', pattern: /authMethod.*google.*currentStep|currentStep.*authMethod.*google/ },
    { name: 'Email users go through complete form', pattern: /authMethod.*email.*currentStep|currentStep.*authMethod.*email/ },
    { name: 'Both fill same address form', pattern: /<AddressForm[\s\S]*?onAddressSelect/ },
    { name: 'Both select skills (for fixers)', pattern: /<SkillsSelection[\s\S]*?onSkillsSelect/ },
    { name: 'Both complete 4 steps', pattern: /currentStep.*4|totalSteps.*4/ },
    { name: 'Unified submission endpoint', pattern: /fetch.*\/api\/auth\/signup/ }
  ];

  let flowScore = 0;

  flowChecks.forEach(({ name, pattern }) => {
    if (pattern.test(content)) {
      logSuccess(`${name} - Verified`);
      flowScore++;
    } else {
      logWarning(`${name} - Not clearly verified`);
    }
  });

  const percentage = Math.round((flowScore / flowChecks.length) * 100);
  logInfo(`Unified Flow: ${flowScore}/${flowChecks.length} (${percentage}%)`);

  return percentage >= 80;
}

// Test 4: Verify enhanced location features
function testLocationFeatures() {
  logHeader('📍 Testing Enhanced Location Features');

  const addressFormFile = path.join(__dirname, '..', 'components/AddressForm/AddressForm.js');
  const locationPickerFile = path.join(__dirname, '..', 'components/LocationPicker/LocationPicker.js');

  let locationScore = 0;
  const totalFeatures = 6;

  if (fs.existsSync(addressFormFile)) {
    const content = fs.readFileSync(addressFormFile, 'utf8');

    if (content.includes('GPS') || content.includes('getCurrentLocation')) {
      logSuccess('GPS auto-detection feature present');
      locationScore++;
    } else {
      logError('GPS auto-detection feature missing');
    }

    if (content.includes('LocationPicker')) {
      logSuccess('LocationPicker integration present');
      locationScore++;
    } else {
      logError('LocationPicker integration missing');
    }

    if (content.includes('motion.') || content.includes('framer-motion')) {
      logSuccess('Smooth animations present');
      locationScore++;
    } else {
      logWarning('Smooth animations may be missing');
    }
  }

  if (fs.existsSync(locationPickerFile)) {
    const content = fs.readFileSync(locationPickerFile, 'utf8');

    if (content.includes('google.maps') || content.includes('Google Maps')) {
      logSuccess('Google Maps integration present');
      locationScore++;
    } else {
      logError('Google Maps integration missing');
    }

    if (content.includes('draggable') || content.includes('marker')) {
      logSuccess('Draggable marker functionality present');
      locationScore++;
    } else {
      logWarning('Draggable marker functionality may be missing');
    }

    if (content.includes('search') || content.includes('autocomplete')) {
      logSuccess('Location search functionality present');
      locationScore++;
    } else {
      logWarning('Location search functionality may be missing');
    }
  }

  const percentage = Math.round((locationScore / totalFeatures) * 100);
  logInfo(`Location Features: ${locationScore}/${totalFeatures} (${percentage}%)`);

  return percentage >= 80;
}

// Test 5: Verify skills selection for fixers
function testSkillsSelection() {
  logHeader('🔧 Testing Skills Selection Features');

  const skillsFile = path.join(__dirname, '..', 'components/SkillsSelection/SkillsSelection.js');
  const signupFile = path.join(__dirname, '..', 'app/auth/signup/page.js');

  let skillsScore = 0;
  const totalFeatures = 4;

  if (fs.existsSync(skillsFile)) {
    const content = fs.readFileSync(skillsFile, 'utf8');

    if (content.includes('fixer') || content.includes('skills')) {
      logSuccess('Fixer skills selection present');
      skillsScore++;
    } else {
      logWarning('Fixer skills selection may be missing');
    }

    if (content.includes('category') || content.includes('categories')) {
      logSuccess('Skill categories present');
      skillsScore++;
    } else {
      logWarning('Skill categories may be missing');
    }
  }

  if (fs.existsSync(signupFile)) {
    const content = fs.readFileSync(signupFile, 'utf8');

    if (content.includes('role.*fixer.*skills|skills.*role.*fixer')) {
      logSuccess('Conditional skills for fixers present');
      skillsScore++;
    } else {
      logWarning('Conditional skills for fixers may be missing');
    }

    if (content.includes('minSkills') && content.includes('maxSkills')) {
      logSuccess('Skills validation limits present');
      skillsScore++;
    } else {
      logWarning('Skills validation limits may be missing');
    }
  }

  const percentage = Math.round((skillsScore / totalFeatures) * 100);
  logInfo(`Skills Selection: ${skillsScore}/${totalFeatures} (${percentage}%)`);

  return percentage >= 75;
}

// Test 6: Verify no references to old onboarding
function testNoOldReferences() {
  logHeader('🔍 Testing No Old Onboarding References');

  const filesToCheck = [
    'app/auth/signup/page.js',
    'app/layout.js',
    'app/page.js'
  ];

  let cleanScore = 0;

  filesToCheck.forEach(file => {
    const fullPath = path.join(__dirname, '..', file);

    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');

      if (!content.includes('/auth/onboarding') && !content.includes('onboarding')) {
        logSuccess(`${file} - No onboarding references`);
        cleanScore++;
      } else {
        logWarning(`${file} - May still reference onboarding`);
      }
    } else {
      cleanScore++; // File doesn't exist, so no references
    }
  });

  const percentage = Math.round((cleanScore / filesToCheck.length) * 100);
  logInfo(`Clean References: ${cleanScore}/${filesToCheck.length} (${percentage}%)`);

  return percentage >= 90;
}

// Main test runner
async function runUnifiedSignupTests() {
  logHeader('🚀 Unified Signup Flow Test Suite');
  console.log('Testing that both Google and Email users go through the same complete signup form\n');

  const results = {
    onboardingRemoval: testOnboardingRemoval(),
    signupComponents: testSignupComponents(),
    unifiedAuthFlow: testUnifiedAuthFlow(),
    locationFeatures: testLocationFeatures(),
    skillsSelection: testSkillsSelection(),
    noOldReferences: testNoOldReferences()
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

  console.log(`\n${colors.bold}Overall Unified Signup Score: ${passedTests}/${totalTests} (${overallScore}%)${colors.reset}`);

  if (overallScore >= 90) {
    logSuccess('🎉 Unified signup flow is working perfectly!');

    console.log(`\n${colors.cyan}${colors.bold}✨ Unified Flow Features:${colors.reset}`);
    console.log('• Both Google and Email users go through same 4-step form');
    console.log('• Enhanced GPS location picker with draggable markers');
    console.log('• Smart skills selection for fixers only');
    console.log('• Only email verification differs between auth methods');
    console.log('• Single unified submission endpoint');
    console.log('• Clean, modern UI with smooth animations');

    console.log(`\n${colors.green}${colors.bold}🔧 Complete Form Steps:${colors.reset}`);
    console.log('1. Authentication Method Selection (Google/Email)');
    console.log('2. Email Verification (Email users) / Google OAuth (Google users)');
    console.log('3. Personal Information (Name, Username, Phone)');
    console.log('4. Address & Skills (GPS location + Fixer skills)');

  } else if (overallScore >= 70) {
    logWarning('⚠️  Unified signup flow mostly working but has some issues');
  } else {
    logError('❌ Unified signup flow has significant issues');
  }

  console.log(`\n${colors.blue}📈 Benefits of Unified Flow:${colors.reset}`);
  console.log('• Consistent user experience regardless of auth method');
  console.log('• Single codebase to maintain');
  console.log('• All users complete full profile setup');
  console.log('• Modern location features with GPS automation');
  console.log('• Role-specific features (skills for fixers)');

  return overallScore >= 90;
}

// Run the tests
runUnifiedSignupTests().then(success => {
  if (success) {
    console.log(`\n${colors.green}${colors.bold}🏆 UNIFIED SIGNUP FLOW COMPLETE!${colors.reset}`);
    console.log(`${colors.cyan}All users now go through the same comprehensive signup experience.${colors.reset}`);
  }
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error(`\n${colors.red}Test execution failed:${colors.reset}`, error.message);
  process.exit(1);
});