import { badRequest, forbidden, notFound, requireSession, respond, serverError } from '@/lib/api';
import { logger } from '@/lib/logger';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

import { parseError, toTrimmedString, type UserDocument } from './shared';

export async function GET(): Promise<Response> {
  try {
    const auth = await requireSession();
    if ('error' in auth) {
      return auth.error;
    }
    const userId = toTrimmedString(auth.session.user.id);

    if (!userId) {
      return badRequest('Invalid user context');
    }

    await connectDB();

    const user = (await User.findById(userId)) as UserDocument | null;
    if (!user) {
      return notFound('User');
    }

    if (user.role !== 'fixer') {
      return forbidden('Only fixers can access fixer settings');
    }

    return respond({
      success: true,
      settings: {
        availableNow: user.availableNow,
        serviceRadius: user.serviceRadius,
        hourlyRate: user.hourlyRate,
        minimumJobValue: user.minimumJobValue,
        maximumJobValue: user.maximumJobValue,
        responseTime: user.responseTime,
        workingHours: user.workingHours,
        workingDays: user.workingDays,
        skills: user.skills,
        portfolio: user.portfolio,
        autoApply: user.autoApply,
        emergencyAvailable: user.emergencyAvailable,
      },
    });
  } catch (error: unknown) {
    const err = parseError(error);
    logger.error('Get fixer settings error:', err);

    return serverError('Failed to get fixer settings');
  }
}
