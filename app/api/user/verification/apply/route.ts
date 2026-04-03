// Phase 2: Hardened verification uploads with deep file scanning and UUID-based storage keys.
import { badRequest, notFound, requireSession, respond, tooManyRequests, unauthorized } from '@/lib/api';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import connectDB from '@/lib/mongodb';
import { csrfGuard } from '@/lib/security/csrf';
import User from '@/models/User';
import { rateLimit } from '@/utils/rateLimiting';

import {
  cleanupUploadedDocuments,
  hasCloudinaryConfig,
  isFile,
  MAX_ADDITIONAL_INFO_LENGTH,
  MAX_DOCUMENT_COUNT,
  parseError,
  REAPPLY_COOLDOWN_DAYS,
  toDaysSince,
  toTrimmedString,
  uploadAllDocuments,
  UserDocument,
  validateDocumentFiles,
  verificationFieldsSchema,
} from './helpers';

export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<Response> {
  const uploadedPublicIds: string[] = [];

  try {
    const rateLimitResult = await rateLimit(request, 'verification_apply', 5, 60 * 60 * 1000);
    if (!rateLimitResult.success) {
      return tooManyRequests('Too many requests. Please try again later.');
    }

    const auth = await requireSession();
    if ('error' in auth) return auth.error;

    const userId = toTrimmedString(auth.session.user.id);
    if (!userId) return unauthorized();

    const csrfResult = csrfGuard(request, auth.session);
    if (csrfResult) return csrfResult;

    if (!hasCloudinaryConfig()) {
      return respond({ message: 'Verification upload service is not configured' }, 503);
    }

    await connectDB();

    const formData = await request.formData();
    const parsedFields = verificationFieldsSchema.safeParse({
      documentType: toTrimmedString(formData.get('documentType')),
      additionalInfo: toTrimmedString(formData.get('additionalInfo')) ?? '',
    });

    if (!parsedFields.success) return badRequest('Valid document type is required');

    const { documentType, additionalInfo } = parsedFields.data;

    if (additionalInfo.length > MAX_ADDITIONAL_INFO_LENGTH) {
      return respond(
        { message: `Additional information cannot exceed ${MAX_ADDITIONAL_INFO_LENGTH} characters` },
        400
      );
    }

    const documentEntries = formData.getAll('documents');
    const documents = documentEntries.filter(isFile);

    if (documents.length === 0) return badRequest('At least one document is required');

    if (documents.length !== documentEntries.length) {
      return respond({ message: 'Invalid file payload in documents list' }, 400);
    }

    if (documents.length > MAX_DOCUMENT_COUNT) {
      return respond({ message: `Maximum ${MAX_DOCUMENT_COUNT} documents allowed` }, 400);
    }

    const fileValidationError = await validateDocumentFiles(documents, userId);
    if (fileValidationError) return fileValidationError;

    const user = (await User.findById(userId)) as UserDocument | null;
    if (!user) return notFound('User');

    if (user.isVerified) return badRequest('Account is already verified');

    if (user.verification?.status === 'pending') {
      return respond({ message: 'You already have a pending verification application' }, 400);
    }

    if (user.verification?.lastApplicationDate) {
      const daysSince = toDaysSince(new Date(user.verification.lastApplicationDate));
      if (daysSince < REAPPLY_COOLDOWN_DAYS) {
        return respond(
          {
            message: `You can only apply for verification once every ${REAPPLY_COOLDOWN_DAYS} days. Please wait ${REAPPLY_COOLDOWN_DAYS - daysSince} more days.`,
          },
          400
        );
      }
    }

    const uploadedDocuments = await uploadAllDocuments(documents, String(user._id), uploadedPublicIds);

    const verificationApplication = {
      status: 'pending' as const,
      documentType,
      documents: uploadedDocuments,
      additionalInfo,
      submittedAt: new Date(),
      lastApplicationDate: new Date(),
      applicationId: `VER_${user._id}_${Date.now()}`,
    };

    user.verification = verificationApplication;
    await user.save();

    try {
      await user.addNotification?.(
        'verification_submitted',
        'Verification Application Submitted',
        'Your verification documents have been submitted and are under review. We will notify you within 3-5 business days.'
      );
    } catch (notificationError: unknown) {
      logger.warn('Verification notification failed:', notificationError);
    }

    return respond({
      success: true,
      message: 'Verification application submitted successfully',
      applicationId: verificationApplication.applicationId,
    });
  } catch (error: unknown) {
    const err = parseError(error);
    logger.error('Verification application error:', err);
    await cleanupUploadedDocuments(uploadedPublicIds);
    return respond(
      {
        message: 'Failed to submit verification application',
        error: env.NODE_ENV === 'development' ? err.message : undefined,
      },
      500
    );
  }
}
