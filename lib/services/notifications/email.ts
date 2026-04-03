import {
  sendEmail,
  sendJobApplicationEmail,
  sendPaymentConfirmationEmail,
} from '@/lib/services/emailService';
import { NOTIFICATION_TYPES } from '@/lib/services/notifications/notification.types';
import { getEmailNotificationUser } from '@/lib/services/notifications/persistence';
import { asString } from '@/lib/services/notifications/preferences';

export async function sendEmailNotificationToUser(
  userId: string,
  type: string,
  data: Record<string, unknown>
): Promise<void> {
  const user = await getEmailNotificationUser(userId);
  if (!user?.email || user.preferences?.emailNotifications === false) return;

  if (type === NOTIFICATION_TYPES.JOB_APPLICATION) {
    await sendJobApplicationEmail(
      user.email,
      asString(data.jobTitle, 'your job'),
      asString(data.applicantName, 'A fixer')
    );
    return;
  }

  if (type === NOTIFICATION_TYPES.PAYMENT_SUCCESS || type === NOTIFICATION_TYPES.SUBSCRIPTION) {
    await sendPaymentConfirmationEmail(
      user.email,
      asString(data.planName, 'Fixly Pro'),
      asString(data.amount, 'Paid')
    );
    return;
  }

  const subject = asString(data.title, 'Fixly notification');
  const message = asString(data.message, 'You have a new notification on Fixly.');
  await sendEmail(user.email, subject, `<p>${message}</p>`, message);
}
