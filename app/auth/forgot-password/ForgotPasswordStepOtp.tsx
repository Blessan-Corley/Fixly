'use client';

import { motion } from 'framer-motion';
import { Loader } from 'lucide-react';

import OtpCodeInput from '@/components/auth/OtpCodeInput';

type ForgotPasswordStepOtpProps = {
  email: string;
  otp: string;
  loading: boolean;
  resendCooldown: number;
  onVerify: () => Promise<void>;
  onResend: () => Promise<void>;
  onOtpChange: (value: string) => void;
  onBack: () => void;
};

export default function ForgotPasswordStepOtp({
  email,
  otp,
  loading,
  resendCooldown,
  onVerify,
  onResend,
  onOtpChange,
  onBack,
}: ForgotPasswordStepOtpProps): JSX.Element {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="rounded-2xl border border-fixly-border bg-fixly-bg/60 px-4 py-3 text-sm text-fixly-text-light dark:border-gray-700 dark:bg-gray-800/70 dark:text-gray-300">
        If an eligible Fixly account exists for{' '}
        <span className="font-semibold text-fixly-text dark:text-white">{email}</span>, a reset code
        may have been sent.
      </div>

      <OtpCodeInput value={otp} onChange={onOtpChange} disabled={loading} />

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        {resendCooldown > 0 ? (
          <span className="text-fixly-text-muted dark:text-gray-400">
            Resend in {resendCooldown}s
          </span>
        ) : (
          <button
            type="button"
            onClick={() => void onResend()}
            className="font-medium text-fixly-accent"
          >
            Resend code
          </button>
        )}
        <button
          type="button"
          onClick={onBack}
          className="font-medium text-fixly-text-light transition-colors hover:text-fixly-accent dark:text-gray-300"
        >
          Use another email
        </button>
      </div>

      <button
        type="button"
        onClick={() => void onVerify()}
        disabled={loading || otp.length !== 6}
        className="btn-primary w-full rounded-2xl py-3"
      >
        {loading ? <Loader className="mr-2 inline h-5 w-5 animate-spin" /> : null}
        Verify code
      </button>
    </motion.div>
  );
}
