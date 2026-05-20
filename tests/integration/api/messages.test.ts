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

jest.mock('@/lib/ably/publisher', () => ({
  publishToChannel: jest.fn().mockResolvedValue(undefined),
}));

import { getServerSession } from 'next-auth/next';

import { POST, PUT } from '@/app/api/messages/route';
import { MessageService } from '@/lib/services/messageService';
import { ContentValidator } from '@/lib/validations/content-validator';
import Conversation from '@/models/Conversation';
import User from '@/models/User';
import { TEST_CSRF_TOKEN } from '@/tests/helpers/auth';
import { rateLimit } from '@/utils/rateLimiting';

// ─── Constants ───────────────────────────────────────────────────────────────

const SESSION_USER_ID = '507f1f77bcf86cd799439011';
const RECIPIENT_ID = '507f1f77bcf86cd799439012';
const CONVERSATION_ID = '507f1f77bcf86cd799439099';
const MESSAGE_ID = '507f1f77bcf86cd799439088';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * POST /api/messages is excluded from the global CSRF auto-attach in jest.setup.js,
 * so tests must always provide the x-csrf-token header explicitly.
 */
function makePostRequest(body: Record<string, unknown>, headerOverrides: Record<string, string> = {}) {
  return new Request('http://localhost/api/messages', {
    method: 'POST',
    headers: {
      'x-csrf-token': TEST_CSRF_TOKEN,
      ...headerOverrides,
    },
    body: JSON.stringify(body),
  });
}

/**
 * PUT /api/messages gets the CSRF header auto-attached by jest.setup.js.
 * Only supply headerOverrides to test CSRF failure cases.
 */
function makePutRequest(body: Record<string, unknown>, headerOverrides: Record<string, string> = {}) {
  return new Request('http://localhost/api/messages', {
    method: 'PUT',
    headers: { ...headerOverrides },
    body: JSON.stringify(body),
  });
}

function validEditBody(override: Record<string, unknown> = {}) {
  return {
    conversationId: CONVERSATION_ID,
    messageId: MESSAGE_ID,
    action: 'edit',
    content: 'Updated message content.',
    ...override,
  };
}

// ─── describe ────────────────────────────────────────────────────────────────

