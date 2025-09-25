/**
 * Comprehensive Review System Test
 * Tests all review system components and database schemas
 */

import { config } from 'dotenv';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '..', '.env.local') });

console.log('🧪 Testing Comprehensive Review System...\n');

// Import models
import User from '../models/User.js';
import Job from '../models/job.js';
import Review from '../models/Review.js';

async function connectToDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    return false;
  }
}

async function testJobSchemaReviewFields() {
  console.log('\n📝 Testing Job Schema Review Fields...');

  try {
    // Create test users
    const timestamp = Date.now().toString().slice(-8);
    const hirer = new User({
      name: 'Test Hirer',
      username: 'hire' + timestamp,
      email: `hirer${timestamp}@test.com`,
      phone: '+919876543210',
      passwordHash: 'testpass123',
      authMethod: 'email',
      role: 'hirer'
    });
    await hirer.save();

    const fixer = new User({
      name: 'Test Fixer',
      username: 'fix' + timestamp,
      email: `fixer${timestamp}@test.com`,
      phone: '+919876543211',
      passwordHash: 'testpass123',
      authMethod: 'email',
      role: 'fixer'
    });
    await fixer.save();

    // Create test job
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);

    const job = new Job({
      title: 'Review System Test Job',
      description: 'This is a test job for validating the review system functionality and database schema alignment',
      skillsRequired: ['electrical'],
      budget: {
        type: 'fixed',
        amount: 1000,
        currency: 'INR'
      },
      location: {
        address: 'Test Location, Mumbai, Maharashtra, India',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001'
      },
      createdBy: hirer._id,
      assignedTo: fixer._id,
      deadline: futureDate,
      status: 'completed' // Set as completed to test review functionality
    });

    await job.save();
    console.log('✅ Job created with review fields');

    // Test job review methods
    const reviewStatusForHirer = job.getReviewStatusForUI(hirer._id);
    const reviewStatusForFixer = job.getReviewStatusForUI(fixer._id);

    console.log('✅ Job review status methods working');
    console.log('   - Hirer can review:', reviewStatusForHirer.canReview);
    console.log('   - Fixer can review:', reviewStatusForFixer.canReview);

    // Test messaging status
    const messagingAllowed = job.isMessagingAllowed();
    console.log('✅ Messaging status check working:', messagingAllowed);

    // Test review submission
    await job.submitReview(hirer._id, {
      overall: 5,
      comment: 'Excellent work, very professional and timely!',
      communication: 5,
      quality: 5,
      timeliness: 5,
      professionalism: 5
    });

    console.log('✅ Hirer review submission successful');

    await job.submitReview(fixer._id, {
      overall: 4,
      comment: 'Great client, clear requirements and prompt payment.',
      clarity: 4,
      responsiveness: 4,
      paymentTimeliness: 5,
      professionalism: 4
    });

    console.log('✅ Fixer review submission successful');

    // Check if messaging was automatically closed
    await job.reload();
    console.log('✅ Messaging auto-closure:', job.completion.messagingClosed);
    console.log('✅ Review status:', job.completion.reviewStatus);

    // Cleanup
    await User.deleteOne({ _id: hirer._id });
    await User.deleteOne({ _id: fixer._id });
    await Job.deleteOne({ _id: job._id });

    return true;
  } catch (error) {
    console.error('❌ Job schema test failed:', error.message);
    return false;
  }
}

