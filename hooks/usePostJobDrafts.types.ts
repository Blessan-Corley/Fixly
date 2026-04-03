import type { Dispatch, SetStateAction } from 'react';

import type {
  DraftStatus,
  DraftSummary,
  PostJobFormData,
  SaveDraftType,
} from '../types/jobs/post-job';

export interface UsePostJobDraftsParams {
  currentStep: number;
  formData: PostJobFormData;
  isAbortError: (error: unknown) => boolean;
  setCurrentStep: Dispatch<SetStateAction<number>>;
  setFormData: Dispatch<SetStateAction<PostJobFormData>>;
  setLoading: Dispatch<SetStateAction<boolean>>;
}

export interface UsePostJobDraftsResult {
  availableDrafts: DraftSummary[];
  currentDraftId: string | null;
  draftStatus: DraftStatus;
  draftToDelete: DraftSummary | null;
  hasUnsavedChanges: boolean;
  lastSaved: Date | null;
  loadingDrafts: boolean;
  showDeleteConfirm: boolean;
  showDraftModal: boolean;
  cancelDeleteDraft: () => void;
  clearDraftStateAfterSubmit: () => void;
  closeDraftModal: () => void;
  confirmDeleteDraft: () => Promise<void>;
  loadDraft: (draftId: string) => Promise<void>;
  openDraftModal: () => void;
  requestDeleteDraft: (draft: DraftSummary) => void;
  saveDraft: (saveType?: SaveDraftType) => Promise<DraftSummary | undefined>;
}
