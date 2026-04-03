import mongoose, { Schema, type Model } from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';

import { apiError, getOptionalSession, methodNotAllowed, parseBody, respond, serverError } from '@/lib/api';
import { connectDB } from '@/lib/db';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import { sendEmail } from '@/lib/services/emailService';
import { NotificationService, NOTIFICATION_TYPES } from '@/lib/services/notifications';
import { HelpFeedbackSchema } from '@/lib/validations/help';
import User from '@/models/User';
import { rateLimit } from '@/utils/rateLimiting';

export const dynamic = 'force-dynamic';

type SessionUser = {
  id?: string;
  email?: string | null;
  name?: string | null;
};

type HelpFeedbackDocument = {
  category: string;
  message: string;
  email?: string;
  articleId?: string;
  rating?: number;
  userId?: string;
  createdAt: Date;
  ipAddress?: string;
};

const helpFeedbackSchema = new Schema<HelpFeedbackDocument>(
  {
    category: { type: String, required: true, trim: true, maxlength: 100 },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    email: { type: String, trim: true },
    articleId: { type: String, trim: true },
    rating: { type: Number, min: 1, max: 5 },
    userId: { type: String, trim: true },
    createdAt: { type: Date, default: Date.now },
    ipAddress: { type: String, trim: true },
  },
  {
    collection: 'helpFeedback',
    versionKey: false,
  }
);

const HelpFeedbackModel =
  (mongoose.models.HelpFeedback as Model<HelpFeedbackDocument> | undefined) ||
  mongoose.model<HelpFeedbackDocument>('HelpFeedback', helpFeedbackSchema, 'helpFeedback');

function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfIp = request.headers.get('cf-connecting-ip');

  if (forwarded) {
    return forwarded.split(',')[0]?.trim() || '127.0.0.1';
  }
  return realIp || cfIp || '127.0.0.1';
}

export async function GET(): Promise<NextResponse> {
  return methodNotAllowed();
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const rateLimitResult = await rateLimit(request, 'help_feedback', 3, 60 * 60 * 1000);
    if (!rateLimitResult.success) {
      return apiError(
        'RATE_LIMITED',
        rateLimitResult.message || 'Too many feedback submissions. Please try again later.',
        429
      );
    }

    const parsed = await parseBody(request, HelpFeedbackSchema);
    if ('error' in parsed) {
      return parsed.error;
    }

    const session = (await getOptionalSession()) as { user?: SessionUser } | null;
    const userId = session?.user?.id || undefined;
    const sessionEmail = session?.user?.email || undefined;
    const ipAddress = getClientIp(request);

    await connectDB();
    await HelpFeedbackModel.create({
      ...parsed.data,
      email: parsed.data.email ?? sessionEmail,
      userId,
      createdAt: new Date(),
      ipAddress,
    });

    if (sessionEmail) {
      await sendEmail(
        sessionEmail,
        'We received your Fixly feedback',
        `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Feedback received</h2>
            <p>Thanks for helping improve Fixly.</p>
            <p>Category: ${parsed.data.category}</p>
            <p>Message: ${parsed.data.message}</p>
          </div>
        `.trim()
      );
    }

    if (env.ADMIN_NOTIFICATION_EMAIL) {
      const adminUser = await User.findOne({
        email: env.ADMIN_NOTIFICATION_EMAIL,
        role: 'admin',
      })
        .select('_id')
        .lean<{ _id?: unknown } | null>();

      if (adminUser?._id) {
        await NotificationService.createNotification(
          String(adminUser._id),
          NOTIFICATION_TYPES.ACCOUNT_UPDATE,
          'New Help Feedback',
          `New help feedback received in ${parsed.data.category}.`,
          '/dashboard/admin',
          {
            category: parsed.data.category,
            articleId: parsed.data.articleId,
            rating: parsed.data.rating,
          }
        );
      }
    }

    return respond({ success: true, message: 'Feedback received' });
  } catch (error: unknown) {
    logger.error('Help feedback submission failed', error);
    return serverError('Failed to submit feedback');
  }
}
