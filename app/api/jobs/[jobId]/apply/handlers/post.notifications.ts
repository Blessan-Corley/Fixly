import {
  Channels as TypedChannels,
  Events as TypedEvents,
  type ApplicationSubmittedPayload,
} from '@/lib/ably/events';
import { publishToChannel } from '@/lib/ably/publisher';
import { inngest } from '@/lib/inngest/client';

import { publishJobCountsUpdate } from '../../realtime';

export type NotifyApplicationSubmittedParams = {
  jobId: string;
  applicationId: string;
  fixerId: string;
  fixerName: string;
  fixerAvatar: string | undefined;
  hirerId: string;
  hirerEmail: string;
  hirerName: string;
  jobTitle: string;
  applicationCount: number;
};

export async function notifyApplicationSubmitted(
  params: NotifyApplicationSubmittedParams
): Promise<void> {
  const {
    jobId,
    applicationId,
    fixerId,
    fixerName,
    fixerAvatar,
    hirerId,
    hirerEmail,
    hirerName,
    jobTitle,
    applicationCount,
  } = params;

  await publishToChannel(
    TypedChannels.job(jobId),
    TypedEvents.job.applicationSubmitted,
    {
      jobId,
      applicationId,
      fixerId,
      fixerName,
      fixerAvatar,
    } satisfies ApplicationSubmittedPayload
  );

  if (hirerId) {
    await publishToChannel(TypedChannels.user(hirerId), TypedEvents.user.notificationSent, {
      notificationId: `application:${applicationId}`,
      type: 'new_application',
      title: 'New application received',
      message: `${fixerName} applied to "${jobTitle}"`,
      link: `/dashboard/jobs/${jobId}`,
      createdAt: new Date().toISOString(),
    });
  }

  await publishJobCountsUpdate(jobId, { applicationCount });

  await inngest.send({
    name: 'job/application.received',
    data: {
      jobId,
      jobTitle,
      hirerId,
      hirerEmail,
      hirerName,
      fixerId,
      fixerName,
      applicationId,
    },
  });
}
