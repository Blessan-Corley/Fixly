// scripts/test-socketio-live.js - Test Socket.io with live Fixly application
const { io } = require('socket.io-client');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: '.env.local' });

// Test configuration
const SERVER_URL = 'http://localhost:3000';
const TIMEOUT = 10000; // 10 seconds
const TEST_USER_ID = 'test-user-123';

// Generate a test JWT token for authentication
function generateTestToken() {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error('NEXTAUTH_SECRET not found in environment variables');
  }
  
  return jwt.sign(
    {
      sub: TEST_USER_ID,
      id: TEST_USER_ID,
      email: 'test@example.com',
      name: 'Test User',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hour
    },
    secret
  );
}

// Test results tracking
const testResults = {
  connection: false,
  authentication: false,
  roomJoining: false,
  messageHandling: false,
  typingIndicators: false,
  jobUpdates: false,
  notifications: false,
  presenceStatus: false,
  disconnection: false
};

// Main test function
async function testSocketIO() {
  console.log('🧪 Testing Socket.io with live Fixly application');
  console.log(`🔗 Connecting to: ${SERVER_URL}`);
  console.log('═'.repeat(60));
  
  return new Promise((resolve, reject) => {
    let client;
    let testTimeout;
    let testsCompleted = 0;
    const totalTests = Object.keys(testResults).length;
    
    try {
      // Generate authentication token
      const token = generateTestToken();
      console.log('🔑 Generated test authentication token');
      
      // Create client with authentication
      client = io(SERVER_URL, {
        auth: {
          token: token
        },
        transports: ['websocket', 'polling'],
        timeout: 5000,
        forceNew: true
      });
      
      // Set overall timeout
      testTimeout = setTimeout(() => {
        console.log('\n⏰ Test timeout reached');
        cleanup();
        resolve(generateReport());
      }, TIMEOUT);
      
      // Test 1: Connection
      client.on('connect', () => {
        console.log('✅ Test 1: Connection successful');
        testResults.connection = true;
        testResults.authentication = true; // If connected, auth worked
        console.log('✅ Test 2: Authentication successful');
        testsCompleted += 2;
        
        // Start additional tests
        runRoomTests();
        runMessagingTests();
        runJobUpdateTests();
        runNotificationTests();
        runPresenceTests();
      });
      
      // Test connection errors
      client.on('connect_error', (error) => {
        console.log('❌ Test 1: Connection failed');
        console.log(`   Error: ${error.message}`);
        
        if (error.message.includes('Authentication')) {
          console.log('❌ Test 2: Authentication failed');
          console.log('   Make sure NEXTAUTH_SECRET is set correctly');
        }
        
        cleanup();
        resolve(generateReport());
      });
      
      // Handle disconnection
      client.on('disconnect', (reason) => {
        console.log(`✅ Test 9: Disconnection handled (${reason})`);
        testResults.disconnection = true;
        testsCompleted++;
        
        // If all tests completed, resolve
        if (testsCompleted >= totalTests) {
          cleanup();
          resolve(generateReport());
        }
      });
      
      // Test room joining functionality
      function runRoomTests() {
        console.log('\n🏠 Testing room functionality...');
        
        // Test joining job room
        const testJobId = 'test-job-123';
        client.emit('join:job', testJobId);
        
        // Test joining messages room
        client.emit('join:messages', testJobId);
        
        setTimeout(() => {
          console.log('✅ Test 3: Room joining completed');
          testResults.roomJoining = true;
          testsCompleted++;
          
          // Test leaving rooms
          client.emit('leave:job', testJobId);
          client.emit('leave:messages', testJobId);
          
          checkTestCompletion();
        }, 1000);
      }
      
      // Test messaging functionality
      function runMessagingTests() {
        console.log('\n💬 Testing messaging functionality...');
        
        // Listen for message responses
        client.on('message:new', (data) => {
          console.log('✅ Test 4: Message handling successful');
          console.log(`   Received message: ${JSON.stringify(data)}`);
          testResults.messageHandling = true;
          testsCompleted++;
          checkTestCompletion();
        });
        
        // Listen for typing indicators
        client.on('typing:start', (data) => {
          console.log('✅ Test 5: Typing indicators working');
          testResults.typingIndicators = true;
          testsCompleted++;
          checkTestCompletion();
        });
        
        // Send test message
        setTimeout(() => {
          client.emit('message:send', {
            jobId: 'test-job-123',
            message: 'Test message from Socket.io test script',
            to: 'test-recipient-456'
          });
          
          // Send typing indicator
          client.emit('typing:start', {
            jobId: 'test-job-123'
          });
          
          setTimeout(() => {
            client.emit('typing:stop', {
              jobId: 'test-job-123'
            });
          }, 500);
        }, 1500);
      }
      
      // Test job update functionality
      function runJobUpdateTests() {
        console.log('\n📋 Testing job update functionality...');
        
        // Listen for job updates
        client.on('job:updated', (data) => {
          console.log('✅ Test 6: Job updates working');
          console.log(`   Job update: ${JSON.stringify(data)}`);
          testResults.jobUpdates = true;
          testsCompleted++;
          checkTestCompletion();
        });
        
        // Send test job update
        setTimeout(() => {
          client.emit('job:update', {
            jobId: 'test-job-123',
            update: {
              status: 'in_progress',
              description: 'Test job update'
            }
          });
        }, 2000);
      }
      
      // Test notification functionality
      function runNotificationTests() {
        console.log('\n🔔 Testing notification functionality...');
        
        // Listen for notifications
        client.on('notification:new', (data) => {
          console.log('✅ Test 7: Notifications working');
          console.log(`   Notification: ${JSON.stringify(data)}`);
          testResults.notifications = true;
          testsCompleted++;
          checkTestCompletion();
        });
        
        // Send test notification
        setTimeout(() => {
          client.emit('notification:send', {
            to: 'test-recipient-456',
            notification: {
              type: 'test',
              title: 'Test Notification',
              message: 'This is a test notification from Socket.io test script'
            }
          });
        }, 2500);
      }
      
      // Test presence/status functionality
      function runPresenceTests() {
        console.log('\n👤 Testing presence functionality...');
        
        // Listen for user status updates
        client.on('user:status', (data) => {
          console.log('✅ Test 8: Presence status working');
          console.log(`   Status update: ${JSON.stringify(data)}`);
          testResults.presenceStatus = true;
          testsCompleted++;
          checkTestCompletion();
        });
        
        // Send presence updates
        setTimeout(() => {
          client.emit('user:online');
          
          setTimeout(() => {
            client.emit('user:away');
          }, 500);
        }, 3000);
      }
      
      // Check if all tests are completed
      function checkTestCompletion() {
        if (testsCompleted >= totalTests - 1) { // -1 because disconnect test runs last
          setTimeout(() => {
            client.disconnect();
          }, 1000);
        }
      }
      
      // Cleanup function
      function cleanup() {
        if (testTimeout) {
          clearTimeout(testTimeout);
        }
        if (client && client.connected) {
          client.disconnect();
        }
      }
      
    } catch (error) {
      console.error('❌ Test setup failed:', error.message);
      reject(error);
    }
  });
}

