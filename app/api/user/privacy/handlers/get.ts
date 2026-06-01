import {
  notFound,
  ok,
  requireSession,
  serverError,
  unauthorized,
} from '@/lib/api';
import { logger } from '@/lib/logger';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

export async function GET(): Promise<Response> {
  try {
    const auth = await requireSession();
    if ('error' in auth) return auth.error;

    const userId = auth.session.user.id;
    if (!userId) return unauthorized();

    await connectDB();

    const user = await User.findById(userId);
    if (!user) return notFound('User');

    const privacySettings = {
      profileVisibility: user.privacy?.profileVisibility || 'public',
      showPhone: user.privacy?.showPhone ?? true,
      showEmail: user.privacy?.showEmail ?? false,
      showLocation: user.privacy?.showLocation ?? true,
      showRating: user.privacy?.showRating ?? true,
      allowReviews: user.privacy?.allowReviews ?? true,
      allowMessages: user.privacy?.allowMessages ?? true,
      dataSharingConsent: user.privacy?.dataSharingConsent ?? false,
    };

    return ok({ privacy: privacySettings });
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('Get privacy settings error:', err);
    return serverError('Failed to get privacy settings');
  }
}
