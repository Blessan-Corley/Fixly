'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, ArrowLeft } from 'lucide-react';

export default function Error({ error, reset }) {
  const router = useRouter();

  useEffect(() => {
    console.error('Application page error:', error);
  }, [error]);

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-2xl mx-auto text-center">
        <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-fixly-text mb-2">
          Something went wrong
        </h1>
        <p className="text-fixly-text-light mb-6">
          We couldn't load the job application form. This might be a temporary issue.
        </p>
        
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => reset()}
              className="btn-primary"
            >
              Try Again
            </button>
            <button
              onClick={() => router.push('/dashboard/browse-jobs')}
              className="btn-secondary flex items-center justify-center"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Jobs
            </button>
          </div>
          
          <button
            onClick={() => window.location.reload()}
            className="btn-ghost text-sm"
          >
            Or refresh the page
          </button>
        </div>
        
        {process.env.NODE_ENV === 'development' && (
          <details className="mt-6 text-left">
            <summary className="cursor-pointer text-sm text-gray-500">
              Error details (development only)
            </summary>
            <pre className="mt-2 p-4 bg-gray-100 rounded text-xs overflow-auto">
              {error.message}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}