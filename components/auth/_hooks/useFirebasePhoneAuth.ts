'use client';

import type { FirebaseError } from 'firebase/app';
import { RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult } from 'firebase/auth';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { auth } from '@/lib/firebase-client';

type VerificationStep = 'send' | 'verify' | 'completed';

type PhoneValidationResult = { valid: true } | { valid: false; error: string };

type VerifyPhoneResponse = {
  success?: boolean;
  message?: string;
  [key: string]: unknown;
};

export type VerificationPayload = {
  success?: boolean;
  message?: string;
  [key: string]: unknown;
};

type UseFirebasePhoneAuthOptions = {
  phoneNumber: string;
  onVerificationComplete?: (payload: VerificationPayload) => void;
  onError?: (error: Error | FirebaseError) => void;
};

export type UseFirebasePhoneAuthResult = {
  otp: string;
  setOtp: (value: string) => void;
  step: VerificationStep;
  loading: boolean;
  resendCooldown: number;
  error: string;
  setError: (value: string) => void;
  sendOTP: () => Promise<void>;
  verifyOTP: () => Promise<void>;
};

const getFirebaseErrorCode = (error: unknown): string => {
  if (error && typeof error === 'object' && 'code' in error && typeof error.code === 'string') {
    return error.code;
  }
  return '';
};

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
};

export function useFirebasePhoneAuth({
  phoneNumber,
  onVerificationComplete,
  onError,
}: UseFirebasePhoneAuthOptions): UseFirebasePhoneAuthResult {
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<VerificationStep>('send');
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [error, setError] = useState('');

  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);
  const confirmationResultRef = useRef<ConfirmationResult | null>(null);
  const cooldownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const validatePhone = useCallback((phone: string): PhoneValidationResult => {
    if (!phone) return { valid: false, error: 'Phone number is required' };
    const digits = phone.replace(/\D/g, '');
    if (digits.length !== 10) return { valid: false, error: 'Phone number must be 10 digits' };
    if (!/^[6-9]\d{9}$/.test(digits)) return { valid: false, error: 'Invalid Indian mobile number' };
    return { valid: true };
  }, []);

  const cleanup = useCallback(() => {
    if (recaptchaVerifierRef.current) {
      try { recaptchaVerifierRef.current.clear(); } catch (e) { console.warn('Failed to clear reCAPTCHA:', e); }
      recaptchaVerifierRef.current = null;
    }
    confirmationResultRef.current = null;
  }, []);

  const startCooldown = useCallback((seconds = 60) => {
    setResendCooldown(seconds);
    if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
    cooldownTimerRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          if (cooldownTimerRef.current) {
            clearInterval(cooldownTimerRef.current);
            cooldownTimerRef.current = null;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const initializeRecaptcha = useCallback(() => {
    if (!auth) throw new Error('Firebase authentication is not initialized');

    if (recaptchaVerifierRef.current) {
      try { recaptchaVerifierRef.current.clear(); } catch (e) { console.warn('Failed to clear existing reCAPTCHA:', e); }
      recaptchaVerifierRef.current = null;
    }

    try {
      recaptchaVerifierRef.current = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
        callback: () => { setError(''); },
        'expired-callback': () => { setError('Security verification expired. Please try again.'); },
        'error-callback': (err: unknown) => {
          console.error('reCAPTCHA error:', err);
          setError('Security verification failed. Please refresh and try again.');
        },
      });
    } catch (err) {
      console.error('reCAPTCHA initialization failed:', err);
      throw new Error('Failed to initialize security verification');
    }
  }, []);

  const sendOTP = useCallback(async (): Promise<void> => {
    const validation = validatePhone(phoneNumber);
    if (!validation.valid) {
      setError(validation.error);
      toast.error(validation.error);
      return;
    }

    if (!auth) {
      const authError = new Error('Firebase authentication is not initialized');
      setError(authError.message);
      toast.error(authError.message);
      onError?.(authError);
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (!recaptchaVerifierRef.current) initializeRecaptcha();

      const formattedPhone = `+91${phoneNumber.replace(/\D/g, '')}`;
      confirmationResultRef.current = await signInWithPhoneNumber(
        auth,
        formattedPhone,
        recaptchaVerifierRef.current as RecaptchaVerifier
      );

      setStep('verify');
      startCooldown(60);
      toast.success('Verification code sent');
    } catch (sendError: unknown) {
      let message = 'Failed to send verification code';
      switch (getFirebaseErrorCode(sendError)) {
        case 'auth/invalid-phone-number': message = 'Invalid phone number format'; break;
        case 'auth/too-many-requests': message = 'Too many requests. Please try again later.'; break;
        case 'auth/captcha-check-failed': message = 'Security verification failed. Please try again.'; break;
        case 'auth/quota-exceeded': message = 'SMS service is temporarily unavailable. Please try again later.'; break;
        default: message = getErrorMessage(sendError, message);
      }
      setError(message);
      toast.error(message);
      onError?.(sendError instanceof Error ? sendError : new Error(message));
      cleanup();
    } finally {
      setLoading(false);
    }
  }, [cleanup, initializeRecaptcha, onError, phoneNumber, startCooldown, validatePhone]);

  const verifyOTP = useCallback(async (): Promise<void> => {
    if (otp.length !== 6) {
      const msg = 'Please enter a valid 6-digit code';
      setError(msg);
      toast.error(msg);
      return;
    }

    if (!confirmationResultRef.current) {
      const msg = 'Verification session expired. Please request a new code.';
      setError(msg);
      toast.error(msg);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await confirmationResultRef.current.confirm(otp);
      const idToken = await result.user.getIdToken();

      const response = await fetch('/api/auth/verify-phone-firebase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: result.user.phoneNumber, idToken }),
      });

      const data = (await response.json()) as VerifyPhoneResponse;
      if (!response.ok || !data.success) throw new Error(data.message ?? 'Backend verification failed');

      setStep('completed');
      toast.success('Phone number verified successfully');
      onVerificationComplete?.(data);
    } catch (verifyError: unknown) {
      let message = 'Verification failed. Please try again.';
      switch (getFirebaseErrorCode(verifyError)) {
        case 'auth/invalid-verification-code': message = 'Invalid verification code. Please try again.'; break;
        case 'auth/code-expired': message = 'Verification code expired. Please request a new one.'; break;
        default: message = getErrorMessage(verifyError, message);
      }
      setError(message);
      toast.error(message);
      onError?.(verifyError instanceof Error ? verifyError : new Error(message));
    } finally {
      setLoading(false);
    }
  }, [onError, onVerificationComplete, otp]);

  useEffect(() => {
    return () => {
      cleanup();
      if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
    };
  }, [cleanup]);

  return { otp, setOtp, step, loading, resendCooldown, error, setError, sendOTP, verifyOTP };
}
