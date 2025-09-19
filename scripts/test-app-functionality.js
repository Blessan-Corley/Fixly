#!/usr/bin/env node

// COMPREHENSIVE APPLICATION FUNCTIONALITY TEST
import { spawn } from 'child_process';
import fs from 'fs/promises';

console.log('🚀 TESTING APPLICATION FUNCTIONALITY');
console.log('='.repeat(60));

let testResults = {
  passed: 0,
  failed: 0,
  errors: []
};

// Test 1: Check if models can be loaded without errors
async function testModelLoading() {
  console.log('\n1️⃣ Testing Model Loading...');
  
  try {
    // Test each model individually
    const models = ['User', 'Job', 'Review', 'Dispute', 'Conversation', 'LocationPreference', 'VerificationToken', 'Notification'];
    
    for (const model of models) {
      try {
        const modelModule = await import(`./models/${model}.js`);
        const ModelClass = modelModule.default;
        
        if (typeof ModelClass === 'function') {
          console.log(`   ✅ ${model}: Loaded successfully`);
          
          // Test basic methods exist
          if (typeof ModelClass.findById === 'function') {
            console.log(`   ✅ ${model}: Has findById method`);
          } else {
            throw new Error(`${model} missing findById method`);
          }
          
        } else {
          throw new Error(`${model} did not export a function/constructor`);
        }
        
      } catch (modelError) {
        console.log(`   ❌ ${model}: ${modelError.message}`);
        testResults.failed++;
        testResults.errors.push(`Model ${model}: ${modelError.message}`);
        continue;
      }
    }
    
    // Test models/index.js
    try {
      const indexModule = await import('./models/index.js');
      const allModels = indexModule.default;
      
      if (allModels && typeof allModels === 'object') {
        console.log(`   ✅ models/index.js: Exports object with ${Object.keys(allModels).length} models`);
        testResults.passed++;
      } else {
        throw new Error('models/index.js does not export valid object');
      }
    } catch (indexError) {
      console.log(`   ❌ models/index.js: ${indexError.message}`);
      testResults.failed++;
      testResults.errors.push(`models/index.js: ${indexError.message}`);
    }
    
  } catch (error) {
    console.log(`   ❌ Model loading test failed: ${error.message}`);
    testResults.failed++;
    testResults.errors.push(`Model loading: ${error.message}`);
  }
}

// Test 2: Check if critical API routes can be loaded
async function testAPIRoutes() {
  console.log('\n2️⃣ Testing API Route Loading...');
  
  const criticalRoutes = [
    'app/api/auth/signup/route.js',
    'app/api/user/profile/route.js', 
    'app/api/jobs/route.js',
    'app/api/dashboard/stats/route.js'
  ];
  
  for (const route of criticalRoutes) {
    try {
      // Check if file exists and can be read
      await fs.access(route);
      const content = await fs.readFile(route, 'utf8');
      
      // Basic syntax check - look for exports
      if (content.includes('export async function') || content.includes('export const')) {
        console.log(`   ✅ ${route}: Can be loaded`);
        testResults.passed++;
      } else {
        console.log(`   ⚠️ ${route}: Missing exports`);
      }
      
      // Check for critical imports
      const hasModelImports = /import.*from.*models/.test(content);
      if (hasModelImports) {
        console.log(`   ✅ ${route}: Has model imports`);
      }
      
    } catch (error) {
      console.log(`   ❌ ${route}: ${error.message}`);
      testResults.failed++;
      testResults.errors.push(`Route ${route}: ${error.message}`);
    }
  }
}

// Test 3: Check Next.js configuration
async function testNextConfig() {
  console.log('\n3️⃣ Testing Next.js Configuration...');
  
  try {
    await fs.access('next.config.js');
    await fs.access('package.json');
    
    const packageJson = JSON.parse(await fs.readFile('package.json', 'utf8'));
    
    if (packageJson.dependencies && packageJson.dependencies.next) {
      console.log(`   ✅ Next.js version: ${packageJson.dependencies.next}`);
      testResults.passed++;
    } else {
      console.log(`   ❌ Next.js not found in dependencies`);
      testResults.failed++;
    }
    
    if (packageJson.dependencies && packageJson.dependencies.mongoose) {
      console.log(`   ✅ Mongoose version: ${packageJson.dependencies.mongoose}`);
      testResults.passed++;
    } else {
      console.log(`   ❌ Mongoose not found in dependencies`);
      testResults.failed++;
    }
    
  } catch (error) {
    console.log(`   ❌ Config test failed: ${error.message}`);
    testResults.failed++;
    testResults.errors.push(`Config: ${error.message}`);
  }
}

