// Real-time Features Testing Script
const EventSource = require('eventsource');
const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testRealtimeSSE() {
  console.log('🔄 Testing Server-Sent Events (SSE) real-time functionality...');
  
  return new Promise((resolve) => {
    let receivedEvents = [];
    let connectionEstablished = false;
    
    // Create SSE connection
    const eventSource = new EventSource(`${BASE_URL}/api/realtime/sse`);
    
    eventSource.onopen = (event) => {
      console.log('✅ SSE Connection opened successfully');
      connectionEstablished = true;
    };
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log(`📨 Received SSE message:`, data);
        receivedEvents.push(data);
        
        // Check for welcome message
        if (data.type === 'welcome') {
          console.log('✅ Welcome message received');
        }
        
        // Check for ping messages
        if (data.type === 'ping') {
          console.log('📡 Ping received - connection alive');
        }
        
      } catch (error) {
        console.log('❌ Error parsing SSE data:', error.message);
      }
    };
    
    eventSource.onerror = (error) => {
      console.log('❌ SSE Error:', error);
    };
    
    // Test for 10 seconds
    setTimeout(() => {
      eventSource.close();
      resolve({
        connectionEstablished,
        eventsReceived: receivedEvents.length,
        events: receivedEvents
      });
    }, 10000);
  });
}

async function testDashboardRealtime() {
  console.log('🔄 Testing Dashboard real-time updates...');
  
  return new Promise((resolve) => {
    let receivedUpdates = [];
    let connectionEstablished = false;
    
    // Try to connect to dashboard realtime
    const eventSource = new EventSource(`${BASE_URL}/api/dashboard/realtime`);
    
    eventSource.onopen = (event) => {
      console.log('✅ Dashboard real-time connection opened');
      connectionEstablished = true;
    };
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log(`📊 Dashboard update received:`, data);
        receivedUpdates.push(data);
        
      } catch (error) {
        console.log('❌ Error parsing dashboard data:', error.message);
      }
    };
    
    eventSource.onerror = (error) => {
      console.log('❌ Dashboard SSE Error:', error);
    };
    
    // Test for 5 seconds
    setTimeout(() => {
      eventSource.close();
      resolve({
        connectionEstablished,
        updatesReceived: receivedUpdates.length,
        updates: receivedUpdates
      });
    }, 5000);
  });
}

async function testJobCommentsRealtime() { console.log('🔄 Testing job Comments real-time stream...');
  
  // First, get a job ID to test with
  try {
    const jobsResponse = await axios.get(`${BASE_URL }/api/jobs`);
    
    if (!jobsResponse.data.allowed || !jobsResponse.data.jobs.length) {
      console.log('❌ No jobs available for comments testing');
      return { connectionEstablished: false, error: 'No jobs available' };
    }
    
    const testJobId = jobsResponse.data.jobs[0]._id;
    console.log(`📋 Testing with job ID: ${testJobId}`);
    
    return new Promise((resolve) => { let receivedComments = [];
      let connectionEstablished = false;
      
      // Connect to job comments stream
      const eventSource = new EventSource(`${BASE_URL }/api/jobs/${testJobId}/comments/stream`);
      
      eventSource.onopen = (event) => { console.log('✅ job comments real-time connection opened');
        connectionEstablished = true;
       };
      
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log(`💬 Comments update received:`, data.type);
          receivedComments.push(data);
          
        } catch (error) {
          console.log('❌ Error parsing comments data:', error.message);
        }
      };
      
      eventSource.onerror = (error) => { console.log('❌ job comments SSE Error:', error);
       };
      
      // Test for 5 seconds
      setTimeout(() => {
        eventSource.close();
        resolve({
          connectionEstablished,
          commentsReceived: receivedComments.length,
          comments: receivedComments,
          jobId: testJobId
        });
      }, 5000);
    });
    
  } catch (error) { console.log('❌ Error setting up job comments test:', error.message);
    return { connectionEstablished: false, error: error.message  };
  }
}

