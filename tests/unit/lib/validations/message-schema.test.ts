import { describe, expect, it } from 'vitest';

import {
  CreateConversationSchema,
  SendMessageSchema,
} from '@/lib/validations/message';

describe('SendMessageSchema', () => {
  it('accepts empty object (all fields optional)', () => {
    const result = SendMessageSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts full valid input', () => {
    const result = SendMessageSchema.safeParse({
      content: 'Hello, when can you start?',
      messageType: 'text',
      attachments: [
        {
          url: 'https://example.com/image.jpg',
          type: 'image',
          filename: 'photo.jpg',
          size: 102400,
          mimeType: 'image/jpeg',
        },
      ],
      replyTo: 'msg_abc123',
      conversationId: 'conv_xyz',
      recipientId: 'user_123',
      jobId: 'job_456',
    });
    expect(result.success).toBe(true);
  });

  describe('content', () => {
    it('accepts content at exactly 1000 characters', () => {
      const result = SendMessageSchema.safeParse({ content: 'a'.repeat(1000) });
      expect(result.success).toBe(true);
    });

    it('rejects content exceeding 1000 characters', () => {
      const result = SendMessageSchema.safeParse({ content: 'a'.repeat(1001) });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].path).toContain('content');
    });

    it('accepts empty content string', () => {
      const result = SendMessageSchema.safeParse({ content: '' });
      expect(result.success).toBe(true);
    });
  });

  describe('messageType', () => {
    it('accepts valid messageType values', () => {
      const types = ['text', 'image', 'file'] as const;
      for (const messageType of types) {
        const result = SendMessageSchema.safeParse({ messageType });
        expect(result.success).toBe(true);
      }
    });

    it('rejects invalid messageType', () => {
      const result = SendMessageSchema.safeParse({ messageType: 'video' });
      expect(result.success).toBe(false);
    });
  });

  describe('attachments', () => {
    it('rejects attachments array exceeding 5 items', () => {
      const attachments = Array.from({ length: 6 }, (_, i) => ({
        url: `https://example.com/file${i}.jpg`,
      }));
      const result = SendMessageSchema.safeParse({ content: 'test', attachments });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].path).toContain('attachments');
    });

    it('accepts attachments array with 5 items', () => {
      const attachments = Array.from({ length: 5 }, (_, i) => ({
        url: `https://example.com/file${i}.jpg`,
      }));
      const result = SendMessageSchema.safeParse({ content: 'test', attachments });
      expect(result.success).toBe(true);
    });

    it('rejects attachment with invalid URL', () => {
      const result = SendMessageSchema.safeParse({
        content: 'test',
        attachments: [{ url: 'not-a-valid-url' }],
      });
      expect(result.success).toBe(false);
    });

    it('accepts attachment with only required url field', () => {
      const result = SendMessageSchema.safeParse({
        attachments: [{ url: 'https://example.com/doc.pdf' }],
      });
      expect(result.success).toBe(true);
    });

    it('rejects attachment with invalid type value', () => {
      const result = SendMessageSchema.safeParse({
        attachments: [{ url: 'https://example.com/file.txt', type: 'video' }],
      });
      expect(result.success).toBe(false);
    });

    it('accepts attachment with valid type values', () => {
      const types = ['image', 'document', 'link'] as const;
      for (const type of types) {
        const result = SendMessageSchema.safeParse({
          attachments: [{ url: 'https://example.com/file.jpg', type }],
        });
        expect(result.success).toBe(true);
      }
    });

    it('rejects negative size in attachment', () => {
      const result = SendMessageSchema.safeParse({
        attachments: [{ url: 'https://example.com/img.jpg', size: -1 }],
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('CreateConversationSchema', () => {
  const validInput = {
    participantId: 'user_abc123',
    jobId: 'job_xyz456',
    initialMessage: 'Hi, I am interested in this job.',
  };

  it('accepts valid input', () => {
    const result = CreateConversationSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  describe('participantId', () => {
    it('rejects empty participantId', () => {
      const result = CreateConversationSchema.safeParse({ ...validInput, participantId: '' });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].path).toContain('participantId');
    });

    it('rejects missing participantId', () => {
      const { participantId: _omit, ...rest } = validInput;
      const result = CreateConversationSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });
  });

  describe('jobId', () => {
    it('rejects empty jobId', () => {
      const result = CreateConversationSchema.safeParse({ ...validInput, jobId: '' });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].path).toContain('jobId');
    });

    it('rejects missing jobId', () => {
      const { jobId: _omit, ...rest } = validInput;
      const result = CreateConversationSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });
  });

  describe('initialMessage', () => {
    it('rejects empty initialMessage', () => {
      const result = CreateConversationSchema.safeParse({ ...validInput, initialMessage: '' });
      expect(result.success).toBe(false);
    });

    it('rejects initialMessage exceeding 1000 characters', () => {
      const result = CreateConversationSchema.safeParse({
        ...validInput,
        initialMessage: 'm'.repeat(1001),
      });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].path).toContain('initialMessage');
    });

    it('accepts initialMessage at exactly 1000 characters', () => {
      const result = CreateConversationSchema.safeParse({
        ...validInput,
        initialMessage: 'm'.repeat(1000),
      });
      expect(result.success).toBe(true);
    });

    it('rejects missing initialMessage', () => {
      const { initialMessage: _omit, ...rest } = validInput;
      const result = CreateConversationSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });
  });

  it('rejects empty object', () => {
    const result = CreateConversationSchema.safeParse({});
    expect(result.success).toBe(false);
    expect(result.error?.issues.length).toBeGreaterThanOrEqual(3);
  });
});