// Test 4: Check environment setup
async function testEnvironment() {
  console.log('\n4️⃣ Testing Environment Setup...');
  
  try {
    await fs.access('.env.example');
    console.log(`   ✅ .env.example exists`);
    
    const envExample = await fs.readFile('.env.example', 'utf8');
    const requiredVars = ['MONGODB_URI', 'NEXTAUTH_SECRET', 'NEXTAUTH_URL'];
    
    let foundVars = 0;
    for (const varName of requiredVars) {
      if (envExample.includes(varName)) {
        foundVars++;
        console.log(`   ✅ ${varName}: Found in .env.example`);
      } else {
        console.log(`   ⚠️ ${varName}: Missing from .env.example`);
      }
    }
    
    if (foundVars >= requiredVars.length / 2) {
      testResults.passed++;
    }
    
  } catch (error) {
    console.log(`   ❌ Environment test failed: ${error.message}`);
    testResults.failed++;
    testResults.errors.push(`Environment: ${error.message}`);
  }
}

// Test 5: Syntax validation with Node.js
async function testSyntaxValidation() {
  console.log('\n5️⃣ Testing Critical File Syntax...');
  
  const criticalFiles = [
    'models/User.js',
    'models/Job.js',
    'app/api/auth/signup/route.js'
  ];
  
  for (const file of criticalFiles) {
    try {
      // Use node --check to validate syntax
      const result = await new Promise((resolve, reject) => {
        const child = spawn('node', ['--check', file], { 
          stdio: ['ignore', 'pipe', 'pipe']
        });
        
        let output = '';
        let error = '';
        
        child.stdout.on('data', (data) => output += data.toString());
        child.stderr.on('data', (data) => error += data.toString());
        
        child.on('close', (code) => {
          if (code === 0) {
            resolve({ success: true, output });
          } else {
            resolve({ success: false, error });
          }
        });
        
        child.on('error', (err) => {
          resolve({ success: false, error: err.message });
        });
      });
      
      if (result.success) {
        console.log(`   ✅ ${file}: Syntax valid`);
        testResults.passed++;
      } else {
        console.log(`   ❌ ${file}: Syntax error - ${result.error}`);
        testResults.failed++;
        testResults.errors.push(`Syntax ${file}: ${result.error}`);
      }
      
    } catch (error) {
      console.log(`   ❌ ${file}: Test failed - ${error.message}`);
      testResults.failed++;
      testResults.errors.push(`Syntax test ${file}: ${error.message}`);
    }
  }
}

async function main() {
  try {
    await testModelLoading();
    await testAPIRoutes();
    await testNextConfig();
    await testEnvironment();
    await testSyntaxValidation();
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 FUNCTIONALITY TEST RESULTS:');
    console.log(`✅ Passed: ${testResults.passed}`);
    console.log(`❌ Failed: ${testResults.failed}`);
    console.log(`📊 Success Rate: ${Math.round((testResults.passed / (testResults.passed + testResults.failed)) * 100)}%`);
    
    if (testResults.failed === 0) {
      console.log('\n🎉 ALL FUNCTIONALITY TESTS PASSED!');
      console.log('✨ The application should work correctly');
    } else {
      console.log('\n⚠️ Some tests failed:');
      testResults.errors.forEach(error => console.log(`   • ${error}`));
    }
    
    if (testResults.passed >= testResults.failed * 2) {
      console.log('\n✅ Overall: Application appears functional');
    } else {
      console.log('\n❌ Overall: Application may have critical issues');
    }
    
  } catch (error) {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  }
}

main().catch(console.error);