describe('/api/messages', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    ContentValidator.violationCache.clear();

    // Default: rate limit passes
    (rateLimit as jest.Mock).mockResolvedValue({ success: true });

    // Default: authenticated fixer session
    (getServerSession as jest.Mock).mockResolvedValue({
      user: {
        id: SESSION_USER_ID,
        role: 'fixer',
        csrfToken: TEST_CSRF_TOKEN,
      },
    });

    // Default: recipient exists
    (User.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockResolvedValue({ _id: RECIPIENT_ID }),
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // POST — send message
  // ─────────────────────────────────────────────────────────────────────────

  describe('POST (send message)', () => {
    // ── Rate limiting ───────────────────────────────────────────────────────

    it('returns 429 when the rate limit is exceeded', async () => {
      (rateLimit as jest.Mock).mockResolvedValue({ success: false });

      const response = await POST(makePostRequest({ recipientId: RECIPIENT_ID, content: 'Hello' }));

      expect(response.status).toBe(429);
      // Rate limit fires before auth
      expect(getServerSession).not.toHaveBeenCalled();
    });

    // ── Authentication ──────────────────────────────────────────────────────

    it('returns 401 when the user is not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const response = await POST(makePostRequest({ recipientId: RECIPIENT_ID, content: 'Hello' }));

      expect(response.status).toBe(401);
      expect(MessageService.sendMessage).not.toHaveBeenCalled();
    });

    // ── CSRF ────────────────────────────────────────────────────────────────

    it('returns 403 when the CSRF token does not match', async () => {
      const response = await POST(
        makePostRequest(
          { recipientId: RECIPIENT_ID, content: 'Hello' },
          { 'x-csrf-token': 'totally-wrong-token' }
        )
      );

      expect(response.status).toBe(403);
      const payload = await response.json();
      expect(payload.error).toBe('CSRF_INVALID');
    });

    // ── Validation ──────────────────────────────────────────────────────────

    it('returns 400 when neither content nor attachments are provided', async () => {
      const response = await POST(
        makePostRequest({ recipientId: RECIPIENT_ID, content: '' })
      );

      expect(response.status).toBe(400);
      const payload = await response.json();
      expect(payload.message).toMatch(/content or attachments/i);
    });

    it('returns 400 when the message content exceeds 1000 characters', async () => {
      const response = await POST(
        makePostRequest({ recipientId: RECIPIENT_ID, content: 'a'.repeat(1001) })
      );

      expect(response.status).toBe(400);
      const payload = await response.json();
      expect(payload.message).toMatch(/too long/i);
    });

    it('returns 400 when neither conversationId nor recipientId is provided', async () => {
      const response = await POST(makePostRequest({ content: 'Hello' }));

      expect(response.status).toBe(400);
      const payload = await response.json();
      expect(payload.message).toMatch(/conversationId or recipientId/i);
    });

    it('returns 400 when the recipientId is not a valid ObjectId', async () => {
      const response = await POST(
        makePostRequest({ recipientId: 'not-a-valid-id', content: 'Hello' })
      );

      expect(response.status).toBe(400);
      expect(MessageService.sendMessage).not.toHaveBeenCalled();
    });

    it('returns 400 when the user tries to message themselves', async () => {
      const response = await POST(
        makePostRequest({ recipientId: SESSION_USER_ID, content: 'Hello' })
      );

      expect(response.status).toBe(400);
      const payload = await response.json();
      expect(payload.message).toMatch(/cannot message yourself/i);
    });

    // ── Content moderation ──────────────────────────────────────────────────

    it('returns 400 and blocks the request when a message contains abusive content', async () => {
      const response = await POST(
        makePostRequest({ recipientId: RECIPIENT_ID, content: 'You are an idiot' })
      );
      const payload = await response.json();

      expect(response.status).toBe(400);
      expect(payload.message).toContain('Message');
      expect(MessageService.sendMessage).not.toHaveBeenCalled();
    });

    // ── Recipient / conversation not found ──────────────────────────────────

    it('returns 404 when the recipient user does not exist', async () => {
      (User.findById as jest.Mock).mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });

      const response = await POST(
        makePostRequest({ recipientId: RECIPIENT_ID, content: 'Hello there' })
      );

      expect(response.status).toBe(404);
      const payload = await response.json();
      expect(payload.message).toMatch(/recipient/i);
    });

    it('returns 404 when the conversation ID does not belong to the user', async () => {
      // findOne returns a query-like object; .select() resolves to null → not a participant
      (Conversation.findOne as jest.Mock).mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });

      const response = await POST(
        makePostRequest({ conversationId: CONVERSATION_ID, content: 'Hello' })
      );

      expect(response.status).toBe(404);
      const payload = await response.json();
      expect(payload.message).toMatch(/conversation/i);
    });

    // ── Access denied ───────────────────────────────────────────────────────

    it('returns 403 when sendMessage throws an access-denied error', async () => {
      (Conversation.findOne as jest.Mock).mockReturnValue({
        select: jest.fn().mockResolvedValue({
          _id: CONVERSATION_ID,
          participants: [SESSION_USER_ID, RECIPIENT_ID],
        }),
      });
      (MessageService.sendMessage as jest.Mock).mockRejectedValue(
        new Error('access denied')
      );

      const response = await POST(
        makePostRequest({ conversationId: CONVERSATION_ID, content: 'Hello' })
      );

      expect(response.status).toBe(403);
    });

    // ── Happy path: recipientId ─────────────────────────────────────────────

    it('allows contact sharing in private messages and sends the message', async () => {
      (Conversation.findOrCreateBetween as jest.Mock).mockResolvedValue({
        _id: CONVERSATION_ID,
      });
      (MessageService.sendMessage as jest.Mock).mockResolvedValue({
        success: true,
        message: { _id: 'msg-1', content: 'Call me at 9876543210' },
      });

      const response = await POST(
        makePostRequest({ recipientId: RECIPIENT_ID, content: 'Call me at 9876543210' })
      );
      const payload = await response.json();

      expect(response.status).toBe(200);
      expect(payload.success).toBe(true);
      expect(MessageService.sendMessage).toHaveBeenCalledWith(
        CONVERSATION_ID,
        SESSION_USER_ID,
        'Call me at 9876543210',
        'text',
        { attachments: [], replyTo: undefined }
      );
    });

    // ── Happy path: conversationId ──────────────────────────────────────────

    it('sends a message by conversationId when the user is a participant', async () => {
      (Conversation.findOne as jest.Mock).mockReturnValue({
        select: jest.fn().mockResolvedValue({
          _id: CONVERSATION_ID,
          participants: [SESSION_USER_ID, RECIPIENT_ID],
        }),
      });
      (MessageService.sendMessage as jest.Mock).mockResolvedValue({
        success: true,
        message: { _id: 'msg-2', content: 'Hello again' },
      });

      const response = await POST(
        makePostRequest({ conversationId: CONVERSATION_ID, content: 'Hello again' })
      );
      const payload = await response.json();

      expect(response.status).toBe(200);
      expect(payload.success).toBe(true);
      expect(MessageService.sendMessage).toHaveBeenCalledWith(
        CONVERSATION_ID,
        SESSION_USER_ID,
        'Hello again',
        'text',
        { attachments: [], replyTo: undefined }
      );
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // PUT — edit or delete a message
  // ─────────────────────────────────────────────────────────────────────────

  describe('PUT (edit / delete message)', () => {
    // ── Authentication ──────────────────────────────────────────────────────

    it('returns 401 when the user is not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const response = await PUT(makePutRequest(validEditBody()));

      expect(response.status).toBe(401);
      expect(MessageService.updateMessage).not.toHaveBeenCalled();
    });

    // ── CSRF ────────────────────────────────────────────────────────────────

    it('returns 403 when the CSRF token does not match', async () => {
      // PUT auto-attaches CSRF; override with wrong value to force failure
      const response = await PUT(
        makePutRequest(validEditBody(), { 'x-csrf-token': 'wrong-csrf-token' })
      );

      expect(response.status).toBe(403);
      const payload = await response.json();
      expect(payload.error).toBe('CSRF_INVALID');
    });

    // ── Validation ──────────────────────────────────────────────────────────

    it('returns 400 when conversationId or messageId is missing', async () => {
      const response = await PUT(
        makePutRequest({ action: 'edit', content: 'New content' })
      );

      expect(response.status).toBe(400);
      const payload = await response.json();
      expect(payload.message).toMatch(/conversation id and message id/i);
    });

    it('returns 400 when the action is not "edit" or "delete"', async () => {
      const response = await PUT(
        makePutRequest({ conversationId: CONVERSATION_ID, messageId: MESSAGE_ID, action: 'like' })
      );

      expect(response.status).toBe(400);
      const payload = await response.json();
      expect(payload.message).toMatch(/invalid action/i);
    });

    it('returns 400 when action is "edit" but no content is provided', async () => {
      const response = await PUT(
        makePutRequest({
          conversationId: CONVERSATION_ID,
          messageId: MESSAGE_ID,
          action: 'edit',
          content: '',
        })
      );

      expect(response.status).toBe(400);
      const payload = await response.json();
      expect(payload.message).toMatch(/content is required/i);
    });

    it('returns 400 when the edited content exceeds 1000 characters', async () => {
      const response = await PUT(
        makePutRequest({
          conversationId: CONVERSATION_ID,
          messageId: MESSAGE_ID,
          action: 'edit',
          content: 'x'.repeat(1001),
        })
      );

      expect(response.status).toBe(400);
      const payload = await response.json();
      expect(payload.message).toMatch(/too long/i);
    });

    // ── Content moderation ──────────────────────────────────────────────────

    it('returns 400 and blocks an edit that contains abusive content', async () => {
      const response = await PUT(
        makePutRequest(validEditBody({ content: 'You are an idiot' }))
      );
      const payload = await response.json();

      expect(response.status).toBe(400);
      expect(payload.message).toContain('Message');
      expect(MessageService.updateMessage).not.toHaveBeenCalled();
    });

    // ── Ownership / not found ───────────────────────────────────────────────

    it('returns 403 when the user tries to edit another user\'s message', async () => {
      (MessageService.updateMessage as jest.Mock).mockRejectedValue(
        new Error('access denied')
      );

      const response = await PUT(makePutRequest(validEditBody()));

      expect(response.status).toBe(403);
      const payload = await response.json();
      expect(payload.message).toMatch(/own messages/i);
    });

    it('returns 404 when the message does not exist', async () => {
      (MessageService.updateMessage as jest.Mock).mockRejectedValue(
        new Error('message not found')
      );

      const response = await PUT(makePutRequest(validEditBody()));

      expect(response.status).toBe(404);
      const payload = await response.json();
      expect(payload.message).toMatch(/message/i);
    });

    // ── Happy path: edit ────────────────────────────────────────────────────

    it('edits the message successfully and returns the updated message', async () => {
      const updatedMessage = {
        _id: MESSAGE_ID,
        content: 'Updated message content.',
        edited: true,
        editedAt: new Date().toISOString(),
      };
      (MessageService.updateMessage as jest.Mock).mockResolvedValue({
        message: updatedMessage,
      });

      const response = await PUT(makePutRequest(validEditBody()));
      const payload = await response.json();

      expect(response.status).toBe(200);
      expect(payload.success).toBe(true);
      expect(payload.updatedMessage).toEqual(updatedMessage);
      expect(MessageService.updateMessage).toHaveBeenCalledWith(
        CONVERSATION_ID,
        MESSAGE_ID,
        SESSION_USER_ID,
        'edit',
        'Updated message content.'
      );
    });

    // ── Happy path: delete ──────────────────────────────────────────────────

    it('deletes the message successfully', async () => {
      (MessageService.updateMessage as jest.Mock).mockResolvedValue({
        message: { _id: MESSAGE_ID, deleted: true },
      });

      const response = await PUT(
        makePutRequest({
          conversationId: CONVERSATION_ID,
          messageId: MESSAGE_ID,
          action: 'delete',
        })
      );
      const payload = await response.json();

      expect(response.status).toBe(200);
      expect(payload.success).toBe(true);
      expect(MessageService.updateMessage).toHaveBeenCalledWith(
        CONVERSATION_ID,
        MESSAGE_ID,
        SESSION_USER_ID,
        'delete',
        ''
      );
    });
  });
});
