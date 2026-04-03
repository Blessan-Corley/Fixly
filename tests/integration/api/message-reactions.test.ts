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

jest.mock('@/lib/services/messageService', () => ({
  MessageService: {
    toggleMessageReaction: jest.fn(),
  },
}));

import { getServerSession } from 'next-auth/next';

import { POST } from '@/app/api/messages/reactions/route';
import { MessageService } from '@/lib/services/messageService';
import { rateLimit } from '@/utils/rateLimiting';

describe('/api/messages/reactions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (rateLimit as jest.Mock).mockResolvedValue({ success: true });
    (getServerSession as jest.Mock).mockResolvedValue({
      user: {
        id: '507f1f77bcf86cd799439011',
      },
    });
  });

  it('rejects invalid reaction types', async () => {
    const response = await POST(
      new Request('http://localhost/api/messages/reactions', {
        method: 'POST',
        body: JSON.stringify({
          conversationId: '507f1f77bcf86cd799439099',
          messageId: '507f1f77bcf86cd799439088',
          reactionType: 'fire',
        }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.message).toBe('Invalid reaction type');
    expect(MessageService.toggleMessageReaction).not.toHaveBeenCalled();
  });

  it('maps access denied failures to 403', async () => {
    (MessageService.toggleMessageReaction as jest.Mock).mockRejectedValue(
      new Error('Access denied')
    );

    const response = await POST(
      new Request('http://localhost/api/messages/reactions', {
        method: 'POST',
        body: JSON.stringify({
          conversationId: '507f1f77bcf86cd799439099',
          messageId: '507f1f77bcf86cd799439088',
          reactionType: 'heart',
        }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload.message).toBe('Access denied');
  });

  it('toggles a valid reaction successfully', async () => {
    (MessageService.toggleMessageReaction as jest.Mock).mockResolvedValue({
      reacted: true,
      reactionType: 'heart',
      message: {
        _id: '507f1f77bcf86cd799439088',
        reactions: [{ user: '507f1f77bcf86cd799439011', type: 'heart' }],
      },
    });

    const response = await POST(
      new Request('http://localhost/api/messages/reactions', {
        method: 'POST',
        body: JSON.stringify({
          conversationId: '507f1f77bcf86cd799439099',
          messageId: '507f1f77bcf86cd799439088',
          reactionType: 'heart',
        }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.reacted).toBe(true);
    expect(MessageService.toggleMessageReaction).toHaveBeenCalledWith(
      '507f1f77bcf86cd799439099',
      '507f1f77bcf86cd799439088',
      '507f1f77bcf86cd799439011',
      'heart'
    );
  });
});
