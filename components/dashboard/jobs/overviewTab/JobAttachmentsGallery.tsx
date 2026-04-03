'use client';

import { Eye, FileText } from 'lucide-react';
import Image from 'next/image';
import { type MouseEvent as ReactMouseEvent, type SyntheticEvent } from 'react';

import type { JobAttachment } from '../../../../app/dashboard/jobs/[jobId]/page.types';

type Props = {
  attachments: JobAttachment[];
  onImageSelect: (attachment: JobAttachment) => void;
  onVideoClick: (event: ReactMouseEvent<HTMLVideoElement>) => void;
  onVideoEnded: (event: SyntheticEvent<HTMLVideoElement>) => void;
};

export function JobAttachmentsGallery({
  attachments,
  onImageSelect,
  onVideoClick,
  onVideoEnded,
}: Props): React.JSX.Element {
  return (
    <div>
      <h3 className="mb-4 text-lg font-semibold text-fixly-text">Photos &amp; Videos</h3>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {attachments.map((attachment, index) => (
          <div key={attachment.id ?? index} className="group relative">
            {attachment.isImage ? (
              <div
                className="relative cursor-pointer overflow-hidden rounded-lg border border-fixly-border bg-fixly-card transition-shadow hover:shadow-lg"
                onClick={() => onImageSelect(attachment)}
              >
                <Image
                  src={attachment.url}
                  alt={attachment.name ?? `Image ${index + 1}`}
                  width={640}
                  height={320}
                  unoptimized
                  className="h-32 w-full object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/20">
                  <Eye className="h-6 w-6 text-white opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
                {attachment.name && (
                  <div className="absolute bottom-0 left-0 right-0 bg-black/70 p-2 text-white">
                    <p className="truncate text-xs">{attachment.name}</p>
                  </div>
                )}
              </div>
            ) : attachment.isVideo ? (
              <div className="relative overflow-hidden rounded-lg border border-fixly-border bg-fixly-card">
                <div className="relative">
                  <video
                    id={`video-${attachment.id ?? index}`}
                    className="h-32 w-full cursor-pointer object-cover"
                    poster={attachment.thumbnail}
                    preload="metadata"
                    onClick={onVideoClick}
                    onEnded={onVideoEnded}
                  >
                    <source src={attachment.url} type={attachment.type} />
                    Your browser does not support the video tag.
                  </video>
                  <div className="play-button pointer-events-none absolute inset-0 flex cursor-pointer items-center justify-center bg-black/20">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-fixly-accent/80 transition-colors hover:bg-fixly-accent">
                      <div className="ml-1 h-0 w-0 border-b-[6px] border-l-[8px] border-t-[6px] border-b-transparent border-l-white border-t-transparent" />
                    </div>
                  </div>
                </div>
                {attachment.name && (
                  <div className="absolute bottom-0 left-0 right-0 bg-black/70 p-2 text-white">
                    <p className="truncate text-xs">{attachment.name}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="relative flex h-32 items-center justify-center overflow-hidden rounded-lg border border-fixly-border bg-fixly-card p-4">
                <div className="text-center">
                  <FileText className="mx-auto mb-2 h-8 w-8 text-fixly-accent" />
                  <p className="truncate text-sm text-fixly-text-muted">
                    {attachment.name ?? 'File'}
                  </p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      <p className="mt-3 text-sm text-fixly-text-muted">
        Click on videos to play them, images to view full size
      </p>
    </div>
  );
}
