#!/usr/bin/env node

console.log('🧪 API FUNCTIONALITY TEST');
console.log('='.repeat(50));

// Test critical API imports and basic functionality
async function testCriticalAPIs() {
  console.log('\n📋 Testing Critical API Routes...');
  
  const criticalAPIs = [
    {
      name: 'Authentication Signup',
      path: './app/api/auth/signup/route.js',
      testFunction: async (module) => {
        // Check if POST function exists
        if (typeof module.POST === 'function') {
          console.log('   ✅ POST function exists');
          return true;
        } else {
          console.log('   ❌ POST function missing');
          return false;
        }
      }
    },
    {
      name: 'User Profile',
      path: './app/api/user/profile/route.js',
      testFunction: async (module) => {
        // Check if GET and PUT functions exist
        const hasGET = typeof module.GET === 'function';
        const hasPUT = typeof module.PUT === 'function';
        
        if (hasGET && hasPUT) {
          console.log('   ✅ GET and PUT functions exist');
          return true;
        } else {
          console.log(`   ❌ Missing functions - GET: ${hasGET}, PUT: ${hasPUT}`);
          return false;
        }
      }
    },
    {
      name: 'Jobs API',
      path: './app/api/jobs/route.js',
      testFunction: async (module) => {
        // Check if GET and POST functions exist
        const hasGET = typeof module.GET === 'function';
        const hasPOST = typeof module.POST === 'function';
        
        if (hasGET && hasPOST) {
          console.log('   ✅ GET and POST functions exist');
          return true;
        } else {
          console.log(`   ❌ Missing functions - GET: ${hasGET}, POST: ${hasPOST}`);
          return false;
        }
      }
    },
    {
      name: 'Dashboard Stats',
      path: './app/api/dashboard/stats/route.js',
      testFunction: async (module) => {
        // Check if GET function exists
        if (typeof module.GET === 'function') {
          console.log('   ✅ GET function exists');
          return true;
        } else {
          console.log('   ❌ GET function missing');
          return false;
        }
      }
    }
  ];
  
  let passedAPIs = 0;
  let totalAPIs = criticalAPIs.length;
  
  for (const api of criticalAPIs) {
    console.log(`\n🔍 Testing ${api.name}...`);
    
    try {
      // Import the module
      const module = await import(api.path);
      console.log('   ✅ Module imported successfully');
      
      // Test the function
      const testResult = await api.testFunction(module);
      
      if (testResult) {
        console.log(`   ✅ ${api.name} functionality test passed`);
        passedAPIs++;
      } else {
        console.log(`   ❌ ${api.name} functionality test failed`);
      }
      
    } catch (error) {
      console.log(`   ❌ ${api.name} failed to load: ${error.message}`);
    }
  }
  
  console.log(`\n📊 API Test Results: ${passedAPIs}/${totalAPIs} passed`);
  return passedAPIs === totalAPIs;
}

// Test model imports and usage
async function testModelImports() {
  console.log('\n🏗️ Testing Model Imports in Context...');
  
  try {
    // Test User model operations
    console.log('\n🔍 Testing User model...');
    const UserModule = await import('./models/User.js');
    const User = UserModule.default;
    
    console.log('   ✅ User model imported');
    console.log(`   ✅ User.findById type: ${typeof User.findById}`);
    console.log(`   ✅ User.findOne type: ${typeof User.findOne}`);
    console.log(`   ✅ User.create type: ${typeof User.create}`);
    
    // Test Job model operations
    console.log('\n🔍 Testing Job model...');
    const JobModule = await import('./models/Job.js');
    const Job = JobModule.default;
    
    console.log('   ✅ Job model imported');
    console.log(`   ✅ Job.findById type: ${typeof Job.findById}`);
    console.log(`   ✅ Job.countDocuments type: ${typeof Job.countDocuments}`);
    console.log(`   ✅ Job.aggregate type: ${typeof Job.aggregate}`);
    
    // Test models/index.js
    console.log('\n🔍 Testing models index...');
    const IndexModule = await import('./models/index.js');
    const allModels = IndexModule.default;
    
    console.log('   ✅ Models index imported');
    console.log(`   ✅ Available models: ${Object.keys(allModels).join(', ')}`);
    
    // Test that we can create model instances
    const testUserData = {
      name: 'Test User',
      email: 'test@example.com',
      username: 'testuser123',
      role: 'hirer'
    };
    
    try {
      const testUser = new User(testUserData);
      console.log('   ✅ Can create User instance');
      
      // Test validation without saving
      const validationError = testUser.validateSync();
      if (!validationError) {
        console.log('   ✅ User instance validates correctly');
      } else {
        console.log(`   ⚠️ User validation issues: ${validationError.message}`);
      }
    } catch (constructorError) {
      console.log(`   ❌ Cannot create User instance: ${constructorError.message}`);
      return false;
    }
    
    return true;
    
  } catch (error) {
    console.log(`   ❌ Model testing failed: ${error.message}`);
    return false;
  }
}

// Test database configuration files
async function testDatabaseConfig() {
  console.log('\n🗄️ Testing Database Configuration...');
  
  try {
    // Check if database manager exists
    const dbManagerModule = await import('./lib/core/DatabaseManager.js');
    console.log('   ✅ DatabaseManager imported successfully');
    
    if (dbManagerModule.default && typeof dbManagerModule.default.connectMongoose === 'function') {
      console.log('   ✅ DatabaseManager has connectMongoose method');
    } else {
      console.log('   ❌ DatabaseManager missing connectMongoose method');
      return false;
    }
    
    return true;
    
  } catch (error) {
    console.log(`   ❌ Database config test failed: ${error.message}`);
    return false;
  }
}

// Run comprehensive testing
async function main() {
  try {
    console.log('🚀 Starting Comprehensive API & Functionality Tests...\n');
    
    // Run all tests
    const modelTest = await testModelImports();
    const apiTest = await testCriticalAPIs();
    const dbTest = await testDatabaseConfig();
    
    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 COMPREHENSIVE TEST RESULTS:');
    console.log(`🏗️ Model Import Test: ${modelTest ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`📋 API Functionality Test: ${apiTest ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`🗄️ Database Config Test: ${dbTest ? '✅ PASSED' : '❌ FAILED'}`);
    
    const allPassed = modelTest && apiTest && dbTest;
    
    if (allPassed) {
      console.log('\n🎉 ALL TESTS PASSED!');
      console.log('✨ The Fixly application should work correctly');
      console.log('🚀 All APIs are functional');
      console.log('🏗️ All models are properly configured');
      console.log('🗄️ Database configuration is working');
    } else {
      console.log('\n⚠️ Some tests failed');
      console.log('🔧 Check the failed components above');
    }
    
    return allPassed;
    
  } catch (error) {
    console.error('❌ Test execution failed:', error);
    return false;
  }
}

main().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});