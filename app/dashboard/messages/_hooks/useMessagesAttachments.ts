'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import { toStringSafe } from '../_lib/normalizers';
import type { PendingAttachment } from '../_lib/types';

type UseMessagesAttachmentsResult = {
  pendingAttachments: PendingAttachment[];
  uploadAttachments: (files: FileList | File[]) => Promise<void>;
  removePendingAttachment: (uploadId: string) => void;
  clearAttachments: () => void;
};

export function useMessagesAttachments(): UseMessagesAttachmentsResult {
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);

  const removePendingAttachment = (uploadId: string): void => {
    setPendingAttachments((previous) =>
      previous.filter((attachment) => attachment.uploadId !== uploadId)
    );
  };

  const clearAttachments = (): void => {
    setPendingAttachments([]);
  };

  const uploadAttachments = async (files: FileList | File[]): Promise<void> => {
    const fileList = Array.from(files);
    for (const file of fileList.slice(0, 5)) {
      const uploadId = `upload-${Date.now()}-${file.name}`;
      const isImage = file.type.startsWith('image/');

      setPendingAttachments((previous) => [
        ...previous,
        {
          uploadId,
          type: isImage ? 'image' : 'document',
          url: '',
          filename: file.name,
          size: file.size,
          mimeType: file.type,
          uploading: true,
        },
      ]);

      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', 'general');

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        const payload = (await response.json()) as Record<string, unknown>;
        if (!response.ok || payload.success !== true) {
          removePendingAttachment(uploadId);
          toast.error(toStringSafe(payload.message, `Failed to upload ${file.name}`));
          continue;
        }

        setPendingAttachments((previous) =>
          previous.map((attachment) =>
            attachment.uploadId === uploadId
              ? {
                  ...attachment,
                  url: toStringSafe(payload.url),
                  filename: toStringSafe(payload.filename, file.name),
                  size: typeof payload.size === 'number' ? payload.size : file.size,
                  mimeType: toStringSafe(payload.type, file.type),
                  type:
                    toStringSafe(payload.fileKind).toLowerCase() === 'image'
                      ? 'image'
                      : 'document',
                  uploading: false,
                }
              : attachment
          )
        );
      } catch {
        removePendingAttachment(uploadId);
        toast.error(`Failed to upload ${file.name}`);
      }
    }
  };

  return { pendingAttachments, uploadAttachments, removePendingAttachment, clearAttachments };
}
