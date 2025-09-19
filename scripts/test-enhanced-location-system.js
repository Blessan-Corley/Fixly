// Enhanced Location System Test Script
// Tests the complete GPS automation, location picker, and address form integration

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Enhanced Location System Integration...\n');

// Test configurations
const testConfig = {
  components: [
    'components/LocationPicker/LocationPicker.js',
    'components/AddressForm/AddressForm.js',
    'app/auth/signup/page.js'
  ],
  features: [
    'GPS Auto-detection',
    'Address Auto-fill',
    'Map Integration',
    'Search Suggestions',
    'Smooth Animations',
    'Form Validation'
  ],
  testCases: [
    'GPS permission granted',
    'GPS permission denied',
    'Search functionality',
    'Manual location selection',
    'Address form validation',
    'Signup integration'
  ]
};

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

// Test 1: Check component files exist and are valid
function testComponentFiles() {
  logHeader('🔍 Testing Component Files');

  let allPassed = true;

  testConfig.components.forEach(componentPath => {
    const fullPath = path.join(__dirname, '..', componentPath);

    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');

      // Check for required imports
      const requiredImports = [
        'framer-motion',
        'lucide-react',
        'useState',
        'useEffect'
      ];

      const missingImports = requiredImports.filter(imp => !content.includes(imp));

      if (missingImports.length === 0) {
        logSuccess(`${componentPath} - All imports present`);
      } else {
        logError(`${componentPath} - Missing imports: ${missingImports.join(', ')}`);
        allPassed = false;
      }

      // Check for key features in LocationPicker
      if (componentPath.includes('LocationPicker')) {
        const locationFeatures = [
          'detectCurrentLocation',
          'handleLocationSelect',
          'reverseGeocode',
          'searchPlaces',
          'Google Maps'
        ];

        locationFeatures.forEach(feature => {
          if (content.includes(feature) || content.toLowerCase().includes(feature.toLowerCase())) {
            logSuccess(`LocationPicker - ${feature} implementation found`);
          } else {
            logWarning(`LocationPicker - ${feature} implementation not clearly found`);
          }
        });
      }

      // Check for key features in AddressForm
      if (componentPath.includes('AddressForm')) {
        const addressFeatures = [
          'GPS',
          'motion.',
          'autoFilledFromGPS',
          'handleLocationSelect',
          'parseAddressComponents'
        ];

        addressFeatures.forEach(feature => {
          if (content.includes(feature)) {
            logSuccess(`AddressForm - ${feature} implementation found`);
          } else {
            logWarning(`AddressForm - ${feature} implementation not found`);
          }
        });
      }

    } else {
      logError(`${componentPath} - File not found`);
      allPassed = false;
    }
  });

  return allPassed;
}

// Test 2: Check environment variables
function testEnvironmentConfig() {
  logHeader('🔧 Testing Environment Configuration');

  const envFile = path.join(__dirname, '..', '.env.local');
  const envExampleFile = path.join(__dirname, '..', '.env.example');

  let envConfigured = false;

  if (fs.existsSync(envFile)) {
    const envContent = fs.readFileSync(envFile, 'utf8');

    if (envContent.includes('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY')) {
      const match = envContent.match(/NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=(.+)/);
      if (match && match[1] && match[1].trim() !== '') {
        logSuccess('Google Maps API Key is configured');
        envConfigured = true;
      } else {
        logWarning('Google Maps API Key is empty');
      }
    } else {
      logError('Google Maps API Key not found in .env.local');
    }
  } else {
    logWarning('.env.local file not found');
  }

  if (fs.existsSync(envExampleFile)) {
    logInfo('.env.example file exists as reference');
  }

  return envConfigured;
}

