import { z } from 'zod';

const messageAttachmentSchema = z.object({
  type: z.enum(['image', 'document', 'link']).optional(),
  url: z.string().url(),
  filename: z.string().optional(),
  size: z.number().nonnegative().optional(),
  mimeType: z.string().optional(),
});

export const SendMessageSchema = z.object({
  content: z.string().max(1000).optional(),
  messageType: z.enum(['text', 'image', 'file']).optional(),
  attachments: z.array(messageAttachmentSchema).max(5).optional(),
  replyTo: z.string().optional(),
  conversationId: z.string().optional(),
  recipientId: z.string().optional(),
  jobId: z.string().optional(),
});

export const CreateConversationSchema = z.object({
  participantId: z.string().min(1),
  jobId: z.string().min(1),
  initialMessage: z.string().min(1).max(1000),
});