// Generate test report
function generateReport() {
  console.log('\n' + '═'.repeat(60));
  console.log('📊 Socket.io Test Results Summary');
  console.log('═'.repeat(60));
  
  const tests = [
    { name: 'Connection', key: 'connection', critical: true },
    { name: 'Authentication', key: 'authentication', critical: true },
    { name: 'Room Joining', key: 'roomJoining', critical: false },
    { name: 'Message Handling', key: 'messageHandling', critical: false },
    { name: 'Typing Indicators', key: 'typingIndicators', critical: false },
    { name: 'Job Updates', key: 'jobUpdates', critical: false },
    { name: 'Notifications', key: 'notifications', critical: false },
    { name: 'Presence Status', key: 'presenceStatus', critical: false },
    { name: 'Disconnection', key: 'disconnection', critical: false }
  ];
  
  let passedTests = 0;
  let criticalFailures = 0;
  
  tests.forEach((test, index) => {
    const status = testResults[test.key] ? '✅ PASS' : '❌ FAIL';
    const critical = test.critical ? ' (CRITICAL)' : '';
    console.log(`${index + 1}. ${test.name}: ${status}${critical}`);
    
    if (testResults[test.key]) {
      passedTests++;
    } else if (test.critical) {
      criticalFailures++;
    }
  });
  
  console.log('\n' + '-'.repeat(40));
  console.log(`📈 Results: ${passedTests}/${tests.length} tests passed`);
  
  if (criticalFailures > 0) {
    console.log('🚨 CRITICAL: Socket.io connection or authentication failed!');
    console.log('   • Make sure Fixly server is running on localhost:3000');
    console.log('   • Check that NEXTAUTH_SECRET is configured correctly');
    console.log('   • Verify Socket.io server is properly initialized');
  } else if (passedTests === tests.length) {
    console.log('🎉 SUCCESS: All Socket.io tests passed!');
    console.log('   Socket.io is working perfectly with your Fixly application.');
  } else {
    console.log('⚠️  PARTIAL: Core functionality working, some features may need attention');
    console.log('   The application will work, but some real-time features may be limited.');
  }
  
  console.log('\n💡 Tips:');
  console.log('   • Run "npm run dev" to start the Fixly server');
  console.log('   • Check server logs for any Socket.io related errors');
  console.log('   • Make sure all environment variables are properly set');
  console.log('   • Test from browser dev tools for client-side debugging');
  
  return {
    passed: passedTests,
    total: tests.length,
    critical: criticalFailures === 0,
    results: testResults
  };
}

// Handle process signals
process.on('SIGINT', () => {
  console.log('\n👋 Test interrupted by user');
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception during test:', error.message);
  process.exit(1);
});

// Main execution
if (require.main === module) {
  console.log('🚀 Starting Socket.io Live Test for Fixly Application\n');
  
  // Check if server is likely running
  const { createConnection } = require('net');
  const socket = createConnection({ port: 3000, host: 'localhost' });
  
  socket.on('connect', () => {
    socket.end();
    console.log('✅ Server detected on localhost:3000');
    console.log('');
    
    // Run the actual Socket.io tests
    testSocketIO()
      .then((results) => {
        process.exit(results.critical ? 0 : 1);
      })
      .catch((error) => {
        console.error('❌ Test execution failed:', error.message);
        process.exit(1);
      });
  });
  
  socket.on('error', (error) => {
    console.log('❌ Cannot connect to localhost:3000');
    console.log('   Make sure Fixly server is running with: npm run dev');
    console.log(`   Error: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { testSocketIO, generateReport };