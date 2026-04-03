'use client';

import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { CheckCircle, ArrowRight, Mail, Phone, Shield } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { parseAsString, useQueryState } from 'nuqs';
import { useEffect, useState } from 'react';

type VerificationDetails = {
  icon: LucideIcon;
  title: string;
  description: string;
  color: string;
  bgColor: string;
};

export default function VerifiedPage() {
  const router = useRouter();
  const [countdown, setCountdown] = useState(5);
  const [type] = useQueryState('type', parseAsString.withDefault('email'));

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((previous) => {
        if (previous <= 1) {
          router.push('/dashboard');
          return 0;
        }
        return previous - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [router]);

  const getVerificationDetails = (): VerificationDetails => {
    switch (type) {
      case 'email':
        return {
          icon: Mail,
          title: 'Email Verified!',
          description: 'Your email address has been successfully verified.',
          color: 'text-green-600',
          bgColor: 'bg-green-100',
        };
      case 'phone':
        return {
          icon: Phone,
          title: 'Phone Verified!',
          description: 'Your phone number has been successfully verified.',
          color: 'text-green-600',
          bgColor: 'bg-green-100',
        };
      case 'account':
        return {
          icon: Shield,
          title: 'Account Fully Verified!',
          description: 'Your account is now completely verified and secure.',
          color: 'text-fixly-primary',
          bgColor: 'bg-fixly-accent/20',
        };
      default:
        return {
          icon: CheckCircle,
          title: 'Verification Complete!',
          description: 'Your verification was successful.',
          color: 'text-green-600',
          bgColor: 'bg-green-100',
        };
    }
  };

  const details = getVerificationDetails();
  const IconComponent = details.icon;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-green-50 to-green-100 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="rounded-2xl bg-white p-8 text-center shadow-xl">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className={`h-20 w-20 ${details.bgColor} mx-auto mb-6 flex items-center justify-center rounded-full`}
          >
            <IconComponent className={`h-10 w-10 ${details.color}`} />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-4 text-2xl font-bold text-fixly-text"
          >
            {details.title}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-6 leading-relaxed text-fixly-text-light"
          >
            {details.description}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4"
          >
            <h3 className="mb-2 font-medium text-green-800">You can now:</h3>
            <ul className="space-y-1 text-sm text-green-700">
              <li>- Access all platform features</li>
              <li>- Build trust with other users</li>
              <li>- Receive important notifications</li>
              <li>- Enjoy enhanced security</li>
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mb-6 text-sm text-fixly-text-muted"
          >
            Redirecting to dashboard in {countdown} seconds...
          </motion.div>

          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            onClick={() => router.push('/dashboard')}
            className="btn-primary flex w-full items-center justify-center gap-2"
          >
            <span>Continue to Dashboard</span>
            <ArrowRight className="h-4 w-4" />
          </motion.button>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-6 border-t border-gray-200 pt-4"
          >
            <p className="mb-3 text-xs text-fixly-text-muted">Need to verify more?</p>
            <div className="flex gap-2">
              <button
                onClick={() => router.push('/auth/verify-account')}
                className="flex-1 text-sm font-medium text-fixly-accent hover:text-fixly-accent-dark"
              >
                Complete Verification
              </button>
              <button
                onClick={() => router.push('/dashboard/settings')}
                className="flex-1 text-sm font-medium text-fixly-accent hover:text-fixly-accent-dark"
              >
                Account Settings
              </button>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
