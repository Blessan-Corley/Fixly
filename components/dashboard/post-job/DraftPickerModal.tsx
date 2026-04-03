'use client';

import { motion } from 'framer-motion';
import { Archive, FileText, Image as ImageIcon, Loader, Trash2, X } from 'lucide-react';

import type { DraftSummary } from '../../../types/jobs/post-job';

type DraftPickerModalProps = {
  loadingDrafts: boolean;
  availableDrafts: DraftSummary[];
  onClose: () => void;
  onLoadDraft: (draftId: string) => void | Promise<void>;
  onRequestDeleteDraft: (draft: DraftSummary) => void;
};

export function DraftPickerModal({
  loadingDrafts,
  availableDrafts,
  onClose,
  onLoadDraft,
  onRequestDeleteDraft,
}: DraftPickerModalProps): React.JSX.Element {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mx-4 max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-fixly-card p-6 shadow-xl"
      >
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-fixly-text">Load Draft</h2>
          <button
            type="button"
            onClick={onClose}
            className="hover:bg-fixly-surface rounded-lg p-2 transition-colors"
          >
            <X className="h-5 w-5 text-fixly-text-muted" />
          </button>
        </div>

        {loadingDrafts ? (
          <div className="flex items-center justify-center py-8">
            <Loader className="h-6 w-6 animate-spin text-fixly-accent" />
            <span className="ml-3 text-fixly-text-muted">Loading drafts...</span>
          </div>
        ) : availableDrafts.length === 0 ? (
          <div className="py-8 text-center">
            <Archive className="mx-auto mb-4 h-12 w-12 text-fixly-text-muted" />
            <p className="text-fixly-text-muted">No drafts found</p>
            <p className="mt-1 text-sm text-fixly-text-muted">
              Start filling out the form to auto-save your progress
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {availableDrafts.map((draft) => (
              <div
                key={draft._id}
                className="rounded-lg border border-fixly-border p-4 transition-colors hover:border-fixly-accent"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="mb-1 font-medium text-fixly-text">
                      {draft.title || 'Untitled Job'}
                    </h3>
                    <div className="mb-2 flex items-center gap-4 text-sm text-fixly-text-muted">
                      <span>Step {draft.currentStep}/4</span>
                      <span>{draft.completionPercentage}% complete</span>
                      <span>{draft.ageInHours}h ago</span>
                      {(draft.photoCount ?? 0) > 0 && (
                        <span className="flex items-center gap-1">
                          <ImageIcon className="h-3 w-3" />
                          {draft.photoCount}
                        </span>
                      )}
                      {(draft.videoCount ?? 0) > 0 && (
                        <span className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          {draft.videoCount}
                        </span>
                      )}
                    </div>
                    {draft.description && (
                      <p className="line-clamp-2 text-sm text-fixly-text-muted">
                        {draft.description}
                      </p>
                    )}
                    <div className="mt-2 flex items-center gap-2">
                      <div className="h-2 flex-1 rounded-full bg-fixly-border">
                        <div
                          className="h-full rounded-full bg-fixly-accent transition-all"
                          style={{ width: `${draft.completionPercentage}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="ml-4 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onLoadDraft(draft._id)}
                      className="btn-primary text-sm"
                    >
                      Load
                    </button>
                    <button
                      type="button"
                      onClick={() => onRequestDeleteDraft(draft)}
                      className="rounded p-2 transition-colors hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 flex items-center justify-between border-t border-fixly-border pt-4">
          <p className="text-sm text-fixly-text-muted">
            Drafts are automatically deleted after 14 days
          </p>
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
        </div>
      </motion.div>
    </div>
  );
}
