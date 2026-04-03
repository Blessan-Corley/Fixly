import cloudinary from '@/lib/cloudinary';
import { inngest } from '@/lib/inngest/client';
import { logger } from '@/lib/logger';
import { getOrphanedUploadRecords } from '@/lib/services/uploads/queries';

export const orphanUploadSweep = inngest.createFunction(
  { id: 'orphan-upload-sweep', name: 'Weekly sweep for orphaned uploads' },
  { cron: '0 3 * * 0' },
  async ({ step }) => {
    await step.run('find-orphaned-uploads', async () => {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const orphans = await getOrphanedUploadRecords(oneHourAgo);

      if (orphans.length > 0) {
        const publicIds = orphans.map((orphan) => orphan.publicId);
        await cloudinary.api.delete_resources(publicIds, { resource_type: 'auto' });
        logger.info({ swept: orphans.length }, '[Inngest] Swept orphaned uploads');
      }

      return { swept: orphans.length };
    });
  }
);
