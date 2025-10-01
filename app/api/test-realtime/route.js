/**
 * Real-time Features Test API
 * Tests all Ably connections and real-time functionality
 */

import { NextResponse } from 'next/server';
import { getServerAbly, CHANNELS, EVENTS } from '@/lib/ably';

export async function GET() {
  console.log('🧪 Starting real-time features test...');

  const testResults = {
    timestamp: new Date().toISOString(),
    tests: [],
    overall: 'unknown'
  };

  try {
    // Test 1: Server Ably connection
    console.log('🔍 Test 1: Server Ably connection');
    const serverAbly = getServerAbly();

    if (!serverAbly) {
      testResults.tests.push({
        name: 'Server Ably Connection',
        status: 'failed',
        error: 'Unable to initialize server Ably instance'
      });
    } else {
      testResults.tests.push({
        name: 'Server Ably Connection',
        status: 'passed',
        details: 'Server Ably instance created successfully'
      });
    }

    // Test 2: Channel creation and messaging
    if (serverAbly) {
      console.log('🔍 Test 2: Channel creation and messaging');
      try {
        const testChannel = serverAbly.channels.get('test:realtime:validation');

        // Test message publishing
        await testChannel.publish('test_event', {
          message: 'Real-time test message',
          timestamp: new Date().toISOString(),
          testId: Math.random().toString(36).substr(2, 9)
        });

        testResults.tests.push({
          name: 'Channel Publishing',
          status: 'passed',
          details: 'Successfully published test message to channel'
        });

        // Clean up test channel gracefully
        try {
          await testChannel.detach();
        } catch (detachError) {
          // Ignore detach timeout errors - they don't affect functionality
          console.log('ℹ️ Channel detach timeout (expected for test channels)');
        }
      } catch (error) {
        testResults.tests.push({
          name: 'Channel Publishing',
          status: 'failed',
          error: error.message
        });
      }
    }

    // Test 3: Channel naming utilities
    console.log('🔍 Test 3: Channel naming utilities');
    try {
      const testJobId = '507f1f77bcf86cd799439011';
      const testUserId = '507f1f77bcf86cd799439012';

      const jobChannel = CHANNELS.jobComments(testJobId);
      const userChannel = CHANNELS.userNotifications(testUserId);

      if (jobChannel && userChannel &&
          !jobChannel.includes('null') && !userChannel.includes('null')) {
        testResults.tests.push({
          name: 'Channel Naming',
          status: 'passed',
          details: {
            jobChannel,
            userChannel
          }
        });
      } else {
        testResults.tests.push({
          name: 'Channel Naming',
          status: 'failed',
          error: 'Channel names contain null or are invalid'
        });
      }
    } catch (error) {
      testResults.tests.push({
        name: 'Channel Naming',
        status: 'failed',
        error: error.message
      });
    }

    // Test 4: Event constants
    console.log('🔍 Test 4: Event constants');
    try {
      const eventTypes = [
        EVENTS.JOB_POSTED,
        EVENTS.COMMENT_POSTED,
        EVENTS.NOTIFICATION_SENT,
        EVENTS.MESSAGE_SENT
      ];

      if (eventTypes.every(event => typeof event === 'string' && event.length > 0)) {
        testResults.tests.push({
          name: 'Event Constants',
          status: 'passed',
          details: { eventTypes }
        });
      } else {
        testResults.tests.push({
          name: 'Event Constants',
          status: 'failed',
          error: 'Some event constants are missing or invalid'
        });
      }
    } catch (error) {
      testResults.tests.push({
        name: 'Event Constants',
        status: 'failed',
        error: error.message
      });
    }

    // Test 5: Connection health check
    console.log('🔍 Test 5: Connection health check');
    try {
      const connectionState = serverAbly.connection.state;
      const isHealthy = ['connected', 'connecting', 'initialized'].includes(connectionState);

      testResults.tests.push({
        name: 'Connection Health',
        status: isHealthy ? 'passed' : 'warning',
        details: {
          connectionState,
          isHealthy
        }
      });
    } catch (error) {
      testResults.tests.push({
        name: 'Connection Health',
        status: 'failed',
        error: error.message
      });
    }

    // Determine overall status
    const failedTests = testResults.tests.filter(test => test.status === 'failed');
    const warningTests = testResults.tests.filter(test => test.status === 'warning');

    if (failedTests.length === 0 && warningTests.length === 0) {
      testResults.overall = 'passed';
    } else if (failedTests.length === 0 && warningTests.length > 0) {
      testResults.overall = 'warning';
    } else {
      testResults.overall = 'failed';
    }

    console.log(`🧪 Real-time test completed: ${testResults.overall}`);
    console.log(`✅ Passed: ${testResults.tests.filter(t => t.status === 'passed').length}`);
    console.log(`⚠️ Warnings: ${testResults.tests.filter(t => t.status === 'warning').length}`);
    console.log(`❌ Failed: ${testResults.tests.filter(t => t.status === 'failed').length}`);

    return NextResponse.json(testResults);

  } catch (error) {
    console.error('💥 Real-time test failed:', error);

    testResults.tests.push({
      name: 'Overall Test Execution',
      status: 'failed',
      error: error.message,
      stack: error.stack
    });

    testResults.overall = 'failed';

    return NextResponse.json(testResults, { status: 500 });
  }
}

