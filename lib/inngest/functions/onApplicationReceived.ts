import { sendEmail } from '@/lib/email';
import { inngest } from '@/lib/inngest/client';
import {
  NOTIFICATION_TYPES,
  NotificationService,
} from '@/lib/services/notifications';

export const onApplicationReceived = inngest.createFunction(
  { id: 'on-application-received', name: 'Notify hirer of new application' },
  { event: 'job/application.received' },
  async ({ event, step }) => {
    const { hirerEmail, hirerName, hirerId, fixerId, fixerName, jobTitle, jobId } = event.data;

    await step.run('send-application-email', async () => {
      if (!hirerEmail) {
        return;
      }
      await sendEmail({
        to: hirerEmail,
        subject: `New application for "${jobTitle}"`,
        template: 'application-received',
        data: { hirerName, fixerName, jobTitle, jobId },
      });
    });

    await step.run('create-notifications', async () => {
      await Promise.allSettled([
        NotificationService.notifyJobApplication(jobId, hirerId, fixerId, fixerName),
        NotificationService.createNotification(
          fixerId,
          NOTIFICATION_TYPES.JOB_APPLICATION,
          'Application submitted',
          `Your application for "${jobTitle}" has been submitted successfully.`,
          `/dashboard/jobs/${jobId}`,
          { jobId }
        ),
      ]);
    });
  }
);
