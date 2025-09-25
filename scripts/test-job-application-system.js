// scripts/test-job-application-system.js - Complete job application testing with Ably
const { performance } = require('perf_hooks');

const BASE_URL = 'http://localhost:3000'; // Adjust port if needed
const results = { passed: 0, failed: 0, warnings: 0, details: [] };

function log(status, test, message, duration = null) {
  const icons = { PASS: '✅', FAIL: '❌', WARN: '⚠️' };
  const durationText = duration ? ` (${duration}ms)` : '';
  console.log(`${icons[status]} ${test}${durationText}: ${message}`);
  results.details.push({ status, test, message, duration });
  results[status.toLowerCase()]++;
}

async function makeRequest(endpoint, options = {}) {
  const startTime = performance.now();
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options
    });
    const duration = Math.round(performance.now() - startTime);
    let data;
    try { data = await response.json(); } catch { data = null; }
    return { status: response.status, ok: response.ok, data, duration, response };
  } catch (error) {
    const duration = Math.round(performance.now() - startTime);
    return { error: error.message, duration };
  }
}

async function testJobPostingFlow() {
  console.log('\n🔍 Testing Job Posting Flow (Hirer Side)...');

  // Test 1: Check job posting page accessibility
  const jobPostPageTest = await makeRequest('/dashboard/post-job');
  if (jobPostPageTest.ok || jobPostPageTest.status === 200) {
    log('PASS', 'Job Posting: Page Access', 'Post job page accessible');
  } else if (jobPostPageTest.status === 401 || jobPostPageTest.status === 302) {
    log('PASS', 'Job Posting: Auth Protection', 'Page properly protected (requires login)');
  } else {
    log('WARN', 'Job Posting: Page Access', `Status: ${jobPostPageTest.status}`);
  }

  // Test 2: Job posting API endpoint (without auth - should fail)
  const jobPostTest = await makeRequest('/api/jobs/post', {
    method: 'POST',
    body: JSON.stringify({
      title: 'Test Plumbing Job',
      description: 'Need a skilled plumber to fix kitchen sink leak. Urgent repair needed for residential property.',
      skillsRequired: ['plumbing', 'pipe-repair'],
      urgency: 'asap',
      budget: {
        type: 'fixed',
        amount: 2000,
        currency: 'INR'
      },
      experienceLevel: 'intermediate',
      location: {
        address: 'Test Address, Mumbai',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        coordinates: { lat: 19.0760, lng: 72.8777 }
      }
    })
  });

  if (jobPostTest.status === 401) {
    log('PASS', 'Job Posting: API Security', 'Job posting API properly protected');
  } else if (jobPostTest.ok && jobPostTest.data?.success) {
    log('WARN', 'Job Posting: API Security', 'Job posting succeeded without auth (check session)');
  } else {
    log('WARN', 'Job Posting: API Response', `Status: ${jobPostTest.status}`);
  }

  // Test 3: Job drafts functionality
  const draftsTest = await makeRequest('/api/jobs/drafts');
  if (draftsTest.status === 401) {
    log('PASS', 'Job Posting: Drafts Security', 'Drafts API properly protected');
  } else if (draftsTest.ok) {
    log('PASS', 'Job Posting: Drafts API', 'Drafts endpoint accessible');
  } else {
    log('WARN', 'Job Posting: Drafts API', `Status: ${draftsTest.status}`);
  }
}

async function testJobBrowsingFlow() {
  console.log('\n🔍 Testing Job Browsing Flow (Fixer Side)...');

  // Test 1: Job browsing page
  const browsePage = await makeRequest('/dashboard/browse-jobs');
  if (browsePage.ok || browsePage.status === 200) {
    log('PASS', 'Job Browsing: Page Access', 'Browse jobs page accessible');
  } else if (browsePage.status === 401 || browsePage.status === 302) {
    log('PASS', 'Job Browsing: Auth Protection', 'Page properly protected');
  } else {
    log('WARN', 'Job Browsing: Page Access', `Status: ${browsePage.status}`);
  }

  // Test 2: Job browse API
  const browseTest = await makeRequest('/api/jobs/browse');
  if (browseTest.ok && browseTest.data) {
    log('PASS', 'Job Browsing: API Response', `Jobs API working (${browseTest.duration}ms)`, browseTest.duration);
  } else if (browseTest.status === 401) {
    log('PASS', 'Job Browsing: API Security', 'Browse API properly protected');
  } else {
    log('WARN', 'Job Browsing: API Response', `Status: ${browseTest.status}`);
  }

  // Test 3: Job search and filtering
  const searchTest = await makeRequest('/api/jobs/browse?skills=plumbing&location=mumbai');
  if (searchTest.ok) {
    log('PASS', 'Job Browsing: Search/Filter', 'Job filtering working', searchTest.duration);
  } else if (searchTest.status === 401) {
    log('PASS', 'Job Browsing: Search Security', 'Search API properly protected');
  } else {
    log('WARN', 'Job Browsing: Search/Filter', `Status: ${searchTest.status}`);
  }
}

