'use client';

import { CheckCircle, Loader, Shield, Star } from 'lucide-react';

import type { SettingsUser } from '../../../types/settings';

export type VerificationStatusUi = {
  dotClassName: string;
  badgeClassName: string;
  badgeLabel: string;
  description: string;
};

export type VerificationPanelProps = {
  user: SettingsUser | null;
  verificationStatusUi: VerificationStatusUi;
  verificationReapplyDaysRemaining: number;
  onOpenVerificationModal: () => void;
};

export function SettingsVerificationPanel({
  user,
  verificationStatusUi,
  verificationReapplyDaysRemaining,
  onOpenVerificationModal,
}: VerificationPanelProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-4 text-lg font-semibold text-fixly-text">Account Verification</h3>
        <div className="card">
          <div className="mb-6">
            <div className="flex items-center justify-between rounded-lg bg-fixly-bg-secondary p-4">
              <div className="flex items-center">
                <div
                  className={`mr-3 h-3 w-3 rounded-full ${verificationStatusUi.dotClassName}`}
                ></div>
                <div>
                  <h4 className="font-medium text-fixly-text">Verification Status</h4>
                  <p className="text-sm text-fixly-text-muted">
                    {verificationStatusUi.description}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span
                  className={`rounded-full px-3 py-1 text-sm font-medium ${verificationStatusUi.badgeClassName}`}
                >
                  {verificationStatusUi.badgeLabel}
                </span>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h4 className="mb-3 font-medium text-fixly-text">Why verify your account?</h4>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-lg bg-blue-50 p-3">
                <div className="mb-2 flex items-center">
                  <Shield className="mr-2 h-4 w-4 text-blue-600" />
                  <span className="font-medium text-blue-800">Increased Trust</span>
                </div>
                <p className="text-sm text-blue-700">
                  Build confidence with customers through verified identity
                </p>
              </div>
              <div className="rounded-lg bg-green-50 p-3">
                <div className="mb-2 flex items-center">
                  <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                  <span className="font-medium text-green-800">Higher Visibility</span>
                </div>
                <p className="text-sm text-green-700">
                  Verified profiles appear higher in search results
                </p>
              </div>
              <div className="rounded-lg bg-fixly-accent/10 p-3">
                <div className="mb-2 flex items-center">
                  <Star className="mr-2 h-4 w-4 text-fixly-primary" />
                  <span className="font-medium text-fixly-primary">Premium Features</span>
                </div>
                <p className="text-sm text-fixly-primary">
                  Access to exclusive features and opportunities
                </p>
              </div>
              <div className="rounded-lg bg-orange-50 p-3">
                <div className="mb-2 flex items-center">
                  <Loader className="mr-2 h-4 w-4 text-orange-600" />
                  <span className="font-medium text-orange-800">Faster Support</span>
                </div>
                <p className="text-sm text-orange-700">
                  Priority customer support for verified users
                </p>
              </div>
            </div>
          </div>

          {user?.verification?.lastApplicationDate && (
            <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
              <h4 className="mb-2 font-medium text-yellow-800">Application History</h4>
              <p className="text-sm text-yellow-700">
                Last application:{' '}
                {new Date(user.verification.lastApplicationDate).toLocaleDateString()}
              </p>
              {user?.verification?.rejectionReason && (
                <p className="mt-1 text-sm text-red-600">
                  <strong>Rejection reason:</strong> {user.verification.rejectionReason}
                </p>
              )}
            </div>
          )}

          {!user?.isVerified && user?.verification?.status !== 'pending' && (
            <div className="text-center">
              <button
                onClick={onOpenVerificationModal}
                className="btn-primary"
                disabled={verificationReapplyDaysRemaining > 0}
              >
                <Shield className="mr-2 h-4 w-4" />
                Apply for Verification
              </button>
              {verificationReapplyDaysRemaining > 0 && (
                <p className="mt-2 text-sm text-fixly-text-muted">
                  You can apply again in {verificationReapplyDaysRemaining} days
                </p>
              )}
            </div>
          )}

          {user?.verification?.status === 'pending' && (
            <div className="rounded-lg bg-blue-50 p-4 text-center">
              <p className="font-medium text-blue-800">Verification documents submitted!</p>
              <p className="mt-1 text-sm text-blue-600">
                We&apos;ll review your documents within 3-5 business days and notify you of the
                result.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
