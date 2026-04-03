import mongoose, { Schema, type Model } from 'mongoose';
import type { NextResponse } from 'next/server';
import { z } from 'zod';

import { respond, serverError, tooManyRequests } from '@/lib/api';
import { parseBody } from '@/lib/api/parse';
import { connectDB } from '@/lib/db';
import { logger } from '@/lib/logger';
import { rateLimit } from '@/utils/rateLimiting';

export const dynamic = 'force-dynamic';

type AnalyticsEventDocument = {
  type: string;
  properties: Record<string, unknown>;
  timestamp: Date;
  sessionId?: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  receivedAt: Date;
};

const analyticsEventSchema = new Schema<AnalyticsEventDocument>(
  {
    type: { type: String, required: true, trim: true },
    properties: { type: Schema.Types.Mixed, default: {} },
    timestamp: { type: Date, required: true },
    sessionId: { type: String, trim: true },
    userId: { type: String, trim: true },
    ipAddress: { type: String, trim: true },
    userAgent: { type: String, trim: true },
    receivedAt: { type: Date, default: Date.now },
  },
  {
    collection: 'analyticsEvents',
    versionKey: false,
  }
);

const AnalyticsEventModel =
  (mongoose.models.AnalyticsEvent as Model<AnalyticsEventDocument> | undefined) ||
  mongoose.model<AnalyticsEventDocument>('AnalyticsEvent', analyticsEventSchema, 'analyticsEvents');

const AnalyticsBatchEventSchema = z.object({
  type: z.string().min(1).max(100),
  properties: z.record(z.string(), z.unknown()).default({}),
  timestamp: z.number().finite(),
  sessionId: z.string().optional(),
  userId: z.string().optional(),
});

const AnalyticsBatchSchema = z.object({
  events: z.array(AnalyticsBatchEventSchema).max(50),
});

function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfIp = request.headers.get('cf-connecting-ip');

  if (forwarded) {
    return forwarded.split(',')[0]?.trim() || '127.0.0.1';
  }

  return realIp || cfIp || '127.0.0.1';
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const rateLimitResult = await rateLimit(request, 'analytics_batch', 10, 60 * 1000);
    if (!rateLimitResult.success) {
      return tooManyRequests('Too many analytics requests');
    }

    const parsed = await parseBody(request, AnalyticsBatchSchema);
    if ('error' in parsed) {
      return parsed.error;
    }

    await connectDB();

    const ipAddress = getClientIp(request);
    const userAgent = request.headers.get('user-agent') || undefined;
    const receivedAt = new Date();

    const documents = parsed.data.events.map((event) => {
      logger.debug(
        {
          type: event.type,
          sessionId: event.sessionId,
          userId: event.userId,
        },
        'Analytics batch event received'
      );

      return {
        type: event.type,
        properties: event.properties,
        timestamp: new Date(event.timestamp),
        sessionId: event.sessionId,
        userId: event.userId,
        ipAddress,
        userAgent,
        receivedAt,
      };
    });

    if (documents.length > 0) {
      await AnalyticsEventModel.insertMany(documents, { ordered: false });
    }

    return respond({ processed: parsed.data.events.length });
  } catch (error: unknown) {
    logger.error('Analytics batch ingestion failed', error);
    return serverError('Failed to process analytics batch');
  }
}
