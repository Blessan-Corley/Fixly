import { requireSession, respond, unauthorized } from '@/lib/api';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import connectDB from '@/lib/mongodb';
import JobDraft from '@/models/JobDraft';

import { toDraftSummary } from './drafts.helpers';
import type { DraftSummarySource } from './drafts.types';

export async function GET(request: Request): Promise<Response> {
  try {
    const auth = await requireSession();
    if ('error' in auth) return auth.error;
    const userId = typeof auth.session.user.id === 'string' ? auth.session.user.id : '';
    if (!userId) return unauthorized();

    const searchParams = new URL(request.url).searchParams;
    const rawLimit = Number(searchParams.get('limit') ?? 10);
    const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(50, Math.floor(rawLimit))) : 10;
    const includeConverted = searchParams.get('includeConverted') === 'true';

    await connectDB();

    const drafts = includeConverted
      ? await JobDraft.find({ createdBy: userId }).sort({ lastActivity: -1 }).limit(limit)
      : await JobDraft.findUserDrafts(userId, limit);

    return respond({
      success: true,
      drafts: drafts.map((draft) => toDraftSummary(draft as DraftSummarySource)),
    });
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('Error fetching drafts:', err);
    return respond(
      {
        success: false,
        message: 'Failed to fetch drafts',
        error: env.NODE_ENV === 'development' ? err.message : undefined,
      },
      500
    );
  }
}