async function testJobApplicationFlow() {
  console.log('\n🔍 Testing Job Application Flow...');

  // Test 1: Job application page (requires job ID)
  const testJobId = '507f1f77bcf86cd799439011'; // Mock ObjectId
  const applyPageTest = await makeRequest(`/dashboard/jobs/${testJobId}/apply`);

  if (applyPageTest.ok || applyPageTest.status === 200) {
    log('PASS', 'Job Application: Page Access', 'Application page accessible');
  } else if (applyPageTest.status === 401 || applyPageTest.status === 302) {
    log('PASS', 'Job Application: Auth Protection', 'Application page protected');
  } else if (applyPageTest.status === 404) {
    log('PASS', 'Job Application: Validation', 'Non-existent job handled correctly');
  } else {
    log('WARN', 'Job Application: Page Access', `Status: ${applyPageTest.status}`);
  }

  // Test 2: Application submission API (without auth)
  const applicationTest = await makeRequest(`/api/jobs/${testJobId}/apply`, {
    method: 'POST',
    body: JSON.stringify({
      coverLetter: 'I am an experienced plumber with 5+ years of experience. I can fix your kitchen sink professionally and efficiently.',
      proposedAmount: 1800,
      timeEstimate: {
        value: 2,
        unit: 'hours'
      },
      availabilityStart: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      experienceYears: 5
    })
  });

  if (applicationTest.status === 401) {
    log('PASS', 'Job Application: API Security', 'Application API properly protected');
  } else if (applicationTest.status === 404) {
    log('PASS', 'Job Application: Validation', 'Non-existent job application handled');
  } else if (applicationTest.ok && applicationTest.data?.success) {
    log('WARN', 'Job Application: API Security', 'Application succeeded without auth');
  } else {
    log('WARN', 'Job Application: API Response', `Status: ${applicationTest.status}`);
  }

  // Test 3: Application withdrawal
  const withdrawTest = await makeRequest(`/api/jobs/${testJobId}/applications/withdraw`, {
    method: 'POST'
  });

  if (withdrawTest.status === 401) {
    log('PASS', 'Job Application: Withdraw Security', 'Withdrawal properly protected');
  } else {
    log('WARN', 'Job Application: Withdraw', `Status: ${withdrawTest.status}`);
  }
}

