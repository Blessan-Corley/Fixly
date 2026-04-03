'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Mail, Phone, CheckCircle, X, AlertTriangle, Star, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useState } from 'react';

import { type VerificationPromptVariant, type VerificationUser } from './VerificationPrompt.types';

export { ProfileVerificationStatus } from './ProfileVerificationStatus';
export type { VerificationUser } from './VerificationPrompt.types';

interface SessionUserLike {
  user?: VerificationUser;
}

interface VerificationPromptProps {
  variant?: VerificationPromptVariant;
}

export default function VerificationPrompt({
  variant = 'banner',
}: VerificationPromptProps): React.JSX.Element | null {
  const { data: session } = useSession();
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);

  const user = (session as SessionUserLike | null)?.user;
  if (!user || dismissed) {
    return null;
  }

  const isFullyVerified = Boolean(user.emailVerified && user.phoneVerified);
  if (isFullyVerified) {
    return null;
  }

  const verificationStatus = {
    email: Boolean(user.emailVerified),
    phone: Boolean(user.phoneVerified),
  };

  const pendingVerifications: string[] = [];
  if (!verificationStatus.email) pendingVerifications.push('Email');
  if (!verificationStatus.phone) pendingVerifications.push('Phone');

  const handleVerifyClick = (): void => {
    router.push('/auth/verify-account');
  };

  const handleDismiss = (): void => {
    setDismissed(true);
    localStorage.setItem('verification-prompt-dismissed', Date.now().toString());
  };

  if (variant === 'card') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-6"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
              <Shield className="h-6 w-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <div className="mb-2 flex items-center gap-2">
                <h3 className="text-lg font-semibold text-gray-900">Verify Your Account</h3>
                <div className="flex items-center gap-1 text-amber-600">
                  <Star className="h-4 w-4" />
                  <span className="text-sm font-medium">Recommended</span>
                </div>
              </div>
              <p className="mb-4 text-gray-600">
                Complete your profile to unlock full potential by verifying your{' '}
                {pendingVerifications.join(' and ').toLowerCase()}.
              </p>

              <div className="mb-4 flex gap-4">
                <div
                  className={`flex items-center gap-2 ${verificationStatus.email ? 'text-green-600' : 'text-gray-400'}`}
                >
                  {verificationStatus.email ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <Mail className="h-4 w-4" />
                  )}
                  <span className="text-sm">
                    Email {verificationStatus.email ? 'Verified' : 'Pending'}
                  </span>
                </div>
                <div
                  className={`flex items-center gap-2 ${verificationStatus.phone ? 'text-green-600' : 'text-gray-400'}`}
                >
                  {verificationStatus.phone ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <Phone className="h-4 w-4" />
                  )}
                  <span className="text-sm">
                    Phone {verificationStatus.phone ? 'Verified' : 'Pending'}
                  </span>
                </div>
              </div>

              <div className="mb-4 rounded-lg bg-white p-3">
                <p className="mb-2 text-sm font-medium text-gray-900">Benefits of verification:</p>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li>- Increase profile trust and job success rate</li>
                  <li>- Access to premium features and priority support</li>
                  <li>- Enhanced security for your account</li>
                </ul>
              </div>

              <button onClick={handleVerifyClick} className="btn-primary flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Verify Now
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="p-1 text-gray-400 transition-colors hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        className="mb-6 border-l-4 border-amber-400 bg-gradient-to-r from-amber-50 to-orange-50 p-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <div>
              <p className="font-medium text-amber-900">Complete your account verification</p>
              <p className="text-sm text-amber-700">
                Complete your profile to unlock full potential - verify your{' '}
                {pendingVerifications.join(' and ').toLowerCase()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleVerifyClick}
              className="flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-700"
            >
              <Shield className="h-4 w-4" />
              Verify Now
            </button>
            <button
              onClick={handleDismiss}
              className="p-1 text-amber-600 transition-colors hover:text-amber-800"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
