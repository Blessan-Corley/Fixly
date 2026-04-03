'use client';

import { Loader } from 'lucide-react';

interface JobDetailsLoadingStateProps {
  onBack: () => void;
}

export function JobDetailsLoadingState({ onBack }: JobDetailsLoadingStateProps): JSX.Element {
  return (
    <div className="p-6 lg:p-8">
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader className="h-8 w-8 animate-spin text-fixly-accent" />
      </div>
      <div className="mt-6 text-center">
        <button type="button" onClick={onBack} className="btn-primary">
          Go Back
        </button>
      </div>
    </div>
  );
}

interface JobDetailsNotFoundStateProps {
  onBack: () => void;
}

export function JobDetailsNotFoundState({ onBack }: JobDetailsNotFoundStateProps): JSX.Element {
  return (
    <div className="p-6 lg:p-8">
      <div className="text-center">
        <h2 className="mb-2 text-xl font-semibold text-fixly-text">Job Not Found</h2>
        <button type="button" onClick={onBack} className="btn-primary">
          Go Back
        </button>
      </div>
    </div>
  );
}
