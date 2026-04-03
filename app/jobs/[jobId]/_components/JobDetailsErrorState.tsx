import { AlertCircle, ArrowLeft } from 'lucide-react';

type JobDetailsErrorStateProps = {
  message: string;
  onBack: () => void;
};

export function JobDetailsErrorState({
  message,
  onBack,
}: JobDetailsErrorStateProps): React.JSX.Element {
  return (
    <div className="flex min-h-screen items-center justify-center bg-fixly-bg">
      <div className="text-center">
        <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
        <h1 className="mb-2 text-2xl font-bold text-fixly-text">Job Not Found</h1>
        <p className="mb-6 text-fixly-text-light">{message}</p>
        <button type="button" onClick={onBack} className="btn-primary">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Go Back
        </button>
      </div>
    </div>
  );
}
