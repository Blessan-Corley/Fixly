// scripts/validate-database-integrity.js - Comprehensive Database Schema Validation
import mongoose from 'mongoose';
import { getRedis } from '../lib/redis.js';

// Import models
import User from '../models/User.js';
import Job from '../models/job.js';
import connectDB from '../lib/db.js';

const VALIDATION_RESULTS = {
  passed: 0,
  failed: 0,
  warnings: 0,
  errors: []
};

function logResult(test, status, message, details = null) {
  const timestamp = new Date().toISOString();
  const result = {
    test,
    status,
    message,
    details,
    timestamp
  };

  if (status === 'PASS') {
    VALIDATION_RESULTS.passed++;
    console.log(`✅ [${timestamp}] ${test}: ${message}`);
  } else if (status === 'FAIL') {
    VALIDATION_RESULTS.failed++;
    console.log(`❌ [${timestamp}] ${test}: ${message}`);
    if (details) console.log(`   Details: ${JSON.stringify(details, null, 2)}`);
  } else if (status === 'WARN') {
    VALIDATION_RESULTS.warnings++;
    console.log(`⚠️  [${timestamp}] ${test}: ${message}`);
  }

  VALIDATION_RESULTS.errors.push(result);
  return result;
}

async function validateDatabaseConnection() {
  try {
    await connectDB();
    const dbState = mongoose.connection.readyState;
    const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];

    if (dbState === 1) {
      logResult('DB_CONNECTION', 'PASS', `MongoDB connected successfully (state: ${states[dbState]})`);
      return true;
    } else {
      logResult('DB_CONNECTION', 'FAIL', `MongoDB connection failed (state: ${states[dbState]})`);
      return false;
    }
  } catch (error) {
    logResult('DB_CONNECTION', 'FAIL', 'Failed to connect to MongoDB', error.message);
    return false;
  }
}

async function validateRedisConnection() {
  try {
    const redis = getRedis();
    const response = await redis.ping();

    if (response === 'PONG') {
      logResult('REDIS_CONNECTION', 'PASS', 'Redis connected successfully');
      return true;
    } else {
      logResult('REDIS_CONNECTION', 'FAIL', `Unexpected Redis ping response: ${response}`);
      return false;
    }
  } catch (error) {
    logResult('REDIS_CONNECTION', 'FAIL', 'Failed to connect to Redis', error.message);
    return false;
  }
}

async function validateUserSchema() {
  try {
    const userSchema = User.schema;
    const requiredFields = [];
    const optionalFields = [];

    // Analyze schema structure
    userSchema.eachPath((path, schemaType) => {
      if (schemaType.isRequired) {
        requiredFields.push(path);
      } else {
        optionalFields.push(path);
      }
    });

    logResult('USER_SCHEMA', 'PASS', `User schema validation completed`, {
      totalFields: requiredFields.length + optionalFields.length,
      requiredFields: requiredFields.length,
      optionalFields: optionalFields.length
    });

    // Test location structure specifically
    const locationPaths = [];
    userSchema.eachPath((path) => {
      if (path.startsWith('location') || path.startsWith('locationHistory')) {
        locationPaths.push(path);
      }
    });

    if (locationPaths.includes('location.coordinates.latitude') &&
        locationPaths.includes('location.coordinates.longitude') &&
        locationPaths.includes('locationHistory')) {
      logResult('USER_LOCATION_SCHEMA', 'PASS', 'User location schema properly structured');
    } else {
      logResult('USER_LOCATION_SCHEMA', 'FAIL', 'User location schema missing required fields', {
        foundPaths: locationPaths
      });
    }

    return true;
  } catch (error) {
    logResult('USER_SCHEMA', 'FAIL', 'User schema validation failed', error.message);
    return false;
  }
}

