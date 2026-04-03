import { sendEmail } from '@/lib/email';
import { inngest } from '@/lib/inngest/client';
import { getDisputeById } from '@/lib/services/disputes/queries';
import {
  NOTIFICATION_TYPES,
  NotificationService,
} from '@/lib/services/notifications';
import { getAdminUsers } from '@/lib/services/user/profile.queries';

export const onDisputeOpened = inngest.createFunction(
  { id: 'on-dispute-opened', name: 'Notify parties when dispute is opened' },
  { event: 'dispute/opened' },
  async ({ event, step }) => {
    const {
      disputeId,
      jobTitle,
      hirerId,
      hirerEmail,
      hirerName,
      fixerId,
      fixerEmail,
      fixerName,
      reason,
    } = event.data;

    await step.run('notify-both-parties', async () => {
      await Promise.allSettled([
        ...(hirerEmail
          ? [
              sendEmail({
                to: hirerEmail,
                subject: `Dispute opened for "${jobTitle}"`,
                template: 'dispute-opened-hirer',
                data: { hirerName, jobTitle, disputeId, reason },
              }),
            ]
          : []),
        ...(fixerEmail
          ? [
              sendEmail({
                to: fixerEmail,
                subject: `Dispute opened for "${jobTitle}"`,
                template: 'dispute-opened-fixer',
                data: { fixerName, jobTitle, disputeId, reason },
              }),
            ]
          : []),
        NotificationService.createNotification(
          hirerId,
          NOTIFICATION_TYPES.DISPUTE,
          'Dispute opened',
          `A dispute for "${jobTitle}" has been opened.`,
          `/dashboard/disputes/${disputeId}`,
          { disputeId }
        ),
        NotificationService.createNotification(
          fixerId,
          NOTIFICATION_TYPES.DISPUTE,
          'Dispute opened',
          `A dispute for "${jobTitle}" has been opened.`,
          `/dashboard/disputes/${disputeId}`,
          { disputeId }
        ),
      ]);
    });

    await step.run('notify-admins', async () => {
      const admins = await getAdminUsers();
      await Promise.allSettled(
        admins.map((admin) =>
          NotificationService.createNotification(
            admin._id,
            NOTIFICATION_TYPES.DISPUTE,
            'New Dispute Requires Review',
            `New dispute opened for "${jobTitle}"`,
            `/dashboard/admin?tab=disputes&id=${disputeId}`,
            { disputeId }
          )
        )
      );
    });

    await step.sleep('wait-for-resolution', '72h');

    await step.run('check-resolution-status', async () => {
      const dispute = await getDisputeById(disputeId);

      if (dispute && dispute.status === 'pending') {
        const admins = await getAdminUsers();
        await Promise.allSettled(
          admins.map((admin) =>
            NotificationService.createNotification(
              admin._id,
              NOTIFICATION_TYPES.DISPUTE,
              'Dispute requires admin attention',
              `Dispute for "${jobTitle}" has been open for 72 hours`,
              `/dashboard/admin?tab=disputes&id=${disputeId}`,
              { disputeId }
            )
          )
        );
      }
    });
  }
);
