// COMPREHENSIVE_API_TEST.js - Full CI/CD-style integration testing
// Tests ALL features with real authentication and data flows

import fetch from 'node-fetch';
import { CookieJar } from 'tough-cookie';
import fetchCookie from 'fetch-cookie';

const BASE_URL = 'http://localhost:3000';
const TEST_RESULTS = {
  totalTests: 0,
  passed: 0,
  failed: 0,
  skipped: 0,
  issues: [],
  timings: {},
  startTime: Date.now()
};

// Create cookie jars for each user
const hirerJar = new CookieJar();
const fixerJar = new CookieJar();
const hirerFetch = fetchCookie(fetch, hirerJar);
const fixerFetch = fetchCookie(fetch, fixerJar);

// Test data storage
const TEST_DATA = {
  hirer: {
    email: 'test-hirer@fixly.test',
    password: 'TestHirer@123',
    username: 'testhirer',
    sessionToken: null,
    cookies: null,
    fetch: hirerFetch,
    jar: hirerJar
  },
  fixer: {
    email: 'test-fixer@fixly.test',
    password: 'TestFixer@123',
    username: 'testfixer',
    sessionToken: null,
    cookies: null,
    fetch: fixerFetch,
    jar: fixerJar
  },
  jobs: [],
  applications: [],
  comments: [],
  messages: [],
  reviews: [],
  notifications: []
};

// Utility: Make authenticated request
async function authRequest(method, endpoint, body = null, user = 'hirer') {
  const userData = TEST_DATA[user];
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json'
    }
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  // Use the cookie-enabled fetch for this user
  const response = await userData.fetch(`${BASE_URL}${endpoint}`, options);
  return response;
}

// Utility: Test runner
async function runTest(name, testFn, category = 'General') {
  TEST_RESULTS.totalTests++;
  const startTime = Date.now();

  try {
    console.log(`\n🧪 [${category}] ${name}`);
    await testFn();
    const duration = Date.now() - startTime;
    TEST_RESULTS.passed++;
    TEST_RESULTS.timings[name] = duration;
    console.log(`   ✅ PASSED (${duration}ms)`);
    return true;
  } catch (error) {
    const duration = Date.now() - startTime;
    TEST_RESULTS.failed++;
    TEST_RESULTS.issues.push({ test: name, category, error: error.message });
    TEST_RESULTS.timings[name] = duration;
    console.log(`   ❌ FAILED: ${error.message} (${duration}ms)`);
    return false;
  }
}