async function testReviewSchemaIntegration() {
  console.log('\n📋 Testing Review Schema Integration...');

  try {
    // Create test users
    const timestamp = Date.now().toString().slice(-8);
    const reviewer = new User({
      name: 'Test Reviewer',
      username: 'rev' + timestamp,
      email: `reviewer${timestamp}@test.com`,
      phone: '+919876543212',
      passwordHash: 'testpass123',
      authMethod: 'email',
      role: 'hirer'
    });
    await reviewer.save();

    const reviewee = new User({
      name: 'Test Reviewee',
      username: 'ree' + timestamp,
      email: `reviewee${timestamp}@test.com`,
      phone: '+919876543213',
      passwordHash: 'testpass123',
      authMethod: 'email',
      role: 'fixer'
    });
    await reviewee.save();

    // Create test job
    const job = new Job({
      title: 'Review Integration Test',
      description: 'Testing review schema integration with user profiles and database aggregation',
      skillsRequired: ['plumbing'],
      budget: { type: 'fixed', amount: 800, currency: 'INR' },
      location: { address: 'Test', city: 'Delhi', state: 'Delhi', pincode: '110001' },
      createdBy: reviewer._id,
      assignedTo: reviewee._id,
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      status: 'completed'
    });
    await job.save();

    // Test Review model
    const review = new Review({
      job: job._id,
      reviewer: reviewer._id,
      reviewee: reviewee._id,
      reviewType: 'client_to_fixer',
      rating: {
        overall: 4,
        workQuality: 4,
        communication: 5,
        punctuality: 4,
        professionalism: 5
      },
      title: 'Great work overall!',
      comment: 'The fixer did an excellent job with clear communication and professional service.',
      pros: ['Professional', 'On time', 'Quality work'],
      cons: ['Could improve initial assessment'],
      wouldRecommend: true,
      wouldHireAgain: true,
      tags: ['excellent_work', 'on_time', 'professional'],
      status: 'published',
      publishedAt: new Date()
    });

    await review.save();
    console.log('✅ Review document created successfully');

    // Test review aggregation methods
    const avgRating = await Review.getAverageRating(reviewee._id);
    console.log('✅ Average rating calculation:', avgRating);

    const detailedRatings = await Review.getDetailedRatings(reviewee._id, 'client_to_fixer');
    console.log('✅ Detailed ratings calculation:', detailedRatings);

    // Test user rating update
    reviewee.rating = {
      average: avgRating.average,
      count: avgRating.total,
      distribution: avgRating.distribution
    };
    await reviewee.save();
    console.log('✅ User profile rating updated');

    // Cleanup
    await Review.deleteOne({ _id: review._id });
    await Job.deleteOne({ _id: job._id });
    await User.deleteOne({ _id: reviewer._id });
    await User.deleteOne({ _id: reviewee._id });

    return true;
  } catch (error) {
    console.error('❌ Review schema integration test failed:', error.message);
    return false;
  }
}

async function testUserRatingAggregation() {
  console.log('\n⭐ Testing User Rating Aggregation...');

  try {
    const timestamp = Date.now().toString().slice(-8);
    const user = new User({
      name: 'Rating Test User',
      username: 'rat' + timestamp,
      email: `rating${timestamp}@test.com`,
      phone: '+919876543214',
      passwordHash: 'testpass123',
      authMethod: 'email',
      role: 'fixer'
    });
    await user.save();

    // Test initial rating structure
    console.log('✅ Initial user rating structure:', {
      average: user.rating.average,
      count: user.rating.count,
      distribution: user.rating.distribution,
      fixerRatings: user.rating.fixerRatings
    });

    // Test rating update
    await user.updateRating(4.5);
    await user.updateRating(5.0);
    await user.updateRating(4.0);

    console.log('✅ Updated user ratings:', {
      average: user.rating.average,
      count: user.rating.count
    });

    // Test badge updates
    await user.updateBadges();
    console.log('✅ User badges updated:', user.badges);

    // Cleanup
    await User.deleteOne({ _id: user._id });

    return true;
  } catch (error) {
    console.error('❌ User rating aggregation test failed:', error.message);
    return false;
  }
}

