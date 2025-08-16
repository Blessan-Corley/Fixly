// components/dashboard/VerificationPrompt.js
'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, 
  Mail, 
  Phone, 
  CheckCircle, 
  X, 
  AlertTriangle,
  Star,
  ArrowRight
} from 'lucide-react';
import VerifiedBadge from '@/components/ui/VerifiedBadge';

export default function VerificationPrompt({ variant = 'banner' }) {
  const { data: session } = useSession();
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);

  if (!session?.user || dismissed) return null;

  const user = session.user;
  const isFullyVerified = user.emailVerified && user.phoneVerified;
  
  // Don't show if already fully verified
  if (isFullyVerified) return null;

  const verificationStatus = {
    email: user.emailVerified,
    phone: user.phoneVerified
  };

  const pendingVerifications = [];
  if (!verificationStatus.email) pendingVerifications.push('Email');
  if (!verificationStatus.phone) pendingVerifications.push('Phone');

  const handleVerifyClick = () => {
    router.push('/auth/verify-account');
  };

  const handleDismiss = () => {
    setDismissed(true);
    // Optionally store in localStorage to persist dismissal
    localStorage.setItem('verification-prompt-dismissed', Date.now().toString());
  };

  if (variant === 'card') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Shield className="h-6 w-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-lg font-semibold text-gray-900">
                  Verify Your Account
                </h3>
                <div className="flex items-center gap-1 text-amber-600">
                  <Star className="h-4 w-4" />
                  <span className="text-sm font-medium">Recommended</span>
                </div>
              </div>
              <p className="text-gray-600 mb-4">
                Increase trust and unlock all features by verifying your {pendingVerifications.join(' and ').toLowerCase()}.
              </p>
              
              {/* Verification Status */}
              <div className="flex gap-4 mb-4">
                <div className={`flex items-center gap-2 ${
                  verificationStatus.email ? 'text-green-600' : 'text-gray-400'
                }`}>
                  {verificationStatus.email ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <Mail className="h-4 w-4" />
                  )}
                  <span className="text-sm">Email {verificationStatus.email ? 'Verified' : 'Pending'}</span>
                </div>
                <div className={`flex items-center gap-2 ${
                  verificationStatus.phone ? 'text-green-600' : 'text-gray-400'
                }`}>
                  {verificationStatus.phone ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <Phone className="h-4 w-4" />
                  )}
                  <span className="text-sm">Phone {verificationStatus.phone ? 'Verified' : 'Pending'}</span>
                </div>
              </div>

              {/* Benefits */}
              <div className="bg-white rounded-lg p-3 mb-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Benefits of verification:</p>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Increase profile trust and job success rate</li>
                  <li>• Access to premium features and priority support</li>
                  <li>• Enhanced security for your account</li>
                </ul>
              </div>
              
              <button
                onClick={handleVerifyClick}
                className="btn-primary flex items-center gap-2"
              >
                <Shield className="h-4 w-4" />
                Verify Now
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </motion.div>
    );
  }

  // Banner variant (default)
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        className="bg-gradient-to-r from-amber-50 to-orange-50 border-l-4 border-amber-400 p-4 mb-6"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <div>
              <p className="font-medium text-amber-900">
                Complete your account verification
              </p>
              <p className="text-sm text-amber-700">
                Verify your {pendingVerifications.join(' and ').toLowerCase()} to build trust and unlock all features
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleVerifyClick}
              className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              <Shield className="h-4 w-4" />
              Verify Now
            </button>
            <button
              onClick={handleDismiss}
              className="p-1 text-amber-600 hover:text-amber-800 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// Profile verification status component
export function ProfileVerificationStatus({ user, showActions = true }) {
  const router = useRouter();

  if (!user) return null;

  const verifications = [
    {
      type: 'email',
      label: 'Email Address',
      verified: user.emailVerified,
      icon: Mail,
      value: user.email
    },
    {
      type: 'phone',
      label: 'Phone Number',
      verified: user.phoneVerified,
      icon: Phone,
      value: user.phone
    }
  ];

  const isFullyVerified = user.emailVerified && user.phoneVerified;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Shield className="h-6 w-6 text-blue-600" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Account Verification</h3>
            <p className="text-sm text-gray-600">Secure your account and build trust</p>
          </div>
        </div>
        {isFullyVerified && (
          <VerifiedBadge user={user} size="lg" showText={true} />
        )}
      </div>

      <div className="space-y-4">
        {verifications.map((verification) => {
          const IconComponent = verification.icon;
          return (
            <div
              key={verification.type}
              className={`flex items-center justify-between p-4 rounded-lg border ${
                verification.verified
                  ? 'bg-green-50 border-green-200'
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  verification.verified
                    ? 'bg-green-100 text-green-600'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {verification.verified ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    <IconComponent className="h-5 w-5" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{verification.label}</p>
                  <p className="text-sm text-gray-600">{verification.value || 'Not provided'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {verification.verified ? (
                  <span className="text-sm font-medium text-green-600">Verified</span>
                ) : (
                  <>
                    <span className="text-sm text-gray-500">Unverified</span>
                    {showActions && (
                      <button
                        onClick={() => router.push('/auth/verify-account')}
                        className="btn-primary text-sm px-3 py-1"
                      >
                        Verify
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {!isFullyVerified && showActions && (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-blue-900">Complete Verification</p>
              <p className="text-sm text-blue-700">Verify all your details to unlock premium features</p>
            </div>
            <button
              onClick={() => router.push('/auth/verify-account')}
              className="btn-primary flex items-center gap-2"
            >
              <Shield className="h-4 w-4" />
              Verify All
            </button>
          </div>
        </div>
      )}
    </div>
  );
}