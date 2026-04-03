import { NOTIFICATION_TYPES, type TemplateNotificationResult, type TemplateSendOptions } from '@/lib/services/notifications/notification.types';
import { getRevieweeActionUrl } from '@/lib/services/notifications/persistence';
import { getErrorMessage, mapLegacyPriority, resolveActionUrl } from '@/lib/services/notifications/preferences';
import { NOTIFICATION_TEMPLATES } from '@/lib/services/notifications/templates';

import { UnifiedNotificationService } from './service.core';

export { UnifiedNotificationService } from './service.core';

class NotificationServiceWithDomain extends UnifiedNotificationService {
  async notifyJobApplication(
    jobId: string,
    hirerId: string,
    fixerId: string,
    fixerName: string
  ): Promise<void> {
    const title = 'New Job Application';
    const message = `${fixerName} applied to your job.`;
    await this.createNotification(hirerId, NOTIFICATION_TYPES.JOB_APPLICATION, title, message, `/dashboard/jobs/${jobId}`, { jobId, fixerId, fixerName });
    await this.sendPushNotification(hirerId, title, message, `/dashboard/jobs/${jobId}`);
  }

  async notifyApplicationAccepted(jobId: string, fixerId: string, jobTitle: string): Promise<void> {
    const title = 'Application Accepted';
    const message = `Your application for "${jobTitle}" was accepted.`;
    await this.createNotification(fixerId, NOTIFICATION_TYPES.APPLICATION_ACCEPTED, title, message, `/dashboard/messages?job=${jobId}`, { jobId, jobTitle });
    await this.sendPushNotification(fixerId, title, message, `/dashboard/messages?job=${jobId}`);
  }

  async notifyApplicationRejected(jobId: string, fixerId: string, jobTitle: string): Promise<void> {
    const title = 'Application Update';
    const message = `Another applicant was selected for "${jobTitle}".`;
    await this.createNotification(fixerId, NOTIFICATION_TYPES.APPLICATION_REJECTED, title, message, `/dashboard/jobs/${jobId}`, { jobId, jobTitle });
  }

  async notifyNewMessage(conversationId: string, recipientId: string, senderName: string): Promise<void> {
    const title = 'New Message';
    const message = `${senderName} sent you a message.`;
    const url = `/dashboard/messages?conversation=${conversationId}`;
    await this.createNotification(recipientId, NOTIFICATION_TYPES.NEW_MESSAGE, title, message, url, { conversationId, senderName });
    await this.sendPushNotification(recipientId, title, message, url);
  }

  async notifyReviewReceived(revieweeId: string, reviewerName: string, jobTitle: string): Promise<void> {
    const title = 'New Review Received';
    const message = `${reviewerName} left a review for "${jobTitle}".`;
    const actionUrl = await getRevieweeActionUrl(revieweeId);
    await this.createNotification(revieweeId, NOTIFICATION_TYPES.NEW_REVIEW, title, message, actionUrl, { reviewerName, jobTitle });
  }

  async notifyDisputeUpdate(disputeId: string, userId: string, update: string): Promise<void> {
    const title = 'Dispute Update';
    await this.createNotification(userId, NOTIFICATION_TYPES.DISPUTE, title, update, `/dashboard/disputes/${disputeId}`, { disputeId, update });
  }

  async notifyPaymentConfirmed(userId: string, planName: string): Promise<void> {
    const title = 'Payment Confirmed';
    const message = `Your ${planName} plan is active.`;
    await this.createNotification(userId, NOTIFICATION_TYPES.PAYMENT_SUCCESS, title, message, '/dashboard/subscription', { planName, amount: planName });
    await this.sendEmailNotification(userId, NOTIFICATION_TYPES.PAYMENT_SUCCESS, { planName, amount: planName, title, message });
  }
}

export const NotificationService = new NotificationServiceWithDomain();

export async function getNotificationService(): Promise<NotificationServiceWithDomain> {
  return NotificationService;
}

export async function sendTemplatedNotification(
  templateKey: string,
  recipientId: string,
  templateData: Record<string, unknown>,
  options: TemplateSendOptions = {}
): Promise<TemplateNotificationResult> {
  const template = NOTIFICATION_TEMPLATES[templateKey];
  if (!template) {
    return { success: false, error: `Unknown notification template: ${templateKey}` };
  }

  try {
    const senderId = options.senderId ?? null;
    const actionData = { ...template.actionData(templateData), ...(options.actionData || {}), senderId };
    const message = template.getMessage(templateData);
    const actionUrl = resolveActionUrl(actionData);

    const notification = await NotificationService.createNotification(
      recipientId,
      template.type,
      template.title,
      message,
      actionUrl,
      { ...templateData, ...actionData, priority: mapLegacyPriority(options.priority || template.priority) }
    );

    if (!notification) {
      return { success: false, error: 'Notification was not sent for the target user' };
    }

    return { success: true, notificationId: notification.id, notification };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) };
  }
}

export const notificationService = NotificationService;

export default NotificationService;
