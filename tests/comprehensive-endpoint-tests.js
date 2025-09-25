/**
 * Comprehensive Endpoint Testing Suite
 * Tests all API endpoints for functionality, security, and data integrity
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

// Import all API routes
import * as authRoutes from '../app/api/auth/signup/route.js';
import * as jobRoutes from '../app/api/jobs/post/route.js';
import * as reviewRoutes from '../app/api/reviews/submit/route.js';
import * as messageRoutes from '../app/api/messages/route.js';
import * as disputeRoutes from '../app/api/disputes/route.js';
import * as adminRoutes from '../app/api/admin/users/route.js';

// Import models
import User from '../models/User.js';
import Job from '../models/job.js';
import Review from '../models/Review.js';
import Dispute from '../models/Dispute.js';

// Test data
const testUsers = {
  hirer: {
    name: 'Test Hirer',
    username: 'testhirer123',
    email: 'hirer@test.com',
    phone: '+919876543210',
    password: 'testpass123',
    role: 'hirer'
  },
  fixer: {
    name: 'Test Fixer',
    username: 'testfixer123',
    email: 'fixer@test.com',
    phone: '+919876543211',
    password: 'testpass123',
    role: 'fixer'
  },
  admin: {
    name: 'Test Admin',
    username: 'testadmin123',
    email: 'admin@test.com',
    phone: '+919876543212',
    password: 'testpass123',
    role: 'admin'
  }
};

let mongoServer;
let testUsersCreated = {};
let testJobId;

describe('Comprehensive Endpoint Tests', () => {
  beforeAll(async () => {
    // Setup in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    await mongoose.connect(mongoUri);

    console.log('🗄️ Test database connected');
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
    console.log('🗄️ Test database disconnected');
  });

  beforeEach(async () => {
    // Clean up before each test
    await User.deleteMany({});
    await Job.deleteMany({});
    await Review.deleteMany({});
    await Dispute.deleteMany({});
  });

  // Helper function to create mock request
  const createMockRequest = (method, url, body = null, headers = {}) => {
    const request = {
      method,
      url,
      headers: new Headers(headers),
      json: async () => body,
      nextUrl: { pathname: url },
      ...headers
    };
    return request;
  };

  // Helper function to create test session
  const createTestSession = (user) => ({
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  });

  describe('🔐 Authentication Endpoints', () => {
    test('POST /api/auth/signup - should create user successfully', async () => {
      const request = createMockRequest('POST', '/api/auth/signup', testUsers.hirer);
      const response = await authRoutes.POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.user.email).toBe(testUsers.hirer.email);

      // Verify user in database
      const dbUser = await User.findOne({ email: testUsers.hirer.email });
      expect(dbUser).toBeTruthy();
      expect(dbUser.role).toBe('hirer');
    });

    test('POST /api/auth/signup - should reject duplicate email', async () => {
      // Create first user
      await new User(testUsers.hirer).save();

      const request = createMockRequest('POST', '/api/auth/signup', testUsers.hirer);
      const response = await authRoutes.POST(request);

      expect(response.status).toBe(400);
    });

    test('POST /api/auth/signup - should validate required fields', async () => {
      const invalidUser = { ...testUsers.hirer };
      delete invalidUser.email;

      const request = createMockRequest('POST', '/api/auth/signup', invalidUser);
      const response = await authRoutes.POST(request);

      expect(response.status).toBe(400);
    });
  });

  describe('💼 Job Management Endpoints', () => {
    beforeEach(async () => {
      // Create test users
      const hirer = await new User(testUsers.hirer).save();
      const fixer = await new User(testUsers.fixer).save();
      testUsersCreated.hirer = hirer;
      testUsersCreated.fixer = fixer;
    });

    test('POST /api/jobs/post - should create job successfully', async () => {
      const jobData = {
        title: 'Test Plumbing Job',
        description: 'Need to fix a leaky faucet in the kitchen',
        skillsRequired: ['plumbing'],
        budget: { type: 'fixed', amount: 500, currency: 'INR' },
        location: {
          address: 'Test Address, Mumbai, Maharashtra',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400001'
        },
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        urgency: 'flexible',
        attachments: []
      };

      // Mock session
      jest.mocked(getServerSession).mockResolvedValue(createTestSession(testUsersCreated.hirer));

      const request = createMockRequest('POST', '/api/jobs/post', jobData);
      const response = await jobRoutes.POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.job.title).toBe(jobData.title);

      // Verify job in database
      const dbJob = await Job.findById(data.job._id);
      expect(dbJob).toBeTruthy();
      expect(dbJob.createdBy.toString()).toBe(testUsersCreated.hirer._id.toString());

      testJobId = data.job._id;
    });

    test('GET /api/jobs/browse - should return jobs list', async () => {
      // Create test job first
      await new Job({
        title: 'Test Job',
        description: 'Test description',
        skillsRequired: ['plumbing'],
        budget: { type: 'fixed', amount: 500, currency: 'INR' },
        location: { address: 'Test', city: 'Mumbai', state: 'Maharashtra', pincode: '400001' },
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdBy: testUsersCreated.hirer._id,
        status: 'open'
      }).save();

      const request = createMockRequest('GET', '/api/jobs/browse');
      const response = await jobRoutes.GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.jobs).toHaveLength(1);
      expect(data.jobs[0].title).toBe('Test Job');
    });

    test('POST /api/jobs/[jobId]/apply - should allow fixer to apply', async () => {
      // Create test job
      const job = await new Job({
        title: 'Test Job',
        description: 'Test description',
        skillsRequired: ['plumbing'],
        budget: { type: 'fixed', amount: 500, currency: 'INR' },
        location: { address: 'Test', city: 'Mumbai', state: 'Maharashtra', pincode: '400001' },
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdBy: testUsersCreated.hirer._id,
        status: 'open'
      }).save();

      const applicationData = {
        proposal: 'I can fix this plumbing issue quickly and efficiently',
        proposedBudget: 450,
        estimatedDuration: '2 hours',
        experience: 'I have 5 years of plumbing experience'
      };

      // Mock session for fixer
      jest.mocked(getServerSession).mockResolvedValue(createTestSession(testUsersCreated.fixer));

      const request = createMockRequest('POST', `/api/jobs/${job._id}/apply`, applicationData);
      const response = await jobRoutes.POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('⭐ Review System Endpoints', () => {
    beforeEach(async () => {
      // Create test users and job
      const hirer = await new User(testUsers.hirer).save();
      const fixer = await new User(testUsers.fixer).save();
      testUsersCreated.hirer = hirer;
      testUsersCreated.fixer = fixer;

      const job = await new Job({
        title: 'Completed Job',
        description: 'Test job for reviews',
        skillsRequired: ['plumbing'],
        budget: { type: 'fixed', amount: 500, currency: 'INR' },
        location: { address: 'Test', city: 'Mumbai', state: 'Maharashtra', pincode: '400001' },
        deadline: new Date(),
        createdBy: hirer._id,
        assignedTo: fixer._id,
        status: 'completed'
      }).save();

      testJobId = job._id;
    });

    test('POST /api/reviews/submit - should submit review successfully', async () => {
      const reviewData = {
        jobId: testJobId,
        rating: 5,
        comment: 'Excellent work! Very professional and completed on time.',
        categories: {
          communication: 5,
          quality: 5,
          timeliness: 5,
          professionalism: 5
        },
        title: 'Great plumber!',
        pros: ['Professional', 'On time'],
        cons: [],
        wouldRecommend: true,
        wouldHireAgain: true,
        tags: ['excellent_work', 'on_time', 'professional']
      };

      // Mock session for hirer
      jest.mocked(getServerSession).mockResolvedValue(createTestSession(testUsersCreated.hirer));

      const request = createMockRequest('POST', '/api/reviews/submit', reviewData);
      const response = await reviewRoutes.POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.review.rating.overall).toBe(5);

      // Verify review in database
      const dbReview = await Review.findById(data.review._id);
      expect(dbReview).toBeTruthy();
      expect(dbReview.reviewType).toBe('client_to_fixer');
    });

    test('POST /api/reviews/submit - should prevent duplicate reviews', async () => {
      // Create existing review
      await new Review({
        job: testJobId,
        reviewer: testUsersCreated.hirer._id,
        reviewee: testUsersCreated.fixer._id,
        reviewType: 'client_to_fixer',
        rating: { overall: 4 },
        title: 'Good work',
        comment: 'Job done well',
        status: 'published'
      }).save();

      const reviewData = {
        jobId: testJobId,
        rating: 5,
        comment: 'Another review',
        categories: { communication: 5, quality: 5, timeliness: 5, professionalism: 5 },
        title: 'Duplicate review'
      };

      jest.mocked(getServerSession).mockResolvedValue(createTestSession(testUsersCreated.hirer));

      const request = createMockRequest('POST', '/api/reviews/submit', reviewData);
      const response = await reviewRoutes.POST(request);

      expect(response.status).toBe(400);
    });
  });

  describe('💬 Messaging Endpoints', () => {
    beforeEach(async () => {
      const hirer = await new User(testUsers.hirer).save();
      const fixer = await new User(testUsers.fixer).save();
      testUsersCreated.hirer = hirer;
      testUsersCreated.fixer = fixer;

      const job = await new Job({
        title: 'Messaging Test Job',
        description: 'Job for messaging tests',
        skillsRequired: ['plumbing'],
        budget: { type: 'fixed', amount: 500, currency: 'INR' },
        location: { address: 'Test', city: 'Mumbai', state: 'Maharashtra', pincode: '400001' },
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdBy: hirer._id,
        assignedTo: fixer._id,
        status: 'in_progress'
      }).save();

      testJobId = job._id;
    });

    test('POST /api/messages/send - should send message successfully', async () => {
      const messageData = {
        jobId: testJobId,
        receiverId: testUsersCreated.fixer._id,
        content: 'Hello, when can you start working?',
        type: 'text'
      };

      jest.mocked(getServerSession).mockResolvedValue(createTestSession(testUsersCreated.hirer));

      const request = createMockRequest('POST', '/api/messages/send', messageData);
      const response = await messageRoutes.POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    test('GET /api/messages/[jobId]/allowed - should check messaging permissions', async () => {
      jest.mocked(getServerSession).mockResolvedValue(createTestSession(testUsersCreated.hirer));

      const request = createMockRequest('GET', `/api/messages/${testJobId}/allowed`);
      const response = await messageRoutes.GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.messagingAllowed).toBe(true);
    });
  });

  describe('⚖️ Dispute System Endpoints', () => {
    beforeEach(async () => {
      const hirer = await new User(testUsers.hirer).save();
      const fixer = await new User(testUsers.fixer).save();
      testUsersCreated.hirer = hirer;
      testUsersCreated.fixer = fixer;

      const job = await new Job({
        title: 'Disputed Job',
        description: 'Job with issues',
        skillsRequired: ['plumbing'],
        budget: { type: 'fixed', amount: 500, currency: 'INR' },
        location: { address: 'Test', city: 'Mumbai', state: 'Maharashtra', pincode: '400001' },
        deadline: new Date(),
        createdBy: hirer._id,
        assignedTo: fixer._id,
        status: 'in_progress'
      }).save();

      testJobId = job._id;
    });

    test('POST /api/disputes - should create dispute successfully', async () => {
      const disputeData = {
        jobId: testJobId,
        reason: 'quality_issues',
        description: 'Work was not completed to standard',
        evidence: ['Photo showing incomplete work'],
        requestedResolution: 'refund'
      };

      jest.mocked(getServerSession).mockResolvedValue(createTestSession(testUsersCreated.hirer));

      const request = createMockRequest('POST', '/api/disputes', disputeData);
      const response = await disputeRoutes.POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.dispute.reason).toBe('quality_issues');

      // Verify dispute in database
      const dbDispute = await Dispute.findById(data.dispute._id);
      expect(dbDispute).toBeTruthy();
      expect(dbDispute.status).toBe('open');
    });
  });

  describe('👑 Admin Endpoints', () => {
    beforeEach(async () => {
      const admin = await new User(testUsers.admin).save();
      const hirer = await new User(testUsers.hirer).save();
      testUsersCreated.admin = admin;
      testUsersCreated.hirer = hirer;
    });

    test('GET /api/admin/users - should return users list for admin', async () => {
      jest.mocked(getServerSession).mockResolvedValue(createTestSession(testUsersCreated.admin));

      const request = createMockRequest('GET', '/api/admin/users');
      const response = await adminRoutes.GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.users).toHaveLength(2);
    });

    test('POST /api/admin/users/[userId]/ban - should ban user successfully', async () => {
      const banData = {
        reason: 'inappropriate_behavior',
        description: 'User violated community guidelines',
        duration: 7, // 7 days
        type: 'temporary'
      };

      jest.mocked(getServerSession).mockResolvedValue(createTestSession(testUsersCreated.admin));

      const request = createMockRequest('POST', `/api/admin/users/${testUsersCreated.hirer._id}/ban`, banData);
      const response = await adminRoutes.POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Verify user is banned
      const bannedUser = await User.findById(testUsersCreated.hirer._id);
      expect(bannedUser.banned).toBe(true);
      expect(bannedUser.banDetails.reason).toBe('inappropriate_behavior');
    });

    test('POST /api/admin/users/[userId]/unban - should unban user successfully', async () => {
      // First ban the user
      await User.findByIdAndUpdate(testUsersCreated.hirer._id, {
        banned: true,
        banDetails: {
          reason: 'test_ban',
          description: 'Test ban',
          bannedAt: new Date(),
          bannedBy: testUsersCreated.admin._id,
          type: 'temporary',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        }
      });

      jest.mocked(getServerSession).mockResolvedValue(createTestSession(testUsersCreated.admin));

      const request = createMockRequest('POST', `/api/admin/users/${testUsersCreated.hirer._id}/unban`, {});
      const response = await adminRoutes.POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Verify user is unbanned
      const unbannedUser = await User.findById(testUsersCreated.hirer._id);
      expect(unbannedUser.banned).toBe(false);
    });
  });

  describe('🔒 Security Tests', () => {
    test('Rate limiting should work on auth endpoints', async () => {
      const requests = [];

      // Make multiple rapid requests
      for (let i = 0; i < 10; i++) {
        const request = createMockRequest('POST', '/api/auth/signup', {
          ...testUsers.hirer,
          email: `test${i}@test.com`
        });
        requests.push(authRoutes.POST(request));
      }

      const responses = await Promise.all(requests);

      // At least one should be rate limited
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    test('Content validation should block sensitive content', async () => {
      const jobWithPhone = {
        title: 'Job with phone',
        description: 'Call me at 9876543210 for details', // Phone number should be blocked
        skillsRequired: ['plumbing'],
        budget: { type: 'fixed', amount: 500, currency: 'INR' },
        location: { address: 'Test', city: 'Mumbai', state: 'Maharashtra', pincode: '400001' },
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        attachments: []
      };

      const hirer = await new User(testUsers.hirer).save();
      jest.mocked(getServerSession).mockResolvedValue(createTestSession(hirer));

      const request = createMockRequest('POST', '/api/jobs/post', jobWithPhone);
      const response = await jobRoutes.POST(request);

      expect(response.status).toBe(400);
    });
  });

  describe('📊 Database Integrity Tests', () => {
    test('User model validation should work correctly', async () => {
      // Test invalid email
      try {
        await new User({ ...testUsers.hirer, email: 'invalid-email' }).save();
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error.errors.email).toBeTruthy();
      }

      // Test invalid username
      try {
        await new User({ ...testUsers.hirer, username: 'ab' }).save();
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error.errors.username).toBeTruthy();
      }
    });

    test('Job model validation should work correctly', async () => {
      const hirer = await new User(testUsers.hirer).save();

      // Test missing required fields
      try {
        await new Job({
          createdBy: hirer._id
          // Missing required fields
        }).save();
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error.errors).toBeTruthy();
      }
    });

    test('Review model validation should work correctly', async () => {
      const hirer = await new User(testUsers.hirer).save();
      const fixer = await new User(testUsers.fixer).save();
      const job = await new Job({
        title: 'Test Job',
        description: 'Test',
        skillsRequired: ['plumbing'],
        budget: { type: 'fixed', amount: 500, currency: 'INR' },
        location: { address: 'Test', city: 'Mumbai', state: 'Maharashtra', pincode: '400001' },
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdBy: hirer._id,
        status: 'completed'
      }).save();

      // Test invalid rating
      try {
        await new Review({
          job: job._id,
          reviewer: hirer._id,
          reviewee: fixer._id,
          reviewType: 'client_to_fixer',
          rating: { overall: 6 }, // Invalid rating > 5
          title: 'Test',
          comment: 'Test comment',
          status: 'published'
        }).save();
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error.errors).toBeTruthy();
      }
    });
  });
});

// Mock getServerSession
jest.mock('next-auth', () => ({
  getServerSession: jest.fn()
}));

export default {};