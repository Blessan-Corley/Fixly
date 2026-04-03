import connectDB from '@/lib/mongodb';
import JobDraft from '@/models/JobDraft';

type OrphanedUploadRecord = {
  draftId: string;
  publicId: string;
  uploadedAt: Date;
};

export async function getOrphanedUploadRecords(
  olderThan: Date
): Promise<OrphanedUploadRecord[]> {
  await connectDB();

  const drafts = await JobDraft.find({
    convertedToJob: false,
    $or: [
      { draftStatus: 'abandoned', lastActivity: { $lte: olderThan } },
      { expiresAt: { $lte: olderThan } },
    ],
  })
    .select('_id attachments')
    .lean<Array<{ _id: { toString(): string }; attachments?: Array<{ publicId?: string; createdAt?: Date }> }>>();

  return drafts.flatMap((draft) =>
    (draft.attachments || [])
      .filter((attachment) => typeof attachment.publicId === 'string' && attachment.publicId.length > 0)
      .map((attachment) => ({
        draftId: draft._id.toString(),
        publicId: attachment.publicId as string,
        uploadedAt: attachment.createdAt instanceof Date ? attachment.createdAt : olderThan,
      }))
  );
}
