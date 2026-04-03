import cloudinary from '@/lib/cloudinary';
import { inngest } from '@/lib/inngest/client';
import { logger } from '@/lib/logger';

export const onOrphanUpload = inngest.createFunction(
  { id: 'on-orphan-upload', name: 'Clean up orphaned uploads' },
  { event: 'upload/orphan.cleanup' },
  async ({ event, step }) => {
    const { publicIds, reason } = event.data;

    await step.run('delete-from-cloudinary', async () => {
      const batches: string[][] = [];
      for (let index = 0; index < publicIds.length; index += 10) {
        batches.push(publicIds.slice(index, index + 10));
      }

      await Promise.allSettled(
        batches.map((batch) => cloudinary.api.delete_resources(batch, { resource_type: 'auto' }))
      );

      logger.info({ count: publicIds.length, reason }, '[Inngest] Cleaned up orphaned uploads');
    });
  }
);
