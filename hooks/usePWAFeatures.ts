'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import type { ShareDataInput } from './serviceWorker/serviceWorker.types';

export function usePWAFeatures(): {
  canShare: boolean;
  shareContent: (data: ShareDataInput) => Promise<boolean>;
  isFullscreen: boolean;
  requestFullscreen: () => Promise<boolean>;
  exitFullscreen: () => Promise<boolean>;
} {
  const [canShare, setCanShare] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    setCanShare('share' in navigator);
    setIsFullscreen(window.matchMedia?.('(display-mode: fullscreen)').matches ?? false);
  }, []);

  const shareContent = useCallback(
    async (data: ShareDataInput): Promise<boolean> => {
      if (!canShare) {
        try {
          await navigator.clipboard.writeText(data.url ?? data.text ?? '');
          toast.success('Link copied to clipboard!');
          return true;
        } catch {
          toast.error('Failed to share content');
          return false;
        }
      }

      try {
        await navigator.share(data);
        return true;
      } catch (error) {
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error('Sharing failed:', error);
          toast.error('Failed to share content');
        }
        return false;
      }
    },
    [canShare]
  );

  const requestFullscreen = useCallback(async (): Promise<boolean> => {
    if (!document.documentElement.requestFullscreen) {
      return false;
    }

    try {
      await document.documentElement.requestFullscreen();
      setIsFullscreen(true);
      return true;
    } catch (error) {
      console.error('Fullscreen request failed:', error);
      return false;
    }
  }, []);

  const exitFullscreen = useCallback(async (): Promise<boolean> => {
    if (!document.exitFullscreen) {
      return false;
    }

    try {
      await document.exitFullscreen();
      setIsFullscreen(false);
      return true;
    } catch (error) {
      console.error('Exit fullscreen failed:', error);
      return false;
    }
  }, []);

  return {
    canShare,
    shareContent,
    isFullscreen,
    requestFullscreen,
    exitFullscreen,
  };
}