// Assertion helpers
function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${expected}, got ${actual}`);
  }
}

// ============================================================================
// PHASE 1: AUTHENTICATION & SESSION MANAGEMENT
// ============================================================================

async function testAuthentication() {
  console.log('\n' + '='.repeat(70));
  console.log('PHASE 1: AUTHENTICATION & SESSION MANAGEMENT');
  console.log('='.repeat(70));

  // Test 1: Login as Hirer
  await runTest('Login as Hirer', async () => {
    //  First get CSRF token
    await TEST_DATA.hirer.fetch(`${BASE_URL}/api/auth/csrf`);

    // Now login with credentials using NextAuth callback endpoint
    const response = await TEST_DATA.hirer.fetch(`${BASE_URL}/api/auth/callback/credentials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        email: TEST_DATA.hirer.email,
        password: TEST_DATA.hirer.password,
        loginMethod: 'email',
        callbackUrl: BASE_URL,
        json: 'true'
      }).toString(),
      redirect: 'manual'
    });

    // NextAuth returns 200 on success with JSON
    assert(response.status === 200 || response.status === 302, `Login failed: ${response.status}`);
    console.log(`   📝 Login status: ${response.status}`);
  }, 'Authentication');

  // Test 2: Login as Fixer
  await runTest('Login as Fixer', async () => {
    // First get CSRF token
    await TEST_DATA.fixer.fetch(`${BASE_URL}/api/auth/csrf`);

    // Now login with credentials
    const response = await TEST_DATA.fixer.fetch(`${BASE_URL}/api/auth/callback/credentials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        email: TEST_DATA.fixer.email,
        password: TEST_DATA.fixer.password,
        loginMethod: 'email',
        callbackUrl: BASE_URL,
        json: 'true'
      }).toString(),
      redirect: 'manual'
    });

    assert(response.status === 200 || response.status === 302, `Login failed: ${response.status}`);
    console.log(`   📝 Login status: ${response.status}`);
  }, 'Authentication');

  // Test 3: Verify Hirer Session
  await runTest('Verify Hirer Session', async () => {
    const response = await authRequest('GET', '/api/auth/session', null, 'hirer');
    const data = await response.json();

    assert(response.status === 200, 'Session check failed');
    assert(data.user, 'No user in session');
    assertEqual(data.user.email, TEST_DATA.hirer.email, 'Wrong user in session');
  }, 'Authentication');

  // Test 4: Verify Fixer Session
  await runTest('Verify Fixer Session', async () => {
    const response = await authRequest('GET', '/api/auth/session', null, 'fixer');
    const data = await response.json();

    assert(response.status === 200, 'Session check failed');
    assert(data.user, 'No user in session');
    assertEqual(data.user.email, TEST_DATA.fixer.email, 'Wrong user in session');
  }, 'Authentication');
}

// ============================================================================
// PHASE 2: JOB POSTING WORKFLOW
// ============================================================================

async function testJobPosting() {
  console.log('\n' + '='.repeat(70));
  console.log('PHASE 2: JOB POSTING WORKFLOW');
  console.log('='.repeat(70));

  // Test 1: Create Job Draft
  await runTest('Create Job Draft', async () => {
    const draftData = {
      title: 'Test Plumbing Job - Leaky Faucet',
      description: 'Need urgent plumbing repair for kitchen faucet',
      category: 'plumbing',
      location: {
        address: '123 Test Street, Test City',
        coordinates: { lat: 12.9716, lng: 77.5946 }
      }
    };

    const response = await authRequest('POST', '/api/jobs/drafts', draftData, 'hirer');
    const data = await response.json();

    assert(response.status === 200 || response.status === 201, `Draft creation failed: ${response.status}`);
    assert(data.success, 'Draft creation not successful');
    assert(data.draft, 'No draft returned');
    assert(data.draft._id, 'No draft ID');

    TEST_DATA.jobs.push({ draftId: data.draft._id, ...draftData });
  }, 'Job Posting');

  // Test 2: Post Complete Job
  await runTest('Post Complete Job', async () => {
    const jobData = {
      title: 'Electrical Wiring Installation',
      description: 'Complete electrical wiring for new construction. Need certified electrician with 5+ years experience.',
      category: 'electrical',
      budget: {
        type: 'fixed',
        amount: 15000,
        currency: 'INR',
        materialsIncluded: true
      },
      location: {
        address: '456 Builder Street, Construction Zone',
        city: 'Bangalore',
        state: 'Karnataka',
        coordinates: { lat: 12.9716, lng: 77.5946 }
      },
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      requirements: ['Licensed electrician', '5+ years experience', 'Own tools'],
      images: []
    };

    const response = await authRequest('POST', '/api/jobs/post', jobData, 'hirer');
    const data = await response.json();

    assert(response.status === 200 || response.status === 201, `Job posting failed: ${response.status}`);
    assert(data.success, 'Job posting not successful');
    assert(data.job, 'No job returned');
    assert(data.job._id, 'No job ID');

    TEST_DATA.jobs.push({ jobId: data.job._id, ...jobData });
    console.log(`   📝 Job created: ${data.job._id}`);
  }, 'Job Posting');

  // Test 3: Browse Jobs (Public)
  await runTest('Browse Posted Jobs', async () => {
    const response = await fetch(`${BASE_URL}/api/jobs/browse?page=1&limit=10`);
    const data = await response.json();

    assert(response.status === 200, 'Browse jobs failed');
    assert(data.success, 'Browse not successful');
    assert(Array.isArray(data.jobs), 'Jobs not an array');
    assert(data.jobs.length > 0, 'No jobs returned');
  }, 'Job Posting');

  // Test 4: Get Job Stats
  await runTest('Get Job Statistics', async () => {
    const response = await fetch(`${BASE_URL}/api/jobs/stats`);
    const data = await response.json();

    assert(response.status === 200, 'Stats failed');
    assert(data.stats, 'No stats returned');
    assert(typeof data.stats.totalJobs === 'number', 'Invalid total jobs count');
  }, 'Job Posting');

  // Test 5: Validate Job Budget
  await runTest('Validate Job Budget Requirements', async () => {
    const invalidJob = {
      title: 'Test Job',
      description: 'Test description',
      budget: { type: 'fixed', amount: 50, currency: 'INR' } // Too low
    };

    const response = await authRequest('POST', '/api/jobs/post', invalidJob, 'hirer');
    const data = await response.json();

    // Should either reject or warn about low budget
    assert(response.status === 400 || data.warning, 'Low budget not validated');
  }, 'Job Posting');
}

// ============================================================================
// PHASE 3: JOB APPLICATION WORKFLOW
// ============================================================================

async function testJobApplications() {
  console.log('\n' + '='.repeat(70));
  console.log('PHASE 3: JOB APPLICATION WORKFLOW');
  console.log('='.repeat(70));

  const testJob = TEST_DATA.jobs.find(j => j.jobId);
  if (!testJob) {
    console.log('⏭️  SKIPPING: No job available for testing');
    TEST_RESULTS.skipped += 4;
    return;
  }

  // Test 1: Apply for Job
  await runTest('Submit Job Application', async () => {
    const applicationData = {
      coverLetter: 'I am an experienced electrician with 7 years of experience in residential and commercial wiring.',
      proposedBudget: 14000,
      estimatedDuration: '5 days',
      availability: 'Can start immediately'
    };

    const response = await authRequest('POST', `/api/jobs/${testJob.jobId}/apply`, applicationData, 'fixer');
    const data = await response.json();

    assert(response.status === 200 || response.status === 201, `Application failed: ${response.status}`);
    assert(data.success, 'Application not successful');
    assert(data.application, 'No application returned');

    TEST_DATA.applications.push({ applicationId: data.application._id, jobId: testJob.jobId });
    console.log(`   📄 Application submitted: ${data.application._id}`);
  }, 'Applications');

  // Test 2: View Job Applications (Hirer)
  await runTest('View Job Applications as Hirer', async () => {
    const response = await authRequest('GET', `/api/jobs/${testJob.jobId}/applications`, null, 'hirer');
    const data = await response.json();

    assert(response.status === 200, 'Failed to get applications');
    assert(Array.isArray(data.applications), 'Applications not an array');
    assert(data.applications.length > 0, 'No applications returned');
  }, 'Applications');

  // Test 3: Withdraw Application
  await runTest('Withdraw Job Application', async () => {
    const response = await authRequest('POST', `/api/jobs/${testJob.jobId}/applications/withdraw`, {}, 'fixer');
    const data = await response.json();

    assert(response.status === 200, 'Withdrawal failed');
    assert(data.success, 'Withdrawal not successful');
  }, 'Applications');

  // Test 4: Re-apply After Withdrawal
  await runTest('Re-apply After Withdrawal', async () => {
    const applicationData = {
      coverLetter: 'Reapplying with updated proposal',
      proposedBudget: 13500,
      estimatedDuration: '4 days'
    };

    const response = await authRequest('POST', `/api/jobs/${testJob.jobId}/apply`, applicationData, 'fixer');
    const data = await response.json();

    assert(response.status === 200 || response.status === 201, 'Re-application failed');
    assert(data.success, 'Re-application not successful');
  }, 'Applications');
}

// ============================================================================
// PHASE 4: JOB LIFECYCLE MANAGEMENT
// ============================================================================

async function testJobLifecycle() {
  console.log('\n' + '='.repeat(70));
  console.log('PHASE 4: JOB LIFECYCLE MANAGEMENT');
  console.log('='.repeat(70));

  const testJob = TEST_DATA.jobs.find(j => j.jobId);
  if (!testJob) {
    console.log('⏭️  SKIPPING: No job available');
    TEST_RESULTS.skipped += 3;
    return;
  }

  // Test 1: Update Job Status to In Progress
  await runTest('Update Job Status to In Progress', async () => {
    const response = await authRequest('PUT', `/api/jobs/${testJob.jobId}/status`,
      { status: 'in_progress' }, 'hirer');
    const data = await response.json();

    assert(response.status === 200, 'Status update failed');
    assert(data.success, 'Status update not successful');
  }, 'Job Lifecycle');

  // Test 2: Update Job Status to Completed
  await runTest('Update Job Status to Completed', async () => {
    const response = await authRequest('PUT', `/api/jobs/${testJob.jobId}/status`,
      { status: 'completed' }, 'hirer');
    const data = await response.json();

    assert(response.status === 200, 'Completion failed');
    assert(data.success, 'Completion not successful');
  }, 'Job Lifecycle');

  // Test 3: Verify Status Change Reflected
  await runTest('Verify Status Change in Job Details', async () => {
    const response = await fetch(`${BASE_URL}/api/jobs/${testJob.jobId}`);
    const data = await response.json();

    assert(response.status === 200, 'Job fetch failed');
    assertEqual(data.job.status, 'completed', 'Status not updated');
  }, 'Job Lifecycle');
}

// ============================================================================
// PHASE 5: COMMENT SYSTEM
// ============================================================================

async function testComments() {
  console.log('\n' + '='.repeat(70));
  console.log('PHASE 5: COMMENT SYSTEM');
  console.log('='.repeat(70));

  const testJob = TEST_DATA.jobs.find(j => j.jobId);
  if (!testJob) {
    console.log('⏭️  SKIPPING: No job available');
    TEST_RESULTS.skipped += 5;
    return;
  }

  // Test 1: Post Comment
  await runTest('Post Comment on Job', async () => {
    const commentData = {
      content: 'Is the budget negotiable? I can provide high quality work.',
      jobId: testJob.jobId
    };

    const response = await authRequest('POST', `/api/jobs/${testJob.jobId}/comments`, commentData, 'fixer');
    const data = await response.json();

    assert(response.status === 200 || response.status === 201, 'Comment posting failed');
    assert(data.success, 'Comment not successful');
    assert(data.comment, 'No comment returned');

    TEST_DATA.comments.push({ commentId: data.comment._id, jobId: testJob.jobId });
    console.log(`   💬 Comment posted: ${data.comment._id}`);
  }, 'Comments');

  // Test 2: Get Job Comments
  await runTest('Retrieve Job Comments', async () => {
    const response = await fetch(`${BASE_URL}/api/jobs/${testJob.jobId}/comments`);
    const data = await response.json();

    assert(response.status === 200, 'Comments retrieval failed');
    assert(Array.isArray(data.comments), 'Comments not an array');
  }, 'Comments');

  const testComment = TEST_DATA.comments[0];
  if (testComment) {
    // Test 3: Like Comment
    await runTest('Like Comment', async () => {
      const response = await authRequest('POST', `/api/jobs/${testJob.jobId}/comments/${testComment.commentId}/like`, {}, 'hirer');
      const data = await response.json();

      assert(response.status === 200, 'Like failed');
      assert(data.success, 'Like not successful');
    }, 'Comments');

    // Test 4: Edit Comment
    await runTest('Edit Comment', async () => {
      const response = await authRequest('PUT', `/api/jobs/${testJob.jobId}/comments/${testComment.commentId}/edit`,
        { content: 'Updated: Is the budget negotiable? I have 7 years experience.' }, 'fixer');
      const data = await response.json();

      assert(response.status === 200, 'Edit failed');
      assert(data.success, 'Edit not successful');
    }, 'Comments');

    // Test 5: React to Comment
    await runTest('React to Comment', async () => {
      const response = await authRequest('POST', `/api/jobs/${testJob.jobId}/comments/${testComment.commentId}/react`,
        { reaction: '👍' }, 'hirer');
      const data = await response.json();

      assert(response.status === 200, 'React failed');
      assert(data.success, 'React not successful');
    }, 'Comments');
  } else {
    TEST_RESULTS.skipped += 3;
  }
}

// ============================================================================
// PHASE 6: MESSAGING SYSTEM
// ============================================================================

async function testMessaging() {
  console.log('\n' + '='.repeat(70));
  console.log('PHASE 6: MESSAGING SYSTEM');
  console.log('='.repeat(70));

  const testJob = TEST_DATA.jobs.find(j => j.jobId);
  if (!testJob) {
    console.log('⏭️  SKIPPING: No job available');
    TEST_RESULTS.skipped += 4;
    return;
  }

  // Test 1: Check Messaging Permission
  await runTest('Check Messaging Permission', async () => {
    const response = await authRequest('GET', `/api/messages/${testJob.jobId}/allowed`, null, 'fixer');
    const data = await response.json();

    assert(response.status === 200, 'Permission check failed');
    assert(typeof data.allowed === 'boolean', 'No permission status');
  }, 'Messaging');

  // Test 2: Send Message
  await runTest('Send Message', async () => {
    const messageData = {
      content: 'Hi, I would like to discuss the project requirements in detail.',
      recipientId: TEST_DATA.hirer.username,
      jobId: testJob.jobId
    };

    const response = await authRequest('POST', `/api/jobs/${testJob.jobId}/messages`, messageData, 'fixer');
    const data = await response.json();

    assert(response.status === 200 || response.status === 201, 'Message send failed');
    assert(data.success, 'Message not successful');
  }, 'Messaging');

  // Test 3: Get Conversations
  await runTest('Get Message Conversations', async () => {
    const response = await authRequest('GET', '/api/messages', null, 'hirer');
    const data = await response.json();

    assert(response.status === 200, 'Conversations retrieval failed');
    assert(Array.isArray(data.conversations) || data.messages, 'No conversations data');
  }, 'Messaging');

  // Test 4: Send Reply
  await runTest('Send Message Reply', async () => {
    const replyData = {
      content: 'Sure, let me know what specific details you need.',
      recipientId: TEST_DATA.fixer.username,
      jobId: testJob.jobId
    };

    const response = await authRequest('POST', `/api/jobs/${testJob.jobId}/messages`, replyData, 'hirer');
    const data = await response.json();

    assert(response.status === 200 || response.status === 201, 'Reply failed');
    assert(data.success, 'Reply not successful');
  }, 'Messaging');
}

// ============================================================================
// PHASE 7: RATINGS & REVIEWS
// ============================================================================

async function testReviews() {
  console.log('\n' + '='.repeat(70));
  console.log('PHASE 7: RATINGS & REVIEWS');
  console.log('='.repeat(70));

  const testJob = TEST_DATA.jobs.find(j => j.jobId);
  if (!testJob) {
    console.log('⏭️  SKIPPING: No job available');
    TEST_RESULTS.skipped += 4;
    return;
  }

  // Test 1: Submit Rating
  await runTest('Submit Job Rating', async () => {
    const ratingData = {
      rating: 5,
      ratedUserId: TEST_DATA.fixer.username,
      categories: {
        quality: 5,
        communication: 5,
        timeliness: 4,
        professionalism: 5
      }
    };

    const response = await authRequest('POST', `/api/jobs/${testJob.jobId}/rating`, ratingData, 'hirer');
    const data = await response.json();

    assert(response.status === 200 || response.status === 201, 'Rating submission failed');
    assert(data.success, 'Rating not successful');
  }, 'Reviews');

  // Test 2: Submit Review
  await runTest('Submit Detailed Review', async () => {
    const reviewData = {
      review: 'Excellent work! Very professional and completed on time. Highly recommended.',
      rating: 5,
      reviewedUserId: TEST_DATA.fixer.username
    };

    const response = await authRequest('POST', `/api/jobs/${testJob.jobId}/review`, reviewData, 'hirer');
    const data = await response.json();

    assert(response.status === 200 || response.status === 201, 'Review submission failed');
    assert(data.success, 'Review not successful');

    if (data.review) {
      TEST_DATA.reviews.push({ reviewId: data.review._id });
    }
  }, 'Reviews');

  // Test 3: Get Public Reviews
  await runTest('Get Public Reviews', async () => {
    const response = await fetch(`${BASE_URL}/api/reviews`);
    const data = await response.json();

    assert(response.status === 200, 'Reviews retrieval failed');
    assert(data.success, 'Reviews not successful');
    assert(Array.isArray(data.reviews), 'Reviews not an array');
  }, 'Reviews');

  // Test 4: Mark Review Helpful
  const testReview = TEST_DATA.reviews[0];
  if (testReview) {
    await runTest('Mark Review as Helpful', async () => {
      const response = await authRequest('POST', `/api/reviews/${testReview.reviewId}/helpful`, {}, 'fixer');
      const data = await response.json();

      assert(response.status === 200, 'Helpful marking failed');
      assert(data.success, 'Helpful not successful');
    }, 'Reviews');
  } else {
    TEST_RESULTS.skipped += 1;
  }
}

// ============================================================================
// PHASE 8: USER PROFILE MANAGEMENT
// ============================================================================

async function testUserProfile() {
  console.log('\n' + '='.repeat(70));
  console.log('PHASE 8: USER PROFILE MANAGEMENT');
  console.log('='.repeat(70));

  // Test 1: Get Own Profile
  await runTest('Get Own Profile', async () => {
    const response = await authRequest('GET', `/api/user/profile/${TEST_DATA.hirer.username}`, null, 'hirer');
    const data = await response.json();

    assert(response.status === 200, 'Profile retrieval failed');
    assert(data.user, 'No user data');
    assertEqual(data.user.username, TEST_DATA.hirer.username, 'Wrong user');
  }, 'User Profile');

  // Test 2: Update Profile
  await runTest('Update User Profile', async () => {
    const profileData = {
      bio: 'Experienced home owner looking for quality services',
      phone: '+919876543210',
      displayName: 'Test Hirer Account'
    };

    const response = await authRequest('PUT', '/api/user/profile', profileData, 'hirer');
    const data = await response.json();

    assert(response.status === 200, 'Profile update failed');
    assert(data.success, 'Profile update not successful');
  }, 'User Profile');

  // Test 3: Update Preferences
  await runTest('Update User Preferences', async () => {
    const preferencesData = {
      emailNotifications: true,
      pushNotifications: true,
      smsNotifications: false,
      language: 'en',
      theme: 'light'
    };

    const response = await authRequest('PUT', '/api/user/preferences', preferencesData, 'hirer');
    const data = await response.json();

    assert(response.status === 200, 'Preferences update failed');
    assert(data.success, 'Preferences not successful');
  }, 'User Profile');

  // Test 4: Update Privacy Settings
  await runTest('Update Privacy Settings', async () => {
    const privacyData = {
      profileVisibility: 'public',
      showEmail: false,
      showPhone: false,
      allowMessages: true
    };

    const response = await authRequest('PUT', '/api/user/privacy', privacyData, 'hirer');
    const data = await response.json();

    assert(response.status === 200, 'Privacy update failed');
    assert(data.success, 'Privacy not successful');
  }, 'User Profile');
}

// ============================================================================
// PHASE 9: SEARCH & DISCOVERY
// ============================================================================

async function testSearch() {
  console.log('\n' + '='.repeat(70));
  console.log('PHASE 9: SEARCH & DISCOVERY');
  console.log('='.repeat(70));

  // Test 1: Search Suggestions
  await runTest('Get Search Suggestions', async () => {
    const response = await fetch(`${BASE_URL}/api/search/suggestions?q=plumb`);
    const data = await response.json();

    assert(response.status === 200, 'Suggestions failed');
    assert(Array.isArray(data) || data.suggestions, 'No suggestions array');
  }, 'Search');

  // Test 2: Search Jobs by Category
  await runTest('Search Jobs by Category', async () => {
    const response = await fetch(`${BASE_URL}/api/jobs/browse?category=electrical&page=1&limit=5`);
    const data = await response.json();

    assert(response.status === 200, 'Category search failed');
    assert(data.success, 'Search not successful');
    assert(Array.isArray(data.jobs), 'Jobs not an array');
  }, 'Search');

  // Test 3: Search Jobs by Location
  await runTest('Search Jobs by Location', async () => {
    const response = await fetch(`${BASE_URL}/api/jobs/browse?city=Bangalore&page=1&limit=5`);
    const data = await response.json();

    assert(response.status === 200, 'Location search failed');
    assert(data.success, 'Search not successful');
  }, 'Search');

  // Test 4: Search User Profiles
  await runTest('Search User Profiles', async () => {
    const response = await authRequest('GET', '/api/user/profile/search?q=test', null, 'hirer');
    const data = await response.json();

    assert(response.status === 200, 'Profile search failed');
    assert(Array.isArray(data.users) || data.profiles, 'No users array');
  }, 'Search');
}

// ============================================================================
// PHASE 10: NOTIFICATIONS
// ============================================================================

async function testNotifications() {
  console.log('\n' + '='.repeat(70));
  console.log('PHASE 10: NOTIFICATIONS');
  console.log('='.repeat(70));

  // Test 1: Get Notifications
  await runTest('Get User Notifications', async () => {
    const response = await authRequest('GET', '/api/user/notifications', null, 'hirer');
    const data = await response.json();

    assert(response.status === 200, 'Notifications retrieval failed');
    assert(Array.isArray(data.notifications) || data.items, 'No notifications array');
  }, 'Notifications');

  // Test 2: Mark Notifications as Read
  await runTest('Mark Notifications as Read', async () => {
    const response = await authRequest('POST', '/api/user/notifications/read',
      { notificationIds: ['all'] }, 'hirer');
    const data = await response.json();

    assert(response.status === 200, 'Mark read failed');
    assert(data.success, 'Mark read not successful');
  }, 'Notifications');

  // Test 3: Get Unread Count
  await runTest('Get Unread Notification Count', async () => {
    const response = await authRequest('GET', '/api/user/notifications?unreadOnly=true', null, 'hirer');
    const data = await response.json();

    assert(response.status === 200, 'Unread count failed');
    assert(typeof data.unreadCount === 'number' || data.count !== undefined, 'No count returned');
  }, 'Notifications');
}

// ============================================================================
// PHASE 11: VALIDATION SYSTEMS
// ============================================================================

async function testValidation() {
  console.log('\n' + '='.repeat(70));
  console.log('PHASE 11: VALIDATION SYSTEMS');
  console.log('='.repeat(70));

  // Test 1: Content Profanity Detection
  await runTest('Profanity Detection', async () => {
    const response = await authRequest('POST', '/api/validate-content',
      { content: 'This is fucking terrible' }, 'hirer');
    const data = await response.json();

    assert(response.status === 200 || response.status === 400, 'Validation check failed');
    assert(data.isValid === false || data.hasProfanity, 'Profanity not detected');
  }, 'Validation');

  // Test 2: Clean Content Validation
  await runTest('Clean Content Validation', async () => {
    const response = await authRequest('POST', '/api/validate-content',
      { content: 'This is perfectly clean content' }, 'hirer');
    const data = await response.json();

    assert(response.status === 200, 'Clean validation failed');
    assert(data.isValid !== false, 'Clean content marked invalid');
  }, 'Validation');

  // Test 3: XSS Prevention
  await runTest('XSS Attack Prevention', async () => {
    const xssData = {
      title: '<script>alert("XSS")</script>Malicious Job',
      description: 'Normal description',
      category: 'plumbing'
    };

    const response = await authRequest('POST', '/api/jobs/post', xssData, 'hirer');
    const data = await response.json();

    // Should either reject or sanitize
    assert(response.status === 400 || !data.job?.title.includes('<script>'), 'XSS not prevented');
  }, 'Validation');

  // Test 4: SQL Injection Prevention
  await runTest('SQL Injection Prevention', async () => {
    const sqlData = {
      username: "admin'--",
      password: 'anything'
    };

    const response = await fetch(`${BASE_URL}/api/auth/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sqlData)
    });

    assert(response.status === 401 || response.status === 400, 'SQL injection not prevented');
  }, 'Validation');

  // Test 5: Long Input Validation
  await runTest('Long Input Validation', async () => {
    const longData = {
      content: 'A'.repeat(10000) // Very long string
    };

    const response = await authRequest('POST', '/api/validate-content', longData, 'hirer');
    const data = await response.json();

    assert(response.status === 400 || data.isValid === false, 'Long input not validated');
  }, 'Validation');
}