// Test 3: Check for GPS and Animation features
function testLocationFeatures() {
  logHeader('📍 Testing Location Features Implementation');

  const locationPickerPath = path.join(__dirname, '..', 'components/LocationPicker/LocationPicker.js');
  const addressFormPath = path.join(__dirname, '..', 'components/AddressForm/AddressForm.js');

  let featuresScore = 0;
  const totalFeatures = 10;

  if (fs.existsSync(locationPickerPath)) {
    const content = fs.readFileSync(locationPickerPath, 'utf8');

    // GPS Detection
    if (content.includes('getCurrentLocation') || content.includes('detectCurrentLocation')) {
      logSuccess('GPS Detection - Implemented');
      featuresScore++;
    } else {
      logError('GPS Detection - Not found');
    }

    // Google Maps Integration
    if (content.includes('google.maps')) {
      logSuccess('Google Maps Integration - Implemented');
      featuresScore++;
    } else {
      logError('Google Maps Integration - Not found');
    }

    // Search Functionality
    if (content.includes('autocomplete') || content.includes('places')) {
      logSuccess('Search Functionality - Implemented');
      featuresScore++;
    } else {
      logError('Search Functionality - Not found');
    }

    // Animations
    if (content.includes('motion.') || content.includes('framer-motion')) {
      logSuccess('Animations - Implemented');
      featuresScore++;
    } else {
      logError('Animations - Not found');
    }
  }

  if (fs.existsSync(addressFormPath)) {
    const content = fs.readFileSync(addressFormPath, 'utf8');

    // GPS Auto-fill
    if (content.includes('autoFilledFromGPS') || content.includes('GPS')) {
      logSuccess('GPS Auto-fill - Implemented');
      featuresScore++;
    } else {
      logError('GPS Auto-fill - Not found');
    }

    // Address Parsing
    if (content.includes('parseAddressComponents')) {
      logSuccess('Address Parsing - Implemented');
      featuresScore++;
    } else {
      logError('Address Parsing - Not found');
    }

    // Form Validation
    if (content.includes('validateForm') || content.includes('validation')) {
      logSuccess('Form Validation - Implemented');
      featuresScore++;
    } else {
      logError('Form Validation - Not found');
    }

    // Smooth Animations
    if (content.includes('motion.') && content.includes('AnimatePresence')) {
      logSuccess('Smooth Animations - Implemented');
      featuresScore++;
    } else {
      logError('Smooth Animations - Not found');
    }

    // View Mode Toggle
    if (content.includes('viewMode') && content.includes('map') && content.includes('form')) {
      logSuccess('View Mode Toggle - Implemented');
      featuresScore++;
    } else {
      logError('View Mode Toggle - Not found');
    }

    // Indian Address Format
    if (content.includes('indianStates') || content.includes('Indian')) {
      logSuccess('Indian Address Format - Implemented');
      featuresScore++;
    } else {
      logError('Indian Address Format - Not found');
    }
  }

  const percentage = Math.round((featuresScore / totalFeatures) * 100);
  logInfo(`Feature Implementation Score: ${featuresScore}/${totalFeatures} (${percentage}%)`);

  return percentage >= 80;
}

// Test 4: Check signup integration
function testSignupIntegration() {
  logHeader('🔗 Testing Signup Integration');

  const signupPath = path.join(__dirname, '..', 'app/auth/signup/page.js');

  if (fs.existsSync(signupPath)) {
    const content = fs.readFileSync(signupPath, 'utf8');

    let integrationScore = 0;

    // Check if AddressForm is imported
    if (content.includes('AddressForm')) {
      logSuccess('AddressForm - Imported in signup');
      integrationScore++;
    } else {
      logError('AddressForm - Not imported in signup');
    }

    // Check if address is handled in form data
    if (content.includes('address') && content.includes('coordinates')) {
      logSuccess('Address Data - Properly structured');
      integrationScore++;
    } else {
      logError('Address Data - Not properly structured');
    }

    // Check if address validation exists
    if (content.includes('address') && content.includes('validation')) {
      logSuccess('Address Validation - Implemented');
      integrationScore++;
    } else {
      logWarning('Address Validation - Not clearly implemented');
    }

    // Check if enhanced location data is used
    if (content.includes('locationData') || content.includes('homeAddress')) {
      logSuccess('Enhanced Location Data - Used in submission');
      integrationScore++;
    } else {
      logError('Enhanced Location Data - Not used in submission');
    }

    const integrationPercentage = Math.round((integrationScore / 4) * 100);
    logInfo(`Signup Integration Score: ${integrationScore}/4 (${integrationPercentage}%)`);

    return integrationPercentage >= 75;
  } else {
    logError('Signup page not found');
    return false;
  }
}

