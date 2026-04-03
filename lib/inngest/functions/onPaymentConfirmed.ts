import { sendEmail } from '@/lib/email';
import { inngest } from '@/lib/inngest/client';
import {
  NOTIFICATION_TYPES,
  NotificationService,
} from '@/lib/services/notifications';

export const onPaymentConfirmed = inngest.createFunction(
  {
    id: 'on-payment-confirmed',
    name: 'Send payment confirmation email',
    retries: 3,
  },
  { event: 'stripe/checkout.completed' },
  async ({ event, step }) => {
    const { userId, userEmail, userName, amount, currency, orderId, planId } = event.data;

    await step.run('store-payment-notification', async () => {
      await NotificationService.createNotification(
        userId,
        NOTIFICATION_TYPES.PAYMENT_SUCCESS,
        'Subscription activated',
        'Your Fixly subscription is now active.',
        '/dashboard/subscription',
        { orderId, amount, currency, planId }
      );
    });

    await step.run('send-confirmation-email', async () => {
      if (!userEmail) {
        return;
      }
      await sendEmail({
        to: userEmail,
        subject: 'Subscription activated',
        template: 'payment-confirmed',
        data: { userName, amount, currency, planId, orderId },
      });
    });
  }
);
