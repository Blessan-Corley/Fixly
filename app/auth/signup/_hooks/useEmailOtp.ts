'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import { signupStep2Schema } from '@/lib/validations/auth';

import { validateStep } from '../_lib/signup.flow';
import type { SignupErrors, SignupFormData } from '../_lib/signup.types';

type UseEmailOtpOptions = {
  formData: Pick<SignupFormData, 'email' | 'password' | 'confirmPassword' | 'name'>;
  setErrors: (errors: SignupErrors) => void;
};

type UseEmailOtpReturn = {
  emailOtp: string;
  emailOtpSent: boolean;
  emailOtpVerified: boolean;
  otpLoading: boolean;
  otpError: string;
  resendCooldown: number;
  canSendEmailOtp: boolean;
  setEmailOtp: (value: string) => void;
  sendEmailOtp: () => Promise<void>;
  verifyEmailOtp: () => Promise<void>;
  resetOtpState: () => void;
};

export function useEmailOtp({ formData, setErrors }: UseEmailOtpOptions): UseEmailOtpReturn {
  const [emailOtp, setEmailOtp] = useState('');
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [emailOtpVerified, setEmailOtpVerified] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const resendTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const canSendEmailOtp = useMemo(
    () =>
      signupStep2Schema.safeParse({
        email: formData.email,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
      }).success,
    [formData.confirmPassword, formData.email, formData.password]
  );

  const startResendCountdown = useCallback((seconds: number) => {
    setResendCooldown(seconds);
    if (resendTimerRef.current) clearInterval(resendTimerRef.current);
    resendTimerRef.current = setInterval(() => {
      setResendCooldown((value) => {
        if (value <= 1) {
          if (resendTimerRef.current) clearInterval(resendTimerRef.current);
          resendTimerRef.current = null;
          return 0;
        }
        return value - 1;
      });
    }, 1000);
  }, []);

  const resetOtpState = useCallback(() => {
    setEmailOtp('');
    setEmailOtpSent(false);
    setEmailOtpVerified(false);
    setOtpError('');
    setResendCooldown(0);
    if (resendTimerRef.current) {
      clearInterval(resendTimerRef.current);
      resendTimerRef.current = null;
    }
  }, []);

  const sendEmailOtp = useCallback(async () => {
    const result = validateStep('account', formData as SignupFormData);
    if (!result.valid) return setErrors(result.errors);
    setOtpLoading(true);
    setOtpError('');
    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          name: formData.name || formData.email.split('@')[0] || 'there',
          purpose: 'signup',
        }),
      });
      const payload = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(payload.message ?? 'Unable to send verification code.');
      setEmailOtpSent(true);
      setEmailOtpVerified(false);
      startResendCountdown(60);
      toast.success('Verification code sent to your email.');
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : 'Unable to send verification code right now.';
      setOtpError(msg);
      toast.error(msg);
    } finally {
      setOtpLoading(false);
    }
  }, [formData, setErrors, startResendCountdown]);

  const verifyEmailOtp = useCallback(async () => {
    if (emailOtp.length !== 6) return setOtpError('Enter the 6-digit code sent to your email.');
    setOtpLoading(true);
    setOtpError('');
    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, otp: emailOtp, purpose: 'signup' }),
      });
      const payload = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(payload.message ?? 'Invalid verification code.');
      setEmailOtpVerified(true);
      toast.success('Email verified. Continue with your profile.');
    } catch (error) {
      setOtpError(
        error instanceof Error ? error.message : 'Unable to verify the code right now.'
      );
    } finally {
      setOtpLoading(false);
    }
  }, [emailOtp, formData.email]);

  return {
    emailOtp,
    emailOtpSent,
    emailOtpVerified,
    otpLoading,
    otpError,
    resendCooldown,
    canSendEmailOtp,
    setEmailOtp,
    sendEmailOtp,
    verifyEmailOtp,
    resetOtpState,
  };
}
