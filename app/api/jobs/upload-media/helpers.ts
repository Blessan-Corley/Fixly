import { Readable } from 'node:stream';
import type { ReadableStream as NodeReadableStream } from 'node:stream/web';

import type { UploadApiOptions, UploadApiResponse } from 'cloudinary';

import cloudinary from '@/lib/cloudinary';

export type UploadMediaResponse = {
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

export function toSafeInt(value: FormDataEntryValue | null, fallback = 0): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.floor(parsed));
}

export function isCloudinaryIdOwnedByUser(publicId: string, userId: string): boolean {
  return publicId.includes(`/jobs/${userId}/`) || publicId.includes(`${userId}_`);
}

export function buildUploadOptions(userId: string, isImage: boolean): UploadApiOptions {
  const base: UploadApiOptions = {
    resource_type: isImage ? 'image' : 'video',
    folder: `fixly/jobs/${userId}`,
    public_id: `${userId}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    tags: ['job_media', isImage ? 'photo' : 'video'],
  };
  if (isImage) {
    base.transformation = [
      { width: 1200, height: 1200, crop: 'limit' },
      { quality: 'auto:good' },
      { format: 'auto' },
    ];
  } else {
    base.transformation = [
      { width: 1280, height: 720, crop: 'limit' },
      { quality: 'auto' },
      { format: 'mp4' },
    ];
  }
  return base;
}

export function uploadToCloudinary(file: File, options: UploadApiOptions): Promise<UploadApiResponse> {
  return new Promise<UploadApiResponse>((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) { reject(error); return; }
      if (!result) { reject(new Error('Cloudinary upload returned no result')); return; }
      resolve(result);
    });
    const readable = Readable.fromWeb(file.stream() as unknown as NodeReadableStream<Uint8Array>);
    readable.on('error', reject);
    uploadStream.on('error', reject);
    readable.pipe(uploadStream);
  });
}

export function buildMediaPayload(
  file: File,
  uploadResult: UploadApiResponse,
  isImage: boolean,
  isVideo: boolean
): UploadMediaResponse {
  return {
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
}
