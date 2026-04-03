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

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('@/lib/env', () => ({
  env: { NODE_ENV: 'test' },
}));

jest.mock('server-only', () => ({}));

jest.mock('@/lib/security/csrf.server', () => ({
  validateCsrfToken: jest.fn(() => ({ valid: true })),
  generateCsrfToken: jest.fn(() => 'test-csrf-token-for-integration-tests'),
  getCsrfToken: jest.fn(() => 'test-csrf-token-for-integration-tests'),
}));

jest.mock('@/lib/services/messageService', () => ({
  MessageService: {
    getJobConversation: jest.fn(),
  },
}));

import type { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';

import { GET } from '@/app/api/messages/job/[jobId]/route';
import { MessageService } from '@/lib/services/messageService';
import { createTestSession } from '@/tests/helpers/auth';

const JOB_ID = '507f1f77bcf86cd799439022';

function makeRequest(jobId = JOB_ID, query = ''): NextRequest {
  return new Request(
    `http://localhost/api/messages/job/${jobId}${query}`
  ) as unknown as NextRequest;
}

describe('/api/messages/job/[jobId] GET', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);

    const response = await GET(makeRequest(), { params: Promise.resolve({ jobId: JOB_ID }) });

    expect(response.status).toBe(401);
  });

  it('returns 400 when jobId is empty', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession('hirer'));

    const response = await GET(makeRequest(''), { params: Promise.resolve({ jobId: '' }) });

    expect(response.status).toBe(400);
  });

  it('returns 200 with job conversation messages', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession('hirer'));

    const mockConversation = {
      _id: '507f1f77bcf86cd799439011',
      participants: ['test-user-hirer-id', '507f1f77bcf86cd799439099'],
      relatedJob: JOB_ID,
      title: 'Job Discussion',
      conversationType: 'job',
      messages: [
        {
          _id: 'msg1',
          sender: 'test-user-hirer-id',
          content: 'Starting the job discussion',
          messageType: 'text',
          timestamp: new Date('2024-01-01T10:00:00Z'),
          readBy: [],
          reactions: [],
          attachments: [],
          replyTo: null,
          edited: false,
          deleted: false,
        },
        {
          _id: 'msg2',
          sender: '507f1f77bcf86cd799439099',
          content: 'Got it, will start tomorrow',
          messageType: 'text',
          timestamp: new Date('2024-01-01T10:05:00Z'),
          readBy: [],
          reactions: [],
          attachments: [],
          replyTo: null,
          edited: false,
          deleted: false,
        },
      ],
    };

    (MessageService.getJobConversation as jest.Mock).mockResolvedValue(mockConversation);

    const response = await GET(makeRequest(), { params: Promise.resolve({ jobId: JOB_ID }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.items).toHaveLength(2);
    expect(body.data.total).toBe(2);
    expect(body.data.conversation.relatedJob).toBe(JOB_ID);
    expect(body.data.conversation.conversationType).toBe('job');
  });

  it('returns 403 when user does not have access to the job conversation', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession('hirer'));

    (MessageService.getJobConversation as jest.Mock).mockRejectedValue(
      new Error('Access denied to this job conversation')
    );

    const response = await GET(makeRequest(), { params: Promise.resolve({ jobId: JOB_ID }) });

    expect(response.status).toBe(403);
  });

  it('returns 404 when job conversation does not exist', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession('hirer'));

    (MessageService.getJobConversation as jest.Mock).mockRejectedValue(
      new Error('Conversation not found')
    );

    const response = await GET(makeRequest(), { params: Promise.resolve({ jobId: JOB_ID }) });

    expect(response.status).toBe(404);
  });

  it('returns 403 when job is not available', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession('fixer'));

    (MessageService.getJobConversation as jest.Mock).mockRejectedValue(
      new Error('Job not available for messaging')
    );

    const response = await GET(makeRequest(), { params: Promise.resolve({ jobId: JOB_ID }) });

    expect(response.status).toBe(403);
  });

  it('returns paginated messages', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession('fixer'));

    const messages = Array.from({ length: 20 }, (_, i) => ({
      _id: `msg${i}`,
      sender: 'test-user-fixer-id',
      content: `Message ${i}`,
      messageType: 'text',
      timestamp: new Date(`2024-01-${String(i + 1).padStart(2, '0')}T00:00:00Z`),
      readBy: [],
      reactions: [],
      attachments: [],
      replyTo: null,
      edited: false,
      deleted: false,
    }));

    (MessageService.getJobConversation as jest.Mock).mockResolvedValue({
      _id: '507f1f77bcf86cd799439011',
      participants: [],
      relatedJob: JOB_ID,
      title: '',
      conversationType: 'job',
      messages,
    });

    const response = await GET(
      makeRequest(JOB_ID, '?page=1&limit=10'),
      { params: Promise.resolve({ jobId: JOB_ID }) }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.items).toHaveLength(10);
    expect(body.data.total).toBe(20);
    expect(body.data.hasMore).toBe(true);
    expect(body.data.page).toBe(1);
    expect(body.data.limit).toBe(10);
  });

  it('returns defaults for conversationType when missing', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession('hirer'));

    (MessageService.getJobConversation as jest.Mock).mockResolvedValue({
      _id: '507f1f77bcf86cd799439011',
      participants: [],
      relatedJob: null,
      title: '',
      conversationType: '',
      messages: [],
    });

    const response = await GET(makeRequest(), { params: Promise.resolve({ jobId: JOB_ID }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.conversation.conversationType).toBe('job');
  });

  it('returns 500 on unexpected error', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession('hirer'));

    (MessageService.getJobConversation as jest.Mock).mockRejectedValue(
      new Error('Unexpected database failure')
    );

    const response = await GET(makeRequest(), { params: Promise.resolve({ jobId: JOB_ID }) });

    expect(response.status).toBe(500);
  });
});
