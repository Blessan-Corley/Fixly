#!/usr/bin/env node

/**
 * Comprehensive Fixer Job System Testing
 * Tests job browsing, application, and real-time features with Ably
 */

const mongoose = require('mongoose');
const fetch = require('node-fetch');
const Ably = require('ably');
require('dotenv').config({ path: '.env.local' });

// Test configuration
const BASE_URL = 'http://localhost:3000';
const TEST_CONFIG = {
  timeout: 30000,
  retryAttempts: 3,
  ablyWaitTime: 2000,
  skills: ['plumbing', 'electrical', 'carpentry', 'cleaning'],
  locations: [
    { city: 'Mumbai', state: 'Maharashtra' },
    { city: 'Bangalore', state: 'Karnataka' }
  ]
};

// Test users for comprehensive testing
const TEST_USERS = {
  hirer: {
    email: 'test.hirer.fixly@gmail.com',
    password: 'TestHirer123!',
    name: 'Test Hirer',
    username: 'testhirer',
    role: 'hirer'
  },
  fixer: {
    email: 'test.fixer.fixly@gmail.com',
    password: 'TestFixer123!',
    name: 'Test Fixer',
    username: 'testfixer',
    role: 'fixer'
  }
};

let testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  details: []
};

// Utility functions
function logTest(testName, passed, details = '') {
  testResults.total++;
  if (passed) {
    testResults.passed++;
    console.log(`✅ ${testName}`);
  } else {
    testResults.failed++;
    console.log(`❌ ${testName} - ${details}`);
  }
  testResults.details.push({ testName, passed, details });
}

async function makeRequest(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  });

  const text = await response.text();
  let data = {};

  try {
    data = JSON.parse(text);
  } catch (e) {
    data = { text, error: 'Invalid JSON response' };
  }

  return { response, data };
}

async function authenticateUser(userType) {
  const user = TEST_USERS[userType];
  const { response, data } = await makeRequest(`${BASE_URL}/api/auth/signin`, {
    method: 'POST',
    body: JSON.stringify({
      email: user.email,
      password: user.password
    })
  });

  if (response.ok && data.token) {
    return {
      success: true,
      token: data.token,
      user: data.user,
      headers: {
        'Authorization': `Bearer ${data.token}`,
        'Cookie': response.headers.get('set-cookie') || ''
      }
    };
  }

  return { success: false, error: data.message || 'Authentication failed' };
}

async function createTestJob(hirerAuth) {
  const jobData = {
    title: 'Test Plumbing Repair',
    description: 'Need urgent plumbing repair for kitchen sink. Water is leaking continuously and needs immediate attention.',
    skillsRequired: ['plumbing'],
    budget: {
      type: 'fixed',
      amount: 1500,
      materialsIncluded: false
    },
    location: {
      address: '123 Test Street, Test Colony',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      lat: 19.0760,
      lng: 72.8777
    },
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    urgency: 'high',
    attachments: [{
      id: 'test_image_1',
      url: 'https://res.cloudinary.com/test/image/upload/test_image_1.jpg',
      publicId: 'test_image_1',
      filename: 'kitchen_sink.jpg',
      type: 'image/jpeg',
      size: 150000,
      isImage: true,
      isVideo: false,
      width: 800,
      height: 600,
      createdAt: new Date()
    }]
  };

  const { response, data } = await makeRequest(`${BASE_URL}/api/jobs/post`, {
    method: 'POST',
    headers: hirerAuth.headers,
    body: JSON.stringify(jobData)
  });

  return { response, data };
}

