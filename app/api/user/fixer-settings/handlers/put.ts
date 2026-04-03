import {
  badRequest,
  forbidden,
  notFound,
  parseBody,
  requireSession,
  respond,
  serverError,
  tooManyRequests,
} from '@/lib/api';
import { logger } from '@/lib/logger';
import connectDB from '@/lib/mongodb';
import { csrfGuard } from '@/lib/security/csrf';
import User from '@/models/User';
import { rateLimit } from '@/utils/rateLimiting';

import { FixerSettingsBodySchema, type FixerSettingsBody } from './put.types';
import { validateFixerSettings } from './put.validators';
import { parseError, toTrimmedString, type UserDocument } from './shared';

export async function PUT(request: Request): Promise<Response> {
  try {
    const rateLimitResult = await rateLimit(request, 'fixer_settings', 20, 60 * 1000);
    if (!rateLimitResult.success) {
      return tooManyRequests('Too many requests. Please try again later.');
    }

    const auth = await requireSession();
    if ('error' in auth) {
      return auth.error;
    }
    const userId = toTrimmedString(auth.session.user.id);

    if (!userId) {
      return badRequest('Invalid user context');
    }
    const csrfResult = csrfGuard(request, auth.session);
    if (csrfResult) return csrfResult;

    await connectDB();

    const user = (await User.findById(userId)) as UserDocument | null;
    if (!user) {
      return notFound('User');
    }

    if (user.role !== 'fixer') {
      return forbidden('Only fixers can update fixer settings');
    }

    const parsed = await parseBody(request, FixerSettingsBodySchema);
    if ('error' in parsed) return parsed.error;
    const parsedBody = parsed.data as FixerSettingsBody;

    const validated = await validateFixerSettings(parsedBody, userId);

    if (validated.errors.length > 0) {
      return respond({ message: 'Validation errors', errors: validated.errors }, 400);
    }

    const {
      availableNow,
      serviceRadiusNumber,
      hourlyRateNumber,
      minimumJobValueNumber,
      maximumJobValueNumber,
      responseTime,
      workingHours,
      workingDays,
      skills,
      portfolio,
      autoApply,
      emergencyAvailable,
    } = validated;

    let hasUpdate = false;

    if (availableNow !== null && availableNow !== undefined) {
      user.availableNow = availableNow;
      hasUpdate = true;
    }

    if (serviceRadiusNumber !== undefined && serviceRadiusNumber !== null) {
      user.serviceRadius = serviceRadiusNumber;
      hasUpdate = true;
    }

    if (hourlyRateNumber !== undefined) {
      user.hourlyRate = hourlyRateNumber;
      hasUpdate = true;
    }

    if (minimumJobValueNumber !== undefined) {
      user.minimumJobValue = minimumJobValueNumber;
      hasUpdate = true;
    }

    if (maximumJobValueNumber !== undefined) {
      user.maximumJobValue = maximumJobValueNumber;
      hasUpdate = true;
    }

    if (responseTime) {
      user.responseTime = responseTime;
      hasUpdate = true;
    }

    if (workingHours) {
      user.workingHours = workingHours;
      hasUpdate = true;
    }

    if (workingDays) {
      user.workingDays = workingDays;
      hasUpdate = true;
    }

    if (skills) {
      user.skills = skills;
      hasUpdate = true;
    }

    if (portfolio !== undefined) {
      user.portfolio = portfolio;
      hasUpdate = true;
    }

    if (autoApply !== null && autoApply !== undefined) {
      user.autoApply = autoApply;
      hasUpdate = true;
    }

    if (emergencyAvailable !== null && emergencyAvailable !== undefined) {
      user.emergencyAvailable = emergencyAvailable;
      hasUpdate = true;
    }

    if (!hasUpdate) {
      return badRequest('No valid updates provided');
    }

    await user.save();

    try {
      await user.addNotification?.(
        'settings_updated',
        'Fixer Settings Updated',
        'Your fixer settings have been successfully updated.'
      );
    } catch (notificationError: unknown) {
      logger.warn('Fixer settings notification failed:', notificationError);
    }

    return respond({
      success: true,
      message: 'Fixer settings updated successfully',
      user: {
        id: user._id,
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
    logger.error('Fixer settings update error:', err);

    if (err.name === 'ValidationError') {
      return respond({ message: 'Validation error', errors: [err.message] }, 400);
    }

    return serverError('Failed to update fixer settings');
  }
}
