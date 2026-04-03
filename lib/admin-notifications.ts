import {
  handleContactFormSubmission,
  handleDisputeCreated,
  handleJobPosted,
  handleNewUserRegistration,
  handlePaymentIssue,
  handleSystemError,
} from './admin-notifications/handlers';
import type { AdminNotificationEvent } from './admin-notifications/types';
import { logger } from './logger';

export type {
  AdminNotificationEvent,
  ContactFormSubmissionData,
  NewUserRegistrationData,
  JobPostedData,
  PaymentIssueData,
  DisputeCreatedData,
  SystemErrorData,
} from './admin-notifications/types';

export async function notifyAdmin(eventType: string, data: unknown): Promise<void> {
  const notifications: Promise<unknown>[] = [];

  try {
    switch (eventType as AdminNotificationEvent) {
      case 'CONTACT_FORM_SUBMISSION':
        notifications.push(handleContactFormSubmission((data ?? {}) as Parameters<typeof handleContactFormSubmission>[0]));
        break;
      case 'NEW_USER_REGISTRATION':
        notifications.push(handleNewUserRegistration((data ?? {}) as Parameters<typeof handleNewUserRegistration>[0]));
        break;
      case 'JOB_POSTED':
        notifications.push(handleJobPosted((data ?? {}) as Parameters<typeof handleJobPosted>[0]));
        break;
      case 'PAYMENT_ISSUE':
        notifications.push(handlePaymentIssue((data ?? {}) as Parameters<typeof handlePaymentIssue>[0]));
        break;
      case 'DISPUTE_CREATED':
        notifications.push(handleDisputeCreated((data ?? {}) as Parameters<typeof handleDisputeCreated>[0]));
        break;
      case 'SYSTEM_ERROR':
        notifications.push(handleSystemError((data ?? {}) as Parameters<typeof handleSystemError>[0]));
        break;
      default:
        logger.warn(`Unknown admin notification event type: ${eventType}`);
    }

    await Promise.allSettled(notifications);
  } catch (error: unknown) {
    logger.error('Admin notification failed:', error);
  }
}

export async function testAdminNotifications(): Promise<boolean> {
  try {
    await notifyAdmin('CONTACT_FORM_SUBMISSION', {
      name: 'Test User',
      email: 'test@example.com',
      phone: '+1234567890',
      category: 'Technical Support',
      subject: 'Test Notification',
      message: 'This is a test message to verify admin notification flow.',
    });
    return true;
  } catch (error: unknown) {
    logger.error('Admin notification test failed:', error);
    return false;
  }
}
