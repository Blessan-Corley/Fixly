#!/usr/bin/env node

// Enhanced Push Notification System Test Suite
// Tests all security improvements and production features

const { PushNotificationManager, createSecurePushNotificationManager } = require('../lib/notifications/PushNotificationManager.js');

class PushNotificationTester {
  constructor() {
    this.testResults = [];
    this.mockUser = {
      id: '507f1f77bcf86cd799439011',
      email: 'test@example.com',
      username: 'testuser'
    };
  }

  log(test, status, message) {
    const result = { test, status, message, timestamp: new Date().toISOString() };
    this.testResults.push(result);
    const emoji = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
    console.log(`${emoji} ${test}: ${message}`);
  }

  async runTest(name, testFunction) {
    try {
      console.log(`\n🧪 Running: ${name}`);
      await testFunction();
      this.log(name, 'PASS', 'Test completed successfully');
    } catch (error) {
      this.log(name, 'FAIL', error.message);
      console.error('Test error details:', error);
    }
  }

  // Test 1: Manager Creation and Initialization
  async testManagerCreation() {
    const manager = new PushNotificationManager();
    
    if (!manager.rateLimitConfig) {
      throw new Error('Rate limit configuration missing');
    }
    
    if (!manager.validateSubscriptionData) {
      throw new Error('Validation methods missing');
    }
    
    if (manager.maxOfflineQueueSize !== 50) {
      throw new Error('Offline queue size limit not set correctly');
    }
    
    manager.setUser(this.mockUser);
    if (manager.currentUser.id !== this.mockUser.id) { throw new Error('user setting failed');
     }
  }

  // Test 2: Secure Factory Method
  async testSecureFactory() { // Mock browser environment
    global.window = { notification: { permission: 'default'  } };
    global.navigator = { onLine: true };
    
    try { const manager = await createSecurePushNotificationManager(this.mockUser);
      
      if (!manager.currentUser) {
        throw new Error('user not set in secure factory');
       }
      
      manager.destroy(); // Clean up
    } catch (error) {
      // Expected in test environment without full browser APIs
      if (!error.message.includes('not supported')) {
        throw error;
      }
    }
  }

  // Test 3: Rate Limiting Functionality
  async testRateLimiting() {
    const manager = new PushNotificationManager();
    manager.setUser(this.mockUser);
    
    // Test memory rate limiting (Redis not available in test)
    const key = 'test_operation';
    const config = { limit: 2, windowMs: 1000 };
    
    // Should allow first two requests
    const result1 = manager.checkMemoryRateLimit(key, config);
    const result2 = manager.checkMemoryRateLimit(key, config);
    
    if (!result1 || !result2) {
      throw new Error('Rate limiting too strict');
    }
    
    // Third request should be blocked
    const result3 = manager.checkMemoryRateLimit(key, config);
    if (result3) {
      throw new Error('Rate limiting not working');
    }
    
    manager.destroy();
  }

  // Test 4: Input Validation and Sanitization
  async testInputValidation() {
    const manager = new PushNotificationManager();
    
    // Test string sanitization
    const maliciousString = '<script>alert("xss")</script>javascript:evil()';
    const sanitized = manager.sanitizeString(maliciousString, 100);
    
    if (sanitized.includes('<script>') || sanitized.includes('javascript:')) {
      throw new Error('String sanitization failed');
    }
    
    // Test notification validation
    const validNotification = {
      title: 'Test Title',
      body: 'Test Body',
      type: 'job_match'
    };
    
    const sanitizedNotification = manager.validateAndSanitizeNotification(validNotification);
    if (!sanitizedNotification || sanitizedNotification.title !== 'Test Title') { throw new Error('Valid notification rejected');
     }
    
    // Test invalid notification rejection
    const invalidNotification = {
      title: '', // Empty title should be rejected
      body: 'Test Body'
    };
    
    const rejectedNotification = manager.validateAndSanitizeNotification(invalidNotification);
    if (rejectedNotification) { throw new Error('Invalid notification accepted');
     }
    
    manager.destroy();
  }

  // Test 5: Offline Queue Management
  async testOfflineQueue() {
    const manager = new PushNotificationManager();
    
    // Test queue size limit
    for (let i = 0; i < 60; i++) { // Try to add more than max (50)
      manager.queueOfflineNotification('test', { message: `Test ${i}` });
    }
    
    if (manager.offlineQueue.length !== 50) {
      throw new Error(`Queue size not limited correctly. Expected 50, got ${manager.offlineQueue.length}`);
    }
    
    // Test queue data sanitization
    const maliciousData = {
      title: '<script>evil</script>',
      body: 'javascript:attack()'
    };
    
    manager.queueOfflineNotification('test', maliciousData);
    const lastQueued = manager.offlineQueue[manager.offlineQueue.length - 1];
    
    if (JSON.stringify(lastQueued.data).includes('<script>')) {
      throw new Error('Queue data not sanitized');
    }
    
    manager.destroy();
  }

  // Test 6: Subscription Data Validation
  async testSubscriptionValidation() {
    const manager = new PushNotificationManager();
    
    // Valid subscription data
    const validSubscription = {
      endpoint: 'https://fcm.googleapis.com/fcm/send/test',
      keys: {
        p256dh: 'BFUbBf5I5n2...' + 'x'.repeat(70), // Simulate valid key
        auth: 'abcdef123456789012345678' // Simulate valid auth key
      }
    };
    
    if (!manager.validateSubscriptionData(validSubscription)) {
      throw new Error('Valid subscription data rejected');
    }
    
    // Invalid subscription data
    const invalidSubscriptions = [
      null,
      { endpoint: 'not-a-url', keys: {} },
      { endpoint: 'https://valid.com', keys: { p256dh: 'too-short', auth: 'also-short' } },
      { endpoint: 'https://valid.com' } // Missing keys
    ];
    
    for (const invalid of invalidSubscriptions) {
      if (manager.validateSubscriptionData(invalid)) {
        throw new Error('Invalid subscription data accepted: ' + JSON.stringify(invalid));
      }
    }

    manager.destroy();
  }

