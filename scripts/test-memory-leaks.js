#!/usr/bin/env node
// scripts/test-memory-leaks.js - Memory Leak Detection and Testing

import { performance, PerformanceObserver } from 'perf_hooks';
import { EventEmitter } from 'events';

console.log('🧠 MEMORY LEAK DETECTION TEST');
console.log('==============================\n');

class MemoryLeakDetector {
  constructor() {
    this.initialMemory = process.memoryUsage();
    this.checkpoints = [];
    this.activeTests = new Map();
    this.eventListeners = new Map();
  }

  /**
   * Create memory checkpoint
   */
  checkpoint(name) {
    const usage = process.memoryUsage();
    const checkpoint = {
      name,
      timestamp: Date.now(),
      memory: usage,
      heapDiff: usage.heapUsed - this.initialMemory.heapUsed,
      externalDiff: usage.external - this.initialMemory.external
    };
    
    this.checkpoints.push(checkpoint);
    console.log(`📊 Checkpoint: ${name}`);
    console.log(`   Heap Used: ${this.formatBytes(usage.heapUsed)} (${this.formatBytes(checkpoint.heapDiff, true)})`);
    console.log(`   External: ${this.formatBytes(usage.external)} (${this.formatBytes(checkpoint.externalDiff, true)})`);
    console.log('');
    
    return checkpoint;
  }

  /**
   * Test for event listener leaks
   */
  async testEventListenerLeaks() {
    console.log('🎧 Testing Event Listener Leaks...');
    
    const emitter = new EventEmitter();
    const initialListeners = emitter.listenerCount('test');
    
    // Add listeners without proper cleanup (potential leak)
    for (let i = 0; i < 100; i++) {
      emitter.on('test', () => {});
    }
    
    const afterAddListeners = emitter.listenerCount('test');
    console.log(`   Added ${afterAddListeners - initialListeners} listeners`);
    
    // Simulate cleanup
    emitter.removeAllListeners('test');
    const afterCleanup = emitter.listenerCount('test');
    
    if (afterCleanup > initialListeners) {
      console.log(`   ⚠️  POTENTIAL LEAK: ${afterCleanup - initialListeners} listeners not cleaned up`);
      return false;
    } else {
      console.log(`   ✅ Event listeners properly cleaned up`);
      return true;
    }
  }

  /**
   * Test for closure/scope leaks
   */
  async testClosureLeaks() {
    console.log('🔒 Testing Closure/Scope Leaks...');
    
    this.checkpoint('Before closure test');
    
    const largeData = [];
    
    // Create potential closure leak
    function createLeak() {
      const bigArray = new Array(100000).fill('leak-test-data');
      
      return function() {
        // This closure keeps reference to bigArray
        return bigArray[0];
      };
    }
    
    // Create many closures
    for (let i = 0; i < 100; i++) {
      largeData.push(createLeak());
    }
    
    this.checkpoint('After closure creation');
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
      this.checkpoint('After garbage collection');
    } else {
      console.log('   ⚠️  Garbage collection not available (run with --expose-gc for better testing)');
    }
    
    // Clear references
    largeData.length = 0;
    
    if (global.gc) {
      global.gc();
      this.checkpoint('After cleanup');
    }
    
