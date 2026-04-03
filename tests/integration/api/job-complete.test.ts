jest.mock('next/server', () => ({
  ...jest.requireActual('next/server'),
  after: jest.fn((fn: () => void) => { void Promise.resolve().then(fn); }),
}));

jest.mock('mongoose', () => ({
  Types: {
    ObjectId: {
      isValid: jest.fn(
        (value: string) => typeof value === 'string' && /^[a-f\d]{24}$/i.test(value)
      ),
    },
  },
}));

jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('@/lib/auth', () => ({
  authOptions: {},
}));

jest.mock('@/lib/mongodb', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('@/utils/rateLimiting', () => ({
  rateLimit: jest.fn().mockResolvedValue({ success: true }),
}));

jest.mock('@/models/Job', () => ({
  __esModule: true,
  default: {
    findById: jest.fn(),
  },
}));

jest.mock('@/models/User', () => ({
  __esModule: true,
  default: {
    findById: jest.fn(),
  },
}));

jest.mock('@/lib/ably/publisher', () => ({
  publishToChannel: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/ably/events', () => ({
  Channels: {
    job: jest.fn((id: string) => `job:${id}`),
    user: jest.fn((id: string) => `user:${id}`),
  },
  Events: {
    job: { statusChanged: 'status-changed' },
    user: { notificationSent: 'notification-sent' },
  },
}));

jest.mock('@/lib/inngest/client', () => ({
  inngest: {
    send: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}));

import type { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';

import { PATCH } from '@/app/api/jobs/[jobId]/complete/route';
import { publishToChannel } from '@/lib/ably/publisher';
import { inngest } from '@/lib/inngest/client';
import Job from '@/models/Job';
import User from '@/models/User';

const TEST_CSRF_TOKEN = 'test-csrf-token-for-integration-tests';
const JOB_ID = '507f1f77bcf86cd799439011';
const HIRER_ID = 'test-user-hirer-id';
const FIXER_ID = '507f1f77bcf86cd799439022';

function createTestSession(role: 'hirer' | 'fixer' | 'admin' = 'hirer') {
  return {
    user: {
      id: role === 'hirer' ? HIRER_ID : `test-user-${role}-id`,
      email: `test-${role}@example.com`,
      role,
      name: `Test ${role}`,
      csrfToken: TEST_CSRF_TOKEN,
    },
    expires: new Date(Date.now() + 86_400_000).toISOString(),
  };
}

function sessionWithMismatchedCsrf(role: 'hirer' | 'fixer' | 'admin' = 'hirer') {
  return {
    user: {
      id: HIRER_ID,
      email: `test@example.com`,
      role,
      csrfToken: 'a'.repeat(64),
    },
    expires: new Date(Date.now() + 86_400_000).toISOString(),
  };
}

function makePatchRequest(jobId: string, extra?: RequestInit): Request {
  return new Request(`http://localhost/api/jobs/${jobId}/complete`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'x-csrf-token': TEST_CSRF_TOKEN,
    },
    ...extra,
  }) as unknown as NextRequest;
}

describe('PATCH /api/jobs/[jobId]/complete', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession('hirer'));
  });

  it('returns 401 when no session exists', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);

    const response = await PATCH(makePatchRequest(JOB_ID) as NextRequest, {
      params: Promise.resolve({ jobId: JOB_ID }),
    });
    expect(response.status).toBe(401);
  });

  it('returns 403 when CSRF token mismatches', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(sessionWithMismatchedCsrf('hirer'));

    const response = await PATCH(
      new Request(`http://localhost/api/jobs/${JOB_ID}/complete`, {
        method: 'PATCH',
        headers: { 'x-csrf-token': TEST_CSRF_TOKEN },
      }) as unknown as NextRequest,
      { params: Promise.resolve({ jobId: JOB_ID }) }
    );
    expect(response.status).toBe(403);
  });

  it('returns 404 when job not found', async () => {
    (Job.findById as jest.Mock).mockResolvedValue(null);

    const response = await PATCH(makePatchRequest(JOB_ID) as NextRequest, {
      params: Promise.resolve({ jobId: JOB_ID }),
    });
    const payload = await response.json();
    expect(response.status).toBe(404);
    expect(payload.message ?? payload.error).toMatch(/job/i);
  });

  it('returns 400 when user is not the job owner', async () => {
    (Job.findById as jest.Mock).mockResolvedValue({
      _id: JOB_ID,
      createdBy: 'other-user-id',
      status: 'in_progress',
      assignedTo: FIXER_ID,
    });

    const response = await PATCH(makePatchRequest(JOB_ID) as NextRequest, {
      params: Promise.resolve({ jobId: JOB_ID }),
    });
    const payload = await response.json();
    expect(response.status).toBe(400);
    expect(payload.message ?? payload.error).toMatch(/hirer/i);
  });

  it('returns 400 when job is not in_progress', async () => {
    (Job.findById as jest.Mock).mockResolvedValue({
      _id: JOB_ID,
      createdBy: HIRER_ID,
      status: 'open',
      assignedTo: FIXER_ID,
    });

    const response = await PATCH(makePatchRequest(JOB_ID) as NextRequest, {
      params: Promise.resolve({ jobId: JOB_ID }),
    });
    const payload = await response.json();
    expect(response.status).toBe(400);
    expect(payload.message ?? payload.error).toMatch(/in.progress/i);
  });

  it('returns 400 when job has no assigned fixer', async () => {
    (Job.findById as jest.Mock).mockResolvedValue({
      _id: JOB_ID,
      createdBy: HIRER_ID,
      status: 'in_progress',
      assignedTo: null,
    });

    const response = await PATCH(makePatchRequest(JOB_ID) as NextRequest, {
      params: Promise.resolve({ jobId: JOB_ID }),
    });
    const payload = await response.json();
    expect(response.status).toBe(400);
    expect(payload.message ?? payload.error).toMatch(/fixer/i);
  });

  it('returns 404 when assigned fixer user not found', async () => {
    (Job.findById as jest.Mock).mockResolvedValue({
      _id: JOB_ID,
      createdBy: HIRER_ID,
      status: 'in_progress',
      assignedTo: FIXER_ID,
    });
    (User.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockResolvedValue(null),
    });

    const response = await PATCH(makePatchRequest(JOB_ID) as NextRequest, {
      params: Promise.resolve({ jobId: JOB_ID }),
    });
    const payload = await response.json();
    expect(response.status).toBe(404);
    expect(payload.message ?? payload.error).toMatch(/fixer/i);
  });

  it('returns 200 and marks job complete on success', async () => {
    const mockJob = {
      _id: JOB_ID,
      title: 'Pipe repair',
      createdBy: HIRER_ID,
      status: 'in_progress',
      assignedTo: FIXER_ID,
      progress: {},
      completion: {},
      save: jest.fn().mockResolvedValue(undefined),
    };

    const mockFixer = { _id: FIXER_ID, name: 'Test Fixer', email: 'fixer@test.com' };

    (Job.findById as jest.Mock).mockResolvedValue(mockJob);
    (User.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockResolvedValue(mockFixer),
    });

    const response = await PATCH(makePatchRequest(JOB_ID) as NextRequest, {
      params: Promise.resolve({ jobId: JOB_ID }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(mockJob.save).toHaveBeenCalled();
    expect(mockJob.status).toBe('completed');
    expect(publishToChannel).toHaveBeenCalledTimes(2);
    expect(inngest.send).toHaveBeenCalled();
  });
});
