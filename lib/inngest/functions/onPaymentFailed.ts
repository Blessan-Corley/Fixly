import { sendEmail } from '@/lib/email';
import { inngest } from '@/lib/inngest/client';
import {
  NOTIFICATION_TYPES,
  NotificationService,
} from '@/lib/services/notifications';

export const onPaymentFailed = inngest.createFunction(
  {
    id: 'on-payment-failed',
    name: 'Handle payment failure — notify and email user',
    retries: 3,
  },
  { event: 'razorpay/payment.failed' },
  async ({ event, step }) => {
    const { userId, userEmail, userName, amountRs, currency, reason, orderId } = event.data;

    await step.run('store-failure-notification', async () => {
      await NotificationService.createNotification(
        userId,
        NOTIFICATION_TYPES.PAYMENT_FAILED,
        'Payment failed',
        `Your payment of ${currency} ${amountRs} could not be processed. Reason: ${reason}`,
        '/dashboard/subscription',
        { orderId, amountRs, currency, reason }
      );
    });

    await step.run('send-failure-email', async () => {
      if (!userEmail) return;
      await sendEmail({
        to: userEmail,
        subject: 'Payment failed – Fixly',
        template: 'payment-failed',
        data: { userName, amountRs, currency, reason, orderId },
      });
    });
  }
);
