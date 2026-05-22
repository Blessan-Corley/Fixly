import type { UploadApiErrorResponse, UploadApiResponse } from 'cloudinary';
import { z } from 'zod';

import cloudinary from '@/lib/cloudinary';
import { env } from '@/lib/env';

export const uploadTypeSchema = z.enum(['general', 'profile', 'job', 'work_progress']);
export type SupportedUploadKind = 'image' | 'document';

export type UploadedFileDescriptor = {
  kind: SupportedUploadKind;
  mimeType: string;
  sizeLimit: number;
};

export const uploadFieldsSchema = z.object({
  type: uploadTypeSchema.default('general'),
  userId: z.string().min(1).optional(),
});

export const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
export const ALLOWED_DOCUMENT_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);
export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
export const MAX_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024;

export function hasCloudinaryConfig(): boolean {
  return Boolean(env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET);
}

export function toTrimmedString(value: unknown): string | null {
  return typeof value === 'string' ? value.trim() : null;
}

export function parseError(error: unknown): Error {
  return error instanceof Error ? error : new Error('Unknown upload error');
}

export function isFile(value: FormDataEntryValue | null): value is File {
  return typeof File !== 'undefined' && value instanceof File;
}

export function resolveUploadedFileDescriptor(file: File): UploadedFileDescriptor | null {
  if (ALLOWED_IMAGE_TYPES.has(file.type)) {
    return { kind: 'image', mimeType: file.type, sizeLimit: MAX_IMAGE_SIZE_BYTES };
  }
  if (ALLOWED_DOCUMENT_TYPES.has(file.type)) {
    return { kind: 'document', mimeType: file.type, sizeLimit: MAX_DOCUMENT_SIZE_BYTES };
  }
  return null;
}

export function toCloudinaryPublicId(userId: string, filename: string): string {
  const lastDotIndex = filename.lastIndexOf('.');
  const baseName = lastDotIndex > 0 ? filename.slice(0, lastDotIndex) : filename;
  return `${userId}/${Date.now()}-${baseName}`;
}

export async function uploadFile(
  file: File,
  folder: string,
  descriptor: UploadedFileDescriptor,
  publicId: string,
  safeFilename: string
): Promise<UploadApiResponse> {
  const buffer = Buffer.from(await file.arrayBuffer());

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