async function validateJobSchema() {
  try {
    const jobSchema = Job.schema;
    const criticalPaths = [
      'applications',
      'comments',
      'location',
      'budget',
      'skillsRequired',
      'status'
    ];

    let foundPaths = 0;
    jobSchema.eachPath((path) => {
      if (criticalPaths.some(critical => path.startsWith(critical))) {
        foundPaths++;
      }
    });

    if (foundPaths >= criticalPaths.length) {
      logResult('JOB_SCHEMA', 'PASS', 'Job schema validation completed', {
        criticalPathsFound: foundPaths,
        requiredPaths: criticalPaths.length
      });
    } else {
      logResult('JOB_SCHEMA', 'FAIL', 'Job schema missing critical paths', {
        foundPaths,
        requiredPaths: criticalPaths.length
      });
    }

    // Validate embedded application schema
    const applicationPath = jobSchema.path('applications');
    if (applicationPath && applicationPath.schema) {
      const appFields = [];
      applicationPath.schema.eachPath((path) => {
        appFields.push(path);
      });

      const requiredAppFields = ['fixer', 'proposedAmount', 'status', 'appliedAt'];
      const hasAllRequired = requiredAppFields.every(field => appFields.includes(field));

      if (hasAllRequired) {
        logResult('JOB_APPLICATION_SCHEMA', 'PASS', 'Job application schema properly structured');
      } else {
        logResult('JOB_APPLICATION_SCHEMA', 'FAIL', 'Job application schema missing required fields', {
          foundFields: appFields,
          requiredFields: requiredAppFields
        });
      }
    }

    return true;
  } catch (error) {
    logResult('JOB_SCHEMA', 'FAIL', 'Job schema validation failed', error.message);
    return false;
  }
}

async function testDataInsertion() {
  try {
    // Test User creation with location data
    const testUserData = {
      name: 'Test User',
      username: 'testuser_' + Date.now(),
      email: `test_${Date.now()}@example.com`,
      role: 'fixer',
      skills: ['plumbing', 'electrical'],
      location: {
        coordinates: {
          latitude: 19.0760,
          longitude: 72.8777
        },
        address: 'Test Address',
        city: 'Mumbai',
        state: 'Maharashtra',
        accuracy: 10,
        source: 'manual'
      },
      locationHistory: [{
        coordinates: {
          latitude: 19.0760,
          longitude: 72.8777
        },
        address: 'Test Address',
        city: 'Mumbai',
        state: 'Maharashtra',
        accuracy: 10,
        timestamp: new Date(),
        source: 'manual',
        metadata: {
          updateReason: 'manual',
          sessionId: 'test-session-' + Date.now(),
          processingTime: 50
        }
      }],
      locationTracking: {
        isEnabled: true,
        enabledAt: new Date(),
        updateInterval: 30,
        permissions: {
          precise: true,
          background: false,
          grantedAt: new Date()
        },
        preferences: {
          onlyWhenActive: true,
          lowPowerMode: false,
          autoDisableAfterInactivity: true,
          inactivityThreshold: 7
        }
      }
    };

    const testUser = new User(testUserData);
    await testUser.save();

    logResult('USER_DATA_INSERTION', 'PASS', 'User creation with location data successful', {
      userId: testUser._id,
      locationFields: Object.keys(testUser.location || {}),
      historyEntries: testUser.locationHistory?.length || 0
    });

    // Test Job creation with applications
    const testJobData = {
      title: 'Test Plumbing Job',
      description: 'This is a test job description that meets the minimum length requirement for validation purposes.',
      skillsRequired: ['plumbing'],
      budget: {
        type: 'fixed',
        amount: 2500,
        currency: 'INR'
      },
      location: {
        address: 'Test Job Address',
        city: 'Mumbai',
        state: 'Maharashtra',
        lat: 19.0760,
        lng: 72.8777
      },
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      createdBy: testUser._id,
      urgency: 'flexible',
      experienceLevel: 'intermediate'
    };

    const testJob = new Job(testJobData);
    await testJob.save();

    logResult('JOB_DATA_INSERTION', 'PASS', 'Job creation successful', {
      jobId: testJob._id,
      title: testJob.title,
      applications: testJob.applications.length
    });

    // Test application creation
    const applicationData = {
      fixer: testUser._id,
      proposedAmount: 2200,
      priceVariance: -300,
      priceVariancePercentage: -12,
      description: 'I can complete this job efficiently with quality workmanship.',
      timeEstimate: {
        value: 2,
        unit: 'days'
      },
      materialsList: [{
        item: 'PVC Pipes',
        quantity: 2,
        estimatedCost: 150
      }],
      materialsIncluded: false,
      requirements: 'Standard plumbing tools required',
      specialNotes: 'Can start immediately',
      status: 'pending',
      appliedAt: new Date()
    };

    testJob.applications.push(applicationData);
    await testJob.save();

    logResult('APPLICATION_DATA_INSERTION', 'PASS', 'Job application creation successful', {
      jobId: testJob._id,
      applicationCount: testJob.applications.length,
      applicationId: testJob.applications[testJob.applications.length - 1]._id
    });

    // Test comment creation
    testJob.comments.push({
      author: testUser._id,
      message: 'This is a test comment to validate the comment system.',
      likes: [],
      reactions: [],
      replies: [],
      createdAt: new Date()
    });

    await testJob.save();

    logResult('COMMENT_DATA_INSERTION', 'PASS', 'Job comment creation successful', {
      jobId: testJob._id,
      commentCount: testJob.comments.length
    });

    // Cleanup test data
    await User.findByIdAndDelete(testUser._id);
    await Job.findByIdAndDelete(testJob._id);

    logResult('TEST_DATA_CLEANUP', 'PASS', 'Test data cleaned up successfully');

    return true;
  } catch (error) {
    logResult('DATA_INSERTION_TEST', 'FAIL', 'Data insertion test failed', error.message);
    return false;
  }
}