async function testJobBrowsing(fixerAuth) {
  console.log('\n🔍 Testing Job Browsing for Fixers...');

  // Test 1: Basic job browsing
  try {
    const { response, data } = await makeRequest(`${BASE_URL}/api/jobs/browse`, {
      headers: fixerAuth.headers
    });

    logTest('Job browse endpoint accessible', response.ok);

    if (response.ok) {
      logTest('Jobs array returned', Array.isArray(data.jobs));
      logTest('Pagination info provided', data.pagination && typeof data.pagination.total === 'number');

      if (data.jobs.length > 0) {
        const job = data.jobs[0];
        logTest('Job has required fields',
          job._id && job.title && job.description && job.budget && job.location && job.skillsRequired
        );
        logTest('Job budget structure valid',
          job.budget.amount && job.budget.type && typeof job.budget.amount === 'number'
        );
        logTest('Job location structure valid',
          job.location.city && job.location.state && job.location.address
        );
      }
    }
  } catch (error) {
    logTest('Job browse basic request', false, error.message);
  }

  // Test 2: Skill-based filtering
  try {
    const { response, data } = await makeRequest(
      `${BASE_URL}/api/jobs/browse?skills=plumbing,electrical&page=1&limit=10`,
      { headers: fixerAuth.headers }
    );

    logTest('Skill-based filtering works', response.ok);

    if (response.ok && data.jobs.length > 0) {
      const hasRelevantSkills = data.jobs.some(job =>
        job.skillsRequired.some(skill => ['plumbing', 'electrical'].includes(skill))
      );
      logTest('Filtered jobs match requested skills', hasRelevantSkills);
    }
  } catch (error) {
    logTest('Skill-based filtering', false, error.message);
  }

  // Test 3: Location-based filtering
  try {
    const { response, data } = await makeRequest(
      `${BASE_URL}/api/jobs/browse?city=Mumbai&state=Maharashtra`,
      { headers: fixerAuth.headers }
    );

    logTest('Location-based filtering works', response.ok);

    if (response.ok && data.jobs.length > 0) {
      const hasCorrectLocation = data.jobs.some(job =>
        job.location.city === 'Mumbai' && job.location.state === 'Maharashtra'
      );
      logTest('Filtered jobs match requested location', hasCorrectLocation);
    }
  } catch (error) {
    logTest('Location-based filtering', false, error.message);
  }

  // Test 4: Sorting functionality
  try {
    const { response, data } = await makeRequest(
      `${BASE_URL}/api/jobs/browse?sortBy=budget.amount&sortOrder=desc`,
      { headers: fixerAuth.headers }
    );

    logTest('Budget sorting works', response.ok);

    if (response.ok && data.jobs.length > 1) {
      let isDescending = true;
      for (let i = 1; i < data.jobs.length; i++) {
        if (data.jobs[i-1].budget.amount < data.jobs[i].budget.amount) {
          isDescending = false;
          break;
        }
      }
      logTest('Jobs sorted by budget descending', isDescending);
    }
  } catch (error) {
    logTest('Budget sorting', false, error.message);
  }
}

async function testJobApplication(fixerAuth, jobId) {
  console.log('\n📝 Testing Job Application Process...');

  // Test 1: Basic application submission
  try {
    const applicationData = {
      proposedAmount: 1200,
      timeEstimate: { value: 2, unit: 'hours' },
      message: 'I have 5+ years of experience in plumbing repairs and can fix this issue quickly and efficiently.',
      availableFrom: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    };

    const { response, data } = await makeRequest(`${BASE_URL}/api/jobs/${jobId}/apply`, {
      method: 'POST',
      headers: fixerAuth.headers,
      body: JSON.stringify(applicationData)
    });

    logTest('Job application submission', response.ok);

    if (response.ok) {
      logTest('Application ID returned', data.application && data.application._id);
      logTest('Application status set to pending', data.application.status === 'pending');
      logTest('Price variance calculated',
        typeof data.application.priceVariance === 'number' &&
        typeof data.application.priceVariancePercentage === 'number'
      );

      return data.application._id;
    }
  } catch (error) {
    logTest('Job application submission', false, error.message);
  }

  // Test 2: Duplicate application prevention
  try {
    const applicationData = {
      proposedAmount: 1300,
      timeEstimate: { value: 3, unit: 'hours' },
      message: 'Second application attempt'
    };

    const { response, data } = await makeRequest(`${BASE_URL}/api/jobs/${jobId}/apply`, {
      method: 'POST',
      headers: fixerAuth.headers,
      body: JSON.stringify(applicationData)
    });

    logTest('Duplicate application prevented', response.status === 400 || response.status === 409);
  } catch (error) {
    logTest('Duplicate application prevention', false, error.message);
  }

  return null;
}

