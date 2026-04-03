// Phase 2: Simplified validation body parsing and preserved authenticated content moderation checks.
import { z } from 'zod';

import { badRequest, parseBody, requireSession, respond, unauthorized } from '@/lib/api';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import { redisRateLimit } from '@/lib/redis';
import { csrfGuard } from '@/lib/security/csrf';

export const dynamic = 'force-dynamic';

type ValidateContentBody = {
  content?: unknown;
  context?: unknown;
};

type ContentValidationResult = {
  isValid?: boolean;
  violations?: unknown[];
  suggestions?: unknown[];
  confidence?: number;
};

const MAX_CONTENT_LENGTH = 5000;
const VALID_CONTEXTS = new Set([
  'general',
  'comment',
  'job_description',
  'job_application',
  'job_posting',
  'job_draft',
  'review',
  'dispute',
  'portfolio',
  'job_media',
  'notification',
  'profile',
  'private_message',
]);

const ValidateContentSchema = z.object({
  content: z.unknown().optional(),
  context: z.unknown().optional(),
});

function toTrimmedString(value: unknown): string | null {
  return typeof value === 'string' ? value.trim() : null;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object') return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  return request.headers.get('x-real-ip')?.trim() || 'unknown';
}

function normalizeContext(value: unknown): string {
  const normalized = toTrimmedString(value)?.toLowerCase() || 'general';
  return VALID_CONTEXTS.has(normalized) ? normalized : 'general';
}

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const rateLimitResult = await redisRateLimit(`content_validation:${ip}`, 100, 60);
    if (!rateLimitResult.success) {
      const retryAfter = Math.max(
        1,
        Math.ceil(((rateLimitResult.retryAfter ?? 0) || Math.max(0, rateLimitResult.resetTime - Date.now()) / 1000) || 60)
      );
      return respond(
        {
          isValid: false,
          message: 'Too many validation requests. Please try again later.',
        },
        429,
        { headers: { 'Retry-After': String(retryAfter) } }
      );
    }

    const auth = await requireSession();
    if ('error' in auth) return auth.error;
    const sessionUserId = toTrimmedString(auth.session.user.id);
    if (!sessionUserId) return unauthorized();

    const csrfResult = csrfGuard(request, auth.session);
    if (csrfResult) return csrfResult;

    const parsed = await parseBody(request, ValidateContentSchema);
    if ('error' in parsed) return parsed.error;
    const parsedBody = parsed.data as ValidateContentBody;
    if (!isPlainObject(parsedBody)) {
      return badRequest('Invalid request body');
    }

    const content = toTrimmedString(parsedBody.content);
    if (!content) {
      return badRequest('Content is required and must be a non-empty string');
    }

    if (content.length > MAX_CONTENT_LENGTH) {
      return respond(
        {
          isValid: false,
          message: `Content must be ${MAX_CONTENT_LENGTH} characters or fewer`,
        },
        400
      );
    }

    const context = normalizeContext(parsedBody.context);
    const { ContentValidator } = await import('@/lib/validations/content');
    const validator = ContentValidator as {
      validateContent: (
        content: string,
        context?: string,
        userId?: string
      ) => Promise<ContentValidationResult>;
    };
    const validationResult = await validator.validateContent(content, context, sessionUserId);

    return respond({
      isValid: Boolean(validationResult.isValid),
      violations: validationResult.violations || [],
      suggestions: validationResult.suggestions || [],
      confidence: validationResult.confidence || 0.8,
      message: validationResult.isValid
        ? 'Content is appropriate'
        : 'Content contains inappropriate elements',
    });
  } catch (error: unknown) {
    logger.error('Content validation error:', error);
    return respond(
      {
        isValid: false,
        message: 'Validation failed. Please try again.',
        error: env.NODE_ENV === 'development' ? (error as Error).message : undefined,
      },
      500
    );
  }
}
