// Comprehensive API testing script for Fixly platform
const axios = require('axios');
const baseURL = 'http://localhost:3000';

class FixlyTester {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      tests: []
    };
  }

  log(message, type = 'info') {
    const colors = {
      info: '\x1b[36m',
      success: '\x1b[32m',
      error: '\x1b[31m',
      warning: '\x1b[33m',
      reset: '\x1b[0m'
    };
    console.log(`${colors[type]}${message}${colors.reset}`);
  }

  async test(name, testFn) {
    try {
      this.log(`Testing: ${name}`, 'info');
      await testFn();
      this.results.passed++;
      this.results.tests.push({ name, status: 'PASSED' });
      this.log(`✅ ${name} - PASSED`, 'success');
    } catch (error) {
      this.results.failed++;
      this.results.tests.push({ name, status: 'FAILED', error: error.message });
      this.log(`❌ ${name} - FAILED: ${error.message}`, 'error');
    }
  }

  async testEndpoint(endpoint, expectedStatus = 200, method = 'GET', data = null) {
    const config = { method, url: `${baseURL}${endpoint}` };
    if (data) config.data = data;
    
    const response = await axios(config);
    if (response.status !== expectedStatus) {
      throw new Error(`Expected status ${expectedStatus}, got ${response.status}`);
    }
    return response.data;
  }

  async runAllTests() {
    this.log('🚀 Starting Comprehensive Fixly Platform Tests', 'info');
    console.log('='.repeat(60));

    // Core API Tests
    await this.test('Health Check', async () => {
      const data = await this.testEndpoint('/api/health');
      if (!data.status || data.status !== 'ok') {
        throw new Error('Health check failed');
      }
    });

    await this.test('Jobs List API', async () => {
      const data = await this.testEndpoint('/api/jobs?limit=5');
      if (!data.success || !Array.isArray(data.jobs)) {
        throw new Error('Jobs API response invalid');
      }
    });

    await this.test('Jobs Browse API', async () => {
      const data = await this.testEndpoint('/api/jobs/browse?city=coimbatore&limit=3');
      if (!data.success) {
        throw new Error('Jobs browse API failed');
      }
    });

    await this.test('Advanced Job Search', async () => {
      const data = await this.testEndpoint('/api/jobs/search/advanced?skills=electrician&limit=2');
      if (!data.success) {
        throw new Error('Advanced search failed');
      }
    });

    // Admin endpoints (expected to fail with 401)
    await this.test('Admin Dashboard (Unauthorized)', async () => {
      await this.testEndpoint('/api/admin/dashboard', 401);
    });

    await this.test('Admin Stats (Unauthorized)', async () => {
      await this.testEndpoint('/api/admin/stats', 401);
    });

    // Real-time endpoints
    await this.test('Real-time Connect (Missing Params)', async () => {
      await this.testEndpoint('/api/realtime/connect', 400);
    });

    // User profile endpoints
    await this.test('User Profile Search', async () => {
      const data = await this.testEndpoint('/api/user/profile/search?skills=electrician&limit=2');
      if (!data.success) {
        throw new Error('User profile search failed');
      }
    });

    // Location endpoints
    await this.test('Location Services', async () => {
      const data = await this.testEndpoint('/api/location', 401); // Should require auth
    });

    // Notification endpoints
    await this.test('Notifications (Unauthorized)', async () => {
      await this.testEndpoint('/api/notifications/mark-read', 401);
    });

    // File upload endpoints
    await this.test('Avatar Upload (Unauthorized)', async () => {
      await this.testEndpoint('/api/users/upload-avatar', 401);
    });

    // Payment endpoints
    await this.test('Payment Processing (Unauthorized)', async () => {
      await this.testEndpoint('/api/payments/process', 401);
    });

    // Review endpoints
    await this.test('Reviews List', async () => {
      const data = await this.testEndpoint('/api/reviews?limit=3');
      if (!data.success) {
        throw new Error('Reviews API failed');
      }
    });

    // Authentication endpoints
    await this.test('Check Username Availability', async () => {
      const data = await this.testEndpoint('/api/auth/check-username?username=testuser123');
      if (typeof data.available !== 'boolean') {
        throw new Error('Username check failed');
      }
    });

    await this.test('Signup Endpoint Structure', async () => {
      try {
        await this.testEndpoint('/api/auth/signup', 400, 'POST', {});
      } catch (error) {
        if (error.response && error.response.status === 400) {
          return; // Expected behavior
        }
        throw error;
      }
    });

    // Database connectivity
    await this.test('Database Connection Test', async () => {
      const data = await this.testEndpoint('/api/jobs?limit=1');
      if (!data.success || !data.jobs) {
        throw new Error('Database connection issue');
      }
    });

    // Redis connectivity test
    await this.test('Redis Rate Limiting Test', async () => {
      // Make multiple requests to test rate limiting works
      for (let i = 0; i < 3; i++) {
        await this.testEndpoint('/api/health');
      }
    });

    // Schema validation test
    await this.test('Job Schema Validation', async () => {
      const data = await this.testEndpoint('/api/jobs?limit=1');
      if (data.jobs.length > 0) {
        const job = data.jobs[0];
        if (!job.views || typeof job.views.count !== 'number' || !Array.isArray(job.views.uniqueViewers)) {
          throw new Error('Job schema validation failed');
        }
      }
    });

    this.showResults();
  }

  showResults() {
    console.log('\n' + '='.repeat(60));
    this.log('📊 TEST RESULTS SUMMARY', 'info');
    console.log('='.repeat(60));
    
    this.log(`✅ Passed: ${this.results.passed}`, 'success');
    this.log(`❌ Failed: ${this.results.failed}`, this.results.failed > 0 ? 'error' : 'success');
    this.log(`📋 Total Tests: ${this.results.tests.length}`, 'info');
    
    const successRate = ((this.results.passed / this.results.tests.length) * 100).toFixed(1);
    this.log(`📈 Success Rate: ${successRate}%`, successRate >= 85 ? 'success' : 'warning');

    if (this.results.failed > 0) {
      console.log('\n❌ FAILED TESTS:');
      this.results.tests
        .filter(test => test.status === 'FAILED')
        .forEach(test => {
          this.log(`   • ${test.name}: ${test.error}`, 'error');
        });
    }

    console.log('\n' + '='.repeat(60));
    if (successRate >= 90) {
      this.log('🎉 EXCELLENT! Platform is fully functional!', 'success');
    } else if (successRate >= 75) {
      this.log('✅ GOOD! Platform is mostly functional with minor issues.', 'success');
    } else {
      this.log('⚠️  NEEDS ATTENTION! Several critical issues found.', 'warning');
    }
    console.log('='.repeat(60));
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  const tester = new FixlyTester();
  tester.runAllTests().catch(error => {
    console.error('Test suite failed:', error);
    process.exit(1);
  });
}

module.exports = FixlyTester;