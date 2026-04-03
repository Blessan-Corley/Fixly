'use client';

import { Camera, FileText, Loader, Upload, X } from 'lucide-react';
import Image from 'next/image';
import { type DragEvent } from 'react';

import { getPostJobAttachmentCounts } from '../../../lib/jobs/post-job-helpers';
import type {
  FormErrors,
  PostJobFormData,
  UploadProgressMap,
} from '../../../types/jobs/post-job';

interface AttachmentUploadZoneProps {
  dragOver: boolean;
  errors: FormErrors;
  formData: PostJobFormData;
  uploading: boolean;
  uploadProgress: UploadProgressMap;
  onDragLeave: (e: DragEvent<HTMLDivElement>) => void;
  onDragOver: (e: DragEvent<HTMLDivElement>) => void;
  onDrop: (e: DragEvent<HTMLDivElement>) => void;
  onFileSelect: (files: FileList | null) => void | Promise<void>;
  onRemoveAttachment: (attachmentId: string) => void | Promise<void>;
}

export function AttachmentUploadZone({
  dragOver,
  errors,
  formData,
  uploading,
  uploadProgress,
  onDragLeave,
  onDragOver,
  onDrop,
  onFileSelect,
  onRemoveAttachment,
}: AttachmentUploadZoneProps): React.JSX.Element {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-fixly-text">
        Photos & Videos <span className="text-red-500">*</span>
      </label>
      <p className="mb-4 text-sm text-fixly-text-muted">
        Upload at least 1 photo (max 5 photos and 1 video). Photos help fixers understand your
        requirements better.
      </p>

      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
          dragOver
            ? 'border-fixly-accent bg-fixly-accent/5'
            : 'border-fixly-border hover:border-fixly-accent'
        }`}
      >
        <div className="flex flex-col items-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-fixly-accent/10">
            <Upload className="h-6 w-6 text-fixly-accent" />
          </div>
          <h3 className="mb-2 font-medium text-fixly-text">
            {dragOver ? 'Drop files here' : 'Upload photos and videos'}
          </h3>
          <p className="mb-4 text-sm text-fixly-text-muted">
            Drag and drop files here, or click to browse
          </p>
          <div className="flex items-center gap-4 text-xs text-fixly-text-muted">
            <span>• Images: max 5MB (5 max)</span>
            <span>• Videos: max 50MB (1 max)</span>
            <span>• Formats: JPG, PNG, WebP, MP4, MOV, AVI</span>
          </div>
          <input
            type="file"
            multiple
            accept="image/*,video/*"
            onChange={(e) => { void onFileSelect(e.target.files); }}
            className="hidden"
            id="file-upload-step3"
          />
          <label htmlFor="file-upload-step3" className="btn-primary mt-4 cursor-pointer">
            <Camera className="mr-2 h-4 w-4" />
            Choose Files
          </label>
        </div>
      </div>

      {errors.attachments && (
        <div className="mt-2">
          <p className="text-sm text-red-500">{errors.attachments}</p>
        </div>
      )}

      <div className="mt-4 flex items-center gap-4 text-sm text-fixly-text-muted">
        <span>Photos: {getPostJobAttachmentCounts(formData.attachments).photos}/5</span>
        <span>Videos: {getPostJobAttachmentCounts(formData.attachments).videos}/1</span>
      </div>

      {formData.attachments.length > 0 && (
        <div className="mt-6">
          <h4 className="mb-4 font-medium text-fixly-text">
            Uploaded Files ({formData.attachments.length})
          </h4>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {formData.attachments.map((attachment) => (
              <div key={attachment.id} className="group relative">
                <div className="relative overflow-hidden rounded-lg border border-fixly-border bg-fixly-card">
                  {attachment.isImage ? (
                    <Image
                      src={attachment.url}
                      alt={attachment.name}
                      fill
                      sizes="(max-width: 768px) 50vw, 25vw"
                      unoptimized
                      className="h-24 w-full object-cover"
                    />
                  ) : (
                    <div className="bg-fixly-surface flex h-24 w-full items-center justify-center">
                      <div className="text-center">
                        <FileText className="mx-auto mb-1 h-8 w-8 text-fixly-accent" />
                        <p className="text-xs text-fixly-text-muted">Video</p>
                      </div>
                    </div>
                  )}

                  <div className="absolute bottom-0 left-0 right-0 bg-black/70 p-2 text-white dark:bg-black/80">
                    <p className="truncate text-xs">{attachment.name}</p>
                    <p className="text-xs text-gray-300 dark:text-gray-400">
                      {(attachment.size / 1024 / 1024).toFixed(1)} MB
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => { void onRemoveAttachment(attachment.id); }}
                    className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white opacity-0 transition-opacity hover:bg-red-600 group-hover:opacity-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {uploading && Object.keys(uploadProgress).length > 0 && (
        <div className="mt-4 space-y-2">
          {Object.entries(uploadProgress).map(([fileId, progress]) => (
            <div key={fileId} className="flex items-center gap-3">
              <Loader className="h-4 w-4 animate-spin text-fixly-accent" />
              <div className="bg-fixly-surface h-2 flex-1 rounded-full">
                <div
                  className="h-full rounded-full bg-fixly-accent transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-xs text-fixly-text-muted">{progress}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
