import { respond, serverError, tooManyRequests } from '@/lib/api';
import { createRequestLogger } from '@/lib/logger';
import { rateLimit } from '@/utils/rateLimiting';

type AnalyticsPayload = Record<string, unknown> | unknown[];

function isLikelyJson(contentType: string | null): boolean {
  if (!contentType) return true;
  return contentType.toLowerCase().includes('application/json');
}

function summarizePayload(payload: AnalyticsPayload): Record<string, unknown> {
  if (Array.isArray(payload)) {
    return {
      type: 'array',
      length: payload.length,
    };
  }

  const event = typeof payload.event === 'string' ? payload.event : null;
  const source = typeof payload.source === 'string' ? payload.source : null;
  const keys = Object.keys(payload).slice(0, 20);

  return {
    type: 'object',
    event,
    source,
    keys,
  };
}

export async function POST(request: Request) {
  const requestId =
    request.headers.get('x-request-id') ??
    `analytics_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const requestLogger = createRequestLogger(requestId, undefined, '/api/analytics/track');

  try {
    const rateLimitResult = await rateLimit(request, 'analytics_track', 300, 60 * 1000);
    if (!rateLimitResult.success) {
      return tooManyRequests('Too many tracking requests');
    }

    const contentLength = request.headers.get('content-length');
    if (contentLength === '0') {
      return respond({
        success: true,
        message: 'Empty request ignored',
      });
    }

    const contentType = request.headers.get('content-type');
    if (!isLikelyJson(contentType)) {
      return respond({
        success: true,
        message: 'Unsupported content-type ignored',
      });
    }

    const rawBody = await request.text();
    if (!rawBody || rawBody.trim().length === 0) {
      return respond({
        success: true,
        message: 'Empty content ignored',
      });
    }

    let parsedPayload: unknown;
    try {
      parsedPayload = JSON.parse(rawBody) as unknown;
    } catch {
      return respond({
        success: true,
        message: 'Invalid JSON ignored',
      });
    }

    if (!parsedPayload || typeof parsedPayload !== 'object') {
      return respond({
        success: true,
        message: 'Invalid payload ignored',
      });
    }

    const payload = parsedPayload as AnalyticsPayload;
    const summary = summarizePayload(payload);

    // Placeholder sink; this endpoint intentionally keeps ingestion non-blocking.
    requestLogger.info({ summary }, 'Analytics event tracked');

    return respond({
      success: true,
      message: 'Event tracked successfully',
    });
  } catch (error: unknown) {
    requestLogger.error({ error }, 'Analytics tracking error');
    return serverError('Failed to track event');
  }
}

export async function GET() {
  return respond({
    status: 'Analytics service is running',
    timestamp: new Date().toISOString(),
  });
}
