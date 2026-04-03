'use client';

import type { DraftSummary } from '../../../types/jobs/post-job';

import { DeleteDraftConfirmModal } from './DeleteDraftConfirmModal';
import { DraftPickerModal } from './DraftPickerModal';
import { ProUpgradeModal } from './ProUpgradeModal';

interface PostJobModalsProps {
  showProModal: boolean;
  onCloseProModal: () => void;
  onUpgradeToPro: () => void;
  showDraftModal: boolean;
  loadingDrafts: boolean;
  availableDrafts: DraftSummary[];
  onCloseDraftModal: () => void;
  onLoadDraft: (draftId: string) => void | Promise<void>;
  onRequestDeleteDraft: (draft: DraftSummary) => void;
  showDeleteConfirm: boolean;
  draftToDelete: DraftSummary | null;
  onCancelDeleteDraft: () => void;
  onConfirmDeleteDraft: () => void | Promise<void>;
}

export default function PostJobModals({
  showProModal,
  onCloseProModal,
  onUpgradeToPro,
  showDraftModal,
  loadingDrafts,
  availableDrafts,
  onCloseDraftModal,
  onLoadDraft,
  onRequestDeleteDraft,
  showDeleteConfirm,
  draftToDelete,
  onCancelDeleteDraft,
  onConfirmDeleteDraft,
}: PostJobModalsProps): JSX.Element {
  return (
    <>
      {showProModal && (
        <ProUpgradeModal onClose={onCloseProModal} onUpgrade={onUpgradeToPro} />
      )}

      {showDraftModal && (
        <DraftPickerModal
          loadingDrafts={loadingDrafts}
          availableDrafts={availableDrafts}
          onClose={onCloseDraftModal}
          onLoadDraft={onLoadDraft}
          onRequestDeleteDraft={onRequestDeleteDraft}
        />
      )}

      <DeleteDraftConfirmModal
        showDeleteConfirm={showDeleteConfirm}
        draftToDelete={draftToDelete}
        onCancel={onCancelDeleteDraft}
        onConfirm={onConfirmDeleteDraft}
      />
    </>
  );
}
