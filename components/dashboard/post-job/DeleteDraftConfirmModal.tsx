'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';

import type { DraftSummary } from '../../../types/jobs/post-job';

type DeleteDraftConfirmModalProps = {
  showDeleteConfirm: boolean;
  draftToDelete: DraftSummary | null;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
};

export function DeleteDraftConfirmModal({
  showDeleteConfirm,
  draftToDelete,
  onCancel,
  onConfirm,
}: DeleteDraftConfirmModalProps): React.JSX.Element {
  return (
    <AnimatePresence>
      {showDeleteConfirm && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="w-full max-w-md overflow-hidden rounded-2xl bg-fixly-card shadow-2xl"
          >
            <div className="bg-gradient-to-r from-red-500 to-red-600 p-6 text-white">
              <div className="flex items-center space-x-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Delete Draft</h3>
                  <p className="text-sm text-white/80">This action cannot be undone</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <p className="mb-4 text-fixly-text">
                Are you sure you want to delete the draft{' '}
                <span className="font-semibold text-fixly-accent">
                  &quot;{draftToDelete?.title || 'Untitled Job'}&quot;
                </span>
                ? This will permanently remove all progress and cannot be recovered.
              </p>

              <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-900/20">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600 dark:text-amber-500" />
                  <p className="text-sm text-amber-700 dark:text-amber-400">
                    All attachments and form data will be permanently deleted.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-fixly-surface border-t border-fixly-border px-6 py-4">
              <div className="flex items-center justify-end space-x-3">
                <button type="button" onClick={onCancel} className="btn-ghost text-sm">
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={onConfirm}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
                >
                  Delete Draft
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
