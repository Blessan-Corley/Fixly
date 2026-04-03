import * as Sentry from '@sentry/nextjs';
import type { UploadApiErrorResponse, UploadApiResponse } from 'cloudinary';
import { Types } from 'mongoose';
import { z } from 'zod';

import { respond } from '@/lib/api';
import cloudinary from '@/lib/cloudinary';
import { env } from '@/lib/env';
import { sanitiseFilename } from '@/lib/files/sanitiseFilename';
import { FileValidator } from '@/lib/fileValidation';
import { logger } from '@/lib/logger';
import type { IUser } from '@/types/User';

export type VerificationDocumentRecord = {
  originalName: string;
  cloudinaryUrl: string;
  cloudinaryPublicId: string;
  fileType: string;
  fileSize: number;
  uploadedAt: Date;
};

export type UserDocument = IUser & {
  _id: Types.ObjectId;
  addNotification?: (
    type: string,
    title: string,
    message: string,
    data?: unknown
  ) => Promise<IUser>;
  save: () => Promise<unknown>;
};

export const ALLOWED_DOCUMENT_TYPES = new Set([
  'aadhaar',
  'pan',
  'driving_license',
  'voter_id',
  'passport',
  'other',
]);
export const ALLOWED_FILE_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']);
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
export const MAX_DOCUMENT_COUNT = 3;
export const REAPPLY_COOLDOWN_DAYS = 7;
export const MAX_ADDITIONAL_INFO_LENGTH = 500;

export const verificationFieldsSchema = z.object({
  documentType: z.enum(['aadhaar', 'pan', 'driving_license', 'voter_id', 'passport', 'other']),
  additionalInfo: z.string().max(MAX_ADDITIONAL_INFO_LENGTH).optional().default(''),
});

export function hasCloudinaryConfig(): boolean {
  return Boolean(env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET);
}

export function toTrimmedString(value: unknown): string | null {
  return typeof value === 'string' ? value.trim() : null;
}

export function parseError(error: unknown): Error {
  if (error instanceof Error) return error;
  return new Error('Unknown error');
}

export function isFile(value: FormDataEntryValue): value is File {
  return typeof File !== 'undefined' && value instanceof File;
}

export function normalizeMimeType(mimeType: string): string {
  return mimeType === 'image/jpg' ? 'image/jpeg' : mimeType;
}

export function toDaysSince(date: Date): number {
  return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
}

export async function uploadVerificationDocument(
  file: File,
  userId: string,
  safeFilename: string
): Promise<UploadApiResponse> {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const baseName = safeFilename.replace(/\.[^.]+$/, '');

  return new Promise<UploadApiResponse>((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder: `verification/${userId}`,
          resource_type: 'auto',
          public_id: `${Date.now()}-${baseName}`,
          use_filename: false,
          unique_filename: false,
          filename_override: safeFilename,
          overwrite: true,
          tags: ['verification', 'document'],
        },
        (error?: UploadApiErrorResponse, result?: UploadApiResponse) => {
          if (error ?? !result) {
            reject(error ?? new Error('Upload failed'));
            return;
          }
          resolve(result);
        }
      )
      .end(buffer);
  });
}

export async function cleanupUploadedDocuments(publicIds: string[]): Promise<void> {
  if (publicIds.length === 0) return;

  await Promise.all(
    publicIds.map(async (publicId) => {
      try {
        await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
      } catch {
        try {
          await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
        } catch (cleanupError: unknown) {
          logger.warn('Failed to cleanup uploaded verification file:', cleanupError);
        }
      }
    })
  );
}

export async function validateDocumentFiles(
  documents: File[],
  userId: string
): Promise<Response | null> {
  for (const document of documents) {
    const normalizedMimeType = normalizeMimeType(document.type);

    if (document.size > MAX_FILE_SIZE_BYTES) {
      return respond({ message: `File ${document.name} is too large. Maximum size is 5MB.` }, 400);
    }

    if (!ALLOWED_FILE_TYPES.has(normalizedMimeType)) {
      return respond(
        { message: `File ${document.name} has invalid format. Only JPG, PNG, and PDF are allowed.` },
        400
      );
    }

    const validationResult = await FileValidator.validateFile(
      {
        name: document.name,
        type: normalizedMimeType,
        size: document.size,
        arrayBuffer: () => document.arrayBuffer(),
      },
      {
        maxFileSize: MAX_FILE_SIZE_BYTES,
        maxImageSize: MAX_FILE_SIZE_BYTES,
        allowedMimeTypes: [normalizedMimeType],
      }
    );

    if (!validationResult.isValid) {
      Sentry.captureEvent({
        level: 'warning',
        message: 'Verification document deep scan failed',
        extra: {
          filename: document.name,
          userId,
          errors: validationResult.errors,
          warnings: validationResult.warnings,
          securityIssues: validationResult.securityIssues,
        },
      });

      return respond(
        { message: `File ${document.name} failed the security scan.`, errors: validationResult.errors },
        422
      );
    }
  }

  return null;
}

export async function uploadAllDocuments(
  documents: File[],
  userId: string,
  uploadedPublicIds: string[]
): Promise<VerificationDocumentRecord[]> {
  const uploadedDocuments: VerificationDocumentRecord[] = [];

  for (const document of documents) {
    const safeFilename = sanitiseFilename(document.name);
    const uploadResult = await uploadVerificationDocument(document, userId, safeFilename);
    uploadedPublicIds.push(uploadResult.public_id);

    uploadedDocuments.push({
      originalName: document.name,
      cloudinaryUrl: uploadResult.secure_url,
      cloudinaryPublicId: uploadResult.public_id,
      fileType: document.type,
      fileSize: document.size,
      uploadedAt: new Date(),
    });
  }

  return uploadedDocuments;
}
