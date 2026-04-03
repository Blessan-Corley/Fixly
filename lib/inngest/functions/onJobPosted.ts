import { sendEmail } from '@/lib/email';
import { inngest } from '@/lib/inngest/client';
import connectDB from '@/lib/mongodb';
import { runJobPostSideEffects } from '@/lib/services/jobPostSideEffects';
import type { JobPostRecord } from '@/lib/services/jobs/createJob';
import Job from '@/models/Job';

export const onJobPosted = inngest.createFunction(
  { id: 'on-job-posted', name: 'Handle job posted side effects' },
  { event: 'job/posted' },
  async ({ event, step }) => {
    const { jobId, hirerId, hirerEmail, hirerName, title, draftId } = event.data;

    await step.run('send-hirer-confirmation', async () => {
      if (!hirerEmail) {
        return;
      }
      await sendEmail({
        to: hirerEmail,
        subject: `Your job "${title}" is now live`,
        template: 'job-posted-confirmation',
        data: { hirerName, title, jobId },
      });
    });

    await step.run('run-job-post-side-effects', async () => {
      await connectDB();
      const job = (await Job.findById(jobId).lean()) as JobPostRecord | null;
      if (!job) {
        return;
      }

      await runJobPostSideEffects(job, hirerId, { draftId: draftId ?? null });
    });
  }
);
