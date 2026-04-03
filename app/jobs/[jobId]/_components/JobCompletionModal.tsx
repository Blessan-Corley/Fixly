'use client';

type Props = {
  completingJob: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function JobCompletionModal({ completingJob, onConfirm, onCancel }: Props): React.JSX.Element {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="text-xl font-semibold text-fixly-text">Mark job as complete?</h2>
        <p className="mt-3 text-sm leading-6 text-fixly-text-light">
          This will move the job to completed, notify the fixer, and unlock reviews for both
          parties.
        </p>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="btn-secondary"
            disabled={completingJob}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="btn-primary"
            disabled={completingJob}
          >
            {completingJob ? 'Completing...' : 'Confirm Completion'}
          </button>
        </div>
      </div>
    </div>
  );
}
