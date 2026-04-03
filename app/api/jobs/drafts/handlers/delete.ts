import { badRequest, requireSession, respond, tooManyRequests, unauthorized } from '@/lib/api';
import cloudinary from '@/lib/cloudinary';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import connectDB from '@/lib/mongodb';
import { csrfGuard } from '@/lib/security/csrf';
import JobDraft from '@/models/JobDraft';
import { rateLimit } from '@/utils/rateLimiting';

import { isValidObjectId } from './drafts.helpers';
import type { DraftAttachmentInput, DraftSummarySource } from './drafts.types';

export async function DELETE(request: Request): Promise<Response> {
  try {
    const rateLimitResult = await rateLimit(request, 'delete_draft', 30, 60 * 60 * 1000);
    if (!rateLimitResult.success) {
      return tooManyRequests('Too many requests. Please try again later.');
    }

    const auth = await requireSession();
    if ('error' in auth) return auth.error;
    const userId = typeof auth.session.user.id === 'string' ? auth.session.user.id : '';
    if (!userId) return unauthorized();

    const csrfResult = csrfGuard(request, auth.session);
    if (csrfResult) return csrfResult;

    const draftId = new URL(request.url).searchParams.get('draftId') ?? '';
    if (!draftId) return badRequest('Draft ID is required');
    if (!isValidObjectId(draftId)) return badRequest('Invalid draft ID');

    await connectDB();

    const draft = (await JobDraft.findOne({
      _id: draftId,
      createdBy: userId,
    })) as DraftSummarySource | null;

    if (!draft) {
      return respond({ success: false, message: 'Draft not found or access denied' }, 404);
    }

    const attachments: DraftAttachmentInput[] = Array.isArray(draft.attachments)
      ? draft.attachments
      : [];

    for (const attachment of attachments) {
      const publicId = typeof attachment?.publicId === 'string' ? attachment.publicId : '';
      if (!publicId) continue;
      try {
        await cloudinary.uploader.destroy(publicId, { resource_type: 'auto' });
      } catch (cloudinaryError) {
        logger.error(`Failed to delete media from Cloudinary: ${publicId}`, cloudinaryError);
      }
    }

    await JobDraft.findByIdAndDelete(draftId);

    return respond({ success: true, message: 'Draft deleted successfully' }, 204);
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('Error deleting draft:', err);
    return respond(
      {
        success: false,
        message: 'Failed to delete draft',
        error: env.NODE_ENV === 'development' ? err.message : undefined,
      },
      500
    );
  }
}
