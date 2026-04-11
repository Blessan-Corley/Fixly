'use client';

import { motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowLeft,
  RefreshCw,
  Mail,
  Shield,
  User,
  ExternalLink,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { parseAsString, useQueryState } from 'nuqs';
import { useEffect, useState } from 'react';

import AuthShell from '@/components/auth/AuthShell';
import { env } from '@/lib/env';

import { getErrorDetails } from './auth-error.config';

export default function AuthErrorPage() {
  const router = useRouter();
  const [currentUrl, setCurrentUrl] = useState<string>('');
  const [error] = useQueryState('error', parseAsString);
  const [message] = useQueryState('message', parseAsString);
  const [email] = useQueryState('email', parseAsString);
  const [name] = useQueryState('name', parseAsString);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentUrl(window.location.href);
    }
  }, []);

  const errorDetails = getErrorDetails(error, email, name);

  return (
    <AuthShell
      title={errorDetails.title}
      subtitle={errorDetails.description}
      badge="Authentication"
      footer={null}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        {errorDetails.isSuccess ? (
          <Shield className="mx-auto mb-6 h-16 w-16 text-green-500" />
        ) : (
          <AlertTriangle className="mx-auto mb-6 h-16 w-16 text-red-500" />
        )}

        {error ? (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900/50 dark:bg-red-950/30">
            <p className="text-sm text-red-800">
              <strong>Error Code:</strong> {error}
            </p>
          </div>
        ) : null}
        {message ? (
          <div className="mb-6 rounded-lg border border-fixly-border bg-fixly-bg p-3">
            <p className="text-sm text-fixly-text">
              <strong>Message:</strong> {message}
            </p>
          </div>
        ) : null}

        <div className="mb-8 text-left">
          <h3 className="mb-3 font-semibold text-fixly-text">What you can do:</h3>
          <ul className="space-y-2">
            {errorDetails.solutions.map((solution, index) => (
              <li key={index} className="flex items-start">
                <div className="mr-3 mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-fixly-accent" />
                <span className="text-sm text-fixly-text-light">{solution}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => router.push(errorDetails.actionPath)}
            className="btn-primary w-full"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            {errorDetails.action}
          </button>

          {error === 'AccountNotFound' ? (
            <button onClick={() => router.push('/auth/signin')} className="btn-secondary w-full">
              <User className="mr-2 h-4 w-4" />
              Try Different Account
            </button>
          ) : null}

          <button onClick={() => router.push('/')} className="btn-ghost w-full">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </button>
        </div>

        <div className="mt-8 border-t border-fixly-border pt-6 dark:border-gray-700">
          <p className="mb-4 text-sm text-fixly-text-muted">
            Still having trouble? We&apos;re here to help!
          </p>

          <div className="flex gap-2">
            <a
              href={`mailto:${env.NEXT_PUBLIC_SUPPORT_EMAIL ?? 'blessancorley@gmail.com'}`}
              className="btn-secondary flex-1 text-sm"
            >
              <Mail className="mr-2 h-4 w-4" />
              Email Support
            </a>
            <button
              onClick={() => router.push('/contact')}
              className="btn-secondary flex-1 text-sm"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Contact Us
            </button>
          </div>
        </div>

        {env.NODE_ENV === 'development' ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-6 rounded-2xl border border-fixly-border bg-gray-50 p-4 text-left dark:border-gray-700 dark:bg-gray-800/60"
          >
            <h3 className="mb-2 font-semibold text-gray-800 dark:text-gray-100">
              Debug Information
            </h3>
            <div className="space-y-1 text-xs text-gray-600 dark:text-gray-300">
              <p>
                <strong>Error:</strong> {error ?? 'Unknown'}
              </p>
              <p>
                <strong>URL:</strong> {currentUrl || 'N/A'}
              </p>
              <p>
                <strong>Timestamp:</strong> {new Date().toISOString()}
              </p>
            </div>
          </motion.div>
        ) : null}
      </motion.div>
    </AuthShell>
  );
}