async function testNotificationSystem() { console.log('🔄 Testing notification system...');
  
  try {
    // Test notification endpoints
    const statusResponse = await axios.get(`${BASE_URL }/api/notifications`);
    console.log(`📬 Notifications endpoint status: ${statusResponse.status}`);
    
    // Test VAPID key endpoint
    const vapidResponse = await axios.get(`${BASE_URL}/api/notifications/vapid-key`);
    console.log(`🔑 VAPID key endpoint status: ${vapidResponse.status}`);
    
    return {
      notificationsEndpoint: statusResponse.status === 200 || statusResponse.status === 401,
      vapidEndpoint: vapidResponse.status === 200,
      working: true
    };
    
  } catch (error) { console.log('❌ notification system test failed:', error.message);
    return { working: false, error: error.message  };
  }
}

async function testPerformanceMetrics() {
  console.log('🔄 Testing performance and response times...');
  
  const startTime = Date.now();
  
  try {
    // Test multiple concurrent requests
    const promises = [
      axios.get(`${BASE_URL}/api/realtime/status`),
      axios.get(`${BASE_URL}/api/jobs`),
      axios.post(`${BASE_URL}/api/auth/check-username`, { username: 'test' }),
      axios.post(`${BASE_URL}/api/location/geocode`, { address: 'Coimbatore' })
    ];
    
    const results = await Promise.all(promises.map(p => p.catch(err => err.response)));
    const endTime = Date.now();
    
    const responseTime = endTime - startTime;
    const successfulRequests = results.filter(r => r && r.status >= 200 && r.status < 400).length;
    
    console.log(`⚡ Performance Test Results:`);
    console.log(`   Total response time: ${responseTime}ms`);
    console.log(`   Successful requests: ${successfulRequests}/${results.length}`);
    console.log(`   Average response time: ${Math.round(responseTime / results.length)}ms`);
    
    return {
      totalResponseTime: responseTime,
      successfulRequests,
      totalRequests: results.length,
      averageResponseTime: Math.round(responseTime / results.length),
      performanceGood: responseTime < 5000 && successfulRequests >= 3
    };
    
  } catch (error) {
    console.log('❌ Performance test failed:', error.message);
    return { performanceGood: false, error: error.message };
  }
}

// Main test runner
async function runRealtimeTests() {
  console.log('🚀 Starting comprehensive real-time features testing...\n');
  
  const results = {
    startTime: new Date(),
    tests: {}
  };
  
  try { // Test SSE functionality
    console.log('1️⃣ Testing Server-Sent Events...');
    results.tests.sse = await testRealtimeSSE();
    
    // Test Dashboard real-time
    console.log('\n2️⃣ Testing Dashboard Real-time...');
    results.tests.dashboard = await testDashboardRealtime();
    
    // Test job Comments real-time
    console.log('\n3️⃣ Testing job Comments Real-time...');
    results.tests.jobComments = await testJobCommentsRealtime();
    
    // Test notification System
    console.log('\n4️⃣ Testing notification System...');
    results.tests.notifications = await testNotificationSystem();
    
    // Test Performance
    console.log('\n5️⃣ Testing Performance...');
    results.tests.performance = await testPerformanceMetrics();
    
   } catch (error) {
    console.log('❌ Fatal error during real-time testing:', error.message);
    results.error = error.message;
  }
  
  // Generate report
  generateRealtimeReport(results);
  
  return results;
}