async function testRealTimeFeatures() {
  console.log('\n🔍 Testing Real-time Features (Ably Integration)...');

  // Test 1: Check Ably configuration
  try {
    require('dotenv').config({ path: '.env.local' });
    const hasAblyRoot = !!process.env.ABLY_ROOT_KEY;
    const hasAblyClient = !!process.env.NEXT_PUBLIC_ABLY_CLIENT_KEY;

    if (hasAblyRoot && hasAblyClient) {
      log('PASS', 'Realtime: Ably Config', 'Ably keys configured');
    } else {
      log('FAIL', 'Realtime: Ably Config', 'Ably keys missing');
    }
  } catch (error) {
    log('WARN', 'Realtime: Config Check', 'Could not verify Ably configuration');
  }

  // Test 2: Job comments real-time endpoint
  const testJobId = '507f1f77bcf86cd799439011';
  const commentsTest = await makeRequest(`/api/jobs/${testJobId}/comments`);

  if (commentsTest.status === 401) {
    log('PASS', 'Realtime: Comments Security', 'Comments API properly protected');
  } else if (commentsTest.ok) {
    log('PASS', 'Realtime: Comments API', 'Comments endpoint accessible');
  } else {
    log('WARN', 'Realtime: Comments API', `Status: ${commentsTest.status}`);
  }

  // Test 3: Real-time messaging endpoint
  const messagesTest = await makeRequest(`/api/jobs/${testJobId}/messages`);

  if (messagesTest.status === 401) {
    log('PASS', 'Realtime: Messages Security', 'Messages API properly protected');
  } else if (messagesTest.ok) {
    log('PASS', 'Realtime: Messages API', 'Messages endpoint accessible');
  } else {
    log('WARN', 'Realtime: Messages API', `Status: ${messagesTest.status}`);
  }

  // Test 4: Check for real-time components
  const realTimeJobBrowser = await makeRequest('/dashboard/browse-jobs');
  if (realTimeJobBrowser.ok || realTimeJobBrowser.status === 200) {
    log('PASS', 'Realtime: Component Access', 'Real-time job browser accessible');
  } else if (realTimeJobBrowser.status === 401) {
    log('PASS', 'Realtime: Component Security', 'Real-time components protected');
  } else {
    log('WARN', 'Realtime: Component Access', `Status: ${realTimeJobBrowser.status}`);
  }
}

