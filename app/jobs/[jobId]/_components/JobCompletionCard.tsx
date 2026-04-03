'use client';

type Props = {
  completingJob: boolean;
  onMarkComplete: () => void;
};

export function JobCompletionCard({ completingJob, onMarkComplete }: Props): React.JSX.Element {
  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-fixly-text">Completion</h3>
      <p className="mt-2 text-sm text-fixly-text-light">
        Mark this job as complete once the work is done. Reviews open for both sides immediately
        after completion.
      </p>
      <button
        type="button"
        onClick={onMarkComplete}
        className="btn-primary mt-4 w-full"
        disabled={completingJob}
      >
        Mark as Complete
      </button>
    </div>
  );
}
