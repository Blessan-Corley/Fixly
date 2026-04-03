'use client';

import { AlertCircle, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { env } from '@/lib/env';

type JobApplyErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function Error({ error, reset }: JobApplyErrorProps) {
  const router = useRouter();

  useEffect(() => {
    console.error('Application page error:', error);
  }, [error]);

  return (
    <div className="p-6 lg:p-8">
      <div className="mx-auto max-w-2xl text-center">
        <AlertCircle className="mx-auto mb-4 h-16 w-16 text-red-500" />
        <h1 className="mb-2 text-2xl font-bold text-fixly-text">Something went wrong</h1>
        <p className="mb-6 text-fixly-text-light">
          We couldn&apos;t load the job application form. This might be a temporary issue.
        </p>

        <div className="space-y-4">
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <button onClick={reset} className="btn-primary">
              Try Again
            </button>
            <button
              onClick={() => router.push('/dashboard/browse-jobs')}
              className="btn-secondary flex items-center justify-center"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Jobs
            </button>
          </div>

          <button onClick={() => window.location.reload()} className="btn-ghost text-sm">
            Or refresh the page
          </button>
        </div>

        {env.NODE_ENV === 'development' ? (
          <details className="mt-6 text-left">
            <summary className="cursor-pointer text-sm text-gray-500">
              Error details (development only)
            </summary>
            <pre className="mt-2 overflow-auto rounded bg-gray-100 p-4 text-xs">
              {error.message}
            </pre>
          </details>
        ) : null}
      </div>
    </div>
  );
}