async function testRealTimeFeatures(jobId, applicationId) {
  console.log('\n⚡ Testing Real-time Features with Ably...');

  if (!process.env.NEXT_PUBLIC_ABLY_CLIENT_KEY) {
    logTest('Ably configuration check', false, 'ABLY_CLIENT_KEY not found');
    return;
  }

  try {
    // Initialize Ably client
    const ably = new Ably.Realtime({
      key: process.env.NEXT_PUBLIC_ABLY_CLIENT_KEY,
      clientId: 'test-fixer-client'
    });

    // Wait for connection
    await new Promise((resolve, reject) => {
      ably.connection.once('connected', resolve);
      ably.connection.once('failed', reject);
      setTimeout(() => reject(new Error('Ably connection timeout')), 10000);
    });

    logTest('Ably client connection established', true);

    // Test job applications channel
    const applicationsChannel = ably.channels.get(`job:${jobId}:applications`);

    let applicationEventReceived = false;

    // Subscribe to application events
    await applicationsChannel.subscribe('application_submitted', (message) => {
      console.log('📨 Received real-time application event:', message.data);
      applicationEventReceived = true;

      logTest('Real-time application event structure',
        message.data.applicationId &&
        message.data.fixer &&
        message.data.proposedAmount &&
        message.data.timestamp
      );
    });

    logTest('Application channel subscription successful', true);

    // Test presence features
    try {
      await applicationsChannel.presence.enter({
        userType: 'fixer',
        userId: 'test-fixer',
        timestamp: new Date().toISOString()
      });

      const members = await applicationsChannel.presence.get();
      logTest('Presence functionality works', members.length >= 1);

      await applicationsChannel.presence.leave();
    } catch (presenceError) {
      logTest('Presence functionality', false, presenceError.message);
    }

    // Test notification channel
    const notificationChannel = ably.channels.get(`user:test-fixer:notifications`);

    let notificationReceived = false;

    await notificationChannel.subscribe('notification_sent', (message) => {
      console.log('🔔 Received notification:', message.data);
      notificationReceived = true;
    });

    logTest('Notification channel subscription successful', true);

    // Simulate waiting for events
    await new Promise(resolve => setTimeout(resolve, TEST_CONFIG.ablyWaitTime));

    // Test message publishing (simulate server-side event)
    try {
      await applicationsChannel.publish('application_status_changed', {
        applicationId: applicationId,
        newStatus: 'accepted',
        timestamp: new Date().toISOString(),
        jobId: jobId
      });

      logTest('Message publishing works', true);
    } catch (publishError) {
      logTest('Message publishing', false, publishError.message);
    }

    // Cleanup
    ably.close();

  } catch (error) {
    logTest('Ably real-time setup', false, error.message);
  }
}

async function testJobDetailsAndComments(fixerAuth, jobId) {
  console.log('\n💬 Testing Job Details and Comment System...');

  // Test 1: Get job details
  try {
    const { response, data } = await makeRequest(`${BASE_URL}/api/jobs/${jobId}`, {
      headers: fixerAuth.headers
    });

    logTest('Job details retrieval', response.ok);

    if (response.ok && data.job) {
      logTest('Detailed job data structure',
        data.job.title &&
        data.job.description &&
        data.job.attachments &&
        data.job.createdBy &&
        data.job.applications !== undefined
      );

      logTest('Job attachments properly structured',
        Array.isArray(data.job.attachments) &&
        (data.job.attachments.length === 0 || data.job.attachments[0].url)
      );
    }
  } catch (error) {
    logTest('Job details retrieval', false, error.message);
  }

  // Test 2: Add comment to job
  try {
    const commentData = {
      text: 'I have a question about the plumbing issue. What type of pipes are installed?',
      type: 'question'
    };

    const { response, data } = await makeRequest(`${BASE_URL}/api/jobs/${jobId}/comments`, {
      method: 'POST',
      headers: fixerAuth.headers,
      body: JSON.stringify(commentData)
    });

    logTest('Job comment submission', response.ok);

    if (response.ok && data.comment) {
      logTest('Comment data structure',
        data.comment._id &&
        data.comment.text &&
        data.comment.author &&
        data.comment.createdAt
      );

      return data.comment._id;
    }
  } catch (error) {
    logTest('Job comment submission', false, error.message);
  }

  return null;
}

