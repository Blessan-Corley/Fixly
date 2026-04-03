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

jest.mock('@/utils/rateLimiting', () => ({
  rateLimit: jest.fn(),
}));

jest.mock('@/lib/mongodb', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('@/models/User', () => ({
  __esModule: true,
  default: {
    findById: jest.fn(),
  },
}));

jest.mock('@/models/Conversation', () => ({
  __esModule: true,
  default: {
    findOrCreateBetween: jest.fn(),
    findOne: jest.fn(),
  },
}));

jest.mock('@/lib/services/messageService', () => ({
  MessageService: {
    sendMessage: jest.fn(),
    getConversation: jest.fn(),
    markAsRead: jest.fn(),
    getJobConversation: jest.fn(),
    getUserConversations: jest.fn(),
    updateMessage: jest.fn(),
  },
}));

jest.mock('@/lib/redis', () => ({
  redisUtils: {
    setex: jest.fn(),
    get: jest.fn(),
  },
}));

import { getServerSession } from 'next-auth/next';

import { POST, PUT } from '@/app/api/messages/route';
import { MessageService } from '@/lib/services/messageService';
import { ContentValidator } from '@/lib/validations/content-validator';
import Conversation from '@/models/Conversation';
import User from '@/models/User';
import { TEST_CSRF_TOKEN } from '@/tests/helpers/auth';
import { rateLimit } from '@/utils/rateLimiting';

describe('/api/messages', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    ContentValidator.violationCache.clear();
    (getServerSession as jest.Mock).mockResolvedValue({
      user: {
        id: '507f1f77bcf86cd799439011',
        role: 'fixer',
        csrfToken: TEST_CSRF_TOKEN,
      },
    });
    (rateLimit as jest.Mock).mockResolvedValue({ success: true });
    (User.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockResolvedValue({ _id: '507f1f77bcf86cd799439012' }),
    });
  });

  it('rejects abusive private messages before persistence', async () => {
    const response = await POST(
      new Request('http://localhost/api/messages', {
        method: 'POST',
        headers: {
          'x-csrf-token': TEST_CSRF_TOKEN,
        },
        body: JSON.stringify({
          recipientId: '507f1f77bcf86cd799439012',
          content: 'You are an idiot',
        }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.message).toContain('Message');
    expect(MessageService.sendMessage).not.toHaveBeenCalled();
  });

  it('allows contact sharing in private messages and sends the message', async () => {
    (Conversation.findOrCreateBetween as jest.Mock).mockResolvedValue({
      _id: '507f1f77bcf86cd799439099',
    });
    (MessageService.sendMessage as jest.Mock).mockResolvedValue({
      success: true,
      message: { _id: 'msg-1', content: 'Call me at 9876543210' },
    });

    const response = await POST(
      new Request('http://localhost/api/messages', {
        method: 'POST',
        headers: {
          'x-csrf-token': TEST_CSRF_TOKEN,
        },
        body: JSON.stringify({
          recipientId: '507f1f77bcf86cd799439012',
          content: 'Call me at 9876543210',
        }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(MessageService.sendMessage).toHaveBeenCalledWith(
      '507f1f77bcf86cd799439099',
      '507f1f77bcf86cd799439011',
      'Call me at 9876543210',
      'text',
      {
        attachments: [],
        replyTo: undefined,
      }
    );
  });

  it('rejects abusive message edits', async () => {
    const response = await PUT(
      new Request('http://localhost/api/messages', {
        method: 'PUT',
        body: JSON.stringify({
          conversationId: '507f1f77bcf86cd799439099',
          messageId: '507f1f77bcf86cd799439088',
          action: 'edit',
          content: 'You are an idiot',
        }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.message).toContain('Message');
    expect(MessageService.updateMessage).not.toHaveBeenCalled();
  });
});
