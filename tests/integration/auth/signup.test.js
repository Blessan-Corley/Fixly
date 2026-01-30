/**
 * @jest-environment node
 */
import { POST } from '@/app/api/auth/signup/route';
import User from '@/models/User';
import connectDB from '@/lib/db';
import { createMocks } from 'node-mocks-http';

// Mock next-auth
jest.mock('next-auth', () => ({
  getServerSession: jest.fn().mockResolvedValue({
    user: { email: 'test@example.com', id: 'session-id' }
  })
}));

// Mock dependencies
jest.mock('@/lib/redis', () => ({
  redisRateLimit: jest.fn().mockResolvedValue({ success: true }),
  redisUtils: {
    set: jest.fn(),
    get: jest.fn()
  }
}));

jest.mock('@/lib/email', () => ({
  sendWelcomeEmail: jest.fn().mockResolvedValue(true)
}));

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

// ... (existing imports)

let mongoServer;

describe('Signup API Integration Test', () => {
  beforeAll(async () => {
    // Start memory server
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    process.env.MONGODB_URI = uri;
    
    // Connect to the in-memory db
    // We need to force close any existing connection first to ensure we use the new URI
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    await connectDB();
  });

  afterEach(async () => {
    // Clean up test data
    if (mongoose.connection.readyState === 1) {
        await User.deleteMany({ email: { $regex: /@(test|example)\.com$/ } });
    }
  });

  afterAll(async () => {
    // Close connection and stop server
    if (mongoose.connection.readyState === 1) {
        await mongoose.disconnect();
    }
    if (mongoServer) {
        await mongoServer.stop();
    }
  });

  it('should successfully register a new Hirer', async () => {
    const body = {
      name: 'Valid Hirer',
      email: 'hirer@example.com',
      username: 'valid_person_one',
      password: 'Password123!',
      confirmPassword: 'Password123!',
      phone: '9876543210',
      role: 'hirer',
      authMethod: 'email',
      termsAccepted: true,
      location: {
        city: 'Bangalore',
        state: 'Karnataka',
        lat: 12.9716,
        lng: 77.5946
      }
    };

    const req = {
      json: async () => body,
      headers: { get: () => '127.0.0.1' }
    };

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.user.role).toBe('hirer');
    
    // Verify DB
    const user = await User.findOne({ email: body.email });
    expect(user).toBeTruthy();
    expect(user.plan.type).toBe('free');
  });

  it('should successfully register a new Fixer with skills', async () => {
    const body = {
      name: 'Valid Fixer',
      email: 'fixer@example.com',
      username: 'valid_person_two',
      password: 'Password123!',
      confirmPassword: 'Password123!',
      phone: '9876543211',
      role: 'fixer',
      authMethod: 'email',
      termsAccepted: true,
      skills: ['plumbing', 'electrical'],
      location: {
        city: 'Mumbai',
        state: 'Maharashtra',
        lat: 19.0760,
        lng: 72.8777
      }
    };

    const req = {
      json: async () => body,
      headers: { get: () => '127.0.0.1' }
    };

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.user.role).toBe('fixer');
    expect(data.user.skills).toContain('plumbing');
  });

  it('should block duplicate email', async () => {
    // Create initial user
    await User.create({
      name: 'Original',
      email: 'duplicate@example.com',
      username: 'first_registrant',
      passwordHash: 'hashedpassword123', // Must be >= 6 chars
      role: 'hirer',
      authMethod: 'email',
      phone: '+919876543210'
    });

    const body = {
      name: 'Duplicate',
      email: 'duplicate@example.com',
      username: 'second_registrant',
      password: 'Password123!',
      confirmPassword: 'Password123!',
      phone: '9876543212',
      role: 'hirer',
      authMethod: 'email',
      termsAccepted: true
    };

    const req = {
      json: async () => body,
      headers: { get: () => '127.0.0.1' }
    };

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.message).toMatch(/email already exists/i);
  });

  it('should enforce password strength', async () => {
    const body = {
      name: 'Weak Password',
      email: 'weak@example.com',
      username: 'weak_pass_person',
      password: '123', // Weak
      confirmPassword: '123',
      phone: '9876543213', // Required field
      role: 'hirer',
      authMethod: 'email',
      termsAccepted: true
    };

    const req = {
      json: async () => body,
      headers: { get: () => '127.0.0.1' }
    };

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.message).toBe('Validation failed');
  });
});