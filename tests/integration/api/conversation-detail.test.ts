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
    getConversation: jest.fn(),
  },
}));

import type { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';

import { GET } from '@/app/api/messages/conversations/[conversationId]/route';
import { MessageService } from '@/lib/services/messageService';
import { TEST_CSRF_TOKEN, createTestSession } from '@/tests/helpers/auth';

const CONV_ID = '507f1f77bcf86cd799439011';

function makeRequest(conversationId = CONV_ID, query = ''): NextRequest {
  return new Request(
    `http://localhost/api/messages/conversations/${conversationId}${query}`
  ) as unknown as NextRequest;
}

describe('/api/messages/conversations/[conversationId] GET', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);

    const response = await GET(makeRequest(), { params: Promise.resolve({ conversationId: CONV_ID }) });

    expect(response.status).toBe(401);
  });

  it('returns 200 with conversation messages for a participant', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession('hirer'));

    const mockConversation = {
      _id: CONV_ID,
      participants: ['test-user-hirer-id', '507f1f77bcf86cd799439099'],
      relatedJob: '507f1f77bcf86cd799439022',
      title: 'Job Chat',
      conversationType: 'direct',
      messages: [
        {
          _id: 'msg1',
          sender: 'test-user-hirer-id',
          content: 'Hello there',
          messageType: 'text',
          timestamp: new Date('2024-01-01T10:00:00Z'),
          readBy: [],
          reactions: [],
          attachments: [],
          replyTo: null,
          edited: false,
          deleted: false,
        },
      ],
    };

    (MessageService.getConversation as jest.Mock).mockResolvedValue(mockConversation);

    const response = await GET(makeRequest(), { params: Promise.resolve({ conversationId: CONV_ID }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.items).toHaveLength(1);
    expect(body.data.items[0].content).toBe('Hello there');
    expect(body.data.conversation._id).toBe(CONV_ID);
    expect(body.data.total).toBe(1);
  });

  it('returns 403 when user is not a participant', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession('hirer'));

    (MessageService.getConversation as jest.Mock).mockRejectedValue(
      new Error('Access denied to conversation')
    );

    const response = await GET(makeRequest(), { params: Promise.resolve({ conversationId: CONV_ID }) });

    expect(response.status).toBe(403);
  });

  it('returns 404 when conversation does not exist', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession('hirer'));

    (MessageService.getConversation as jest.Mock).mockRejectedValue(
      new Error('Conversation not found')
    );

    const response = await GET(makeRequest(), { params: Promise.resolve({ conversationId: CONV_ID }) });

    expect(response.status).toBe(404);
  });

  it('returns 400 for empty conversationId', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession('hirer'));

    const response = await GET(makeRequest(''), { params: Promise.resolve({ conversationId: '' }) });

    expect(response.status).toBe(400);
  });

  it('returns paginated messages with page and limit params', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession('fixer'));

    const messages = Array.from({ length: 10 }, (_, i) => ({
      _id: `msg${i}`,
      sender: 'test-user-fixer-id',
      content: `Message ${i}`,
      messageType: 'text',
      timestamp: new Date(`2024-01-01T${String(i).padStart(2, '0')}:00:00Z`),
      readBy: [],
      reactions: [],
      attachments: [],
      replyTo: null,
      edited: false,
      deleted: false,
    }));

    (MessageService.getConversation as jest.Mock).mockResolvedValue({
      _id: CONV_ID,
      participants: [],
      relatedJob: null,
      title: '',
      conversationType: 'direct',
      messages,
    });

    const response = await GET(
      makeRequest(CONV_ID, '?page=1&limit=5'),
      { params: Promise.resolve({ conversationId: CONV_ID }) }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.items).toHaveLength(5);
    expect(body.data.total).toBe(10);
    expect(body.data.hasMore).toBe(true);
  });

  it('normalizes messages with default values for missing fields', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession('hirer'));

    (MessageService.getConversation as jest.Mock).mockResolvedValue({
      _id: CONV_ID,
      participants: [],
      relatedJob: null,
      title: '',
      conversationType: 'direct',
      messages: [
        {
          _id: 'msg1',
          sender: 'some-user',
          content: 'Hi',
          // messageType missing — should default to 'text'
          timestamp: new Date(),
          readBy: [],
          // reactions missing — should default to []
          // attachments missing — should default to []
        },
      ],
    });

    const response = await GET(makeRequest(), { params: Promise.resolve({ conversationId: CONV_ID }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    const msg = body.data.items[0];
    expect(msg.messageType).toBe('text');
    expect(msg.reactions).toEqual([]);
    expect(msg.attachments).toEqual([]);
    expect(msg.replyTo).toBeNull();
    expect(msg.edited).toBe(false);
    expect(msg.deleted).toBe(false);
  });

  it('returns 500 when MessageService throws an unexpected error', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession('hirer'));

    (MessageService.getConversation as jest.Mock).mockRejectedValue(
      new Error('Database connection error')
    );

    const response = await GET(makeRequest(), { params: Promise.resolve({ conversationId: CONV_ID }) });

    expect(response.status).toBe(500);
  });

  it('filters messages by before timestamp query param', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession('hirer'));

    const cutoff = new Date('2024-01-01T12:00:00Z');
    const before = cutoff.getTime();

    const messages = [
      {
        _id: 'old',
        sender: 'u1',
        content: 'old message',
        messageType: 'text',
        timestamp: new Date('2024-01-01T10:00:00Z'),
        readBy: [],
      },
      {
        _id: 'new',
        sender: 'u1',
        content: 'new message',
        messageType: 'text',
        timestamp: new Date('2024-01-01T14:00:00Z'),
        readBy: [],
      },
    ];

    (MessageService.getConversation as jest.Mock).mockResolvedValue({
      _id: CONV_ID,
      participants: [],
      relatedJob: null,
      title: '',
      conversationType: 'direct',
      messages,
    });

    const response = await GET(
      makeRequest(CONV_ID, `?before=${before}`),
      { params: Promise.resolve({ conversationId: CONV_ID }) }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    // Only the old message (before cutoff) should be returned
    expect(body.data.items).toHaveLength(1);
    expect(body.data.items[0]._id).toBe('old');
  });
});
