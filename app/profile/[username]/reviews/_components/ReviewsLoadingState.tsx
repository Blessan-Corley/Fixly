import { Loader } from 'lucide-react';

export function ReviewsLoadingState(): React.JSX.Element {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader className="h-8 w-8 animate-spin text-fixly-accent" />
    </div>
  );
}
