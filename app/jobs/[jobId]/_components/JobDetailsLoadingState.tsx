import { Loader } from 'lucide-react';

export function JobDetailsLoadingState(): React.JSX.Element {
  return (
    <div className="flex min-h-screen items-center justify-center bg-fixly-bg">
      <div className="text-center">
        <Loader className="mx-auto mb-4 h-8 w-8 animate-spin text-fixly-accent" />
        <p className="text-fixly-text-light">Loading job details...</p>
      </div>
    </div>
  );
}
