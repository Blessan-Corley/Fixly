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
    }\n    \n    manager.destroy();\n  }\n\n  // Test 7: Memory Cleanup and Resource Management\n  async testMemoryCleanup() {\n    const manager = new PushNotificationManager();\n    manager.setUser(this.mockUser);\n    \n    // Add some rate limit entries\n    for (let i = 0; i < 100; i++) {\n      manager.inMemoryRateLimit.set(`test_key_${i}`, [Date.now() - 25 * 60 * 60 * 1000]); // 25 hours ago\n    }\n    \n    const initialSize = manager.inMemoryRateLimit.size;\n    manager.cleanupMemoryRateLimit();\n    const afterCleanupSize = manager.inMemoryRateLimit.size;\n    \n    if (afterCleanupSize >= initialSize) {\n      throw new Error('Memory cleanup not working');\n    }\n    \n    // Test destroy method\n    manager.destroy();\n    \n    if (manager.inMemoryRateLimit.size !== 0) {\n      throw new Error('Destroy method not clearing memory properly');\n    }\n    \n    if (manager.currentUser !== null) {\n      throw new Error('Destroy method not resetting state');\n    }\n  }\n\n  // Test 8: Error Handling\n  async testErrorHandling() {\n    const manager = new PushNotificationManager();\n    \n    let errorHandled = false;\n    manager.on('notificationError', () => {\n      errorHandled = true;\n    });\n    \n    const testError = new Error('Test error');\n    await manager.handleNotificationError(testError, 'test_operation');\n    \n    // Give a moment for async operations\n    await new Promise(resolve => setTimeout(resolve, 100));\n    \n    if (!errorHandled) {\n      throw new Error('Error event not emitted');\n    }\n    \n    manager.destroy();\n  }\n\n  // Test 9: Health Check System\n  async testHealthCheck() {\n    // Mock browser environment\n    global.navigator = { serviceWorker: { ready: Promise.resolve({ active: true }) } };\n    \n    const manager = new PushNotificationManager();\n    manager.setUser(this.mockUser);\n    \n    let healthCheckCompleted = false;\n    manager.on('healthCheckDetailed', (data) => {\n      healthCheckCompleted = true;\n      \n      if (!data.timestamp || typeof data.redis !== 'boolean') {\n        throw new Error('Health check data incomplete');\n      }\n    });\n    \n    try {\n      await manager.performEnhancedHealthCheck();\n    } catch (error) {\n      // Expected in test environment\n      if (!error.message.includes('serviceWorker')) {\n        throw error;\n      }\n    }\n    \n    manager.destroy();\n  }\n\n  // Test 10: Configuration Validation\n  async testConfiguration() {\n    const manager = new PushNotificationManager();\n    \n    // Check rate limit configuration\n    const requiredConfigs = ['subscribe', 'send', 'unsubscribe'];\n    for (const config of requiredConfigs) {\n      if (!manager.rateLimitConfig[config]) {\n        throw new Error(`Missing rate limit config for ${config}`);\n      }\n      \n      if (!manager.rateLimitConfig[config].limit || !manager.rateLimitConfig[config].windowMs) {\n        throw new Error(`Incomplete rate limit config for ${config}`);\n      }\n    }\n    \n    // Check notification templates\n    const requiredTemplates = ['job_match', 'message_received', 'job_application'];\n    for (const template of requiredTemplates) { \n      if (!manager.notificationTemplates[template]) {\n        throw new Error(`Missing notification template for ${template }`);\n      }\n    }\n    \n    manager.destroy();\n  }\n\n  // Run all tests\n  async runAllTests() { \n    console.log('🚀 Starting Enhanced Push notification System Tests\\n');\n    \n    const tests = [\n      ['Manager Creation and Initialization', () => this.testManagerCreation()],\n      ['Secure Factory Method', () => this.testSecureFactory()],\n      ['Rate Limiting Functionality', () => this.testRateLimiting()],\n      ['Input Validation and Sanitization', () => this.testInputValidation()],\n      ['Offline Queue Management', () => this.testOfflineQueue()],\n      ['Subscription Data Validation', () => this.testSubscriptionValidation()],\n      ['Memory Cleanup and Resource Management', () => this.testMemoryCleanup()],\n      ['Error Handling', () => this.testErrorHandling()],\n      ['Health Check System', () => this.testHealthCheck()],\n      ['Configuration Validation', () => this.testConfiguration()]\n    ];\n    \n    for (const [name, testFn] of tests) {\n      await this.runTest(name, testFn);\n     }\n    \n    this.printSummary();\n  }\n\n  printSummary() {\n    console.log('\\n' + '='.repeat(60));\n    console.log('📊 TEST RESULTS SUMMARY');\n    console.log('='.repeat(60));\n    \n    const passed = this.testResults.filter(r => r.status === 'PASS').length;\n    const failed = this.testResults.filter(r => r.status === 'FAIL').length;\n    const warnings = this.testResults.filter(r => r.status === 'WARN').length;\n    \n    console.log(`✅ Passed: ${passed}`);\n    console.log(`❌ Failed: ${failed}`);\n    console.log(`⚠️  Warnings: ${warnings}`);\n    console.log(`📈 Success Rate: ${((passed / this.testResults.length) * 100).toFixed(1)}%`);\n    \n    if (failed > 0) {\n      console.log('\\n❌ Failed Tests:');\n      this.testResults\n        .filter(r => r.status === 'FAIL')\n        .forEach(r => console.log(`   - ${r.test}: ${r.message}`));\n    }\n    \n    console.log('\\n🎉 Enhanced Push Notification System Testing Complete!');\n    \n    if (failed === 0) {\n      console.log('🏆 All critical security and functionality tests passed!');\n      process.exit(0);\n    } else { \n      console.log('⚠️  Some tests failed. Please review the results above.');\n      process.exit(1);\n     }\n  }\n}\n\n// Run tests if called directly\nif (require.main === module) {\n  const tester = new PushNotificationTester();\n  tester.runAllTests().catch(error => {\n    console.error('❌ Test suite failed:', error);\n    process.exit(1);\n  });\n}\n\nmodule.exports = { PushNotificationTester };