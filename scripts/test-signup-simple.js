// Simple test of signup API
const fetch = require('node-fetch');

async function testSignup() {
  console.log('🧪 Testing simplified signup...');

  const testUser = {
    name: 'Test User',
    email: `test${Date.now()}@example.com`,
    password: 'TestPass123!',
    phone: '9876543210',
    role: 'hirer',
    authMethod: 'email',
    location: {
      address: 'Mumbai, India',
      city: 'Mumbai',
      state: 'Maharashtra',
      lat: 19.0760,
      lng: 72.8777
    }
  };

  try {
    console.log('📤 Sending signup request...');
    console.time('Signup Duration');

    const response = await fetch('http://localhost:3000/api/auth/signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testUser)
    });

    console.timeEnd('Signup Duration');

    const result = await response.text();
    console.log('📋 Response status:', response.status);
    console.log('📋 Response:', result);

    if (response.ok) {
      console.log('✅ Signup successful!');

      // Now test login
      console.log('\n🔐 Testing login...');
      console.time('Login Duration');

      const loginResponse = await fetch('http://localhost:3000/api/auth/callback/credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          email: testUser.email,
          password: testUser.password,
          loginMethod: 'email',
          csrfToken: 'test'
        })
      });

      console.timeEnd('Login Duration');
      console.log('🔐 Login status:', loginResponse.status);

    } else {
      console.log('❌ Signup failed');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testSignup();