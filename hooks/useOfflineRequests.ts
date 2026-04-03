'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { SERVICE_WORKER_SYNC_TAGS } from './serviceWorker/serviceWorker.types';
import type { PendingRequest } from './serviceWorker/serviceWorker.types';
import { getAllFromStore, openDB, requestSync, requestToPromise } from './serviceWorker/serviceWorker.utils';

export function useOfflineRequests(): {
  pendingRequests: PendingRequest[];
  isLoading: boolean;
  loadPendingRequests: () => Promise<void>;
  clearCompletedRequests: () => Promise<void>;
  retryFailedRequests: () => Promise<void>;
} {
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadPendingRequests = useCallback(async () => {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      return;
    }

    setIsLoading(true);
    try {
      const db = await openDB();
      const transaction = db.transaction(['requests'], 'readonly');
      const store = transaction.objectStore('requests');
      const requests = await getAllFromStore<PendingRequest>(store);
      setPendingRequests(requests);
    } catch (error) {
      console.error('Failed to load pending requests:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearCompletedRequests = useCallback(async () => {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      return;
    }

    try {
      const db = await openDB();
      const transaction = db.transaction(['requests'], 'readwrite');
      const store = transaction.objectStore('requests');
      await requestToPromise(store.clear());
      setPendingRequests([]);
      toast.success('Cleared completed offline requests');
    } catch (error) {
      console.error('Failed to clear requests:', error);
      toast.error('Failed to clear offline requests');
    }
  }, []);

  const retryFailedRequests = useCallback(async () => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    try {
      await requestSync(SERVICE_WORKER_SYNC_TAGS.analytics);
      await requestSync(SERVICE_WORKER_SYNC_TAGS.notifications);
      await requestSync(SERVICE_WORKER_SYNC_TAGS.drafts);
      toast.info('Retrying failed requests...');
    } catch (error) {
      console.error('Failed to retry requests:', error);
      toast.error('Failed to retry offline requests');
    }
  }, []);

  useEffect(() => {
    loadPendingRequests();
  }, [loadPendingRequests]);

  return {
    pendingRequests,
    isLoading,
    loadPendingRequests,
    clearCompletedRequests,
    retryFailedRequests,
  };
}
