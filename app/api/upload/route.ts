import { badRequest, forbidden, requireSession, respond, tooManyRequests, unauthorized } from '@/lib/api';
import { env } from '@/lib/env';
import { sanitiseFilename } from '@/lib/files/sanitiseFilename';
import { enforceUploadRateLimit } from '@/lib/files/uploadRateLimit';
import { FileValidator } from '@/lib/fileValidation';
import { logger } from '@/lib/logger';
import { csrfGuard } from '@/lib/security/csrf';

import {
  hasCloudinaryConfig,
  isFile,
  parseError,
  resolveUploadedFileDescriptor,
  toCloudinaryPublicId,
  toTrimmedString,
  uploadFile,
  uploadFieldsSchema,
} from './helpers';

export async function POST(request: Request) {
  try {
    const auth = await requireSession();
    if ('error' in auth) return auth.error;

    const userId = toTrimmedString(auth.session.user.id);
    if (!userId) return unauthorized();

    const csrfResult = csrfGuard(request, auth.session);
    if (csrfResult) return csrfResult;

    const uploadRateLimit = await enforceUploadRateLimit(userId);
    if (!uploadRateLimit.allowed) return tooManyRequests('Too many upload requests. Please try again later.');

    if (!hasCloudinaryConfig()) return respond({ success: false, message: 'File upload service is not configured' }, 503);

    const formData = await request.formData();
    const parsedFields = uploadFieldsSchema.safeParse({
      type: toTrimmedString(formData.get('type')) ?? 'general',
      userId: toTrimmedString(formData.get('userId')) ?? undefined,
    });
    if (!parsedFields.success) return badRequest('Invalid upload request');
    if (parsedFields.data.userId && parsedFields.data.userId !== userId) {
      return forbidden('You cannot upload files for another user');
    }

    const fileEntry = formData.get('file');
    if (!isFile(fileEntry)) return badRequest('No file provided');

    const descriptor = resolveUploadedFileDescriptor(fileEntry);
    if (!descriptor) return badRequest('Only images, PDF, DOC, and DOCX files are allowed');

    if (fileEntry.size > descriptor.sizeLimit) {
      return badRequest(descriptor.kind === 'image' ? 'Image size must be less than 5MB' : 'Document size must be less than 10MB');
    }

    const filenameValidation = FileValidator.validateFileName(fileEntry.name);
    if (!filenameValidation.isValid) return badRequest(filenameValidation.errors[0] ?? 'Invalid file name');

    const safeFilename = sanitiseFilename(fileEntry.name);
    const publicId = toCloudinaryPublicId(userId, safeFilename);
    const uploadResult = await uploadFile(fileEntry, `fixly/${parsedFields.data.type}/${userId}`, descriptor, publicId, safeFilename);

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
    return respond({ success: false, message: 'Upload failed', error: env.NODE_ENV === 'development' ? err.message : undefined }, 500);
  }
}