export async function POST(request) {
  console.log('🧪 Starting real-time stress test...');

  try {
    const { testType = 'basic', messageCount = 5, channelCount = 3 } = await request.json();

    const serverAbly = getServerAbly();
    if (!serverAbly) {
      return NextResponse.json({
        success: false,
        error: 'Server Ably not available'
      }, { status: 500 });
    }

    const results = {
      testType,
      messageCount,
      channelCount,
      startTime: new Date().toISOString(),
      results: [],
      summary: {
        totalMessages: 0,
        successfulMessages: 0,
        failedMessages: 0,
        averageLatency: 0
      }
    };

    // Create test channels and send messages
    const channelPromises = [];

    for (let i = 0; i < channelCount; i++) {
      const channelName = `test:stress:${i}:${Date.now()}`;
      const channel = serverAbly.channels.get(channelName);

      const messagePromises = [];

      for (let j = 0; j < messageCount; j++) {
        const startTime = Date.now();

        const messagePromise = channel.publish('stress_test', {
          channelIndex: i,
          messageIndex: j,
          timestamp: new Date().toISOString(),
          testData: `Test message ${j} in channel ${i}`
        }).then(() => {
          const latency = Date.now() - startTime;
          results.results.push({
            channelIndex: i,
            messageIndex: j,
            status: 'success',
            latency
          });
          results.summary.successfulMessages++;
        }).catch((error) => {
          results.results.push({
            channelIndex: i,
            messageIndex: j,
            status: 'failed',
            error: error.message
          });
          results.summary.failedMessages++;
        });

        messagePromises.push(messagePromise);
        results.summary.totalMessages++;
      }

      channelPromises.push(Promise.all(messagePromises).then(async () => {
        // Cleanup channel gracefully
        try {
          await channel.detach();
        } catch (detachError) {
          // Ignore detach timeout errors - they don't affect functionality
          console.log(`ℹ️ Channel ${channelName} detach timeout (expected for test channels)`);
        }
      }));
    }

    // Wait for all messages to complete
    await Promise.all(channelPromises);

    // Calculate average latency
    const successfulResults = results.results.filter(r => r.status === 'success' && r.latency);
    if (successfulResults.length > 0) {
      results.summary.averageLatency = successfulResults.reduce((sum, r) => sum + r.latency, 0) / successfulResults.length;
    }

    results.endTime = new Date().toISOString();
    results.success = results.summary.failedMessages === 0;

    console.log(`🧪 Stress test completed: ${results.summary.successfulMessages}/${results.summary.totalMessages} messages sent successfully`);
    console.log(`📊 Average latency: ${results.summary.averageLatency.toFixed(2)}ms`);

    return NextResponse.json(results);

  } catch (error) {
    console.error('💥 Stress test failed:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}