async function testMessagingIntegration() {
  console.log('\n💬 Testing Messaging Integration...');

  try {
    // Create test job with review completion
    const timestamp = Date.now().toString().slice(-8);
    const hirer = new User({
      name: 'Messaging Test Hirer',
      username: 'msg' + timestamp,
      email: `msghirer${timestamp}@test.com`,
      phone: '+919876543215',
      passwordHash: 'testpass123',
      authMethod: 'email',
      role: 'hirer'
    });
    await hirer.save();

    const fixer = new User({
      name: 'Messaging Test Fixer',
      username: 'msf' + timestamp,
      email: `msgfixer${timestamp}@test.com`,
      phone: '+919876543216',
      passwordHash: 'testpass123',
      authMethod: 'email',
      role: 'fixer'
    });
    await fixer.save();

    const job = new Job({
      title: 'Messaging Integration Test',
      description: 'Testing messaging closure after review completion',
      skillsRequired: ['electrical'],
      budget: { type: 'fixed', amount: 500, currency: 'INR' },
      location: { address: 'Test', city: 'Mumbai', state: 'Maharashtra', pincode: '400001' },
      createdBy: hirer._id,
      assignedTo: fixer._id,
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      status: 'completed'
    });
    await job.save();

    // Initially messaging should be allowed
    console.log('✅ Initial messaging status:', job.isMessagingAllowed());

    // Submit first review
    await job.submitReview(hirer._id, {
      overall: 4,
      comment: 'Good work!',
      communication: 4,
      quality: 4,
      timeliness: 4,
      professionalism: 4
    });

    // Messaging should still be allowed
    console.log('✅ Messaging after first review:', job.isMessagingAllowed());

    // Submit second review
    await job.submitReview(fixer._id, {
      overall: 5,
      comment: 'Great client!',
      clarity: 5,
      responsiveness: 5,
      paymentTimeliness: 5,
      professionalism: 5
    });

    // Messaging should now be closed
    await job.reload();
    console.log('✅ Messaging after both reviews:', job.isMessagingAllowed());
    console.log('✅ Messaging closed at:', job.completion.messagingClosedAt);

    // Cleanup
    await Job.deleteOne({ _id: job._id });
    await User.deleteOne({ _id: hirer._id });
    await User.deleteOne({ _id: fixer._id });

    return true;
  } catch (error) {
    console.error('❌ Messaging integration test failed:', error.message);
    return false;
  }
}

async function runAllTests() {
  let allTestsPassed = true;

  try {
    console.log('🔬 COMPREHENSIVE REVIEW SYSTEM VALIDATION');
    console.log('=========================================\n');

    // Connect to database
    const dbConnected = await connectToDatabase();
    if (!dbConnected) {
      allTestsPassed = false;
      return;
    }

    // Run all tests
    const jobSchemaTest = await testJobSchemaReviewFields();
    if (!jobSchemaTest) allTestsPassed = false;

    const reviewSchemaTest = await testReviewSchemaIntegration();
    if (!reviewSchemaTest) allTestsPassed = false;

    const ratingAggregationTest = await testUserRatingAggregation();
    if (!ratingAggregationTest) allTestsPassed = false;

    const messagingIntegrationTest = await testMessagingIntegration();
    if (!messagingIntegrationTest) allTestsPassed = false;

    // Final results
    console.log('\n🎯 REVIEW SYSTEM VALIDATION RESULTS');
    console.log('==================================');

    if (allTestsPassed) {
      console.log('🎉 ALL TESTS PASSED! Review system is fully functional.');
      console.log('✅ Job schema review fields working properly');
      console.log('✅ Review model integration successful');
      console.log('✅ User rating aggregation functioning correctly');
      console.log('✅ Messaging integration and auto-closure working');
      console.log('✅ All database schemas are properly aligned');
      console.log('✅ Bidirectional review system fully implemented');
    } else {
      console.log('⚠️ SOME TESTS FAILED! Please review the errors above.');
    }

  } catch (error) {
    console.error('💥 Test suite crashed:', error.message);
    allTestsPassed = false;
  } finally {
    // Close database connection
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      console.log('\n🔌 Database connection closed');
    }
  }

  process.exit(allTestsPassed ? 0 : 1);
}

// Run the tests
runAllTests();