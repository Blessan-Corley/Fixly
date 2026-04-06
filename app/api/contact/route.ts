import { notifyAdmin } from '@/lib/admin-notifications';
import { badRequest, respond, serverError } from '@/lib/api';
import { parseBody } from '@/lib/api/parse';
import { logger } from '@/lib/logger';
import { sendContactFormEmail, sendEmail } from '@/lib/services/emailService';
import { ContactFormSchema } from '@/lib/validations/contact';
import { moderateUserGeneratedContent } from '@/lib/validations/content-policy';
import { rateLimit } from '@/utils/rateLimiting';

import {
  ADMIN_EMAIL,
  EMAIL_REGEX,
  PHONE_REGEX,
  buildAdminEmailContent,
  buildConfirmationEmailContent,
  getErrorMessage,
  toSafeHeaderValue,
  toSafeHtml,
  toTrimmedString,
} from './contact.helpers';

export async function POST(request: Request) {
  try {
    const rateLimitResult = await rateLimit(request, 'contact_form', 5, 60 * 60 * 1000, {
      requireRedis: true,
    });
    if (!rateLimitResult.success) {
      if (rateLimitResult.degraded) {
        return respond(
          { message: 'Contact form is temporarily unavailable. Please try again shortly.' },
          503
        );
      }
      const retryAfter = Math.max(
        1,
        Math.ceil(
          (rateLimitResult.remainingTime ?? Math.max(0, rateLimitResult.resetTime - Date.now())) /
            1000
        )
      );
      return respond(
        { message: 'Too many contact requests. Please try again later.' },
        429,
        { headers: { 'Retry-After': String(retryAfter) } }
      );
    }

    const parsed = await parseBody(request, ContactFormSchema);
    if ('error' in parsed) {
      return parsed.error;
    }

    const name = toTrimmedString(parsed.data.name);
    const email = toTrimmedString(parsed.data.email)?.toLowerCase();
    const phone = toTrimmedString(parsed.data.phone);
    const subject = toTrimmedString(parsed.data.subject);
    const message = toTrimmedString(parsed.data.message);
    const category = toTrimmedString(parsed.data.category);

    if (!name || !email || !message) {
      return badRequest('Name, email, and message are required');
    }
    if (name.length < 2 || name.length > 80) {
      return badRequest('Name must be between 2 and 80 characters');
    }
    if (!EMAIL_REGEX.test(email)) {
      return badRequest('Please provide a valid email address');
    }
    if (phone && !PHONE_REGEX.test(phone)) {
      return badRequest('Please provide a valid phone number');
    }
    if (subject && subject.length > 120) {
      return badRequest('Subject cannot exceed 120 characters');
    }
    if (category && category.length > 50) {
      return badRequest('Category cannot exceed 50 characters');
    }
    if (message.length < 10) {
      return badRequest('Message must be at least 10 characters long');
    }
    if (message.length > 2000) {
      return badRequest('Message cannot exceed 2000 characters');
    }

    const nameModeration = await moderateUserGeneratedContent(name, {
      context: 'profile',
      fieldLabel: 'Name',
    });
    if (!nameModeration.allowed) {
      return badRequest(nameModeration.message ?? 'Name contains inappropriate content');
    }

    const messageModeration = await moderateUserGeneratedContent(message, {
      context: 'private_message',
      fieldLabel: 'Message',
    });
    if (!messageModeration.allowed) {
      return badRequest(messageModeration.message ?? 'Message contains inappropriate content');
    }

    const normalizedSubject = toSafeHeaderValue(
      subject || `New Contact Form Message - ${category || 'General'}`
    );
    const emailContent = buildAdminEmailContent({ name, email, phone, category, subject, message });

    try {
      await sendContactFormEmail(ADMIN_EMAIL, email, normalizedSubject, emailContent);
    } catch (error: unknown) {
      logger.error('Failed to send contact email:', getErrorMessage(error));
      return serverError('Failed to send message. Please try again later or contact us directly.');
    }

    try {
      await notifyAdmin('CONTACT_FORM_SUBMISSION', { name, email, phone, category, subject, message });
    } catch (error: unknown) {
      logger.warn('Admin notification failed:', getErrorMessage(error));
    }

    try {
      const confirmationSubject = "Thank you for contacting Fixly - We've received your message";
      const confirmationContent = buildConfirmationEmailContent({ name, subject, category });
      await sendEmail(email, confirmationSubject, `<p>${toSafeHtml(confirmationContent)}</p>`);
    } catch (error: unknown) {
      logger.error('Failed to send confirmation email:', getErrorMessage(error));
    }

    return respond({
      success: true,
      message: "Message sent successfully! We'll get back to you soon.",
    });
  } catch (error: unknown) {
    logger.error('Contact form error:', error);
    return serverError('Internal server error. Please try again later.');
  }
}
