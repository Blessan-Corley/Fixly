'use client';

import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import { toast } from 'sonner';

import { fetchWithCsrf } from '@/lib/api/fetchWithCsrf';
import { getPostJobAttachmentCounts } from '../lib/jobs/post-job-helpers';
import type { JobAttachment, UploadMediaResponse, UploadProgressMap } from '../types/jobs/post-job';

export type MediaApiRefs = {
  uploadMediaAbortRef: MutableRefObject<AbortController | null>;
  deleteMediaAbortRef: MutableRefObject<AbortController | null>;
};

export type MediaApiSetters = {
  setUploading: Dispatch<SetStateAction<boolean>>;
  setUploadProgress: Dispatch<SetStateAction<UploadProgressMap>>;
};

const getErrorMessage = (error: unknown, fallback = 'Unknown error'): string =>
  error instanceof Error ? error.message : fallback;

export async function handleFileSelect(
  files: FileList | null,
  attachments: JobAttachment[],
  refs: Pick<MediaApiRefs, 'uploadMediaAbortRef'>,
  setters: MediaApiSetters,
  isAbortError: (error: unknown) => boolean,
  onAttachmentsChange: (next: JobAttachment[]) => void
): Promise<void> {
  if (!files) return;

  const { photos: currentPhotos, videos: currentVideos } = getPostJobAttachmentCounts(attachments);

  const validFiles = Array.from(files).filter((file) => {
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    if (!isImage && !isVideo) {
      toast.error(`${file.name}: Only image and video files are allowed`);
      return false;
    }
    if (isImage && currentPhotos >= 5) { toast.error('Maximum 5 photos allowed'); return false; }
    if (isVideo && currentVideos >= 1) { toast.error('Maximum 1 video allowed'); return false; }

    const maxImageSize = 5 * 1024 * 1024;
    const maxVideoSize = 50 * 1024 * 1024;

    if (isImage && file.size > maxImageSize) {
      toast.error(`${file.name}: Image size must be less than 5MB`);
      return false;
    }
    if (isVideo && file.size > maxVideoSize) {
      toast.error(`${file.name}: Video size must be less than 50MB`);
      return false;
    }
    if (isImage && !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error(`${file.name}: Only JPEG, PNG, and WebP images are allowed`);
      return false;
    }
    if (isVideo && !['video/mp4', 'video/mov', 'video/avi', 'video/quicktime'].includes(file.type)) {
      toast.error(`${file.name}: Only MP4, MOV, and AVI videos are allowed`);
      return false;
    }
    return true;
  });

  if (validFiles.length === 0) return;

  setters.setUploading(true);
  const newAttachments: JobAttachment[] = [];

  for (const file of validFiles) {
    const fileId = `${Date.now()}_${Math.random().toString(36).substring(7)}`;

    try {
      setters.setUploadProgress((prev) => ({ ...prev, [fileId]: 0 }));

      const uploadFormData = new FormData();
      uploadFormData.append('file', file);
      uploadFormData.append('existingPhotos', currentPhotos.toString());
      uploadFormData.append('existingVideos', currentVideos.toString());

      const progressInterval = setInterval(() => {
        setters.setUploadProgress((prev) => {
          const currentProgress = prev[fileId] ?? 0;
          return { ...prev, [fileId]: Math.min(currentProgress + 15, 85) };
        });
      }, 200);

      if (refs.uploadMediaAbortRef.current) refs.uploadMediaAbortRef.current.abort();
      const abortController = new AbortController();
      refs.uploadMediaAbortRef.current = abortController;

      const uploadResponse = await fetchWithCsrf('/api/jobs/upload-media', {
        method: 'POST',
        body: uploadFormData,
        signal: abortController.signal,
      });

      clearInterval(progressInterval);

      if (abortController.signal.aborted) return;

      if (!uploadResponse.ok) {
        const errorData = (await uploadResponse.json()) as { message?: string };
        throw new Error(errorData.message || 'Upload failed');
      }

      const uploadResult = (await uploadResponse.json()) as UploadMediaResponse;
      if (!uploadResult.success || !uploadResult.media) {
        throw new Error(uploadResult.message || 'Upload failed');
      }

      setters.setUploadProgress((prev) => ({ ...prev, [fileId]: 100 }));

      newAttachments.push({
        id: uploadResult.media.id,
        name: uploadResult.media.filename,
        filename: uploadResult.media.filename,
        type: uploadResult.media.type,
        size: uploadResult.media.size,
        url: uploadResult.media.url,
        publicId: uploadResult.media.publicId,
        isImage: uploadResult.media.isImage,
        isVideo: uploadResult.media.isVideo,
        width: uploadResult.media.width,
        height: uploadResult.media.height,
        duration: uploadResult.media.duration,
        createdAt: uploadResult.media.createdAt,
      });
    } catch (error: unknown) {
      if (isAbortError(error)) {
        setters.setUploadProgress((prev) => {
          const next = { ...prev };
          delete next[fileId];
          return next;
        });
        continue;
      }

      console.error('Upload error:', error);
      toast.error(`Failed to upload ${file.name}: ${getErrorMessage(error)}`);
      setters.setUploadProgress((prev) => {
        const next = { ...prev };
        delete next[fileId];
        return next;
      });
    }
  }

  if (newAttachments.length > 0) {
    onAttachmentsChange([...attachments, ...newAttachments]);
    toast.success(`Successfully uploaded ${newAttachments.length} file(s)`);
  }

  setters.setUploading(false);
  setters.setUploadProgress({});
}

export async function removeAttachment(
  attachmentId: string,
  attachments: JobAttachment[],
  refs: Pick<MediaApiRefs, 'deleteMediaAbortRef'>,
  isAbortError: (error: unknown) => boolean,
  onAttachmentsChange: (next: JobAttachment[]) => void
): Promise<void> {
  const attachment = attachments.find((item) => item.id === attachmentId);
  if (!attachment) return;

  try {
    if (attachment.publicId) {
      if (refs.deleteMediaAbortRef.current) refs.deleteMediaAbortRef.current.abort();

      const abortController = new AbortController();
      refs.deleteMediaAbortRef.current = abortController;

      const deleteResponse = await fetchWithCsrf(
        `/api/jobs/upload-media?publicId=${attachment.publicId}`,
        { method: 'DELETE', signal: abortController.signal }
      );

      if (abortController.signal.aborted) return;

      if (!deleteResponse.ok) {
        const errorData = (await deleteResponse.json()) as { message?: string };
        console.error('Delete error:', errorData.message);
        toast.error('Failed to delete file from server');
        return;
      }
    }

    if (attachment.url.startsWith('blob:')) URL.revokeObjectURL(attachment.url);

    onAttachmentsChange(attachments.filter((item) => item.id !== attachmentId));
    toast.success('File removed successfully');
  } catch (error: unknown) {
    if (isAbortError(error)) return;
    console.error('Error removing attachment:', error);
    toast.error('Failed to remove file');
  }
}
