import { inngest } from '@/lib/inngest/client';
import { logger } from '@/lib/logger';
import { closeJob } from '@/lib/services/jobs/job.mutations';
import { getInactiveJobs } from '@/lib/services/jobs/job.queries';

export const closeInactiveJobs = inngest.createFunction(
  { id: 'close-inactive-jobs', name: 'Close jobs with no activity for 30 days' },
  { cron: '0 2 * * *' },
  async ({ step }) => {
    await step.run('find-and-close-inactive-jobs', async () => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const inactiveJobs = await getInactiveJobs(thirtyDaysAgo);

      let closed = 0;
      await Promise.allSettled(
        inactiveJobs.map(async (job) => {
          await closeJob(job._id, 'auto-closed-inactive');
          closed += 1;
        })
      );

      logger.info({ closed }, '[Inngest] Auto-closed inactive jobs');
      return { closed };
    });
  }
);
