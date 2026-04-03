'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import Image from 'next/image';
import { type MouseEvent } from 'react';

import type { JobAttachment } from '../../app/dashboard/jobs/[jobId]/page.types';

type JobImageLightboxProps = {
  isOpen: boolean;
  image: JobAttachment | null;
  onClose: () => void;
};

export default function JobImageLightbox({ isOpen, image, onClose }: JobImageLightboxProps) {
  const handleContentClick = (event: MouseEvent<HTMLDivElement>): void => {
    event.stopPropagation();
  };

  return (
    <AnimatePresence>
      {isOpen && image && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="relative max-h-full max-w-4xl"
            onClick={handleContentClick}
          >
            <Image
              src={image.url}
              alt={image.name || 'Job attachment'}
              width={1600}
              height={1200}
              unoptimized
              className="max-h-[80vh] max-w-full rounded-lg object-contain"
            />

            <button
              onClick={onClose}
              className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-black/70 text-white transition-colors hover:bg-black/90"
            >
              <X className="h-5 w-5" />
            </button>

            {image.name && (
              <div className="absolute bottom-4 left-4 right-4 rounded-lg bg-black/70 p-4 text-white">
                <p className="font-medium">{image.name}</p>
                {typeof image.size === 'number' && Number.isFinite(image.size) && (
                  <p className="text-sm text-gray-300">
                    {(image.size / 1024 / 1024).toFixed(1)} MB
                  </p>
                )}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
