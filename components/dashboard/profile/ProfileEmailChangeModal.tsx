'use client';

import { motion } from 'framer-motion';
import { CheckCircle, Loader, Mail, X } from 'lucide-react';
import type { Dispatch, SetStateAction } from 'react';

import { sanitizeOtpDigits } from '../../../lib/validations/profile';
import type { ProfileUser } from '../../../types/profile';

export type ProfileEmailChangeModalProps = {
  user: ProfileUser | null;
  newEmail: string;
  setNewEmail: Dispatch<SetStateAction<string>>;
  emailOtp: string;
  setEmailOtp: Dispatch<SetStateAction<string>>;
  emailOtpSent: boolean;
  emailChangeLoading: boolean;
  emailOtpCountdown: number;
  onCancel: () => void;
  onSendOtp: () => void | Promise<void>;
  onVerify: () => void | Promise<void>;
};

export default function ProfileEmailChangeModal({
  user,
  newEmail,
  setNewEmail,
  emailOtp,
  setEmailOtp,
  emailOtpSent,
  emailChangeLoading,
  emailOtpCountdown,
  onCancel,
  onSendOtp,
  onVerify,
}: ProfileEmailChangeModalProps): React.JSX.Element {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md rounded-2xl bg-fixly-card p-6"
      >
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-fixly-text">Change Email Address</h2>
            <p className="text-sm text-fixly-text-muted">
              Enter your new email address to receive a verification code
            </p>
          </div>
          <button onClick={onCancel} className="text-fixly-text-muted hover:text-fixly-text">
            <X className="h-5 w-5" />
          </button>
        </div>

        {!emailOtpSent ? (
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-fixly-text">
                Current Email
              </label>
              <div className="flex items-center rounded-lg bg-fixly-bg-secondary p-3">
                <Mail className="mr-2 h-4 w-4 text-fixly-text-muted" />
                <span className="text-fixly-text">{user?.email ?? ''}</span>
                <CheckCircle className="ml-2 h-4 w-4 text-fixly-success" />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-fixly-text">
                New Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-fixly-text-muted" />
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="Enter new email address"
                  className="w-full rounded-xl border border-fixly-border bg-fixly-bg py-3 pl-10 pr-4 transition-all duration-200 focus:border-fixly-primary focus:outline-none focus:ring-2 focus:ring-fixly-primary-light"
                />
              </div>
            </div>

            <button
              onClick={onSendOtp}
              disabled={emailChangeLoading || !newEmail.trim()}
              className="btn-primary w-full disabled:opacity-50"
            >
              {emailChangeLoading ? (
                <Loader className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Mail className="mr-2 h-4 w-4" />
              )}
              Send Verification Code
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg bg-fixly-accent/10 p-4 text-center">
              <Mail className="mx-auto mb-2 h-8 w-8 text-fixly-accent" />
              <p className="font-medium text-fixly-text">Verification code sent!</p>
              <p className="text-sm text-fixly-text-muted">
                We&apos;ve sent a 6-digit code to <strong>{newEmail}</strong>
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-fixly-text">
                Verification Code
              </label>
              <input
                type="text"
                value={emailOtp}
                onChange={(e) => setEmailOtp(sanitizeOtpDigits(e.target.value))}
                placeholder="Enter 6-digit code"
                className="w-full rounded-xl border border-fixly-border bg-fixly-bg px-4 py-3 text-center font-mono text-lg tracking-widest transition-all duration-200 focus:border-fixly-primary focus:outline-none focus:ring-2 focus:ring-fixly-primary-light"
                maxLength={6}
              />
              {emailOtpCountdown > 0 ? (
                <p className="mt-2 text-center text-sm text-fixly-text-muted">
                  Code expires in {Math.floor(emailOtpCountdown / 60)}:
                  {(emailOtpCountdown % 60).toString().padStart(2, '0')}
                </p>
              ) : null}
            </div>

            <div className="flex gap-3">
              <button onClick={onCancel} className="btn-secondary flex-1">
                Cancel
              </button>
              <button
                onClick={onVerify}
                disabled={emailChangeLoading || emailOtp.length !== 6}
                className="btn-primary flex-1 disabled:opacity-50"
              >
                {emailChangeLoading ? (
                  <Loader className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="mr-2 h-4 w-4" />
                )}
                Verify & Change
              </button>
            </div>

            {emailOtpCountdown === 0 ? (
              <button
                onClick={onSendOtp}
                disabled={emailChangeLoading}
                className="btn-outline w-full text-sm"
              >
                Resend Code
              </button>
            ) : null}
          </div>
        )}
      </motion.div>
    </div>
  );
}
