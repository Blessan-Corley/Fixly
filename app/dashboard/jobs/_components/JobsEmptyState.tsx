'use client';

import { Briefcase, Plus } from 'lucide-react';

export function JobsEmptyState({
  onPostJob,
}: {
  onPostJob: () => void;
}): React.JSX.Element {
  return (
    <div className="py-12 text-center">
      <Briefcase className="mx-auto mb-4 h-12 w-12 text-fixly-text-muted" />
      <h3 className="mb-2 text-lg font-medium text-fixly-text">No jobs posted yet</h3>
      <p className="mb-4 text-fixly-text-muted">
        Post your first job to find skilled professionals
      </p>
      <button onClick={onPostJob} className="btn-primary">
        <Plus className="mr-2 h-4 w-4" />
        Post Your First Job
      </button>
    </div>
  );
}
