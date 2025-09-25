// tests/apiEndpoints.test.js - Comprehensive API Endpoint Tests
import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { GET, POST, PUT, DELETE } from '../app/api/jobs/[jobId]/apply/route';
import { GET as CommentsGET, POST as CommentsPOST } from '../app/api/jobs/[jobId]/comments/route';
import { GET as LocationGET, POST as LocationPOST } from '../app/api/user/location/history/route';

// Mock Next.js modules
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((data, options) => ({
      json: () => Promise.resolve(data),
      status: options?.status || 200,
      headers: options?.headers || {}
    })),
    redirect: jest.fn((url) => ({ redirect: url }))
  }
}));

jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn()
}));

jest.mock('@/lib/auth', () => ({
  authOptions: {}
}));

// Mock database models
const mockJob = {
  _id: 'job-123',
  title: 'Test Job',
  description: 'Test job description',
  budget: { amount: 5000, type: 'fixed' },
  location: { coordinates: { latitude: 19.0760, longitude: 72.8777 } },
  skillsRequired: ['plumbing'],
  status: 'open',
  createdBy: 'hirer-456',
  applications: [],
  save: jest.fn().mockResolvedValue(),
  populate: jest.fn().mockReturnThis(),
  lean: jest.fn().mockReturnThis()
};

const mockUser = {
  _id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  role: 'fixer',
  skills: ['plumbing', 'electrical'],
  location: { coordinates: { latitude: 19.0760, longitude: 72.8777 } },
  save: jest.fn().mockResolvedValue()
};

const mockApplication = {
  _id: 'app-123',
  jobId: 'job-123',
  applicantId: 'user-123',
  proposedBudget: 4500,
  message: 'I can do this job',
  status: 'pending',
  createdAt: new Date(),
  save: jest.fn().mockResolvedValue()
};

const mockComment = {
  _id: 'comment-123',
  jobId: 'job-123',
  userId: 'user-123',
  content: 'Test comment',
  createdAt: new Date(),
  replies: [],
  save: jest.fn().mockResolvedValue()
};

// Mock database connection
jest.mock('../lib/db', () => ({
  __esModule: true,
  default: jest.fn(() => Promise.resolve())
}));

// Mock models
jest.mock('../models/Job', () => ({
  findById: jest.fn(() => Promise.resolve(mockJob)),
  find: jest.fn(() => ({
    populate: jest.fn(() => ({
      lean: jest.fn(() => Promise.resolve([mockJob]))
    }))
  }))
}));

jest.mock('../models/User', () => ({
  findById: jest.fn(() => Promise.resolve(mockUser))
}));

jest.mock('../models/Application', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => mockApplication),
  find: jest.fn(() => ({
    populate: jest.fn(() => ({
      lean: jest.fn(() => Promise.resolve([mockApplication]))
    }))
  }))
}));

jest.mock('../models/Comment', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => mockComment),
  find: jest.fn(() => ({
    populate: jest.fn(() => ({
      lean: jest.fn(() => Promise.resolve([mockComment]))
    }))
  }))
}));

// Mock services
jest.mock('../lib/services/locationHistoryService', () => ({
  getUserLocationHistory: jest.fn(() => Promise.resolve({
    current: { latitude: 19.0760, longitude: 72.8777, city: 'Mumbai' },
    history: []
  })),
  getUserJobSuggestions: jest.fn(() => Promise.resolve({
    jobs: [],
    location: null,
    generatedAt: new Date().toISOString()
  })),
  updateUserLocation: jest.fn(() => Promise.resolve({
    coordinates: { latitude: 19.0760, longitude: 72.8777 },
    city: 'Mumbai'
  })),
  startUserLocationTracking: jest.fn(() => Promise.resolve()),
  stopUserLocationTracking: jest.fn(() => Promise.resolve())
}));

// Mock Ably
const mockAblyChannel = {
  publish: jest.fn(() => Promise.resolve())
};

jest.mock('../lib/ably', () => ({
  getServerAbly: jest.fn(() => ({
    channels: {
      get: jest.fn(() => mockAblyChannel)
    }
  })),
  CHANNELS: {
    jobApplications: (jobId) => `job:${jobId}:applications`,
    userNotifications: (userId) => `user:${userId}:notifications`,
    jobComments: (jobId) => `job:${jobId}:comments`
  },
  EVENTS: {
    APPLICATION_SUBMITTED: 'application_submitted',
    APPLICATION_STATUS_UPDATED: 'application_status_updated',
    COMMENT_POSTED: 'comment_posted',
    COMMENT_REPLIED: 'comment_replied'
  }
}));