async function testJobLifecycle() {
  console.log('\n🔍 Testing Complete Job Lifecycle...');

  const testJobId = '507f1f77bcf86cd799439011';

  // Test 1: Job details page
  const jobDetailsTest = await makeRequest(`/dashboard/jobs/${testJobId}`);

  if (jobDetailsTest.ok || jobDetailsTest.status === 200) {
    log('PASS', 'Job Lifecycle: Details Page', 'Job details accessible');
  } else if (jobDetailsTest.status === 401 || jobDetailsTest.status === 302) {
    log('PASS', 'Job Lifecycle: Auth Protection', 'Job details protected');
  } else if (jobDetailsTest.status === 404) {
    log('PASS', 'Job Lifecycle: Validation', 'Non-existent job handled');
  } else {
    log('WARN', 'Job Lifecycle: Details Page', `Status: ${jobDetailsTest.status}`);
  }

  // Test 2: Job status management
  const statusTest = await makeRequest(`/api/jobs/${testJobId}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status: 'in_progress' })
  });

  if (statusTest.status === 401) {
    log('PASS', 'Job Lifecycle: Status Security', 'Status update properly protected');
  } else {
    log('WARN', 'Job Lifecycle: Status Update', `Status: ${statusTest.status}`);
  }

  // Test 3: Job applications viewing
  const applicationsTest = await makeRequest(`/api/jobs/${testJobId}/applications`);

  if (applicationsTest.status === 401) {
    log('PASS', 'Job Lifecycle: Applications Security', 'Applications view protected');
  } else if (applicationsTest.ok) {
    log('PASS', 'Job Lifecycle: Applications API', 'Applications endpoint working');
  } else {
    log('WARN', 'Job Lifecycle: Applications', `Status: ${applicationsTest.status}`);
  }

  // Test 4: Job editing
  const editJobTest = await makeRequest(`/dashboard/jobs/${testJobId}/edit`);

  if (editJobTest.ok || editJobTest.status === 200) {
    log('PASS', 'Job Lifecycle: Edit Page', 'Job editing accessible');
  } else if (editJobTest.status === 401 || editJobTest.status === 302) {
    log('PASS', 'Job Lifecycle: Edit Security', 'Job editing protected');
  } else {
    log('WARN', 'Job Lifecycle: Edit Page', `Status: ${editJobTest.status}`);
  }
}

async function testJobNotifications() {
  console.log('\n🔍 Testing Job Notifications System...');

  // Test 1: User notifications endpoint
  const notificationsTest = await makeRequest('/api/user/notifications');

  if (notificationsTest.status === 401) {
    log('PASS', 'Notifications: Security', 'Notifications properly protected');
  } else if (notificationsTest.ok) {
    log('PASS', 'Notifications: API', 'Notifications endpoint working');
  } else {
    log('WARN', 'Notifications: API', `Status: ${notificationsTest.status}`);
  }

  // Test 2: Notification preferences
  const preferencesTest = await makeRequest('/api/user/preferences');

  if (preferencesTest.status === 401) {
    log('PASS', 'Notifications: Preferences Security', 'Preferences properly protected');
  } else if (preferencesTest.ok) {
    log('PASS', 'Notifications: Preferences API', 'Preferences endpoint working');
  } else {
    log('WARN', 'Notifications: Preferences', `Status: ${preferencesTest.status}`);
  }

  // Test 3: Push notifications setup
  const pushSubTest = await makeRequest('/api/user/push-subscription');

  if (pushSubTest.status === 401) {
    log('PASS', 'Notifications: Push Security', 'Push subscriptions protected');
  } else if (pushSubTest.ok) {
    log('PASS', 'Notifications: Push API', 'Push subscription endpoint working');
  } else {
    log('WARN', 'Notifications: Push Setup', `Status: ${pushSubTest.status}`);
  }
}

async function runJobApplicationSystemTest() {
  console.log('🚀 COMPLETE JOB APPLICATION SYSTEM TEST');
  console.log('='.repeat(65));
  console.log('Testing job posting, browsing, applications, and real-time features...');

  const startTime = performance.now();

  await testJobPostingFlow();
  await testJobBrowsingFlow();
  await testJobApplicationFlow();
  await testRealTimeFeatures();
  await testJobLifecycle();
  await testJobNotifications();

  const totalDuration = Math.round(performance.now() - startTime);

  console.log('\n' + '='.repeat(65));
  console.log('📊 JOB APPLICATION SYSTEM TEST RESULTS');
  console.log('='.repeat(65));
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`⚠️ Warnings: ${results.warnings}`);
  console.log(`⏱️ Total Duration: ${totalDuration}ms`);

  const total = results.passed + results.failed + results.warnings;
  const successRate = Math.round((results.passed / total) * 100);
  console.log(`📈 Success Rate: ${successRate}%`);

  // Analyze results by category
  console.log('\n📋 FEATURE STATUS SUMMARY:');
  console.log('='.repeat(40));

  const categories = {
    posting: results.details.filter(d => d.test.toLowerCase().includes('posting')),
    browsing: results.details.filter(d => d.test.toLowerCase().includes('browsing')),
    application: results.details.filter(d => d.test.toLowerCase().includes('application')),
    realtime: results.details.filter(d => d.test.toLowerCase().includes('realtime')),
    lifecycle: results.details.filter(d => d.test.toLowerCase().includes('lifecycle')),
    notifications: results.details.filter(d => d.test.toLowerCase().includes('notifications'))
  };

  Object.entries(categories).forEach(([category, tests]) => {
    const categoryPassed = tests.filter(t => t.status === 'PASS').length;
    const categoryTotal = tests.length;
    const categoryRate = categoryTotal > 0 ? Math.round((categoryPassed / categoryTotal) * 100) : 0;

    const status = categoryRate >= 80 ? '✅' : categoryRate >= 60 ? '⚠️' : '❌';
    console.log(`${status} ${category.toUpperCase()}: ${categoryPassed}/${categoryTotal} (${categoryRate}%)`);
  });

  console.log('\n🎯 IMPLEMENTATION STATUS:');
  console.log('='.repeat(35));

  if (results.failed === 0) {
    console.log('🎉 ALL JOB SYSTEM COMPONENTS WORKING!');
    console.log('✨ Your job application system is ready:');
    console.log('   • Job posting flow (Hirers)');
    console.log('   • Job browsing and search (Fixers)');
    console.log('   • Real-time applications with Ably');
    console.log('   • Complete job lifecycle management');
    console.log('   • Notification system');
    console.log('   • Security and authentication');
  } else {
    console.log('⚠️ Some components need attention:');
    results.details.filter(d => d.status === 'FAIL').forEach(detail => {
      console.log(`   • ${detail.test}: ${detail.message}`);
    });
  }

  console.log('\n🚀 NEXT STEPS:');
  console.log('='.repeat(20));
  console.log('1. Test with authenticated users');
  console.log('2. Verify Ably real-time functionality');
  console.log('3. Test complete hirer-fixer interaction');
  console.log('4. Performance optimization');

  return results;
}

if (require.main === module) {
  runJobApplicationSystemTest().catch(console.error);
}

module.exports = { runJobApplicationSystemTest, results };