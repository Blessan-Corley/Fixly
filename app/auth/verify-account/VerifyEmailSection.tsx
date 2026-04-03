'use client';

import { CheckCircle, Clock, Loader, Mail, Send } from 'lucide-react';

import OtpCodeInput from '@/components/auth/OtpCodeInput';

import type { VerificationStep } from './verify-account.types';

type VerifyEmailSectionProps = {
  email: string | null | undefined;
  emailStep: VerificationStep;
  emailOTP: string;
  loading: boolean;
  cooldown: number;
  onSend: () => void;
  onVerify: () => void;
  onOtpChange: (value: string) => void;
};

export function VerifyEmailSection({
  email,
  emailStep,
  emailOTP,
  loading,
  cooldown,
  onSend,
  onVerify,
  onOtpChange,
}: VerifyEmailSectionProps): JSX.Element {
  return (
    <div className="mb-6">
      <div className="mb-4 flex items-center gap-3">
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-full ${
            emailStep === 'verified' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
          }`}
        >
          {emailStep === 'verified' ? <CheckCircle className="h-5 w-5" /> : <Mail className="h-5 w-5" />}
        </div>
        <div>
          <h3 className="font-medium text-fixly-text dark:text-slate-100">Email Verification</h3>
          <p className="break-all text-sm text-fixly-text-light dark:text-slate-400">{email}</p>
        </div>
      </div>

      {emailStep === 'send' ? (
        <button
          onClick={onSend}
          disabled={loading || cooldown > 0}
          className="btn-primary flex w-full items-center justify-center gap-2"
        >
          {loading ? (
            <Loader className="h-4 w-4 animate-spin" />
          ) : cooldown > 0 ? (
            <><Clock className="h-4 w-4" />Wait {cooldown}s</>
          ) : (
            <><Send className="h-4 w-4" />Send Email OTP</>
          )}
        </button>
      ) : null}

      {emailStep === 'verify' ? (
        <div className="space-y-4">
          <div>
            <label className="mb-3 block text-sm font-medium text-fixly-text dark:text-slate-200">
              Enter 6-digit code
            </label>
            <OtpCodeInput value={emailOTP} onChange={onOtpChange} disabled={loading} />
          </div>
          <button
            onClick={onVerify}
            disabled={loading || emailOTP.length !== 6}
            className="btn-primary flex w-full items-center justify-center gap-2"
          >
            {loading ? <Loader className="h-4 w-4 animate-spin" /> : <><CheckCircle className="h-4 w-4" />Verify Email</>}
          </button>
          <button
            onClick={onSend}
            disabled={loading || cooldown > 0}
            className="btn-secondary w-full text-sm"
          >
            {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Code'}
          </button>
        </div>
      ) : null}

      {emailStep === 'verified' ? (
        <div className="flex items-center gap-2 rounded-lg bg-green-50 p-3 text-green-600 dark:bg-green-950/40 dark:text-green-300">
          <CheckCircle className="h-5 w-5" />
          <span className="font-medium">Email verified successfully!</span>
        </div>
      ) : null}
    </div>
  );
}