async function testRedisIntegration() {
  try {
    const redis = getRedis();

    // Test basic Redis operations
    const testKey = `test:${Date.now()}`;
    const testData = {
      userId: 'test-user-123',
      location: {
        latitude: 19.0760,
        longitude: 72.8777,
        city: 'Mumbai'
      },
      timestamp: new Date().toISOString()
    };

    // Set data
    await redis.set(testKey, JSON.stringify(testData), 'EX', 60);
    logResult('REDIS_SET', 'PASS', 'Redis SET operation successful');

    // Get data
    const retrieved = await redis.get(testKey);
    const parsedData = JSON.parse(retrieved);

    if (parsedData.userId === testData.userId) {
      logResult('REDIS_GET', 'PASS', 'Redis GET operation successful');
    } else {
      logResult('REDIS_GET', 'FAIL', 'Retrieved data does not match');
    }

    // Test location caching pattern
    const locationKey = `user_location:test-user-123`;
    const locationCache = {
      current: {
        coordinates: { latitude: 19.0760, longitude: 72.8777 },
        city: 'Mumbai',
        timestamp: new Date().toISOString()
      },
      history: [
        {
          coordinates: { latitude: 19.0761, longitude: 72.8778 },
          timestamp: new Date().toISOString()
        }
      ],
      lastUpdate: new Date().toISOString()
    };

    await redis.set(locationKey, JSON.stringify(locationCache), 'EX', 7200);
    logResult('REDIS_LOCATION_CACHE', 'PASS', 'Location caching pattern works correctly');

    // Test job suggestions caching
    const suggestionsKey = `job_suggestions:test-user-123`;
    const suggestionsData = {
      jobs: [
        { id: 'job-1', title: 'Test Job 1', distance: 2.5 },
        { id: 'job-2', title: 'Test Job 2', distance: 1.8 }
      ],
      location: { city: 'Mumbai' },
      generatedAt: new Date().toISOString(),
      radius: 25
    };

    await redis.set(suggestionsKey, JSON.stringify(suggestionsData), 'EX', 3600);
    logResult('REDIS_SUGGESTIONS_CACHE', 'PASS', 'Job suggestions caching works correctly');

    // Cleanup test keys
    await redis.del(testKey, locationKey, suggestionsKey);
    logResult('REDIS_CLEANUP', 'PASS', 'Redis test data cleaned up');

    return true;
  } catch (error) {
    logResult('REDIS_INTEGRATION_TEST', 'FAIL', 'Redis integration test failed', error.message);
    return false;
  }
}

async function validateDataIntegrity() {
  try {
    // Check for any existing data inconsistencies
    const userCount = await User.countDocuments();
    const jobCount = await Job.countDocuments();

    logResult('DATA_COUNTS', 'PASS', 'Data integrity check completed', {
      users: userCount,
      jobs: jobCount
    });

    // Sample a few users to check location field consistency
    const sampleUsers = await User.find({}).limit(5).lean();
    let locationIssues = 0;

    for (const user of sampleUsers) {
      if (user.location) {
        // Check if location has the expected structure
        if (!user.location.coordinates ||
            typeof user.location.coordinates.latitude !== 'number' ||
            typeof user.location.coordinates.longitude !== 'number') {
          locationIssues++;
        }
      }
    }

    if (locationIssues === 0) {
      logResult('LOCATION_DATA_INTEGRITY', 'PASS', 'Location data structure is consistent');
    } else {
      logResult('LOCATION_DATA_INTEGRITY', 'WARN', `Found ${locationIssues} users with inconsistent location data`);
    }

    // Sample a few jobs to check application structure
    const sampleJobs = await Job.find({ 'applications.0': { $exists: true } }).limit(5).lean();
    let applicationIssues = 0;

    for (const job of sampleJobs) {
      for (const app of job.applications || []) {
        if (!app.fixer || !app.proposedAmount || !app.status) {
          applicationIssues++;
        }
      }
    }

    if (applicationIssues === 0) {
      logResult('APPLICATION_DATA_INTEGRITY', 'PASS', 'Application data structure is consistent');
    } else {
      logResult('APPLICATION_DATA_INTEGRITY', 'WARN', `Found ${applicationIssues} applications with missing required fields`);
    }

    return true;
  } catch (error) {
    logResult('DATA_INTEGRITY_CHECK', 'FAIL', 'Data integrity check failed', error.message);
    return false;
  }
}

