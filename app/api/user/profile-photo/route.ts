import type { UploadApiErrorResponse, UploadApiResponse } from 'cloudinary';
import { Types } from 'mongoose';

import { badRequest, notFound, requireSession, respond, unauthorized } from '@/lib/api';
import cloudinary from '@/lib/cloudinary';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import connectDB from '@/lib/mongodb';
import { redisRateLimit } from '@/lib/redis';
import { csrfGuard } from '@/lib/security/csrf';
import User from '@/models/User';
import type { IUser } from '@/types/User';

export const dynamic = 'force-dynamic';

type UserDocument = IUser & {
  _id: Types.ObjectId;
  addNotification: (type: string, title: string, message: string, data?: unknown) => Promise<IUser>;
  save: () => Promise<unknown>;
};

const ALLOWED_FILE_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const PHOTO_COOLDOWN_DAYS = 7;
const PHOTO_COOLDOWN_SECONDS = PHOTO_COOLDOWN_DAYS * 24 * 3600;

function isFile(value: FormDataEntryValue | null): value is File {
  return typeof File !== 'undefined' && value instanceof File;
}

function hasCloudinaryConfig(): boolean {
  return Boolean(env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET);
}

function toDaysRemaining(resetAtMs: number): number {
  return Math.ceil((resetAtMs - Date.now()) / (24 * 60 * 60 * 1000));
}

function getNextUpdateDate(fromDate: Date): string {
  const next = new Date(fromDate.getTime() + PHOTO_COOLDOWN_DAYS * 24 * 60 * 60 * 1000);
  return next.toISOString();
}

async function uploadProfilePhoto(buffer: Buffer, userId: string): Promise<UploadApiResponse> {
  return new Promise<UploadApiResponse>((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          resource_type: 'image',
          folder: `fixly/profiles/${userId}`,
          public_id: `profile_${userId}_${Date.now()}`,
          transformation: [
            { width: 400, height: 400, crop: 'fill', gravity: 'face' },
            { quality: 'auto:good' },
            { format: 'auto' },
          ],
          overwrite: true,
          tags: ['profile', 'user_upload'],
        },
        (error?: UploadApiErrorResponse, result?: UploadApiResponse) => {
          if (error || !result) {
            reject(error || new Error('Upload failed'));
            return;
          }
          resolve(result);
        }
      )
      .end(buffer);
  });
}

export async function POST(request: Request) {
  try {
    const auth = await requireSession();
    if ('error' in auth) {
      return auth.error;
    }
    const userId = auth.session.user.id;
    if (!userId) {
      return unauthorized();
    }
    const csrfResult = csrfGuard(request, auth.session);
    if (csrfResult) return csrfResult;

    if (!hasCloudinaryConfig()) {
      return respond(
        { message: 'Image upload service is not configured' },
        503
      );
    }

    const rateLimitResult = await redisRateLimit(
      `profile_photo:${userId}`,
      1,
      PHOTO_COOLDOWN_SECONDS
    );
    if (!rateLimitResult.success) {
      const resetTime = new Date(
        rateLimitResult.resetTime || Date.now() + PHOTO_COOLDOWN_SECONDS * 1000
      );
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

    if (!isFile(fileEntry)) {
      return badRequest('No file provided');
    }

    if (!ALLOWED_FILE_TYPES.has(fileEntry.type)) {
      return respond(
        { message: 'Only JPEG, PNG, and WebP images are allowed' },
        400
      );
    }

    if (fileEntry.size > MAX_FILE_SIZE_BYTES) {
      return badRequest('File size must be less than 5MB');
    }

    await connectDB();

    const user = (await User.findById(userId)) as UserDocument | null;
    if (!user) {
      return notFound('User');
    }

    const lastPhotoUpdate = user.profilePhoto?.lastUpdated;
    if (lastPhotoUpdate) {
      const daysSinceLastUpdate = Math.floor(
        (Date.now() - new Date(lastPhotoUpdate).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceLastUpdate < PHOTO_COOLDOWN_DAYS) {
        const nextUpdateDate = getNextUpdateDate(new Date(lastPhotoUpdate));
        return respond(
          {
            message: `You can only update your profile photo once every 7 days. Please wait ${PHOTO_COOLDOWN_DAYS - daysSinceLastUpdate} more days.`,
            nextUpdateDate,
            daysRemaining: PHOTO_COOLDOWN_DAYS - daysSinceLastUpdate,
          },
          429
        );
      }
    }

    const bytes = await fileEntry.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Validate actual file content via magic bytes — MIME type is client-controlled.
    const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    const isPng =
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a;
    const isWebp =
      buffer[0] === 0x52 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x46 &&
      buffer[8] === 0x57 &&
      buffer[9] === 0x45 &&
      buffer[10] === 0x42 &&
      buffer[11] === 0x50;

    if (!isJpeg && !isPng && !isWebp) {
      return badRequest('File content does not match an allowed image format');
    }

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
      dimensions: {
        width: uploadResult.width,
        height: uploadResult.height,
      },
    };

    await user.save();

    try {
      await user.addNotification(
        'profile_updated',
        'Profile Photo Updated',
        'Your profile photo has been updated successfully.'
      );
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
      {
        message: 'Failed to update profile photo',
        error: env.NODE_ENV === 'development' ? err.message : undefined,
      },
      500
    );
  }
}
