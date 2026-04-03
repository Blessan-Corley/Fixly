import { sendEmail } from '@/lib/email';
import { inngest } from '@/lib/inngest/client';
import { NotificationService } from '@/lib/services/notifications';

export const onApplicationAccepted = inngest.createFunction(
  { id: 'on-application-accepted', name: 'Notify fixer of acceptance' },
  { event: 'job/application.accepted' },
  async ({ event, step }) => {
    const {
      fixerEmail,
      fixerName,
      hirerName,
      jobTitle,
      jobId,
      fixerId,
      rejectedApplicants = [],
    } = event.data;

    await step.run('send-acceptance-email', async () => {
      if (!fixerEmail) {
        return;
      }
      await sendEmail({
        to: fixerEmail,
        subject: `You got the job: "${jobTitle}"`,
        template: 'application-accepted',
        data: { fixerName, hirerName, jobTitle, jobId },
      });
    });

    await step.run('notify-accepted-fixer', async () => {
      await NotificationService.notifyApplicationAccepted(jobId, fixerId, jobTitle);
    });

    await step.run('notify-rejected-fixers', async () => {
      await Promise.allSettled(
        rejectedApplicants.map((applicant: { fixerId: string; jobTitle: string }) =>
          NotificationService.notifyApplicationRejected(jobId, applicant.fixerId, applicant.jobTitle)
        )
      );
    });
  }
);

export const onApplicationRejected = inngest.createFunction(
  { id: 'on-application-rejected', name: 'Notify fixer of rejection' },
  { event: 'job/application.rejected' },
  async ({ event, step }) => {
    const { fixerEmail, fixerName, jobTitle, jobId, fixerId } = event.data;

    await step.run('send-rejection-email', async () => {
      if (!fixerEmail) {
        return;
      }
      await sendEmail({
        to: fixerEmail,
        subject: `Update on your application for "${jobTitle}"`,
        template: 'application-rejected',
        data: { fixerName, jobTitle, jobId },
      });
    });

    await step.run('notify-rejected-fixer', async () => {
      await NotificationService.notifyApplicationRejected(jobId, fixerId, jobTitle);
    });
  }
);
