console.log('🧪 DIRECT AUTHENTICATION API TEST');
console.log('==================================\n');

const http = require('http');

function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 5000
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch (error) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function runTests() {
  let tests = 0;
  let passed = 0;

  function test(name, condition) {
    tests++;
    if (condition) {
      console.log(`✅ ${name}`);
      passed++;
    } else {
      console.log(`❌ ${name}`);
    }
  }

  try {
    // Test 1: Server health
    const health = await makeRequest('GET', '/api/auth/session');
    test('Server is responding', health.status < 500);

    // Test 2: Forgot password with invalid email
    const forgotTest1 = await makeRequest('POST', '/api/auth/forgot-password', {
      email: 'nonexistent@test.com'
    });
    test('Forgot password handles non-existent email', forgotTest1.data.error && forgotTest1.data.error.includes('No account found'));

    // Test 3: Forgot password with invalid format
    const forgotTest2 = await makeRequest('POST', '/api/auth/forgot-password', {
      email: 'invalid-email'
    });
    test('Forgot password handles invalid email format', forgotTest2.data.error && forgotTest2.data.error.includes('valid email'));

    // Test 4: Forgot password without email
    const forgotTest3 = await makeRequest('POST', '/api/auth/forgot-password', {});
    test('Forgot password requires email', forgotTest3.data.error && forgotTest3.data.error.includes('required'));

    // Test 5: Reset password token verification
    const resetTest = await makeRequest('GET', '/api/auth/reset-password?token=invalid');
    test('Reset password validates tokens', resetTest.data.error && resetTest.data.error.includes('Invalid'));

    console.log(`\n📊 TEST RESULTS:`);
    console.log(`   Passed: ${passed}/${tests}`);
    console.log(`   Success Rate: ${((passed / tests) * 100).toFixed(1)}%`);

    if (passed === tests) {
      console.log('\n🎉 ALL AUTHENTICATION TESTS PASSED! 🎉');
    } else {
      console.log('\n⚠️  Some tests failed');
    }

  } catch (error) {
    console.log('❌ Test failed:', error.message);
  }
}

runTests();