// ============================================================================
// PHASE 12: SYSTEM HEALTH & INFRASTRUCTURE
// ============================================================================

async function testInfrastructure() {
  console.log('\n' + '='.repeat(70));
  console.log('PHASE 12: SYSTEM HEALTH & INFRASTRUCTURE');
  console.log('='.repeat(70));

  // Test 1: System Health Check
  await runTest('System Health Check', async () => {
    const response = await fetch(`${BASE_URL}/api/test-system`);
    const data = await response.json();

    assert(response.status === 200, 'Health check failed');
    assert(data.mongodb?.status === 'connected', 'MongoDB not connected');
    assert(data.redis?.status === 'connected', 'Redis not connected');
  }, 'Infrastructure');

  // Test 2: Ably Configuration
  await runTest('Ably Real-time Configuration', async () => {
    const response = await fetch(`${BASE_URL}/api/check-ably`);
    const data = await response.json();

    assert(response.status === 200, 'Ably check failed');
    assert(data.configured || data.clientKey, 'Ably not configured');
  }, 'Infrastructure');

  // Test 3: Database Performance
  await runTest('Database Query Performance', async () => {
    const start = Date.now();
    const response = await fetch(`${BASE_URL}/api/jobs/browse?limit=20`);
    const duration = Date.now() - start;

    assert(response.status === 200, 'Query failed');
    assert(duration < 3000, `Query too slow: ${duration}ms`);
  }, 'Infrastructure');
}

