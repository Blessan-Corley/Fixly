import { badRequest, notFound, requireSession, respond, unauthorized } from '@/lib/api';
import cloudinary from '@/lib/cloudinary';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import connectDB from '@/lib/mongodb';
import { redisRateLimit } from '@/lib/redis';
import { csrfGuard } from '@/lib/security/csrf';
import User from '@/models/User';

import {
  ALLOWED_FILE_TYPES,
  MAX_FILE_SIZE_BYTES,
  PHOTO_COOLDOWN_DAYS,
  PHOTO_COOLDOWN_SECONDS,
  getNextUpdateDate,
  hasCloudinaryConfig,
  isFile,
  isValidImageBuffer,
  toDaysRemaining,
  uploadProfilePhoto,
  type UserDocument,
} from './helpers';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const auth = await requireSession();
    if ('error' in auth) return auth.error;
    const userId = auth.session.user.id;
    if (!userId) return unauthorized();
    const csrfResult = csrfGuard(request, auth.session);
    if (csrfResult) return csrfResult;

    if (!hasCloudinaryConfig()) {
      return respond({ message: 'Image upload service is not configured' }, 503);
    }

    const rateLimitResult = await redisRateLimit(`profile_photo:${userId}`, 1, PHOTO_COOLDOWN_SECONDS);
    if (!rateLimitResult.success) {
      const resetTime = new Date(rateLimitResult.resetTime || Date.now() + PHOTO_COOLDOWN_SECONDS * 1000);
      return respond(
        {
          message: 'You can only update your profile photo once every 7 days.',
          resetTime: resetTime.toISOString(),
          daysRemaining: toDaysRemaining(resetTime.getTime()),
        },
        429
      );
    }

    const formData = await request.formData();
    const fileEntry = formData.get('file');
    if (!isFile(fileEntry)) return badRequest('No file provided');
    if (!ALLOWED_FILE_TYPES.has(fileEntry.type)) return respond({ message: 'Only JPEG, PNG, and WebP images are allowed' }, 400);
    if (fileEntry.size > MAX_FILE_SIZE_BYTES) return badRequest('File size must be less than 5MB');

    await connectDB();

    const user = (await User.findById(userId)) as UserDocument | null;
    if (!user) return notFound('User');

    const lastPhotoUpdate = user.profilePhoto?.lastUpdated;
    if (lastPhotoUpdate) {
      const daysSinceLastUpdate = Math.floor((Date.now() - new Date(lastPhotoUpdate).getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceLastUpdate < PHOTO_COOLDOWN_DAYS) {
        return respond(
          {
            message: `You can only update your profile photo once every 7 days. Please wait ${PHOTO_COOLDOWN_DAYS - daysSinceLastUpdate} more days.`,
            nextUpdateDate: getNextUpdateDate(new Date(lastPhotoUpdate)),
            daysRemaining: PHOTO_COOLDOWN_DAYS - daysSinceLastUpdate,
          },
          429
        );
      }
    }

    const buffer = Buffer.from(await fileEntry.arrayBuffer());
    // Validate actual file content via magic bytes — MIME type is client-controlled.
    if (!isValidImageBuffer(buffer)) return badRequest('File content does not match an allowed image format');

    if (user.profilePhoto?.cloudinaryPublicId) {
      try {
        await cloudinary.uploader.destroy(user.profilePhoto.cloudinaryPublicId);
      } catch (destroyError: unknown) {
        logger.warn('Failed to delete previous Cloudinary profile photo:', destroyError as Error);
      }
    }

    const uploadResult = await uploadProfilePhoto(buffer, String(user._id));

    user.profilePhoto = {
      url: uploadResult.secure_url,
      cloudinaryPublicId: uploadResult.public_id,
      lastUpdated: new Date(),
      originalName: fileEntry.name,
      fileSize: fileEntry.size,
      dimensions: { width: uploadResult.width, height: uploadResult.height },
    };

    await user.save();

    try {
      await user.addNotification('profile_updated', 'Profile Photo Updated', 'Your profile photo has been updated successfully.');
    } catch (notificationError: unknown) {
      logger.warn('Profile photo notification failed:', notificationError as Error);
    }

    return respond({
      success: true,
      message: 'Profile photo updated successfully',
      profilePhoto: {
        url: uploadResult.secure_url,
        lastUpdated: user.profilePhoto.lastUpdated,
        nextUpdateDate: getNextUpdateDate(new Date()),
      },
    });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    logger.error('Profile photo update error:', err);
    return respond(
      { message: 'Failed to update profile photo', error: env.NODE_ENV === 'development' ? err.message : undefined },
      500
    );
  }
}