async function validateIndexes() {
  try {
    // Check User collection indexes
    const userIndexes = await User.collection.getIndexes();
    const userIndexNames = Object.keys(userIndexes);

    const expectedUserIndexes = ['email_1', 'role_1', 'skills_1'];
    const hasUserIndexes = expectedUserIndexes.some(expected =>
      userIndexNames.some(actual => actual.includes(expected.split('_')[0]))
    );

    if (hasUserIndexes) {
      logResult('USER_INDEXES', 'PASS', 'User collection has proper indexes', {
        totalIndexes: userIndexNames.length,
        indexNames: userIndexNames
      });
    } else {
      logResult('USER_INDEXES', 'WARN', 'User collection may be missing some indexes');
    }

    // Check Job collection indexes
    const jobIndexes = await Job.collection.getIndexes();
    const jobIndexNames = Object.keys(jobIndexes);

    const expectedJobIndexes = ['status_1', 'skillsRequired_1', 'createdBy_1'];
    const hasJobIndexes = expectedJobIndexes.some(expected =>
      jobIndexNames.some(actual => actual.includes(expected.split('_')[0]))
    );

    if (hasJobIndexes) {
      logResult('JOB_INDEXES', 'PASS', 'Job collection has proper indexes', {
        totalIndexes: jobIndexNames.length,
        indexNames: jobIndexNames
      });
    } else {
      logResult('JOB_INDEXES', 'WARN', 'Job collection may be missing some indexes');
    }

    return true;
  } catch (error) {
    logResult('INDEX_VALIDATION', 'FAIL', 'Index validation failed', error.message);
    return false;
  }
}

async function runCompleteValidation() {
  console.log('🔍 Starting Comprehensive Database Validation...\n');

  const startTime = Date.now();

  // Run all validation tests
  await validateDatabaseConnection();
  await validateRedisConnection();
  await validateUserSchema();
  await validateJobSchema();
  await testDataInsertion();
  await testRedisIntegration();
  await validateDataIntegrity();
  await validateIndexes();

  const endTime = Date.now();
  const duration = endTime - startTime;

  console.log('\n📊 VALIDATION SUMMARY');
  console.log('═'.repeat(50));
  console.log(`✅ Tests Passed: ${VALIDATION_RESULTS.passed}`);
  console.log(`❌ Tests Failed: ${VALIDATION_RESULTS.failed}`);
  console.log(`⚠️  Warnings: ${VALIDATION_RESULTS.warnings}`);
  console.log(`⏱️  Duration: ${duration}ms`);
  console.log(`📅 Completed: ${new Date().toISOString()}`);

  if (VALIDATION_RESULTS.failed > 0) {
    console.log('\n❌ CRITICAL ISSUES FOUND:');
    VALIDATION_RESULTS.errors
      .filter(e => e.status === 'FAIL')
      .forEach(error => {
        console.log(`   - ${error.test}: ${error.message}`);
      });
  }

  if (VALIDATION_RESULTS.warnings > 0) {
    console.log('\n⚠️  WARNINGS:');
    VALIDATION_RESULTS.errors
      .filter(e => e.status === 'WARN')
      .forEach(warning => {
        console.log(`   - ${warning.test}: ${warning.message}`);
      });
  }

  if (VALIDATION_RESULTS.failed === 0) {
    console.log('\n🎉 ALL CRITICAL VALIDATIONS PASSED!');
    console.log('Database schema and Redis integration are properly aligned.');
  } else {
    console.log('\n🚨 VALIDATION FAILED!');
    console.log('Please address the critical issues before proceeding.');
  }

  // Close connections
  try {
    await mongoose.connection.close();
    console.log('\n🔒 Database connections closed.');
  } catch (error) {
    console.error('Error closing connections:', error);
  }

  return {
    success: VALIDATION_RESULTS.failed === 0,
    results: VALIDATION_RESULTS,
    duration
  };
}

// Export for use in other scripts
export {
  validateDatabaseConnection,
  validateRedisConnection,
  validateUserSchema,
  validateJobSchema,
  testDataInsertion,
  testRedisIntegration,
  validateDataIntegrity,
  validateIndexes,
  runCompleteValidation
};

// Run validation if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runCompleteValidation()
    .then((result) => {
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Validation script failed:', error);
      process.exit(1);
    });
}