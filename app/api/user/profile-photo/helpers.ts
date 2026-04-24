import type { UploadApiErrorResponse, UploadApiResponse } from 'cloudinary';
import { Types } from 'mongoose';

import cloudinary from '@/lib/cloudinary';
import { env } from '@/lib/env';
import type { IUser } from '@/types/User';

export type UserDocument = IUser & {
  _id: Types.ObjectId;
  addNotification: (type: string, title: string, message: string, data?: unknown) => Promise<IUser>;
  save: () => Promise<unknown>;
};

export const ALLOWED_FILE_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
export const PHOTO_COOLDOWN_DAYS = 7;
export const PHOTO_COOLDOWN_SECONDS = PHOTO_COOLDOWN_DAYS * 24 * 3600;

export function isFile(value: FormDataEntryValue | null): value is File {
  return typeof File !== 'undefined' && value instanceof File;
}

export function hasCloudinaryConfig(): boolean {
  return Boolean(env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET);
}

export function toDaysRemaining(resetAtMs: number): number {
  return Math.ceil((resetAtMs - Date.now()) / (24 * 60 * 60 * 1000));
}

export function getNextUpdateDate(fromDate: Date): string {
  const next = new Date(fromDate.getTime() + PHOTO_COOLDOWN_DAYS * 24 * 60 * 60 * 1000);
  return next.toISOString();
}

export function isValidImageBuffer(buffer: Buffer): boolean {
  const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  const isPng =
    buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47 &&
    buffer[4] === 0x0d && buffer[5] === 0x0a && buffer[6] === 0x1a && buffer[7] === 0x0a;
  const isWebp =
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50;
  return isJpeg || isPng || isWebp;
}

export async function uploadProfilePhoto(buffer: Buffer, userId: string): Promise<UploadApiResponse> {
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
