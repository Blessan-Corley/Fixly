'use client';

import { AlertCircle, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';

import AuthShell from '@/components/auth/AuthShell';

import {
  forgotPasswordEmailSchema,
  forgotPasswordOtpSchema,
  forgotPasswordResetSchema,
  forgotPasswordResolver,
} from './forgot-password.schemas';
import type { ApiResponse, ForgotPasswordFormData, RecoveryStep } from './forgot-password.types';
import { getPasswordStrength } from './forgot-password.utils';
import ForgotPasswordStepEmail from './ForgotPasswordStepEmail';
import ForgotPasswordStepIndicator from './ForgotPasswordStepIndicator';
import ForgotPasswordStepOtp from './ForgotPasswordStepOtp';
import ForgotPasswordStepReset from './ForgotPasswordStepReset';

export default function ForgotPasswordPage(): JSX.Element {
  const router = useRouter();
  const [step, setStep] = useState<RecoveryStep>(1);

  const activeSchema = useMemo(() => {
    if (step === 1) return forgotPasswordEmailSchema;
    if (step === 2) return forgotPasswordOtpSchema;
    return forgotPasswordResetSchema;
  }, [step]);

  const { register, control, trigger, getValues, getFieldState, setValue } =
    useForm<ForgotPasswordFormData>({
      resolver: forgotPasswordResolver(activeSchema),
      defaultValues: { email: '', otp: '', newPassword: '', confirmPassword: '' },
    });

  const email = useWatch({ control, name: 'email' }) ?? '';
  const otp = useWatch({ control, name: 'otp' }) ?? '';
  const newPassword = useWatch({ control, name: 'newPassword' }) ?? '';
  const confirmPassword = useWatch({ control, name: 'confirmPassword' }) ?? '';

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const resendTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (resendTimerRef.current) {
        clearInterval(resendTimerRef.current);
        resendTimerRef.current = null;
      }
    };
  }, []);

  const startResendCooldown = (seconds: number): void => {
    setResendCooldown(seconds);
    if (resendTimerRef.current) clearInterval(resendTimerRef.current);

    resendTimerRef.current = setInterval(() => {
      setResendCooldown((previous) => {
        if (previous <= 1) {
          if (resendTimerRef.current) {
            clearInterval(resendTimerRef.current);
            resendTimerRef.current = null;
          }
          return 0;
        }
        return previous - 1;
      });
    }, 1000);
  };

  const sendOtp = async (): Promise<void> => {
    const isValid = await trigger('email');
    if (!isValid) {
      const emailError = getFieldState('email').error?.message;
      setError(typeof emailError === 'string' ? emailError : 'Please enter a valid email address.');
      return;
    }

    const normalizedEmail = getValues('email').trim().toLowerCase();
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail }),
      });

      const payload = (await response.json()) as ApiResponse;
      if (!response.ok || !payload.success) {
        setError(payload.message ?? 'Unable to send a reset code.');
        return;
      }

      setStep(2);
      startResendCooldown(60);
      toast.success('If an eligible account exists, a reset code will arrive shortly.');
    } catch (sendError) {
      console.error('Forgot password send OTP error:', sendError);
      setError('Unable to send the reset code right now.');
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (): Promise<void> => {
    const isValid = await trigger('otp');
    if (!isValid) {
      const otpError = getFieldState('otp').error?.message;
      setError(typeof otpError === 'string' ? otpError : 'Enter the 6-digit verification code.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: getValues('email').trim().toLowerCase(),
          otp: getValues('otp'),
          purpose: 'password_reset',
        }),
      });

      const payload = (await response.json()) as ApiResponse;
      if (!response.ok || !payload.success) {
        setError(payload.message ?? 'Invalid verification code.');
        return;
      }

      setStep(3);
      toast.success('Verification complete. Create your new password.');
    } catch (verifyError) {
      console.error('Forgot password verify OTP error:', verifyError);
      setError('Unable to verify the code right now.');
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (): Promise<void> => {
    const isValid = await trigger(['newPassword', 'confirmPassword']);
    if (!isValid) {
      const passwordError = getFieldState('newPassword').error?.message;
      const confirmError = getFieldState('confirmPassword').error?.message;
      setError(
        typeof passwordError === 'string'
          ? passwordError
          : typeof confirmError === 'string'
            ? confirmError
            : 'Unable to validate your password.'
      );
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: getValues('email').trim().toLowerCase(),
          newPassword: getValues('newPassword'),
          otp: getValues('otp'),
        }),
      });

      const payload = (await response.json()) as ApiResponse;
      if (!response.ok || !payload.success) {
        setError(payload.message ?? 'Unable to reset your password.');
        return;
      }

      toast.success('Password updated successfully.');
      router.push('/auth/signin?message=password_reset_success');
    } catch (resetError) {
      console.error('Reset password error:', resetError);
      setError('Unable to reset the password right now.');
    } finally {
      setLoading(false);
    }
  };

  const strength = getPasswordStrength(newPassword);
  const emailRegistration = register('email');
  const newPasswordRegistration = register('newPassword');
  const confirmPasswordRegistration = register('confirmPassword');

  const stepTitles: Record<RecoveryStep, string> = {
    1: 'Reset Password',
    2: 'Verify Reset Code',
    3: 'Choose a New Password',
  };

  const stepSubtitles: Record<RecoveryStep, string> = {
    1: 'Enter your account email',
    2: 'Enter the code from your email',
    3: 'Create your new password',
  };

  return (
    <AuthShell
      title={stepTitles[step]}
      subtitle={stepSubtitles[step]}
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
        <ForgotPasswordStepIndicator step={step} />

        {step === 1 ? (
          <ForgotPasswordStepEmail
            emailRegistration={emailRegistration}
            email={email}
            loading={loading}
            onSend={sendOtp}
            onClearError={() => setError('')}
          />
        ) : null}

        {step === 2 ? (
          <ForgotPasswordStepOtp
            email={email}
            otp={otp}
            loading={loading}
            resendCooldown={resendCooldown}
            onVerify={verifyOtp}
            onResend={sendOtp}
            onOtpChange={(value) => {
              setValue('otp', value, { shouldDirty: true });
              setError('');
            }}
            onBack={() => {
              setStep(1);
              setValue('otp', '', { shouldDirty: true });
              setError('');
            }}
          />
        ) : null}

        {step === 3 ? (
          <ForgotPasswordStepReset
            newPassword={newPassword}
            confirmPassword={confirmPassword}
            strength={strength}
            showPassword={showPassword}
            showConfirmPassword={showConfirmPassword}
            loading={loading}
            newPasswordRegistration={newPasswordRegistration}
            confirmPasswordRegistration={confirmPasswordRegistration}
            onReset={resetPassword}
            onClearError={() => setError('')}
            onToggleShowPassword={() => setShowPassword((prev) => !prev)}
            onToggleShowConfirmPassword={() => setShowConfirmPassword((prev) => !prev)}
          />
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
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
