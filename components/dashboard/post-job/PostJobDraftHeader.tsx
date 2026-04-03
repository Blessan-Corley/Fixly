'use client';

import { AlertCircle, Check, FolderOpen, Loader, Save, Timer } from 'lucide-react';

import type { DraftStatus } from '../../../types/jobs/post-job';

interface PostJobDraftHeaderProps {
  availableDraftCount: number;
  draftStatus: DraftStatus;
  hasUnsavedChanges: boolean;
  lastSaved: Date | null;
  onOpenDraftModal: () => void;
  onSaveDraft: () => void;
}

export function PostJobDraftHeader({
  availableDraftCount,
  draftStatus,
  hasUnsavedChanges,
  lastSaved,
  onOpenDraftModal,
  onSaveDraft,
}: PostJobDraftHeaderProps): JSX.Element {
  return (
    <div className="mb-6 flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold text-fixly-text">Post New Job</h1>
        <div className="mt-2 flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            {draftStatus === 'saving' && (
              <>
                <Loader className="h-4 w-4 animate-spin text-fixly-accent" />
                <span className="text-fixly-text-muted">Saving...</span>
              </>
            )}
            {draftStatus === 'saved' && lastSaved && (
              <>
                <Check className="h-4 w-4 text-green-500" />
                <span className="text-fixly-text-muted">
                  Saved {new Date(lastSaved).toLocaleTimeString()}
                </span>
              </>
            )}
            {draftStatus === 'unsaved' && hasUnsavedChanges && (
              <>
                <Timer className="h-4 w-4 text-amber-500" />
                <span className="text-amber-600">Unsaved changes</span>
              </>
            )}
            {draftStatus === 'error' && (
              <>
                <AlertCircle className="h-4 w-4 text-red-500" />
                <span className="text-red-600">Save failed</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onSaveDraft}
          disabled={draftStatus === 'saving' || !hasUnsavedChanges}
          className="btn-secondary flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          Save Draft
        </button>

        <button
          type="button"
          onClick={onOpenDraftModal}
          className="btn-outline flex items-center gap-2"
        >
          <FolderOpen className="h-4 w-4" />
          Load Draft
          {availableDraftCount > 0 && (
            <span className="rounded-full bg-fixly-accent px-2 py-1 text-xs text-fixly-text">
              {availableDraftCount}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
