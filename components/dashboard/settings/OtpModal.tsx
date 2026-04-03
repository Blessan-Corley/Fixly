'use client';

import { motion } from 'framer-motion';
import { Loader, Mail } from 'lucide-react';
import type { Dispatch, SetStateAction } from 'react';

import { sanitizeOtpDigits } from '../../../lib/validations/settings';
import type { OtpType, SettingsUser } from '../../../types/settings';

export type OtpModalProps = {
  user: SettingsUser | null;
  otpType: OtpType;
  newUsername: string;
  newEmail: string;
  otp: string;
  setOtp: Dispatch<SetStateAction<string>>;
  otpLoading: boolean;
  countdown: number;
  onClose: () => void;
  onVerifyAndUpdate: () => void | Promise<void>;
  onResend: () => void;
};

export function OtpModal({
  user,
  otpType,
  newUsername,
  newEmail,
  otp,
  setOtp,
  otpLoading,
  countdown,
  onClose,
  onVerifyAndUpdate,
  onResend,
}: OtpModalProps): React.JSX.Element {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md rounded-xl bg-fixly-card p-6"
      >
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-fixly-accent/10">
            <Mail className="h-8 w-8 text-fixly-accent" />
          </div>
          <h2 className="mb-2 text-xl font-bold text-fixly-text">
            Verify {otpType === 'username' ? 'Username Change' : 'Email Change'}
          </h2>
          <p className="text-sm text-fixly-text-muted">
            {otpType === 'username'
              ? `Enter the OTP sent to ${user?.email} to change your username to "${newUsername}"`
              : `Enter the OTP sent to ${newEmail} to verify your new email address`}
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-fixly-text">6-Digit OTP</label>
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(sanitizeOtpDigits(e.target.value))}
              placeholder="Enter OTP"
              className="input-field text-center text-lg tracking-wider"
              maxLength={6}
              autoFocus
            />
          </div>

          <div className="flex gap-3">
            <button onClick={onClose} className="btn-ghost flex-1">
              Cancel
            </button>
            <button
              onClick={onVerifyAndUpdate}
              disabled={otpLoading || otp.length !== 6}
              className="btn-primary flex-1"
            >
              {otpLoading ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : null}
              Verify &amp; Update
            </button>
          </div>

          <div className="text-center">
            {countdown > 0 ? (
              <p className="text-sm text-fixly-text-muted">Resend OTP in {countdown} seconds</p>
            ) : (
              <button
                onClick={onResend}
                disabled={otpLoading}
                className="text-sm text-fixly-accent transition-colors hover:text-fixly-accent-dark"
              >
                Resend OTP
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
