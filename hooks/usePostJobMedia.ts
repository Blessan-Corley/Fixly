'use client';

import { useEffect, useRef, useState, type DragEvent } from 'react';

import type { JobAttachment, UploadProgressMap } from '../types/jobs/post-job';
import { handleFileSelect as apiHandleFileSelect, removeAttachment as apiRemoveAttachment } from './usePostJobMedia.api';

interface UsePostJobMediaParams {
  attachments: JobAttachment[];
  isAbortError: (error: unknown) => boolean;
  onAttachmentsChange: (nextAttachments: JobAttachment[]) => void;
}

interface UsePostJobMediaResult {
  dragOver: boolean;
  uploading: boolean;
  uploadProgress: UploadProgressMap;
  handleDragLeave: (e: DragEvent<HTMLDivElement>) => void;
  handleDragOver: (e: DragEvent<HTMLDivElement>) => void;
  handleDrop: (e: DragEvent<HTMLDivElement>) => void;
  handleFileSelect: (files: FileList | null) => Promise<void>;
  removeAttachment: (attachmentId: string) => Promise<void>;
}

export function usePostJobMedia({
  attachments,
  isAbortError,
  onAttachmentsChange,
}: UsePostJobMediaParams): UsePostJobMediaResult {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgressMap>({});
  const [dragOver, setDragOver] = useState(false);

  const uploadMediaAbortRef = useRef<AbortController | null>(null);
  const deleteMediaAbortRef = useRef<AbortController | null>(null);

  const handleFileSelect = (files: FileList | null): Promise<void> =>
    apiHandleFileSelect(
      files,
      attachments,
      { uploadMediaAbortRef },
      { setUploading, setUploadProgress },
      isAbortError,
      onAttachmentsChange
    );

  const removeAttachment = (attachmentId: string): Promise<void> =>
    apiRemoveAttachment(
      attachmentId,
      attachments,
      { deleteMediaAbortRef },
      isAbortError,
      onAttachmentsChange
    );

  const handleDragOver = (e: DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    setDragOver(false);
    void handleFileSelect(e.dataTransfer.files);
  };

  useEffect(() => {
    return () => {
      if (uploadMediaAbortRef.current) uploadMediaAbortRef.current.abort();
      if (deleteMediaAbortRef.current) deleteMediaAbortRef.current.abort();
    };
  }, []);

  return {
    dragOver,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    handleFileSelect,
    removeAttachment,
    uploading,
    uploadProgress,
  };
}