async function runComprehensiveFixerTests() {
  console.log('🚀 Starting Comprehensive Fixer Job System Testing...\n');

  try {
    // Step 1: Authenticate users
    console.log('🔐 Authenticating test users...');

    const hirerAuth = await authenticateUser('hirer');
    const fixerAuth = await authenticateUser('fixer');

    if (!hirerAuth.success || !fixerAuth.success) {
      console.log('❌ Authentication failed. Please ensure test users exist.');
      console.log('Hirer auth:', hirerAuth);
      console.log('Fixer auth:', fixerAuth);
      return;
    }

    logTest('Hirer authentication', hirerAuth.success);
    logTest('Fixer authentication', fixerAuth.success);

    // Step 2: Create a test job (as hirer)
    console.log('\n📋 Creating test job...');
    const jobCreation = await createTestJob(hirerAuth);

    if (!jobCreation.response.ok || !jobCreation.data.job) {
      logTest('Test job creation', false, jobCreation.data.message || 'Job creation failed');
      return;
    }

    const jobId = jobCreation.data.job._id;
    logTest('Test job creation', true);
    console.log(`📝 Test job created with ID: ${jobId}`);

    // Step 3: Test job browsing (as fixer)
    await testJobBrowsing(fixerAuth);

    // Step 4: Test job application (as fixer)
    const applicationId = await testJobApplication(fixerAuth, jobId);

    // Step 5: Test real-time features
    if (applicationId) {
      await testRealTimeFeatures(jobId, applicationId);
    }

    // Step 6: Test job details and comments
    await testJobDetailsAndComments(fixerAuth, jobId);

    // Step 7: Test application withdrawal
    console.log('\n↩️ Testing Application Withdrawal...');
    if (applicationId) {
      try {
        const { response, data } = await makeRequest(
          `${BASE_URL}/api/jobs/${jobId}/applications/withdraw`,
          {
            method: 'POST',
            headers: fixerAuth.headers,
            body: JSON.stringify({ applicationId })
          }
        );

        logTest('Application withdrawal', response.ok);

        if (response.ok) {
          logTest('Withdrawal response structure', data.success === true);
        }
      } catch (error) {
        logTest('Application withdrawal', false, error.message);
      }
    }

  } catch (error) {
    console.error('💥 Test execution error:', error);
    logTest('Overall test execution', false, error.message);
  }

  // Print final results
  console.log('\n' + '='.repeat(60));
  console.log('📊 FIXER JOB SYSTEM TEST RESULTS');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${testResults.passed}/${testResults.total}`);
  console.log(`❌ Failed: ${testResults.failed}/${testResults.total}`);
  console.log(`📈 Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%\n`);

  if (testResults.failed > 0) {
    console.log('🔍 Failed Tests:');
    testResults.details
      .filter(test => !test.passed)
      .forEach(test => {
        console.log(`   • ${test.testName}: ${test.details}`);
      });
    console.log('');
  }

  const isSuccess = testResults.passed === testResults.total;
  console.log(isSuccess ? '🎉 All tests passed! Fixer job system is working correctly.' :
              '⚠️ Some tests failed. Please review the issues above.');

  return {
    success: isSuccess,
    results: testResults
  };
}

// Run tests if called directly
if (require.main === module) {
  runComprehensiveFixerTests()
    .then((results) => {
      process.exit(results.success ? 0 : 1);
    })
    .catch((error) => {
      console.error('💥 Test runner error:', error);
      process.exit(1);
    });
}

module.exports = {
  runComprehensiveFixerTests,
  testJobBrowsing,
  testJobApplication,
  testRealTimeFeatures
};