import { Loader } from 'lucide-react';

export function SearchLoadingState(): React.JSX.Element {
  return (
    <div className="py-12 text-center">
      <Loader className="mx-auto mb-4 h-8 w-8 animate-spin text-fixly-accent" />
      <p className="text-fixly-text-light">Searching for jobs...</p>
    </div>
  );
}
