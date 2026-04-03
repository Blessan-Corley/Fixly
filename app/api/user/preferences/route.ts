import { badRequest, ok, requireSession, serverError, tooManyRequests, unauthorized } from '@/lib/api';
import { parseBody } from '@/lib/api/parse';
import { logger } from '@/lib/logger';
import connectDB from '@/lib/mongodb';
import { csrfGuard } from '@/lib/security/csrf';
import { UpdateSettingsSchema } from '@/lib/validations/user';
import User from '@/models/User';
import { rateLimit } from '@/utils/rateLimiting';

type PreferencesBody = {
  preferences?: unknown;
};

export async function PUT(request: Request) {
  try {
    const rateLimitResult = await rateLimit(request, 'user_preferences', 20, 60 * 1000);
    if (!rateLimitResult.success) {
      return tooManyRequests('Too many requests. Please try again later.');
    }

    const auth = await requireSession();
    if ('error' in auth) return auth.error;

    const userId = auth.session.user.id;
    if (!userId) return unauthorized();
    const csrfResult = csrfGuard(request, auth.session);
    if (csrfResult) return csrfResult;

    const parsedBody = await parseBody(request, UpdateSettingsSchema);
    if ('error' in parsedBody) {
      return parsedBody.error;
    }
    const parsed = parsedBody;

    if (!parsed.data.preferences) {
      return badRequest('Invalid preferences payload');
    }

    await connectDB();

    const user = await User.findByIdAndUpdate(
      userId,
      { preferences: parsed.data.preferences },
      { new: true }
    );

    return ok({
      message: 'Preferences saved successfully',
      user,
    });
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('Preferences save error:', err);
    return serverError('Failed to save preferences');
  }
}
