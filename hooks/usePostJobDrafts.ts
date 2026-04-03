'use client';

import { useEffect, useRef, useState } from 'react';

import type { DraftStatus, DraftSummary, PostJobFormData, SaveDraftType } from '../types/jobs/post-job';
import type { UsePostJobDraftsParams, UsePostJobDraftsResult } from './usePostJobDrafts.types';
import {
  confirmDeleteDraft as apiConfirmDeleteDraft,
  fetchUserDrafts as apiFetchUserDrafts,
  loadDraft as apiLoadDraft,
  saveDraft as apiSaveDraft,
} from './usePostJobDrafts.api';

const hasPostJobDraftContent = (formData: PostJobFormData): boolean => {
  return Boolean(
    formData.title.trim() ||
    formData.description.trim() ||
    formData.skillsRequired.length > 0 ||
    formData.attachments.length > 0
  );
};

export function usePostJobDrafts({
  currentStep,
  formData,
  isAbortError,
  setCurrentStep,
  setFormData,
  setLoading,
}: UsePostJobDraftsParams): UsePostJobDraftsResult {
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  const [draftStatus, setDraftStatus] = useState<DraftStatus>('unsaved');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [availableDrafts, setAvailableDrafts] = useState<DraftSummary[]>([]);
  const [loadingDrafts, setLoadingDrafts] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [draftToDelete, setDraftToDelete] = useState<DraftSummary | null>(null);

  const draftsListAbortRef = useRef<AbortController | null>(null);
  const draftSaveAbortRef = useRef<AbortController | null>(null);
  const draftLoadAbortRef = useRef<AbortController | null>(null);
  const draftDeleteAbortRef = useRef<AbortController | null>(null);
  const autoSaveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const suppressDirtyTrackingRef = useRef(false);

  const fetchUserDrafts = (): Promise<void> =>
    apiFetchUserDrafts({ draftsListAbortRef }, { setLoadingDrafts, setAvailableDrafts }, isAbortError);

  const saveDraft = (saveType: SaveDraftType = 'auto'): Promise<DraftSummary | undefined> =>
    apiSaveDraft(
      { currentDraftId, draftStatus, currentStep, formData },
      { draftSaveAbortRef },
      { setDraftStatus, setCurrentDraftId, setLastSaved, setHasUnsavedChanges },
      isAbortError,
      saveType
    );

  const loadDraft = (draftId: string): Promise<void> =>
    apiLoadDraft(
      draftId,
      { draftLoadAbortRef, suppressDirtyTrackingRef },
      {
        setLoading,
        setFormData,
        setCurrentStep,
        setCurrentDraftId,
        setLastSaved,
        setDraftStatus,
        setHasUnsavedChanges,
        setShowDraftModal,
      },
      isAbortError
    );

  const cancelDeleteDraft = (): void => {
    setShowDeleteConfirm(false);
    setDraftToDelete(null);
  };

  const confirmDeleteDraft = (): Promise<void> =>
    apiConfirmDeleteDraft(
      { currentDraftId, draftToDelete },
      { draftDeleteAbortRef },
      { setAvailableDrafts, setCurrentDraftId, setDraftStatus, setLastSaved },
      isAbortError,
      cancelDeleteDraft
    );

  const requestDeleteDraft = (draft: DraftSummary): void => {
    setDraftToDelete(draft);
    setShowDeleteConfirm(true);
  };

  const openDraftModal = (): void => setShowDraftModal(true);
  const closeDraftModal = (): void => setShowDraftModal(false);

  const clearDraftStateAfterSubmit = (): void => {
    setCurrentDraftId(null);
    setDraftStatus('unsaved');
    setHasUnsavedChanges(false);
    setLastSaved(null);
  };

  useEffect(() => {
    void fetchUserDrafts();
  }, []);

  useEffect(() => {
    if (suppressDirtyTrackingRef.current) {
      suppressDirtyTrackingRef.current = false;
      return;
    }

    if (!hasPostJobDraftContent(formData)) return;

    setHasUnsavedChanges(true);
    if (draftStatus === 'saved') setDraftStatus('unsaved');
  }, [currentStep, draftStatus, formData]);

  useEffect(() => {
    if (autoSaveIntervalRef.current) {
      clearInterval(autoSaveIntervalRef.current);
      autoSaveIntervalRef.current = null;
    }

    if (!hasUnsavedChanges) return;

    autoSaveIntervalRef.current = setInterval(() => {
      void saveDraft('auto');
    }, 30000);

    return () => {
      if (autoSaveIntervalRef.current) {
        clearInterval(autoSaveIntervalRef.current);
        autoSaveIntervalRef.current = null;
      }
    };
  }, [currentStep, draftStatus, formData, hasUnsavedChanges]);

  useEffect(() => {
    return () => {
      if (draftsListAbortRef.current) draftsListAbortRef.current.abort();
      if (draftSaveAbortRef.current) draftSaveAbortRef.current.abort();
      if (draftLoadAbortRef.current) draftLoadAbortRef.current.abort();
      if (draftDeleteAbortRef.current) draftDeleteAbortRef.current.abort();
      if (autoSaveIntervalRef.current) clearInterval(autoSaveIntervalRef.current);
    };
  }, []);

  return {
    availableDrafts,
    cancelDeleteDraft,
    clearDraftStateAfterSubmit,
    closeDraftModal,
    confirmDeleteDraft,
    currentDraftId,
    draftStatus,
    draftToDelete,
    hasUnsavedChanges,
    lastSaved,
    loadDraft,
    loadingDrafts,
    openDraftModal,
    requestDeleteDraft,
    saveDraft,
    showDeleteConfirm,
    showDraftModal,
  };
}