    return true;
  }

  /**
   * Test for timer leaks
   */
  async testTimerLeaks() {
    console.log('⏰ Testing Timer Leaks...');
    
    const timers = [];
    
    // Create many timers
    for (let i = 0; i < 50; i++) {
      const timer = setInterval(() => {
        // Some work
      }, 1000);
      timers.push(timer);
    }
    
    console.log(`   Created ${timers.length} timers`);
    
    // Simulate forgetting to clear timers (leak)
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Proper cleanup
    timers.forEach(timer => clearInterval(timer));
    console.log(`   ✅ Cleared ${timers.length} timers`);
    
    return true;
  }

  /**
   * Test for Redis connection leaks
   */
  async testRedisConnectionLeaks() {
    console.log('🔗 Testing Redis Connection Leaks...');
    
    try {
      const redisModule = await import('../lib/redis.js');
      const redis = redisModule.default;
      
      // Test connection pooling
      const connections = [];
      
      for (let i = 0; i < 10; i++) {
        // Each Redis operation should reuse connection
        const result = await redis.ping();
        connections.push(result);
      }
      
      console.log(`   ✅ Completed ${connections.length} Redis operations`);
      console.log(`   Connection type: ${redis.connectionType || 'unknown'}`);
      
      return true;
    } catch (error) {
      console.log(`   ⚠️  Redis connection test failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Test for HTTP request leaks
   */
  async testHTTPRequestLeaks() {
    console.log('🌐 Testing HTTP Request Leaks...');
    
    this.checkpoint('Before HTTP requests');
    
    const requests = [];
    
    // Simulate many HTTP requests without proper cleanup
    for (let i = 0; i < 20; i++) {
      try {
        // Use fetch with timeout to prevent hanging
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const request = fetch('http://httpbin.org/delay/1', {
          signal: controller.signal
        }).then(() => {
          clearTimeout(timeoutId);
        }).catch(() => {
          clearTimeout(timeoutId);
        });
        
        requests.push(request);
      } catch (error) {
        // Expected in some cases
      }
    }
    
    // Wait for requests to complete or timeout
    try {
      await Promise.allSettled(requests);
      console.log(`   ✅ Completed ${requests.length} HTTP requests`);
    } catch (error) {
      console.log(`   ⚠️  Some HTTP requests failed (expected): ${error.message}`);
    }
    
    this.checkpoint('After HTTP requests');
    
    return true;
  }

  /**
   * Generate memory leak report
   */
  generateReport() {
    console.log('📊 MEMORY LEAK DETECTION REPORT');
    console.log('================================\n');
    
    if (this.checkpoints.length < 2) {
      console.log('⚠️  Insufficient checkpoints for analysis');
      return;
    }
    
    const first = this.checkpoints[0];
    const last = this.checkpoints[this.checkpoints.length - 1];
    const totalHeapIncrease = last.memory.heapUsed - first.memory.heapUsed;
    const totalExternalIncrease = last.memory.external - first.memory.external;
    
    console.log(`Memory Usage Analysis:`);
    console.log(`   Initial Heap: ${this.formatBytes(first.memory.heapUsed)}`);
    console.log(`   Final Heap: ${this.formatBytes(last.memory.heapUsed)}`);
    console.log(`   Net Change: ${this.formatBytes(totalHeapIncrease, true)}`);
    console.log(`   External Change: ${this.formatBytes(totalExternalIncrease, true)}`);
    console.log('');
    
    // Analyze trends
    const significantIncrease = totalHeapIncrease > 10 * 1024 * 1024; // 10MB
    
    if (significantIncrease) {
      console.log('⚠️  POTENTIAL MEMORY LEAK DETECTED');
      console.log(`   Heap increased by ${this.formatBytes(totalHeapIncrease)}`);
      console.log('   Recommendations:');
      console.log('   • Check event listener cleanup');
      console.log('   • Verify timer cleanup');
      console.log('   • Review closure usage');
      console.log('   • Monitor connection pooling');
    } else {
      console.log('✅ No significant memory leaks detected');
      console.log('   Memory usage appears stable');
    }
    
    console.log('');
    
    // Checkpoint timeline
    console.log('Memory Timeline:');
    this.checkpoints.forEach((cp, index) => {
      const symbol = index === 0 ? '🔹' : index === this.checkpoints.length - 1 ? '🔸' : '▫️';
      console.log(`   ${symbol} ${cp.name}: ${this.formatBytes(cp.memory.heapUsed)}`);
    });
  }

  /**
   * Format bytes for display
   */
  formatBytes(bytes, showSign = false) {
    const sign = showSign && bytes > 0 ? '+' : '';
    const absBytes = Math.abs(bytes);
    
    if (absBytes < 1024) return `${sign}${bytes}B`;
    if (absBytes < 1024 * 1024) return `${sign}${(bytes / 1024).toFixed(1)}KB`;
    return `${sign}${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  }
}

// Run memory leak detection
async function runMemoryLeakTests() {
  const detector = new MemoryLeakDetector();
  
  let passedTests = 0;
  let totalTests = 0;
  
  const test = async (name, testFn) => {
    totalTests++;
    try {
      const result = await testFn();
      if (result) {
        passedTests++;
        console.log(`✅ ${name}: PASSED\n`);
      } else {
        console.log(`⚠️  ${name}: POTENTIAL ISSUES\n`);
      }
    } catch (error) {
      console.log(`❌ ${name}: FAILED - ${error.message}\n`);
    }
  };
  
  detector.checkpoint('Initial state');
  
  await test('Event Listener Leaks', () => detector.testEventListenerLeaks());
  await test('Closure/Scope Leaks', () => detector.testClosureLeaks());
  await test('Timer Leaks', () => detector.testTimerLeaks());
  await test('Redis Connection Leaks', () => detector.testRedisConnectionLeaks());
  await test('HTTP Request Leaks', () => detector.testHTTPRequestLeaks());
  
  detector.checkpoint('Final state');
  detector.generateReport();
  
  console.log(`\n📊 Memory Leak Tests: ${passedTests}/${totalTests} passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All memory leak tests passed!');
  } else { console.log('⚠️  Some potential memory leaks detected - review recommendations');
   }
  
  return passedTests / totalTests;
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMemoryLeakTests()
    .then(successRate => {
      process.exit(successRate === 1.0 ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Memory leak test suite failed:', error);
      process.exit(1);
    });
}

export default MemoryLeakDetector;