'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';

import {
  forgotPasswordEmailSchema,
  forgotPasswordOtpSchema,
  forgotPasswordResetSchema,
  forgotPasswordResolver,
} from './forgot-password.schemas';
import type { ApiResponse, ForgotPasswordFormData, RecoveryStep } from './forgot-password.types';
import { getPasswordStrength } from './forgot-password.utils';

export function useForgotPassword() {
  const [step, setStep] = useState<RecoveryStep>(1);

  const activeSchema = useMemo(() => {
    if (step === 1) return forgotPasswordEmailSchema;
    if (step === 2) return forgotPasswordOtpSchema;
    return forgotPasswordResetSchema;
  }, [step]);

  const stableResolver = useMemo(() => forgotPasswordResolver(activeSchema), [activeSchema]);

  const { register, control, trigger, getValues, getFieldState, setValue } =
    useForm<ForgotPasswordFormData>({
      resolver: stableResolver,
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

  const resetPassword = async (onSuccess: (path: string) => void): Promise<void> => {
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
        }),
      });

      const payload = (await response.json()) as ApiResponse;
      if (!response.ok || !payload.success) {
        setError(payload.message ?? 'Unable to reset your password.');
        return;
      }

      toast.success('Password updated successfully.');
      onSuccess('/auth/signin?message=password_reset_success');
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

  return {
    step,
    setStep,
    email,
    otp,
    newPassword,
    confirmPassword,
    loading,
    error,
    setError,
    showPassword,
    setShowPassword,
    showConfirmPassword,
    setShowConfirmPassword,
    resendCooldown,
    strength,
    emailRegistration,
    newPasswordRegistration,
    confirmPasswordRegistration,
    setValue,
    sendOtp,
    verifyOtp,
    resetPassword,
  };
}
