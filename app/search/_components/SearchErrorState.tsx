import { AlertCircle } from 'lucide-react';

type SearchErrorStateProps = {
  message: string;
  onRetry: () => void;
};

export function SearchErrorState({ message, onRetry }: SearchErrorStateProps): React.JSX.Element {
  return (
    <div className="py-12 text-center">
      <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
      <h2 className="mb-2 text-xl font-bold text-fixly-text">Search Error</h2>
      <p className="mb-6 text-fixly-text-light">{message}</p>
      <button type="button" onClick={onRetry} className="btn-primary">
        Try Again
      </button>
    </div>
  );
}
