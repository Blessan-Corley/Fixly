'use client';

import { AlertCircle, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type React from 'react';

import AuthShell from '@/components/auth/AuthShell';

import ForgotPasswordStepEmail from './ForgotPasswordStepEmail';
import ForgotPasswordStepIndicator from './ForgotPasswordStepIndicator';
import ForgotPasswordStepOtp from './ForgotPasswordStepOtp';
import ForgotPasswordStepReset from './ForgotPasswordStepReset';
import { useForgotPassword } from './useForgotPassword';

const STEP_TITLES: Record<1 | 2 | 3, string> = {
  1: 'Reset Password',
  2: 'Verify Reset Code',
  3: 'Choose a New Password',
};

const STEP_SUBTITLES: Record<1 | 2 | 3, string> = {
  1: 'Enter your account email',
  2: 'Enter the code from your email',
  3: 'Create your new password',
};

export default function ForgotPasswordPage(): React.JSX.Element {
  const router = useRouter();
  const fp = useForgotPassword();

  return (
    <AuthShell
      title={STEP_TITLES[fp.step]}
      subtitle={STEP_SUBTITLES[fp.step]}
      badge="Password Recovery"
      footer={
        <p>
          Remembered your password?{' '}
          <button
            type="button"
            onClick={() => router.push('/auth/signin')}
            className="font-semibold text-fixly-accent transition-colors hover:text-fixly-accent-dark"
          >
            Go back to sign in
          </button>
        </p>
      }
    >
      <div className="space-y-4">
        <ForgotPasswordStepIndicator step={fp.step} />

        {fp.step === 1 ? (
          <ForgotPasswordStepEmail
            emailRegistration={fp.emailRegistration}
            email={fp.email}
            loading={fp.loading}
            onSend={fp.sendOtp}
            onClearError={() => fp.setError('')}
          />
        ) : null}

        {fp.step === 2 ? (
          <ForgotPasswordStepOtp
            email={fp.email}
            otp={fp.otp}
            loading={fp.loading}
            resendCooldown={fp.resendCooldown}
            onVerify={fp.verifyOtp}
            onResend={fp.sendOtp}
            onOtpChange={(value) => {
              fp.setValue('otp', value, { shouldDirty: true });
              fp.setError('');
            }}
            onBack={() => {
              fp.setStep(1);
              fp.setValue('otp', '', { shouldDirty: true });
              fp.setError('');
            }}
          />
        ) : null}

        {fp.step === 3 ? (
          <ForgotPasswordStepReset
            newPassword={fp.newPassword}
            confirmPassword={fp.confirmPassword}
            strength={fp.strength}
            showPassword={fp.showPassword}
            showConfirmPassword={fp.showConfirmPassword}
            loading={fp.loading}
            newPasswordRegistration={fp.newPasswordRegistration}
            confirmPasswordRegistration={fp.confirmPasswordRegistration}
            onReset={() => fp.resetPassword((path) => router.push(path))}
            onClearError={() => fp.setError('')}
            onToggleShowPassword={() => fp.setShowPassword((prev) => !prev)}
            onToggleShowConfirmPassword={() => fp.setShowConfirmPassword((prev) => !prev)}
          />
        ) : null}

        {fp.error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{fp.error}</span>
            </div>
          </div>
        ) : null}

        <div className="text-center">
          <button
            type="button"
            onClick={() => router.push('/auth/signin')}
            className="inline-flex items-center gap-2 text-sm font-medium text-fixly-text-light transition-colors hover:text-fixly-accent dark:text-gray-300"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to sign in
          </button>
        </div>
      </div>
    </AuthShell>
  );
}
