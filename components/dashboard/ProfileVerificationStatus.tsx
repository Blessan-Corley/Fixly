'use client';

import { Shield, Mail, Phone, CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

import VerifiedBadge from '@/components/ui/VerifiedBadge';

import { type VerificationItem, type VerificationUser } from './VerificationPrompt.types';

interface ProfileVerificationStatusProps {
  user?: VerificationUser | null;
  showActions?: boolean;
}

export function ProfileVerificationStatus({
  user,
  showActions = true,
}: ProfileVerificationStatusProps): React.JSX.Element | null {
  const router = useRouter();

  if (!user) {
    return null;
  }

  const verifications: VerificationItem[] = [
    {
      type: 'email',
      label: 'Email Address',
      verified: Boolean(user.emailVerified),
      icon: Mail,
      value: user.email,
    },
    {
      type: 'phone',
      label: 'Phone Number',
      verified: Boolean(user.phoneVerified),
      icon: Phone,
      value: user.phone,
    },
  ];

  const isFullyVerified = Boolean(user.emailVerified && user.phoneVerified);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="h-6 w-6 text-blue-600" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Account Verification</h3>
            <p className="text-sm text-gray-600">Secure your account and build trust</p>
          </div>
        </div>
        {isFullyVerified && <VerifiedBadge user={user} size="lg" showText={true} />}
      </div>

      <div className="space-y-4">
        {verifications.map((verification) => {
          const IconComponent = verification.icon;
          return (
            <div
              key={verification.type}
              className={`flex items-center justify-between rounded-lg border p-4 ${
                verification.verified
                  ? 'border-green-200 bg-green-50'
                  : 'border-gray-200 bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full ${
                    verification.verified
                      ? 'bg-green-100 text-green-600'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {verification.verified ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    <IconComponent className="h-5 w-5" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{verification.label}</p>
                  <p className="text-sm text-gray-600">{verification.value ?? 'Not provided'}</p>
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
                        className="btn-primary px-3 py-1 text-sm"
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
        <div className="mt-6 rounded-lg bg-blue-50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-blue-900">Complete Verification</p>
              <p className="text-sm text-blue-700">
                Complete your profile to unlock full potential
              </p>
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
