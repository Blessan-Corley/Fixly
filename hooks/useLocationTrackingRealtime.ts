'use client';

import { toast } from 'sonner';

import { useAblyChannel } from '../contexts/AblyContext';
import { CHANNELS, EVENTS } from '../lib/ably';

type RealtimeOptions = {
  userId: string | null | undefined;
  isTracking: boolean;
  updateLocationNow: () => Promise<void>;
  enableSuggestions: boolean;
  showNotifications: boolean;
  fetchLocationData: (includeSuggestions?: boolean) => Promise<void>;
};

export function useLocationTrackingRealtime({
  userId,
  isTracking,
  updateLocationNow,
  enableSuggestions,
  showNotifications,
  fetchLocationData,
}: RealtimeOptions): void {
  useAblyChannel(
    userId ? CHANNELS.userNotifications(userId) : null,
    EVENTS.LOCATION_UPDATE_REQUESTED,
    () => {
      if (isTracking) {
        void updateLocationNow();
      }
    },
    [isTracking, updateLocationNow]
  );

  useAblyChannel(
    userId ? CHANNELS.userNotifications(userId) : null,
    EVENTS.JOB_SUGGESTIONS_UPDATED,
    (message) => {
      const payload = (message.data || {}) as { jobCount?: number; location?: string };
      const jobCount = payload.jobCount ?? 0;

      if (enableSuggestions && showNotifications && jobCount > 0) {
        toast.info(`Found ${jobCount} relevant jobs near ${payload.location ?? 'you'}`, {
          action: {
            label: 'View Jobs',
            onClick: () => {
              window.location.href = '/dashboard/browse-jobs';
            },
          },
        });
      }

      void fetchLocationData(true);
    },
    [enableSuggestions, showNotifications, fetchLocationData]
  );
}