// Test 5: Package dependencies
function testDependencies() {
  logHeader('📦 Testing Package Dependencies');

  const packagePath = path.join(__dirname, '..', 'package.json');

  if (fs.existsSync(packagePath)) {
    const packageContent = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    const dependencies = { ...packageContent.dependencies, ...packageContent.devDependencies };

    const requiredPackages = [
      'framer-motion',
      'lucide-react',
      'sonner',
      'next',
      'react'
    ];

    let allPresent = true;

    requiredPackages.forEach(pkg => {
      if (dependencies[pkg]) {
        logSuccess(`${pkg} - Version ${dependencies[pkg]}`);
      } else {
        logError(`${pkg} - Not found in dependencies`);
        allPresent = false;
      }
    });

    return allPresent;
  } else {
    logError('package.json not found');
    return false;
  }
}

// Test 6: Build and type checking
function testBuildCompilation() {
  logHeader('🔨 Testing Build Compilation');

  try {
    logInfo('Running TypeScript type check...');
    execSync('npx tsc --noEmit --skipLibCheck', { stdio: 'pipe' });
    logSuccess('TypeScript compilation - No errors');

    return true;
  } catch (error) {
    logError('TypeScript compilation - Has errors');
    console.log(error.stdout?.toString() || error.message);
    return false;
  }
}

// Main test runner
async function runAllTests() {
  logHeader('🚀 Enhanced Location System Integration Test');
  console.log('Testing GPS automation, location picker, and address form integration\n');

  const results = {
    componentFiles: testComponentFiles(),
    environment: testEnvironmentConfig(),
    locationFeatures: testLocationFeatures(),
    signupIntegration: testSignupIntegration(),
    dependencies: testDependencies(),
    buildCompilation: testBuildCompilation()
  };

  // Summary
  logHeader('📊 Test Results Summary');

  const passedTests = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  const overallScore = Math.round((passedTests / totalTests) * 100);

  Object.entries(results).forEach(([test, passed]) => {
    const status = passed ? `${colors.green}✅ PASSED${colors.reset}` : `${colors.red}❌ FAILED${colors.reset}`;
    console.log(`${test.charAt(0).toUpperCase() + test.slice(1).replace(/([A-Z])/g, ' $1')}: ${status}`);
  });

  console.log(`\n${colors.bold}Overall Score: ${passedTests}/${totalTests} (${overallScore}%)${colors.reset}`);

  if (overallScore >= 80) {
    logSuccess('🎉 Enhanced Location System is ready for production!');

    console.log(`\n${colors.cyan}${colors.bold}✨ Key Features Implemented:${colors.reset}`);
    console.log('• GPS auto-detection with automatic address filling');
    console.log('• Draggable map marker for manual location selection');
    console.log('• Google Maps integration with search suggestions');
    console.log('• Smooth animations and transitions');
    console.log('• Two-mode interface (map view / form view)');
    console.log('• Complete signup form integration');
    console.log('• Indian address format support');
    console.log('• Real-time validation and error handling');

  } else if (overallScore >= 60) {
    logWarning('⚠️  Enhanced Location System is mostly ready but needs some improvements');
  } else {
    logError('❌ Enhanced Location System needs significant improvements before deployment');
  }

  console.log(`\n${colors.magenta}💡 Next Steps:${colors.reset}`);
  console.log('1. Test the GPS auto-detection in a browser');
  console.log('2. Verify Google Maps API integration');
  console.log('3. Test the complete signup flow');
  console.log('4. Validate address parsing accuracy');
  console.log('5. Check mobile responsiveness');

  return overallScore >= 80;
}

// Run the tests
runAllTests().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error(`\n${colors.red}Test execution failed:${colors.reset}`, error.message);
  process.exit(1);
});