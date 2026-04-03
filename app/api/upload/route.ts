// Phase 2: Hardened the generic upload route with CSRF, per-user rate limits, and UUID filenames.
import type { UploadApiErrorResponse, UploadApiResponse } from 'cloudinary';
import { z } from 'zod';

import {
  badRequest,
  forbidden,
  requireSession,
  respond,
  tooManyRequests,
  unauthorized,
} from '@/lib/api';
import cloudinary from '@/lib/cloudinary';
import { env } from '@/lib/env';
import { sanitiseFilename } from '@/lib/files/sanitiseFilename';
import { enforceUploadRateLimit } from '@/lib/files/uploadRateLimit';
import { FileValidator } from '@/lib/fileValidation';
import { logger } from '@/lib/logger';
import { csrfGuard } from '@/lib/security/csrf';

const uploadTypeSchema = z.enum(['general', 'profile', 'job', 'work_progress']);
type SupportedUploadKind = 'image' | 'document';

type UploadedFileDescriptor = {
  kind: SupportedUploadKind;
  mimeType: string;
  sizeLimit: number;
};

const uploadFieldsSchema = z.object({
  type: uploadTypeSchema.default('general'),
  userId: z.string().min(1).optional(),
});

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
const ALLOWED_DOCUMENT_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024;

function hasCloudinaryConfig(): boolean {
  return Boolean(env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET);
}

function toTrimmedString(value: unknown): string | null {
  return typeof value === 'string' ? value.trim() : null;
}

function parseError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }

  return new Error('Unknown upload error');
}

function isFile(value: FormDataEntryValue | null): value is File {
  return typeof File !== 'undefined' && value instanceof File;
}

function resolveUploadedFileDescriptor(file: File): UploadedFileDescriptor | null {
  if (ALLOWED_IMAGE_TYPES.has(file.type)) {
    return {
      kind: 'image',
      mimeType: file.type,
      sizeLimit: MAX_IMAGE_SIZE_BYTES,
    };
  }

  if (ALLOWED_DOCUMENT_TYPES.has(file.type)) {
    return {
      kind: 'document',
      mimeType: file.type,
      sizeLimit: MAX_DOCUMENT_SIZE_BYTES,
    };
  }

  return null;
}

function toCloudinaryPublicId(userId: string, filename: string): string {
  const lastDotIndex = filename.lastIndexOf('.');
  const baseName = lastDotIndex > 0 ? filename.slice(0, lastDotIndex) : filename;
  return `${userId}/${Date.now()}-${baseName}`;
}

async function uploadFile(
  file: File,
  folder: string,
  descriptor: UploadedFileDescriptor,
  publicId: string,
  safeFilename: string
): Promise<UploadApiResponse> {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  return new Promise<UploadApiResponse>((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: descriptor.kind === 'image' ? 'image' : 'raw',
        folder,
        public_id: publicId,
        use_filename: false,
        unique_filename: false,
        filename_override: safeFilename,
        ...(descriptor.kind === 'image'
          ? {
              transformation: [
                { width: 1200, height: 1200, crop: 'limit' },
                { quality: 'auto:good' },
                { format: 'auto' },
              ],
            }
          : {}),
      },
      (error?: UploadApiErrorResponse, result?: UploadApiResponse) => {
        if (error || !result) {
          reject(error || new Error('Upload failed'));
          return;
        }
        resolve(result);
      }
    );

    uploadStream.on('error', reject);
    uploadStream.end(buffer);
  });
}

export async function POST(request: Request) {
  try {
    const auth = await requireSession();
    if ('error' in auth) return auth.error;

    const userId = toTrimmedString(auth.session.user.id);
    if (!userId) {
      return unauthorized();
    }

    const csrfResult = csrfGuard(request, auth.session);
    if (csrfResult) return csrfResult;

    const uploadRateLimit = await enforceUploadRateLimit(userId);
    if (!uploadRateLimit.allowed) {
      return tooManyRequests('Too many upload requests. Please try again later.');
    }

    if (!hasCloudinaryConfig()) {
      return respond({ success: false, message: 'File upload service is not configured' }, 503);
    }

    const formData = await request.formData();
    const parsedFields = uploadFieldsSchema.safeParse({
      type: toTrimmedString(formData.get('type')) ?? 'general',
      userId: toTrimmedString(formData.get('userId')) ?? undefined,
    });

    if (!parsedFields.success) {
      return badRequest('Invalid upload request');
    }

    if (parsedFields.data.userId && parsedFields.data.userId !== userId) {
      return forbidden('You cannot upload files for another user');
    }

    const fileEntry = formData.get('file');
    if (!isFile(fileEntry)) {
      return badRequest('No file provided');
    }

    const descriptor = resolveUploadedFileDescriptor(fileEntry);
    if (!descriptor) {
      return badRequest('Only images, PDF, DOC, and DOCX files are allowed');
    }

    if (fileEntry.size > descriptor.sizeLimit) {
      return badRequest(
        descriptor.kind === 'image'
          ? 'Image size must be less than 5MB'
          : 'Document size must be less than 10MB'
      );
    }

    const filenameValidation = FileValidator.validateFileName(fileEntry.name);
    if (!filenameValidation.isValid) {
      return badRequest(filenameValidation.errors[0] ?? 'Invalid file name');
    }

    const safeFilename = sanitiseFilename(fileEntry.name);
    const publicId = toCloudinaryPublicId(userId, safeFilename);
    const uploadResult = await uploadFile(
      fileEntry,
      `fixly/${parsedFields.data.type}/${userId}`,
      descriptor,
      publicId,
      safeFilename
    );

    return respond({
      success: true,
      url: uploadResult.secure_url,
      publicId: uploadResult.public_id,
      filename: safeFilename,
      size: fileEntry.size,
      type: descriptor.mimeType,
      fileKind: descriptor.kind,
      width: uploadResult.width,
      height: uploadResult.height,
    });
  } catch (error: unknown) {
    const err = parseError(error);
    logger.error('Upload error:', err);
    return respond(
      {
        success: false,
        message: 'Upload failed',
        error: env.NODE_ENV === 'development' ? err.message : undefined,
      },
      500
    );
  }
}
