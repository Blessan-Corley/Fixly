'use client';

import { Loader, ShieldCheck } from 'lucide-react';
import { useState } from 'react';

import OtpCodeInput from '@/components/auth/OtpCodeInput';

import type { SignupErrors, SignupFormData } from '../_lib/signup.types';

type AccountStepProps = {
  formData: SignupFormData;
  errors: SignupErrors;
  isLoading: boolean;
  otpLoading: boolean;
  emailOtp: string;
  emailOtpSent: boolean;
  emailOtpVerified: boolean;
  otpError: string;
  resendCooldown: number;
  canSendEmailOtp: boolean;
  onChange: <K extends keyof SignupFormData>(field: K, value: SignupFormData[K]) => void;
  onEmailOtpChange: (value: string) => void;
  onSendEmailOtp: () => Promise<void>;
  onVerifyEmailOtp: () => Promise<void>;
};

export function AccountStep({
  formData,
  errors,
  isLoading,
  otpLoading,
  emailOtp,
  emailOtpSent,
  emailOtpVerified,
  otpError,
  resendCooldown,
  canSendEmailOtp,
  onChange,
  onEmailOtpChange,
  onSendEmailOtp,
  onVerifyEmailOtp,
}: AccountStepProps): React.JSX.Element {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-lg font-semibold text-fixly-text dark:text-white">
          Email and password
        </h2>
      </div>

      <div>
        <label htmlFor="signup-email" className="mb-2 block text-sm font-medium text-fixly-text dark:text-gray-100">
          Email address
        </label>
        <input
          id="signup-email"
          type="email"
          value={formData.email}
          onChange={(event) => onChange('email', event.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          autoCapitalize="none"
          inputMode="email"
          spellCheck={false}
          className="input-field dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
        />
        {errors.email ? <p className="mt-1 text-sm text-red-500">{errors.email}</p> : null}
      </div>

      <div>
        <label htmlFor="signup-password" className="mb-2 block text-sm font-medium text-fixly-text dark:text-gray-100">
          Password
        </label>
        <div className="relative">
          <input
            id="signup-password"
            type={showPassword ? 'text' : 'password'}
            value={formData.password}
            onChange={(event) => onChange('password', event.target.value)}
            placeholder="Create a strong password"
            autoComplete="new-password"
            className="input-field pr-12 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          />
          <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-fixly-text-muted">
            {showPassword ? 'Hide' : 'Show'}
          </button>
        </div>
        {errors.password ? <p className="mt-1 text-sm text-red-500">{errors.password}</p> : null}
      </div>

      <div>
        <label htmlFor="signup-confirm-password" className="mb-2 block text-sm font-medium text-fixly-text dark:text-gray-100">
          Confirm Password
        </label>
        <div className="relative">
          <input
            id="signup-confirm-password"
            type={showConfirmPassword ? 'text' : 'password'}
            value={formData.confirmPassword}
            onChange={(event) => onChange('confirmPassword', event.target.value)}
            placeholder="Re-enter your password"
            autoComplete="new-password"
            className="input-field pr-12 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          />
          <button type="button" onClick={() => setShowConfirmPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-fixly-text-muted">
            {showConfirmPassword ? 'Hide' : 'Show'}
          </button>
        </div>
        {errors.confirmPassword ? <p className="mt-1 text-sm text-red-500">{errors.confirmPassword}</p> : null}
      </div>

      <div className="rounded-2xl border border-fixly-border bg-fixly-bg/60 p-3 dark:border-gray-700 dark:bg-gray-800/70">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 font-semibold text-fixly-text dark:text-white">
            <ShieldCheck className="h-4 w-4 text-fixly-accent" />
            Verify your email
          </div>
          <button
            type="button"
            onClick={() => void onSendEmailOtp()}
            disabled={isLoading || !canSendEmailOtp || otpLoading || (emailOtpSent && resendCooldown > 0)}
            className="btn-secondary rounded-2xl px-4 py-2"
          >
            {otpLoading ? <Loader className="h-4 w-4 animate-spin" /> : emailOtpSent ? 'Resend code' : 'Send code'}
          </button>
        </div>

        {!canSendEmailOtp ? (
          <p className="mt-3 text-sm text-fixly-text-light dark:text-gray-300">
            Enter a valid email and matching password first, then request your verification code.
          </p>
        ) : null}

        {emailOtpSent ? (
          <div className="mt-4 space-y-3">
            <OtpCodeInput value={emailOtp} onChange={onEmailOtpChange} disabled={otpLoading || emailOtpVerified} />
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className={emailOtpVerified ? 'text-green-600 dark:text-green-400' : 'text-fixly-text-light dark:text-gray-300'}>
                {emailOtpVerified ? 'Email verified successfully.' : `Code sent to ${formData.email}`}
              </span>
              {emailOtpVerified ? null : resendCooldown > 0 ? (
                <span className="text-fixly-text-muted dark:text-gray-400">Resend in {resendCooldown}s</span>
              ) : (
                <button type="button" onClick={() => void onSendEmailOtp()} className="font-medium text-fixly-accent">
                  Resend code
                </button>
              )}
            </div>
            {emailOtpVerified ? null : (
              <button
                type="button"
                onClick={() => void onVerifyEmailOtp()}
                disabled={otpLoading || emailOtp.length !== 6}
                className="btn-primary w-full rounded-2xl py-3"
              >
                {otpLoading ? <Loader className="mr-2 inline h-4 w-4 animate-spin" /> : null}
                Verify email
              </button>
            )}
          </div>
        ) : null}

        {otpError || errors.emailOtp ? (
          <p className="mt-3 text-sm text-red-500">{otpError || errors.emailOtp}</p>
        ) : null}
      </div>
    </div>
  );
}