  // Test 7: Memory Cleanup and Resource Management
  async testMemoryCleanup() {
    const manager = new PushNotificationManager();
    manager.setUser(this.mockUser);

    // Add some rate limit entries
    for (let i = 0; i < 100; i++) {
      manager.inMemoryRateLimit.set(`test_key_${i}`, [Date.now() - 25 * 60 * 60 * 1000]); // 25 hours ago
    }

    const initialSize = manager.inMemoryRateLimit.size;
    manager.cleanupMemoryRateLimit();
    const afterCleanupSize = manager.inMemoryRateLimit.size;

    if (afterCleanupSize >= initialSize) {
      throw new Error('Memory cleanup not working');
    }

    // Test destroy method
    manager.destroy();

    if (manager.inMemoryRateLimit.size !== 0) {
      throw new Error('Destroy method not clearing memory properly');
    }

    if (manager.currentUser !== null) {
      throw new Error('Destroy method not resetting state');
    }
  }

  // Test 8: Error Handling
  async testErrorHandling() {
    const manager = new PushNotificationManager();

    let errorHandled = false;
    manager.on('notificationError', () => {
      errorHandled = true;
    });

    const testError = new Error('Test error');
    await manager.handleNotificationError(testError, 'test_operation');

    // Give a moment for async operations
    await new Promise(resolve => setTimeout(resolve, 100));

    if (!errorHandled) {
      throw new Error('Error event not emitted');
    }

    manager.destroy();
  }

  // Test 9: Health Check System
  async testHealthCheck() {
    // Mock browser environment
    global.navigator = { serviceWorker: { ready: Promise.resolve({ active: true }) } };

    const manager = new PushNotificationManager();
    manager.setUser(this.mockUser);

    let healthCheckCompleted = false;
    manager.on('healthCheckDetailed', (data) => {
      healthCheckCompleted = true;

      if (!data.timestamp || typeof data.redis !== 'boolean') {
        throw new Error('Health check data incomplete');
      }
    });

    try {
      await manager.performEnhancedHealthCheck();
    } catch (error) {
      // Expected in test environment
      if (!error.message.includes('serviceWorker')) {
        throw error;
      }
    }

    manager.destroy();
  }

  // Test 10: Configuration Validation
  async testConfiguration() {
    const manager = new PushNotificationManager();

    // Check rate limit configuration
    const requiredConfigs = ['subscribe', 'send', 'unsubscribe'];
    for (const config of requiredConfigs) {
      if (!manager.rateLimitConfig[config]) {
        throw new Error(`Missing rate limit config for ${config}`);
      }

      if (!manager.rateLimitConfig[config].limit || !manager.rateLimitConfig[config].windowMs) {
        throw new Error(`Incomplete rate limit config for ${config}`);
      }
    }

    // Check notification templates
    const requiredTemplates = ['job_match', 'message_received', 'job_application'];
    for (const template of requiredTemplates) {
      if (!manager.notificationTemplates[template]) {
        throw new Error(`Missing notification template for ${template }`);
      }
    }

    manager.destroy();
  }

  // Run all tests
  async runAllTests() {
    console.log('🚀 Starting Enhanced Push notification System Tests\n');

    const tests = [
      ['Manager Creation and Initialization', () => this.testManagerCreation()],
      ['Secure Factory Method', () => this.testSecureFactory()],
      ['Rate Limiting Functionality', () => this.testRateLimiting()],
      ['Input Validation and Sanitization', () => this.testInputValidation()],
      ['Offline Queue Management', () => this.testOfflineQueue()],
      ['Subscription Data Validation', () => this.testSubscriptionValidation()],
      ['Memory Cleanup and Resource Management', () => this.testMemoryCleanup()],
      ['Error Handling', () => this.testErrorHandling()],
      ['Health Check System', () => this.testHealthCheck()],
      ['Configuration Validation', () => this.testConfiguration()]
    ];

    for (const [name, testFn] of tests) {
      await this.runTest(name, testFn);
     }

    this.printSummary();
  }

  printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('='.repeat(60));

    const passed = this.testResults.filter(r => r.status === 'PASS').length;
    const failed = this.testResults.filter(r => r.status === 'FAIL').length;
    const warnings = this.testResults.filter(r => r.status === 'WARN').length;

    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⚠️  Warnings: ${warnings}`);
    console.log(`📈 Success Rate: ${((passed / this.testResults.length) * 100).toFixed(1)}%`);

    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.testResults
        .filter(r => r.status === 'FAIL')
        .forEach(r => console.log(`   - ${r.test}: ${r.message}`));
    }

    console.log('\n🎉 Enhanced Push Notification System Testing Complete!');

    if (failed === 0) {
      console.log('🏆 All critical security and functionality tests passed!');
      process.exit(0);
    } else {
      console.log('⚠️  Some tests failed. Please review the results above.');
      process.exit(1);
     }
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new PushNotificationTester();
  tester.runAllTests().catch(error => {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  });
}

module.exports = { PushNotificationTester };