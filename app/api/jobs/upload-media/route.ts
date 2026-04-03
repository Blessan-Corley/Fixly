// Phase 2: Updated job media mutations to validate CSRF against the authenticated session.
import { Readable } from 'node:stream';
import type { ReadableStream as NodeReadableStream } from 'node:stream/web';

import type { UploadApiOptions, UploadApiResponse } from 'cloudinary';
import { NextRequest } from 'next/server';
import { z } from 'zod';

import { requireSession } from '@/lib/api/auth';
import { parseQuery } from '@/lib/api/parse';
import {
  badRequest,
  forbidden,
  respond,
  unauthorized,
} from '@/lib/api/response';
import cloudinary from '@/lib/cloudinary';
import { env } from '@/lib/env';
import { FileValidator } from '@/lib/fileValidation';
import { logger } from '@/lib/logger';
import { redisRateLimit } from '@/lib/redis';
import { csrfGuard } from '@/lib/security/csrf';

export const dynamic = 'force-dynamic';

type UploadMediaResponse = {
  id: string;
  url: string;
  publicId: string;
  filename: string;
  size: number;
  type: string;
  isImage: boolean;
  isVideo: boolean;
  width?: number;
  height?: number;
  duration?: number | null;
  createdAt: string;
};

const deleteMediaQuerySchema = z.object({
  publicId: z.string().min(1),
});

function toSafeInt(value: FormDataEntryValue | null, fallback = 0): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.floor(parsed));
}

function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown';
  return request.headers.get('x-real-ip') || 'unknown';
}

function isCloudinaryIdOwnedByUser(publicId: string, userId: string): boolean {
  return publicId.includes(`/jobs/${userId}/`) || publicId.includes(`${userId}_`);
}

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const rateLimitResult = await redisRateLimit(`job_media_upload:${ip}`, 20, 3600);
    if (!rateLimitResult.success) {
      return respond(
        {
          success: false,
          message: 'Too many upload requests. Please try again later.',
          resetTime: new Date(rateLimitResult.resetTime).toISOString(),
        },
        429
      );
    }

    const auth = await requireSession();
    if ('error' in auth) return auth.error;
    const { session } = auth;
    const userId = session.user.id;
    if (!userId) return unauthorized();
    const csrfResult = csrfGuard(request, session);
    if (csrfResult) return csrfResult;

    const formData = await request.formData();
    const fileEntry = formData.get('file');
    const existingPhotos = toSafeInt(formData.get('existingPhotos'));
    const existingVideos = toSafeInt(formData.get('existingVideos'));

    if (!(fileEntry instanceof File)) {
      return badRequest('No file provided');
    }

    const file = fileEntry;
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    if (!isImage && !isVideo) {
      return badRequest('Only images and videos are allowed');
    }

    if (isImage && existingPhotos >= 5) {
      return badRequest('Maximum 5 photos allowed');
    }

    if (isVideo && existingVideos >= 1) {
      return badRequest('Maximum 1 video allowed');
    }

    const fileValidation = await FileValidator.validateFile(file, {
      maxImageSize: isImage ? 5 * 1024 * 1024 : undefined,
      maxVideoSize: isVideo ? 50 * 1024 * 1024 : undefined,
    });

    if (!fileValidation.isValid) {
      return respond(
        {
          success: false,
          message: fileValidation.errors?.[0] || 'File validation failed',
          errors: fileValidation.errors,
          securityIssues: fileValidation.securityIssues,
        },
        400
      );
    }

    const { ContentValidator } = await import('@/lib/validations/content');
    const contentValidation = await ContentValidator.validateContent(
      file.name,
      'job_media',
      userId
    );

    if (!contentValidation.isValid) {
      const violations = (contentValidation.violations || []).map((entry) => entry.type).join(', ');
      return respond(
        {
          success: false,
          message: `File name contains inappropriate content: ${violations}`,
          suggestions: contentValidation.suggestions,
        },
        400
      );
    }

    const uploadOptions: UploadApiOptions = {
      resource_type: isVideo ? 'video' : 'image',
      folder: `fixly/jobs/${userId}`,
      public_id: `${userId}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      tags: ['job_media', isVideo ? 'video' : 'photo'],
    };

    if (isImage) {
      uploadOptions.transformation = [
        { width: 1200, height: 1200, crop: 'limit' },
        { quality: 'auto:good' },
        { format: 'auto' },
      ];
    } else {
      uploadOptions.transformation = [
        { width: 1280, height: 720, crop: 'limit' },
        { quality: 'auto' },
        { format: 'mp4' },
      ];
    }

    const uploadResult = await new Promise<UploadApiResponse>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
        if (error) {
          reject(error);
          return;
        }
        if (!result) {
          reject(new Error('Cloudinary upload returned no result'));
          return;
        }
        resolve(result);
      });

      const readable = Readable.fromWeb(
        file.stream() as unknown as NodeReadableStream<Uint8Array>
      );
      readable.on('error', reject);
      uploadStream.on('error', reject);
      readable.pipe(uploadStream);
    });

    const mediaPayload: UploadMediaResponse = {
      id: uploadResult.public_id,
      url: uploadResult.secure_url,
      publicId: uploadResult.public_id,
      filename: file.name,
      size: file.size,
      type: file.type,
      isImage,
      isVideo,
      width: uploadResult.width,
      height: uploadResult.height,
      duration: uploadResult.duration || null,
      createdAt: new Date().toISOString(),
    };

    return respond({
      success: true,
      media: mediaPayload,
    });
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('Job media upload error:', err);
    return respond(
      {
        success: false,
        message: 'Upload failed. Please try again.',
        error: env.NODE_ENV === 'development' ? err.message : undefined,
      },
      500
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await requireSession();
    if ('error' in auth) return auth.error;
    const { session } = auth;
    const userId = session.user.id;
    if (!userId) return unauthorized();
    const csrfResult = csrfGuard(request, session);
    if (csrfResult) return csrfResult;

    const parsedQuery = parseQuery(
      new NextRequest(request.url, { method: request.method, headers: request.headers }),
      deleteMediaQuerySchema
    );
    if ('error' in parsedQuery) return parsedQuery.error;
    const { publicId } = parsedQuery.data;

    if (!isCloudinaryIdOwnedByUser(publicId, userId)) {
      return forbidden('Unauthorized access');
    }

    const deleteResult = await cloudinary.uploader.destroy(publicId, {
      resource_type: 'auto',
    });

    return respond({
      success: true,
      message: 'Media deleted successfully',
      result: deleteResult,
    });
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('Job media delete error:', err);
    return respond(
      {
        success: false,
        message: 'Delete failed. Please try again.',
        error: env.NODE_ENV === 'development' ? err.message : undefined,
      },
      500
    );
  }
}
