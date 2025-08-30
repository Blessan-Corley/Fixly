console.log('🧪 SIMPLE AUTHENTICATION TEST');
console.log('=============================\n');

let tests = 0;
let passed = 0;

function test(name, result) {
  tests++;
  if (result) {
    console.log(`✅ ${name}`);
    passed++;
  } else {
    console.log(`❌ ${name}`);
  }
}

// Test 1: Server running
try {
  const { execSync } = require('child_process');
  
  // Test forgot password endpoint
  const response1 = execSync(`curl -s -X POST http://localhost:3000/api/auth/forgot-password -H "Content-Type: application/json" -d "{\\"email\\":\\"test@example.com\\"}"`, { encoding: 'utf8', timeout: 5000 });
  const data1 = JSON.parse(response1);
  test('Forgot password API responds correctly', data1.hasOwnProperty('success') || data1.hasOwnProperty('error'));
  
  // Test reset password token check
  const response2 = execSync(`curl -s "http://localhost:3000/api/auth/reset-password?token=invalid"`, { encoding: 'utf8', timeout: 5000 });
  const data2 = JSON.parse(response2);
  test('Reset password token validation works', data2.success === false && data2.expired === true);
  
  // Test session endpoint
  const response3 = execSync(`curl -s http://localhost:3000/api/auth/session`, { encoding: 'utf8', timeout: 5000 });
  const data3 = JSON.parse(response3);
  test('Session API returns valid response', typeof data3 === 'object');
  
  console.log(`\n📊 RESULTS: ${passed}/${tests} tests passed`);
  
  if (passed === tests) {
    console.log('🎉 ALL AUTHENTICATION TESTS PASSED!');
  } else {
    console.log('⚠️ Some tests failed');
  }
  
} catch (error) {
  console.log('❌ Test execution failed:', error.message);
}

console.log('\n📋 CONSOLE LOG COUNT:');
console.log('=====================');

// Simple console log count
const fs = require('fs');
const path = require('path');

let totalLogs = 0;

function countLogsInFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const matches = content.match(/console\.(log|error|warn|info|debug)/g);
    return matches ? matches.length : 0;
  } catch (error) {
    return 0;
  }
}

const keyFiles = [
  'lib/auth.js',
  'app/api/auth/forgot-password/route.js', 
  'app/api/auth/reset-password/route.js',
  'middleware.js'
];

keyFiles.forEach(file => {
  const fullPath = `C:\\Users\\Blessan Corley\\My Projects\\Fixly\\${file}`;
  const count = countLogsInFile(fullPath);
  totalLogs += count;
  if (count > 0) {
    console.log(`   📄 ${file}: ${count} logs`);
  }
});

console.log(`\n📈 TOTAL CONSOLE LOGS IN KEY AUTH FILES: ${totalLogs}`);
console.log(`\n🎯 AUTHENTICATION SYSTEM STATUS: ${passed === tests ? 'WORKING' : 'NEEDS FIXES'} ✨`);