// Mock rate limiting
jest.mock('../utils/rateLimiting', () => ({
  rateLimit: jest.fn(() => Promise.resolve({ success: true }))
}));

describe('API Endpoints Integration Tests', () => {
  let mockSession;
  let mockRequest;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSession = {
      user: {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'fixer'
      }
    };

    mockRequest = {
      json: jest.fn(),
      url: 'http://localhost:3000/api/test',
      headers: new Map()
    };

    // Mock successful authentication
    require('next-auth/next').getServerSession.mockResolvedValue(mockSession);
  });

  describe('Job Application API Routes', () => {
    describe('POST /api/jobs/[jobId]/apply', () => {
      test('should submit job application successfully', async () => {
        const applicationData = {
          proposedBudget: 4500,
          message: 'I can complete this job efficiently',
          timeline: '2 days'
        };

        mockRequest.json.mockResolvedValue(applicationData);

        const response = await POST(mockRequest, { params: { jobId: 'job-123' } });
        const data = await response.json();

        expect(data.success).toBe(true);
        expect(data.message).toContain('Application submitted successfully');
        expect(mockAblyChannel.publish).toHaveBeenCalledWith(
          'application_submitted',
          expect.objectContaining({
            jobId: 'job-123',
            applicantId: 'user-123'
          })
        );
      });

      test('should reject duplicate applications', async () => {
        // Mock existing application
        mockJob.applications = [{ applicantId: 'user-123' }];

        const applicationData = {
          proposedBudget: 4500,
          message: 'Second application'
        };

        mockRequest.json.mockResolvedValue(applicationData);

        const response = await POST(mockRequest, { params: { jobId: 'job-123' } });
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.message).toContain('already applied');
      });

      test('should validate required application fields', async () => {
        const incompleteData = {
          message: 'Missing budget'
        };

        mockRequest.json.mockResolvedValue(incompleteData);

        const response = await POST(mockRequest, { params: { jobId: 'job-123' } });

        expect(response.status).toBe(400);
      });

      test('should prevent self-application to own jobs', async () => {
        mockJob.createdBy = 'user-123'; // Same as applicant

        const applicationData = {
          proposedBudget: 4500,
          message: 'Applying to my own job'
        };

        mockRequest.json.mockResolvedValue(applicationData);

        const response = await POST(mockRequest, { params: { jobId: 'job-123' } });

        expect(response.status).toBe(400);
      });
    });

    describe('GET /api/jobs/[jobId]/apply', () => {
      test('should retrieve job applications for job owner', async () => {
        mockSession.user.id = 'hirer-456'; // Job owner
        require('next-auth/next').getServerSession.mockResolvedValue(mockSession);

        const response = await GET(mockRequest, { params: { jobId: 'job-123' } });
        const data = await response.json();

        expect(data.success).toBe(true);
        expect(Array.isArray(data.data.applications)).toBe(true);
      });

      test('should restrict access to non-owners', async () => {
        mockSession.user.id = 'other-user-789';
        require('next-auth/next').getServerSession.mockResolvedValue(mockSession);

        const response = await GET(mockRequest, { params: { jobId: 'job-123' } });

        expect(response.status).toBe(403);
      });
    });
  });

  describe('Comments API Routes', () => {
    describe('POST /api/jobs/[jobId]/comments', () => {
      test('should post comment successfully', async () => {
        const commentData = {
          content: 'Great job posting! I have some questions.',
          parentId: null
        };

        mockRequest.json.mockResolvedValue(commentData);

        const response = await CommentsPOST(mockRequest, { params: { jobId: 'job-123' } });
        const data = await response.json();

        expect(data.success).toBe(true);
        expect(data.data.comment.content).toBe(commentData.content);
        expect(mockAblyChannel.publish).toHaveBeenCalledWith(
          'comment_posted',
          expect.objectContaining({
            jobId: 'job-123',
            comment: expect.any(Object)
          })
        );
      });

      test('should post reply to existing comment', async () => {
        const replyData = {
          content: 'Thank you for your question!',
          parentId: 'comment-123'
        };

        mockRequest.json.mockResolvedValue(replyData);

        const response = await CommentsPOST(mockRequest, { params: { jobId: 'job-123' } });
        const data = await response.json();

        expect(data.success).toBe(true);
        expect(mockAblyChannel.publish).toHaveBeenCalledWith(
          'comment_replied',
          expect.objectContaining({
            parentCommentId: 'comment-123'
          })
        );
      });

      test('should validate comment content', async () => {
        const invalidData = {
          content: '', // Empty content
          parentId: null
        };

        mockRequest.json.mockResolvedValue(invalidData);

        const response = await CommentsPOST(mockRequest, { params: { jobId: 'job-123' } });

        expect(response.status).toBe(400);
      });

      test('should detect and block sensitive information', async () => {
        const sensitiveData = {
          content: 'Call me at 9876543210 or email test@gmail.com',
          parentId: null
        };

        mockRequest.json.mockResolvedValue(sensitiveData);

        const response = await CommentsPOST(mockRequest, { params: { jobId: 'job-123' } });

        expect(response.status).toBe(400);
      });
    });

    describe('GET /api/jobs/[jobId]/comments', () => {
      test('should retrieve comments for a job', async () => {
        const response = await CommentsGET(mockRequest, { params: { jobId: 'job-123' } });
        const data = await response.json();

        expect(data.success).toBe(true);
        expect(Array.isArray(data.data.comments)).toBe(true);
      });

      test('should handle pagination', async () => {
        mockRequest.url = 'http://localhost:3000/api/jobs/job-123/comments?page=2&limit=5';

        const response = await CommentsGET(mockRequest, { params: { jobId: 'job-123' } });
        const data = await response.json();

        expect(data.success).toBe(true);
        expect(data.data.pagination).toBeDefined();
      });
    });
  });

  describe('Location History API Routes', () => {
    describe('GET /api/user/location/history', () => {
      test('should retrieve user location history', async () => {
        mockRequest.url = 'http://localhost:3000/api/user/location/history?limit=10&includeSuggestions=true';

        const response = await LocationGET(mockRequest);
        const data = await response.json();

        expect(data.success).toBe(true);
        expect(data.data.current).toBeDefined();
        expect(data.data.suggestions).toBeDefined();
      });

      test('should require authentication', async () => {
        require('next-auth/next').getServerSession.mockResolvedValue(null);

        const response = await LocationGET(mockRequest);

        expect(response.status).toBe(401);
      });
    });

    describe('POST /api/user/location/history', () => {
      test('should update user location', async () => {
        const locationData = {
          action: 'update',
          location: {
            latitude: 19.0760,
            longitude: 72.8777,
            city: 'Mumbai',
            state: 'Maharashtra'
          }
        };

        mockRequest.json.mockResolvedValue(locationData);

        const response = await LocationPOST(mockRequest);
        const data = await response.json();

        expect(data.success).toBe(true);
        expect(data.message).toBe('Location updated successfully');
      });

      test('should start location tracking', async () => {
        const trackingData = {
          action: 'start_tracking',
          location: {
            latitude: 19.0760,
            longitude: 72.8777
          }
        };

        mockRequest.json.mockResolvedValue(trackingData);

        const response = await LocationPOST(mockRequest);
        const data = await response.json();

        expect(data.success).toBe(true);
        expect(data.message).toBe('Location tracking started');
      });

      test('should stop location tracking', async () => {
        const stopData = {
          action: 'stop_tracking'
        };

        mockRequest.json.mockResolvedValue(stopData);

        const response = await LocationPOST(mockRequest);
        const data = await response.json();

        expect(data.success).toBe(true);
        expect(data.message).toBe('Location tracking stopped');
      });

      test('should validate location coordinates', async () => {
        const invalidData = {
          action: 'update',
          location: {
            latitude: 'invalid',
            longitude: 72.8777
          }
        };

        mockRequest.json.mockResolvedValue(invalidData);

        const response = await LocationPOST(mockRequest);

        expect(response.status).toBe(400);
      });

      test('should handle rate limiting', async () => {
        const { rateLimit } = require('../utils/rateLimiting');
        rateLimit.mockResolvedValueOnce({ success: false });

        const locationData = {
          action: 'update',
          location: { latitude: 19.0760, longitude: 72.8777 }
        };

        mockRequest.json.mockResolvedValue(locationData);

        const response = await LocationPOST(mockRequest);

        expect(response.status).toBe(429);
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle database connection errors', async () => {
      const connectDB = require('../lib/db').default;
      connectDB.mockRejectedValueOnce(new Error('Database connection failed'));

      const response = await POST(mockRequest, { params: { jobId: 'job-123' } });

      expect(response.status).toBe(500);
    });

    test('should handle Ably publishing errors gracefully', async () => {
      mockAblyChannel.publish.mockRejectedValueOnce(new Error('Ably error'));

      const applicationData = {
        proposedBudget: 4500,
        message: 'Test application'
      };

      mockRequest.json.mockResolvedValue(applicationData);

      const response = await POST(mockRequest, { params: { jobId: 'job-123' } });
      const data = await response.json();

      // Should still succeed even if Ably fails
      expect(data.success).toBe(true);
    });

    test('should handle malformed JSON requests', async () => {
      mockRequest.json.mockRejectedValueOnce(new Error('Invalid JSON'));

      const response = await POST(mockRequest, { params: { jobId: 'job-123' } });

      expect(response.status).toBe(400);
    });

    test('should handle missing required parameters', async () => {
      const response = await POST(mockRequest, { params: {} });

      expect(response.status).toBe(400);
    });
  });

  describe('Authentication and Authorization', () => {
    test('should require valid session for protected routes', async () => {
      require('next-auth/next').getServerSession.mockResolvedValue(null);

      const response = await POST(mockRequest, { params: { jobId: 'job-123' } });

      expect(response.status).toBe(401);
    });

    test('should validate user roles for role-specific actions', async () => {
      // Test hirer-only actions
      mockSession.user.role = 'fixer';
      require('next-auth/next').getServerSession.mockResolvedValue(mockSession);

      const response = await GET(mockRequest, { params: { jobId: 'job-123' } });

      expect(response.status).toBe(403);
    });

    test('should handle expired sessions', async () => {
      const expiredSession = {
        ...mockSession,
        expires: new Date(Date.now() - 3600000).toISOString() // 1 hour ago
      };

      require('next-auth/next').getServerSession.mockResolvedValue(expiredSession);

      const response = await POST(mockRequest, { params: { jobId: 'job-123' } });

      expect(response.status).toBe(401);
    });
  });

  describe('Real-time Integration', () => {
    test('should broadcast events via Ably for all operations', async () => {
      const applicationData = {
        proposedBudget: 4500,
        message: 'Test application'
      };

      mockRequest.json.mockResolvedValue(applicationData);

      await POST(mockRequest, { params: { jobId: 'job-123' } });

      expect(mockAblyChannel.publish).toHaveBeenCalledWith(
        'application_submitted',
        expect.any(Object)
      );
    });

    test('should include proper event data structure', async () => {
      const commentData = {
        content: 'Test comment',
        parentId: null
      };

      mockRequest.json.mockResolvedValue(commentData);

      await CommentsPOST(mockRequest, { params: { jobId: 'job-123' } });

      expect(mockAblyChannel.publish).toHaveBeenCalledWith(
        'comment_posted',
        expect.objectContaining({
          jobId: 'job-123',
          comment: expect.objectContaining({
            content: 'Test comment'
          }),
          author: expect.objectContaining({
            id: 'user-123',
            name: 'Test User'
          }),
          timestamp: expect.any(String)
        })
      );
    });

    test('should handle concurrent real-time operations', async () => {
      const operations = [];

      for (let i = 0; i < 10; i++) {
        const request = {
          ...mockRequest,
          json: jest.fn().mockResolvedValue({
            content: `Comment ${i}`,
            parentId: null
          })
        };

        operations.push(CommentsPOST(request, { params: { jobId: 'job-123' } }));
      }

      await Promise.allSettled(operations);

      expect(mockAblyChannel.publish).toHaveBeenCalledTimes(10);
    });
  });

  describe('Performance Tests', () => {
    test('should handle high request volume', async () => {
      const requests = [];

      for (let i = 0; i < 100; i++) {
        const request = {
          ...mockRequest,
          json: jest.fn().mockResolvedValue({
            proposedBudget: 4500 + i,
            message: `Application ${i}`
          })
        };

        requests.push(POST(request, { params: { jobId: `job-${i}` } }));
      }

      const startTime = Date.now();
      const results = await Promise.allSettled(requests);
      const endTime = Date.now();

      const successfulRequests = results.filter(r => r.status === 'fulfilled').length;

      expect(successfulRequests).toBeGreaterThan(90); // At least 90% success rate
      expect(endTime - startTime).toBeLessThan(10000); // Complete within 10 seconds
    });

    test('should maintain performance with large datasets', async () => {
      // Mock large comment dataset
      const largeCommentSet = Array.from({ length: 1000 }, (_, i) => ({
        _id: `comment-${i}`,
        content: `Comment ${i}`,
        userId: 'user-123',
        createdAt: new Date()
      }));

      require('../models/Comment').find.mockReturnValueOnce({
        populate: jest.fn(() => ({
          lean: jest.fn(() => Promise.resolve(largeCommentSet))
        }))
      });

      const startTime = Date.now();
      const response = await CommentsGET(mockRequest, { params: { jobId: 'job-123' } });
      const endTime = Date.now();

      expect(response.status).toBe(200);
      expect(endTime - startTime).toBeLessThan(2000); // Should complete within 2 seconds
    });
  });
});

export default {};