function generateRealtimeReport(results) {
  const endTime = new Date();
  const duration = endTime - results.startTime;
  
  console.log('\n'.repeat(2));
  console.log('📊 REAL-TIME FEATURES TEST REPORT');
  console.log('='.repeat(50));
  console.log(`🕒 Test Duration: ${Math.round(duration / 1000)}s`);
  
  console.log('\n🔍 DETAILED RESULTS:\n');
  
  // SSE Test Results
  if (results.tests.sse) {
    const sse = results.tests.sse;
    console.log(`✅ Server-Sent Events:`);
    console.log(`   Connection: ${sse.connectionEstablished ? 'SUCCESS' : 'FAILED'}`);
    console.log(`   Events received: ${sse.eventsReceived}`);
  }
  
  // Dashboard Test Results
  if (results.tests.dashboard) {
    const dashboard = results.tests.dashboard;
    console.log(`\n📊 Dashboard Real-time:`);
    console.log(`   Connection: ${dashboard.connectionEstablished ? 'SUCCESS' : 'FAILED'}`);
    console.log(`   Updates received: ${dashboard.updatesReceived}`);
  }
  
  // Job Comments Test Results
  if (results.tests.jobComments) { const comments = results.tests.jobComments;
    console.log(`\n💬 job Comments Real-time:`);
    console.log(`   Connection: ${comments.connectionEstablished ? 'SUCCESS' : 'FAILED' }`);
    console.log(`   Comments received: ${comments.commentsReceived || 0}`);
    if (comments.jobId) { console.log(`   Test job ID: ${comments.jobId }`);
    }
  }
  
  // Notifications Test Results
  if (results.tests.notifications) { const notifications = results.tests.notifications;
    console.log(`\n📬 notification System:`);
    console.log(`   System: ${notifications.working ? 'FUNCTIONAL' : 'ISSUES DETECTED' }`);
    console.log(`   Endpoints: ${notifications.notificationsEndpoint ? 'ACCESSIBLE' : 'ISSUES'}`);
  }
  
  // Performance Test Results
  if (results.tests.performance) {
    const perf = results.tests.performance;
    console.log(`\n⚡ Performance:`);
    console.log(`   Overall: ${perf.performanceGood ? 'GOOD' : 'NEEDS IMPROVEMENT'}`);
    console.log(`   Average response time: ${perf.averageResponseTime}ms`);
    console.log(`   Success rate: ${Math.round((perf.successfulRequests / perf.totalRequests) * 100)}%`);
  }
  
  // Overall Assessment
  console.log('\n🌟 OVERALL ASSESSMENT:');
  const sseWorking = results.tests.sse?.connectionEstablished;
  const dashboardWorking = results.tests.dashboard?.connectionEstablished;
  const notificationsWorking = results.tests.notifications?.working;
  const performanceGood = results.tests.performance?.performanceGood;
  
  const workingFeatures = [sseWorking, dashboardWorking, notificationsWorking, performanceGood].filter(Boolean).length;
  const totalFeatures = 4;
  
  console.log(`✅ Working Features: ${workingFeatures}/${totalFeatures}`);
  console.log(`📈 Real-time Health: ${Math.round((workingFeatures / totalFeatures) * 100)}%`);
  
  if (workingFeatures === totalFeatures) {
    console.log('🎉 All real-time features are fully functional!');
  } else if (workingFeatures >= totalFeatures * 0.75) {
    console.log('✅ Real-time features are mostly functional with minor issues.');
  } else {
    console.log('⚠️ Some real-time features need attention.');
  }
  
  console.log('\n'.repeat(2));
}

// Install eventsource if not present
async function ensureDependencies() {
  try {
    require('eventsource');
  } catch (error) {
    console.log('📦 Installing eventsource dependency...');
    const { exec } = require('child_process');
    return new Promise((resolve, reject) => {
      exec('npm install eventsource', (error, stdout, stderr) => {
        if (error) {
          console.log('❌ Failed to install eventsource:', error.message);
          reject(error);
        } else {
          console.log('✅ eventsource installed successfully');
          resolve();
        }
      });
    });
  }
}

// Run the tests
if (require.main === module) {
  ensureDependencies()
    .then(() => runRealtimeTests())
    .catch(console.error);
}

module.exports = { runRealtimeTests };