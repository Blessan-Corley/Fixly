'use client';

import { useCallback, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { toast } from 'sonner';

import {
  checkEmailAvailability,
  sendEmailChangeOtp,
  verifyEmailChange,
} from '../lib/services/profileClient';
import type { ProfileUser } from '../types/profile';

function startCountdown(seconds: number, setValue: Dispatch<SetStateAction<number>>): void {
  setValue(seconds);
  const timer = setInterval(() => {
    setValue((prev) => {
      if (prev <= 1) {
        clearInterval(timer);
        return 0;
      }
      return prev - 1;
    });
  }, 1000);
}

export type UseProfileEmailFlowResult = {
  showEmailChange: boolean;
  setShowEmailChange: Dispatch<SetStateAction<boolean>>;
  newEmail: string;
  setNewEmail: Dispatch<SetStateAction<string>>;
  emailOtp: string;
  setEmailOtp: Dispatch<SetStateAction<string>>;
  emailOtpSent: boolean;
  emailChangeLoading: boolean;
  emailOtpCountdown: number;
  handleSendEmailOtp: () => Promise<void>;
  handleVerifyEmailChange: () => Promise<void>;
  handleCancelEmailChange: () => void;
};

export function useProfileEmailFlow(
  user: ProfileUser | null,
  updateUser: (user: Partial<ProfileUser>) => void
): UseProfileEmailFlowResult {
  const [showEmailChange, setShowEmailChange] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [emailOtp, setEmailOtp] = useState('');
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [emailChangeLoading, setEmailChangeLoading] = useState(false);
  const [emailOtpCountdown, setEmailOtpCountdown] = useState(0);

  const handleSendEmailOtp = useCallback(async (): Promise<void> => {
    if (!newEmail || !newEmail.trim()) {
      toast.error('Please enter a new email address');
      return;
    }

    if (newEmail.toLowerCase() === (user?.email ?? '').toLowerCase()) {
      toast.error('New email cannot be the same as current email');
      return;
    }

    setEmailChangeLoading(true);
    const validation = await checkEmailAvailability(newEmail.trim());

    if (!validation.available) {
      toast.error(validation.message);
      setEmailChangeLoading(false);
      return;
    }

    try {
      const result = await sendEmailChangeOtp({ newEmail: newEmail.trim(), step: 'send_otp' });

      if (result.success) {
        setEmailOtpSent(true);
        startCountdown(300, setEmailOtpCountdown);
        toast.success(result.message ?? 'Verification code sent');
      } else {
        toast.error(result.message ?? 'Failed to send verification code');
      }
    } catch (error) {
      console.error('Email OTP send error:', error);
      toast.error('Failed to send verification code');
    } finally {
      setEmailChangeLoading(false);
    }
  }, [newEmail, user?.email]);

  const handleVerifyEmailChange = useCallback(async (): Promise<void> => {
    if (!emailOtp || emailOtp.length !== 6) {
      toast.error('Please enter the 6-digit verification code');
      return;
    }

    if (!user) {
      toast.error('User not available');
      return;
    }

    setEmailChangeLoading(true);
    try {
      const result = await verifyEmailChange({
        newEmail: newEmail.trim(),
        otp: emailOtp,
        step: 'verify_and_change',
      });

      if (result.success) {
        updateUser({ ...user, email: newEmail.trim(), emailVerified: true });
        setShowEmailChange(false);
        setNewEmail('');
        setEmailOtp('');
        setEmailOtpSent(false);
        setEmailOtpCountdown(0);
        toast.success(result.message ?? 'Email changed successfully');
      } else {
        toast.error(result.message ?? 'Failed to verify email change');
      }
    } catch (error) {
      console.error('Email change verification error:', error);
      toast.error('Failed to verify email change');
    } finally {
      setEmailChangeLoading(false);
    }
  }, [emailOtp, newEmail, updateUser, user]);

  const handleCancelEmailChange = useCallback((): void => {
    setShowEmailChange(false);
    setNewEmail('');
    setEmailOtp('');
    setEmailOtpSent(false);
    setEmailOtpCountdown(0);
  }, []);

  return {
    showEmailChange,
    setShowEmailChange,
    newEmail,
    setNewEmail,
    emailOtp,
    setEmailOtp,
    emailOtpSent,
    emailChangeLoading,
    emailOtpCountdown,
    handleSendEmailOtp,
    handleVerifyEmailChange,
    handleCancelEmailChange,
  };
}
