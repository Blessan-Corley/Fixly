'use client';

import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import type { ResendCooldown, VerificationResponse, VerificationStep } from './verify-account.types';
import { getMessage, isRecord, isVerifiedUserPayload } from './verify-account.utils';

type UseVerifyAccountResult = {
  loading: boolean;
  emailStep: VerificationStep;
  phoneStep: VerificationStep;
  emailOTP: string;
  resendCooldown: ResendCooldown;
  showPhoneEdit: boolean;
  newPhoneNumber: string;
  isFullyVerified: boolean;
  sessionStatus: 'loading' | 'authenticated' | 'unauthenticated';
  sessionUser: {
    email?: string | null;
    phone?: string | null;
  } | null;
  setEmailOTP: (value: string) => void;
  setShowPhoneEdit: (value: boolean) => void;
  setNewPhoneNumber: (value: string) => void;
  sendEmailVerification: () => Promise<void>;
  verifyEmailOTP: () => Promise<void>;
  updatePhoneNumber: () => Promise<void>;
  handlePhoneVerificationComplete: (data: unknown) => void;
  goToDashboard: () => void;
};

export function useVerifyAccount(): UseVerifyAccountResult {
  const { data: session, status, update } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState<boolean>(false);
  const [emailStep, setEmailStep] = useState<VerificationStep>('send');
  const [phoneStep, setPhoneStep] = useState<VerificationStep>('send');
  const [emailOTP, setEmailOTP] = useState<string>('');
  const [resendCooldown, setResendCooldown] = useState<ResendCooldown>({ email: 0, phone: 0 });
  const [showPhoneEdit, setShowPhoneEdit] = useState<boolean>(false);
  const [newPhoneNumber, setNewPhoneNumber] = useState<string>('');

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) { router.push('/auth/signin'); return; }
    if (session.user.emailVerified) setEmailStep('verified');
    if (session.user.phoneVerified) setPhoneStep('verified');
  }, [router, session, status]);

  useEffect(() => {
    const interval = setInterval(() => {
      setResendCooldown((prev) => ({
        email: Math.max(0, prev.email - 1),
        phone: Math.max(0, prev.phone - 1),
      }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const sendEmailVerification = async (): Promise<void> => {
    if (!session?.user?.email) {
      toast.error('No email found for your account');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: session.user.email, type: 'email_verification' }),
      });

      const payload: unknown = await response.json();
      const data = isRecord(payload) ? (payload as VerificationResponse) : {};

      if (data.success) {
        toast.success(getMessage(payload, 'Verification code sent'));
        setEmailStep('verify');
        setResendCooldown((prev) => ({ ...prev, email: 60 }));
        return;
      }

      const message = data.message ?? getMessage(payload, 'Failed to send email verification');
      if (message.includes('Google authentication') || message.includes('already verified')) {
        setEmailStep('verified');
        await update({ ...session, user: { ...session.user, emailVerified: true, isVerified: session.user.phoneVerified || false } });
        toast.info(message);
      } else {
        toast.error(message);
      }
    } catch (error: unknown) {
      console.error('Send email verification error:', error);
      toast.error('Failed to send verification email');
    } finally {
      setLoading(false);
    }
  };

  const verifyEmailOTP = async (): Promise<void> => {
    if (!session?.user?.email) {
      toast.error('No email found for your account');
      return;
    }

    if (!emailOTP || emailOTP.length !== 6) {
      toast.error('Please enter a valid 6-digit code');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: session.user.email, otp: emailOTP, type: 'email_verification' }),
      });

      const payload: unknown = await response.json();
      const data = isRecord(payload) ? (payload as VerificationResponse) : {};

      if (data.success) {
        toast.success('Email verified successfully!');
        setEmailStep('verified');
        setEmailOTP('');
        await update({ ...session, user: { ...session.user, emailVerified: true, isVerified: data.user?.isVerified === true } });
        if (data.user?.isVerified === true) {
          toast.success('Account fully verified!');
          setTimeout(() => router.push('/dashboard'), 2000);
        }
      } else {
        toast.error(data.message ?? getMessage(payload, 'Failed to verify email'));
      }
    } catch (error: unknown) {
      console.error('Verify email error:', error);
      toast.error('Failed to verify email');
    } finally {
      setLoading(false);
    }
  };

  const updatePhoneNumber = async (): Promise<void> => {
    if (!session) {
      toast.error('Session expired. Please sign in again.');
      router.push('/auth/signin');
      return;
    }

    if (!newPhoneNumber || newPhoneNumber.length < 10) {
      toast.error('Please enter a valid phone number');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/user/update-phone', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: newPhoneNumber }),
      });

      const payload: unknown = await response.json();
      const data = isRecord(payload) ? (payload as VerificationResponse) : {};

      if (data.success) {
        toast.success('Phone number updated successfully!');
        await update({ ...session, user: { ...session.user, phone: data.user?.phone ?? session.user.phone, phoneVerified: false } });
        setShowPhoneEdit(false);
        setNewPhoneNumber('');
        setPhoneStep('send');
      } else {
        toast.error(data.message ?? getMessage(payload, 'Failed to update phone number'));
      }
    } catch (error: unknown) {
      console.error('Update phone number error:', error);
      toast.error('Failed to update phone number');
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneVerificationComplete = (data: unknown): void => {
    setPhoneStep('verified');
    const fullyVerified = isVerifiedUserPayload(data);
    if (!session) return;

    void update({ ...session, user: { ...session.user, phoneVerified: true, isVerified: fullyVerified } });

    if (fullyVerified) {
      toast.success('Account fully verified!');
      setTimeout(() => router.push('/dashboard'), 2000);
    }
  };

  return {
    loading,
    emailStep,
    phoneStep,
    emailOTP,
    resendCooldown,
    showPhoneEdit,
    newPhoneNumber,
    isFullyVerified: emailStep === 'verified' && phoneStep === 'verified',
    sessionStatus: status,
    sessionUser: session?.user ?? null,
    setEmailOTP,
    setShowPhoneEdit,
    setNewPhoneNumber,
    sendEmailVerification,
    verifyEmailOTP,
    updatePhoneNumber,
    handlePhoneVerificationComplete,
    goToDashboard: () => router.push('/dashboard'),
  };
}
