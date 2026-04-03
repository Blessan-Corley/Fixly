'use client';

import type { Dispatch, SetStateAction } from 'react';
import { toast } from 'sonner';

import { fetchWithCsrf } from '@/lib/api/fetchWithCsrf';
import type { OtpType } from '../types/settings';

export type CredentialApiSetters = {
  setOtpType: Dispatch<SetStateAction<OtpType>>;
  setShowOtpModal: Dispatch<SetStateAction<boolean>>;
  setOtpSent: Dispatch<SetStateAction<boolean>>;
  setOtpLoading: Dispatch<SetStateAction<boolean>>;
  setLoading: Dispatch<SetStateAction<boolean>>;
  setShowUsernameChange: Dispatch<SetStateAction<boolean>>;
  setNewUsername: Dispatch<SetStateAction<string>>;
  setShowEmailChange: Dispatch<SetStateAction<boolean>>;
  setNewEmail: Dispatch<SetStateAction<string>>;
  setOtp: Dispatch<SetStateAction<string>>;
};

export async function sendOtpForUsernameChange(
  email: string | undefined,
  newUsername: string,
  setters: Pick<CredentialApiSetters, 'setOtpLoading' | 'setOtpSent' | 'setShowOtpModal'>,
  startCountdown: () => void
): Promise<void> {
  setters.setOtpLoading(true);
  try {
    const response = await fetchWithCsrf('/api/auth/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, type: 'username_change', username: newUsername }),
    });

    const data = await response.json();

    if (data.success) {
      setters.setOtpSent(true);
      startCountdown();
      toast.success('OTP sent to your email');
    } else {
      toast.error(data.message || 'Failed to send OTP');
      setters.setShowOtpModal(false);
    }
  } catch {
    toast.error('Failed to send OTP');
    setters.setShowOtpModal(false);
  } finally {
    setters.setOtpLoading(false);
  }
}

export async function sendOtpForEmailChange(
  newEmail: string,
  currentEmail: string | undefined,
  setters: Pick<CredentialApiSetters, 'setOtpLoading' | 'setOtpSent' | 'setShowOtpModal'>,
  startCountdown: () => void
): Promise<void> {
  setters.setOtpLoading(true);
  try {
    const response = await fetchWithCsrf('/api/auth/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: newEmail, type: 'email_change', currentEmail }),
    });

    const data = await response.json();

    if (data.success) {
      setters.setOtpSent(true);
      startCountdown();
      toast.success(`OTP sent to ${newEmail}`);
    } else {
      toast.error(data.message || 'Failed to send OTP');
      setters.setShowOtpModal(false);
    }
  } catch {
    toast.error('Failed to send OTP');
    setters.setShowOtpModal(false);
  } finally {
    setters.setOtpLoading(false);
  }
}

export async function checkUsernameAvailability(
  newUsername: string,
  email: string | undefined,
  setters: Pick<CredentialApiSetters, 'setLoading' | 'setOtpType' | 'setShowOtpModal' | 'setOtpLoading' | 'setOtpSent'>,
  startCountdown: () => void
): Promise<void> {
  setters.setLoading(true);
  try {
    const response = await fetchWithCsrf('/api/user/check-username', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: newUsername }),
    });

    const data = await response.json();

    if (data.available) {
      setters.setOtpType('username');
      setters.setShowOtpModal(true);
      await sendOtpForUsernameChange(
        email,
        newUsername,
        { setOtpLoading: setters.setOtpLoading, setOtpSent: setters.setOtpSent, setShowOtpModal: setters.setShowOtpModal },
        startCountdown
      );
    } else {
      toast.error('Username not available', {
        description: data.message || 'Please try a different username',
      });
    }
  } catch {
    toast.error('Failed to check username availability');
  } finally {
    setters.setLoading(false);
  }
}

export async function checkEmailAvailability(
  newEmail: string,
  currentEmail: string | undefined,
  setters: Pick<CredentialApiSetters, 'setLoading' | 'setOtpType' | 'setShowOtpModal' | 'setOtpLoading' | 'setOtpSent'>,
  startCountdown: () => void
): Promise<void> {
  setters.setLoading(true);
  try {
    const response = await fetchWithCsrf('/api/user/check-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: newEmail }),
    });

    const data = await response.json();

    if (data.available) {
      setters.setOtpType('email');
      setters.setShowOtpModal(true);
      await sendOtpForEmailChange(
        newEmail,
        currentEmail,
        { setOtpLoading: setters.setOtpLoading, setOtpSent: setters.setOtpSent, setShowOtpModal: setters.setShowOtpModal },
        startCountdown
      );
    } else {
      toast.error('Email already in use', {
        description: 'Please use a different email address',
      });
    }
  } catch {
    toast.error('Failed to check email availability');
  } finally {
    setters.setLoading(false);
  }
}

export async function verifyOtpAndUpdate(
  otp: string,
  otpType: string,
  newUsername: string,
  newEmail: string,
  currentEmail: string | undefined,
  setters: Pick<
    CredentialApiSetters,
    | 'setOtpLoading'
    | 'setShowUsernameChange'
    | 'setNewUsername'
    | 'setShowEmailChange'
    | 'setNewEmail'
    | 'setShowOtpModal'
    | 'setOtp'
    | 'setOtpSent'
  >
): Promise<void> {
  if (!otp || otp.length !== 6) {
    toast.error('Please enter a valid 6-digit OTP');
    return;
  }

  setters.setOtpLoading(true);
  try {
    const endpoint = otpType === 'username' ? '/api/user/update-username' : '/api/user/update-email';
    const requestBody =
      otpType === 'username'
        ? { username: newUsername, otp, email: currentEmail }
        : { email: newEmail, otp, currentEmail };

    const response = await fetchWithCsrf(endpoint, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    if (data.success) {
      if (otpType === 'username') {
        toast.success('Username updated successfully!');
        setters.setShowUsernameChange(false);
        setters.setNewUsername('');
      } else {
        toast.success('Email updated successfully!');
        setters.setShowEmailChange(false);
        setters.setNewEmail('');
      }

      setters.setShowOtpModal(false);
      setters.setOtp('');
      setters.setOtpSent(false);
      window.location.reload();
    } else {
      toast.error(data.message || 'Verification failed');
    }
  } catch {
    toast.error('Verification failed');
  } finally {
    setters.setOtpLoading(false);
  }
}
