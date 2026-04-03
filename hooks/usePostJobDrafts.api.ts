'use client';

import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import { toast } from 'sonner';

import { fetchWithCsrf } from '@/lib/api/fetchWithCsrf';
import { mapDraftSummaryToPostJobFormData } from '../lib/jobs/post-job-helpers';
import type {
  DraftLoadResponse,
  DraftSaveResponse,
  DraftStatus,
  DraftSummary,
  DraftsListResponse,
  PostJobFormData,
  SaveDraftType,
} from '../types/jobs/post-job';

export type DraftApiState = {
  currentDraftId: string | null;
  draftStatus: DraftStatus;
  currentStep: number;
  formData: PostJobFormData;
  draftToDelete: DraftSummary | null;
};

export type DraftApiSetters = {
  setCurrentDraftId: Dispatch<SetStateAction<string | null>>;
  setDraftStatus: Dispatch<SetStateAction<DraftStatus>>;
  setLastSaved: Dispatch<SetStateAction<Date | null>>;
  setHasUnsavedChanges: Dispatch<SetStateAction<boolean>>;
  setAvailableDrafts: Dispatch<SetStateAction<DraftSummary[]>>;
  setLoadingDrafts: Dispatch<SetStateAction<boolean>>;
  setShowDraftModal: Dispatch<SetStateAction<boolean>>;
  setLoading: Dispatch<SetStateAction<boolean>>;
  setFormData: Dispatch<SetStateAction<PostJobFormData>>;
  setCurrentStep: Dispatch<SetStateAction<number>>;
};

export type DraftApiRefs = {
  draftsListAbortRef: MutableRefObject<AbortController | null>;
  draftSaveAbortRef: MutableRefObject<AbortController | null>;
  draftLoadAbortRef: MutableRefObject<AbortController | null>;
  draftDeleteAbortRef: MutableRefObject<AbortController | null>;
  suppressDirtyTrackingRef: MutableRefObject<boolean>;
};

export async function fetchUserDrafts(
  refs: Pick<DraftApiRefs, 'draftsListAbortRef'>,
  setters: Pick<DraftApiSetters, 'setLoadingDrafts' | 'setAvailableDrafts'>,
  isAbortError: (error: unknown) => boolean
): Promise<void> {
  setters.setLoadingDrafts(true);
  try {
    if (refs.draftsListAbortRef.current) refs.draftsListAbortRef.current.abort();

    const abortController = new AbortController();
    refs.draftsListAbortRef.current = abortController;

    const response = await fetch('/api/jobs/drafts?limit=10', {
      signal: abortController.signal,
    });

    if (abortController.signal.aborted) return;
    if (!response.ok) throw new Error('Failed to fetch drafts');

    const data = (await response.json()) as DraftsListResponse;
    setters.setAvailableDrafts(data.drafts ?? []);
  } catch (error: unknown) {
    if (isAbortError(error)) return;
    console.error('Error fetching drafts:', error);
    toast.error('Failed to load drafts');
  } finally {
    setters.setLoadingDrafts(false);
  }
}

export async function saveDraft(
  state: Pick<DraftApiState, 'currentDraftId' | 'draftStatus' | 'currentStep' | 'formData'>,
  refs: Pick<DraftApiRefs, 'draftSaveAbortRef'>,
  setters: Pick<
    DraftApiSetters,
    'setDraftStatus' | 'setCurrentDraftId' | 'setLastSaved' | 'setHasUnsavedChanges'
  >,
  isAbortError: (error: unknown) => boolean,
  saveType: SaveDraftType = 'auto'
): Promise<DraftSummary | undefined> {
  if (state.draftStatus === 'saving') return undefined;

  setters.setDraftStatus('saving');
  try {
    if (refs.draftSaveAbortRef.current) refs.draftSaveAbortRef.current.abort();

    const abortController = new AbortController();
    refs.draftSaveAbortRef.current = abortController;

    const response = await fetchWithCsrf('/api/jobs/drafts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        completedSteps: [],
        currentStep: state.currentStep,
        draftId: state.currentDraftId,
        formData: state.formData,
        saveType,
      }),
      signal: abortController.signal,
    });

    if (abortController.signal.aborted) return undefined;
    if (!response.ok) throw new Error('Failed to save draft');

    const data = (await response.json()) as DraftSaveResponse;
    setters.setCurrentDraftId(data.draft._id);
    setters.setLastSaved(new Date());
    setters.setDraftStatus('saved');
    setters.setHasUnsavedChanges(false);

    if (saveType === 'manual') toast.success('Draft saved successfully');
    return data.draft;
  } catch (error: unknown) {
    if (isAbortError(error)) return undefined;
    console.error('Error saving draft:', error);
    setters.setDraftStatus('error');
    if (saveType === 'manual') toast.error('Failed to save draft');
    return undefined;
  }
}