// ============================================================================
// FINAL REPORT GENERATION
// ============================================================================

function generateReport() {
  const totalDuration = Date.now() - TEST_RESULTS.startTime;

  console.log('\n' + '█'.repeat(70));
  console.log('   COMPREHENSIVE CI/CD TEST REPORT');
  console.log('█'.repeat(70));

  console.log('\n📊 OVERALL STATISTICS:');
  console.log(`   Total Tests: ${TEST_RESULTS.totalTests}`);
  console.log(`   ✅ Passed: ${TEST_RESULTS.passed}`);
  console.log(`   ❌ Failed: ${TEST_RESULTS.failed}`);
  console.log(`   ⏭️  Skipped: ${TEST_RESULTS.skipped}`);
  console.log(`   Success Rate: ${((TEST_RESULTS.passed / TEST_RESULTS.totalTests) * 100).toFixed(1)}%`);
  console.log(`   Total Duration: ${(totalDuration / 1000).toFixed(2)}s`);

  if (TEST_RESULTS.failed > 0) {
    console.log('\n❌ FAILED TESTS:');
    TEST_RESULTS.issues.forEach((issue, index) => {
      console.log(`   ${index + 1}. [${issue.category}] ${issue.test}`);
      console.log(`      Error: ${issue.error}`);
    });
  }

  console.log('\n⏱️  PERFORMANCE METRICS:');
  const slowTests = Object.entries(TEST_RESULTS.timings)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  slowTests.forEach(([test, time], index) => {
    console.log(`   ${index + 1}. ${test}: ${time}ms`);
  });

  console.log('\n' + '█'.repeat(70));

  const exitCode = TEST_RESULTS.failed > 0 ? 1 : 0;
  console.log(`\nTest suite ${exitCode === 0 ? '✅ PASSED' : '❌ FAILED'}`);

  return exitCode;
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

async function runAllTests() {
  console.log('██████████████████████████████████████████████████████████████████████');
  console.log('   FIXLY PLATFORM - COMPREHENSIVE CI/CD TEST SUITE');
  console.log('   Testing ALL Features End-to-End with Real Data Flows');
  console.log('██████████████████████████████████████████████████████████████████████\n');
  console.log(`Server: ${BASE_URL}`);
  console.log(`Start Time: ${new Date().toISOString()}\n`);

  try {
    await testAuthentication();
    await testJobPosting();
    await testJobApplications();
    await testJobLifecycle();
    await testComments();
    await testMessaging();
    await testReviews();
    await testUserProfile();
    await testSearch();
    await testNotifications();
    await testValidation();
    await testInfrastructure();

    const exitCode = generateReport();
    process.exit(exitCode);
  } catch (error) {
    console.error('\n💥 CRITICAL ERROR:', error);
    process.exit(1);
  }
}

// Run tests
runAllTests();
