'use client';

import { motion } from 'framer-motion';
import { RefreshCw, Home, AlertTriangle, Wrench } from 'lucide-react';
import { useEffect } from 'react';

import { env } from '@/lib/env';

type AppErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function Error({ error, reset }: AppErrorProps) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-fixly-bg p-4">
      <div className="w-full max-w-md text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="mb-8 flex items-center justify-center">
            <Wrench className="mr-3 h-12 w-12 text-fixly-accent" />
            <span className="text-3xl font-bold text-fixly-text">Fixly</span>
          </div>

          <div className="mb-8">
            <div className="mx-auto mb-4 flex h-32 w-32 items-center justify-center rounded-full bg-red-50">
              <AlertTriangle className="h-16 w-16 text-red-500" />
            </div>
          </div>

          <h1 className="mb-4 text-2xl font-bold text-fixly-text">Oops! Something went wrong</h1>
          <p className="mb-8 text-fixly-text-light">
            We encountered an unexpected error. Don&apos;t worry, our team has been notified and
            we&apos;re working to fix it.
          </p>

          {env.NODE_ENV === 'development' ? (
            <div className="mb-8 rounded-lg border border-red-200 bg-red-50 p-4 text-left">
              <h3 className="mb-2 font-semibold text-red-800">Error Details:</h3>
              <pre className="overflow-auto text-xs text-red-700">{error.message}</pre>
              {error.stack ? (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs text-red-600">Stack Trace</summary>
                  <pre className="mt-2 overflow-auto text-xs text-red-600">{error.stack}</pre>
                </details>
              ) : null}
            </div>
          ) : null}

          <div className="space-y-4">
            <button onClick={reset} className="btn-primary flex w-full items-center justify-center">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </button>

            <button
              onClick={() => window.location.assign('/')}
              className="btn-secondary flex w-full items-center justify-center"
            >
              <Home className="mr-2 h-4 w-4" />
              Go Home
            </button>
          </div>

          <div className="mt-8 border-t border-fixly-border pt-6">
            <p className="mb-4 text-sm text-fixly-text-muted">Still having issues?</p>
            <div className="flex flex-col space-y-2 text-sm">
              <a
                href="mailto:blessancorley@gmail.com"
                className="text-fixly-accent hover:text-fixly-accent-dark"
              >
                Contact Support
              </a>
              <a href="/help" className="text-fixly-accent hover:text-fixly-accent-dark">
                Help Center
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
