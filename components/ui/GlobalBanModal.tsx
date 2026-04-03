'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Lock } from 'lucide-react';

import { useApp } from '@/app/providers';

export default function GlobalBanModal() {
  const { user } = useApp();

  if (!user || !user.banned) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-md"
        />

        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="dark:bg-fixly-dark-card relative mx-4 w-full max-w-md rounded-2xl border border-red-200 bg-white p-8 text-center shadow-2xl dark:border-red-900"
        >
          <div className="mb-6 flex justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
              <Lock className="h-10 w-10 text-red-600 dark:text-red-400" />
            </div>
          </div>

          <h2 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
            Account Suspended
          </h2>

          <p className="mb-6 text-gray-600 dark:text-gray-300">
            Your account has been suspended due to a violation of our terms of service. You cannot
            access the platform at this time.
          </p>

          <div className="mb-6 rounded-lg bg-red-50 p-4 text-left dark:bg-red-900/10">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
              <div>
                <h3 className="text-sm font-semibold text-red-800 dark:text-red-300">
                  Reason for Suspension
                </h3>
                <p className="mt-1 text-sm text-red-700 dark:text-red-400">
                  {user.banReason || 'Suspicious activity detected on your account.'}
                </p>
                {user.banExpiresAt && (
                  <p className="mt-2 font-mono text-xs text-red-700 dark:text-red-400">
                    Lift Date: {new Date(user.banExpiresAt).toLocaleDateString()} at{' '}
                    {new Date(user.banExpiresAt).toLocaleTimeString()}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <a
              href="mailto:support@fixly.app"
              className="block w-full rounded-xl bg-gray-900 px-4 py-3 font-medium text-white transition-opacity hover:opacity-90 dark:bg-white dark:text-gray-900"
            >
              Contact Support
            </a>

            <button
              onClick={() => {
                window.location.href = '/api/auth/signout';
              }}
              className="block w-full bg-transparent px-4 py-3 font-medium text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              Sign Out
            </button>
          </div>

          <p className="mt-6 text-xs text-gray-400">
            If you believe this is a mistake, please contact our support team.
          </p>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
