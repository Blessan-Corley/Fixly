'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import {
  getErrorMessage,
  isAbortError,
  parseResponsePayload,
} from '@/app/dashboard/jobs/_lib/jobs.helpers';
import type {
  DashboardJob,
  DeleteModalState,
  PaginationState,
} from '@/app/dashboard/jobs/_lib/jobs.types';

type UseJobsDeleteParams = {
  checkConnection: () => boolean;
  handleNetworkError: (error: unknown) => void;
  setJobs: React.Dispatch<React.SetStateAction<DashboardJob[]>>;
  setPagination: React.Dispatch<React.SetStateAction<PaginationState>>;
};

type UseJobsDeleteResult = {
  deleteModal: DeleteModalState;
  openDeleteModal: (jobId: string) => void;
  closeDeleteModal: () => void;
  handleDeleteJob: () => Promise<void>;
};

export function useJobsDelete({
  checkConnection,
  handleNetworkError,
  setJobs,
  setPagination,
}: UseJobsDeleteParams): UseJobsDeleteResult {
  const [deleteModal, setDeleteModal] = useState<DeleteModalState>({
    isOpen: false,
    jobId: null,
    loading: false,
  });

  const deleteAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      deleteAbortRef.current?.abort();
    };
  }, []);

  const openDeleteModal = useCallback((jobId: string): void => {
    setDeleteModal({ isOpen: true, jobId, loading: false });
  }, []);

  const closeDeleteModal = useCallback((): void => {
    setDeleteModal({ isOpen: false, jobId: null, loading: false });
  }, []);

  const handleDeleteJob = useCallback(async (): Promise<void> => {
    if (!checkConnection()) return;

    const jobId = deleteModal.jobId;
    if (!jobId) return;

    setDeleteModal((prev) => ({ ...prev, loading: true }));

    deleteAbortRef.current?.abort();
    const abortController = new AbortController();
    deleteAbortRef.current = abortController;

    try {
      const response = await fetch(`/api/jobs/${jobId}`, {
        method: 'DELETE',
        signal: abortController.signal,
      });

      if (abortController.signal.aborted) return;

      const payload = await parseResponsePayload(response);
      if (!response.ok) {
        toast.error(getErrorMessage(payload, 'Failed to delete job'), {
          style: { background: '#EF4444', color: 'white' },
        });
        return;
      }

      toast.success('Job deleted successfully', {
        style: { background: '#10B981', color: 'white' },
      });
      closeDeleteModal();
      setJobs((prev) => prev.filter((job) => job._id !== jobId));
      setPagination((prev) => ({ ...prev, total: Math.max(0, prev.total - 1) }));
    } catch (error: unknown) {
      if (isAbortError(error)) return;
      handleNetworkError(error);
    } finally {
      setDeleteModal((prev) => ({ ...prev, loading: false }));
    }
  }, [checkConnection, closeDeleteModal, deleteModal.jobId, handleNetworkError, setJobs, setPagination]);

  return { deleteModal, openDeleteModal, closeDeleteModal, handleDeleteJob };
}