export async function loadDraft(
  draftId: string,
  refs: Pick<DraftApiRefs, 'draftLoadAbortRef' | 'suppressDirtyTrackingRef'>,
  setters: Pick<
    DraftApiSetters,
    | 'setLoading'
    | 'setFormData'
    | 'setCurrentStep'
    | 'setCurrentDraftId'
    | 'setLastSaved'
    | 'setDraftStatus'
    | 'setHasUnsavedChanges'
    | 'setShowDraftModal'
  >,
  isAbortError: (error: unknown) => boolean
): Promise<void> {
  setters.setLoading(true);
  try {
    if (refs.draftLoadAbortRef.current) refs.draftLoadAbortRef.current.abort();

    const abortController = new AbortController();
    refs.draftLoadAbortRef.current = abortController;

    const response = await fetch(`/api/jobs/drafts/${draftId}`, {
      signal: abortController.signal,
    });

    if (abortController.signal.aborted) return;
    if (!response.ok) throw new Error('Failed to load draft');

    const data = (await response.json()) as DraftLoadResponse;
    const draft = data.draft;

    // Prevent dirty-tracking from immediately marking a loaded draft as unsaved.
    refs.suppressDirtyTrackingRef.current = true;
    setters.setFormData(mapDraftSummaryToPostJobFormData(draft));
    setters.setCurrentStep(draft.currentStep || 1);
    setters.setCurrentDraftId(draft._id);

    const lastSavedAt = draft.lastAutoSave ?? draft.lastManualSave;
    setters.setLastSaved(lastSavedAt ? new Date(lastSavedAt) : null);
    setters.setDraftStatus('saved');
    setters.setHasUnsavedChanges(false);
    setters.setShowDraftModal(false);

    toast.success(`Draft "${draft.title || 'Untitled Job'}" loaded successfully`);
  } catch (error: unknown) {
    if (isAbortError(error)) return;
    console.error('Error loading draft:', error);
    toast.error('Failed to load draft');
  } finally {
    setters.setLoading(false);
  }
}

export async function confirmDeleteDraft(
  state: Pick<DraftApiState, 'currentDraftId' | 'draftToDelete'>,
  refs: Pick<DraftApiRefs, 'draftDeleteAbortRef'>,
  setters: Pick<
    DraftApiSetters,
    'setAvailableDrafts' | 'setCurrentDraftId' | 'setDraftStatus' | 'setLastSaved'
  >,
  isAbortError: (error: unknown) => boolean,
  cancelDeleteDraft: () => void
): Promise<void> {
  if (!state.draftToDelete) return;

  try {
    if (refs.draftDeleteAbortRef.current) refs.draftDeleteAbortRef.current.abort();

    const abortController = new AbortController();
    refs.draftDeleteAbortRef.current = abortController;

    const response = await fetchWithCsrf(
      `/api/jobs/drafts?draftId=${state.draftToDelete._id}`,
      { method: 'DELETE', signal: abortController.signal }
    );

    if (abortController.signal.aborted) return;
    if (!response.ok) throw new Error('Failed to delete draft');

    setters.setAvailableDrafts((prevDrafts) =>
      prevDrafts.filter((draft) => draft._id !== state.draftToDelete!._id)
    );

    if (state.currentDraftId === state.draftToDelete._id) {
      setters.setCurrentDraftId(null);
      setters.setDraftStatus('unsaved');
      setters.setLastSaved(null);
    }

    toast.success('Draft deleted successfully');
  } catch (error: unknown) {
    if (isAbortError(error)) return;
    console.error('Error deleting draft:', error);
    toast.error('Failed to delete draft');
  } finally {
    cancelDeleteDraft();
  }
}
