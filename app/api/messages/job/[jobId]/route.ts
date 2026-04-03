import { NextRequest } from 'next/server';

import { apiForbidden, apiNotFound, apiSuccess, apiValidationError, requireSession } from '@/lib/api';
import { handleRouteError } from '@/lib/api/errors';
import { logger } from '@/lib/logger';
import { MessageService } from '@/lib/services/messageService';

export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{
    jobId: string;
  }>;
};

function toTrimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function parsePositiveInt(value: string | null, fallback: number, max: number): number {
  const parsed = Number.parseInt(value || '', 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
}

function isAccessDeniedError(error: unknown): boolean {
  return error instanceof Error && /access denied|unauthorized|not available/i.test(error.message);
}

function isNotFoundError(error: unknown): boolean {
  return error instanceof Error && /not found/i.test(error.message);
}

function normalizeMessage(message: Record<string, unknown>) {
  return {
    _id: toTrimmedString(message._id),
    sender: message.sender,
    content: toTrimmedString(message.content),
    messageType: toTrimmedString(message.messageType) || 'text',
    timestamp: message.timestamp,
    readBy: message.readBy,
    reactions: Array.isArray(message.reactions) ? message.reactions : [],
    attachments: Array.isArray(message.attachments) ? message.attachments : [],
    replyTo: message.replyTo ?? null,
    edited: message.edited === true,
    deleted: message.deleted === true,
  };
}

export async function GET(request: NextRequest, props: RouteContext) {
  const params = await props.params;
  try {
    const auth = await requireSession();
    if ('error' in auth) return auth.error;
    const userId = toTrimmedString(auth.session.user.id);

    const jobId = toTrimmedString(params.jobId);
    if (!jobId) {
      return apiValidationError('Job ID is required');
    }

    const { searchParams } = new URL(request.url);
    const page = parsePositiveInt(searchParams.get('page'), 1, 1000);
    const limit = parsePositiveInt(searchParams.get('limit'), 50, 100);

    let conversation;
    try {
      conversation = await MessageService.getJobConversation(jobId, userId, true);
    } catch (error: unknown) {
      if (isAccessDeniedError(error)) {
        return apiForbidden('Access denied');
      }
      if (isNotFoundError(error)) {
        return apiNotFound('Conversation');
      }
      throw error;
    }

    const allMessages = Array.isArray(conversation.messages)
      ? (conversation.messages as Array<Record<string, unknown>>)
      : [];
    const total = allMessages.length;
    const startIndex = Math.max(0, total - page * limit);
    const endIndex = total - (page - 1) * limit;
    const items = allMessages.slice(startIndex, endIndex).map(normalizeMessage);

    return apiSuccess({
      items,
      total,
      page,
      limit,
      hasMore: total > page * limit,
      conversation: {
        _id: toTrimmedString(conversation._id),
        participants: Array.isArray(conversation.participants) ? conversation.participants : [],
        relatedJob: conversation.relatedJob ?? null,
        title: toTrimmedString(conversation.title),
        conversationType: toTrimmedString(conversation.conversationType) || 'job',
      },
    });
  } catch (error: unknown) {
    logger.error({ error }, 'Get job conversation route error');
    return handleRouteError(error);
  }
}
