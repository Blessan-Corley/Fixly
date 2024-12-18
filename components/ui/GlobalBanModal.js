'use client';

import { useApp } from '@/app/providers';
import { AlertTriangle, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function GlobalBanModal() {
  const { user } = useApp();

  // If no user or user is not banned, don't show anything
  if (!user || !user.banned) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center">
        {/* Blurred Background Overlay - Unclosable */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-md"
        />

        {/* Modal Content */}
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="relative bg-white dark:bg-fixly-dark-card rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 text-center border border-red-200 dark:border-red-900"
        >
          <div className="mb-6 flex justify-center">
            <div className="h-20 w-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
              <Lock className="h-10 w-10 text-red-600 dark:text-red-400" />
            </div>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Account Suspended
          </h2>
          
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Your account has been suspended due to a violation of our terms of service. You cannot access the platform at this time.
          </p>

          {/* Ban Details */}
          <div className="bg-red-50 dark:bg-red-900/10 rounded-lg p-4 mb-6 text-left">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-800 dark:text-red-300 text-sm">
                  Reason for Suspension
                </h3>
                <p className="text-red-700 dark:text-red-400 text-sm mt-1">
                  {user.banReason || 'Suspicious activity detected on your account.'}
                </p>
                {user.banExpiresAt && (
                   <p className="text-red-700 dark:text-red-400 text-xs mt-2 font-mono">
                    Lift Date: {new Date(user.banExpiresAt).toLocaleDateString()} at {new Date(user.banExpiresAt).toLocaleTimeString()}
                   </p>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <a 
              href="mailto:support@fixly.app"
              className="block w-full py-3 px-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-medium hover:opacity-90 transition-opacity"
            >
              Contact Support
            </a>
            
            <button
              onClick={() => window.location.href = '/api/auth/signout'}
              className="block w-full py-3 px-4 bg-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 font-medium transition-colors"
            >
              Sign Out
            </button>
          </div>

          <p className="text-xs text-gray-400 mt-6">
            If you believe this is a mistake, please contact our support team.
          </p>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}