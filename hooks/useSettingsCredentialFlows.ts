'use client';

import { useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { toast } from 'sonner';

import type { OtpType, SettingsUser } from '../types/settings';
import {
  checkEmailAvailability,
  checkUsernameAvailability,
  sendOtpForEmailChange,
  sendOtpForUsernameChange,
  verifyOtpAndUpdate as apiVerifyOtpAndUpdate,
} from './useSettingsCredentialFlows.api';

export type UseSettingsCredentialFlowsResult = {
  loading: boolean;
  newUsername: string;
  setNewUsername: Dispatch<SetStateAction<string>>;
  showUsernameChange: boolean;
  setShowUsernameChange: Dispatch<SetStateAction<boolean>>;
  newEmail: string;
  setNewEmail: Dispatch<SetStateAction<string>>;
  showEmailChange: boolean;
  setShowEmailChange: Dispatch<SetStateAction<boolean>>;
  showOtpModal: boolean;
  setShowOtpModal: Dispatch<SetStateAction<boolean>>;
  otpType: OtpType;
  otp: string;
  setOtp: Dispatch<SetStateAction<string>>;
  otpLoading: boolean;
  otpSent: boolean;
  countdown: number;
  handleUsernameChange: () => void;
  handleEmailChange: () => void;
  verifyOtpAndUpdate: () => Promise<void>;
  isValidEmail: (email: string) => boolean;
  resendOtp: () => void;
  handleCloseOtpModal: () => void;
};

export function useSettingsCredentialFlows(
  user: SettingsUser | null
): UseSettingsCredentialFlowsResult {
  const [loading, setLoading] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [showUsernameChange, setShowUsernameChange] = useState(false);

  const [newEmail, setNewEmail] = useState('');
  const [showEmailChange, setShowEmailChange] = useState(false);

  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpType, setOtpType] = useState<OtpType>('');
  const [otp, setOtp] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const isValidEmail = (email: string): boolean =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const startCountdown = (): void => {
    setCountdown(60);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const otpSetters = {
    setOtpLoading,
    setOtpSent,
    setShowOtpModal,
  };

  const availabilitySetters = {
    setLoading,
    setOtpType,
    setShowOtpModal,
    setOtpLoading,
    setOtpSent,
  };

  const handleUsernameChange = (): void => {
    if (!newUsername || newUsername.length < 3) {
      toast.error('Username too short', {
        description: 'Username must be at least 3 characters long',
      });
      return;
    }
    void checkUsernameAvailability(newUsername, user?.email, availabilitySetters, startCountdown);
  };

  const handleEmailChange = (): void => {
    if (!newEmail || !isValidEmail(newEmail)) {
      toast.error('Invalid email address');
      return;
    }
    if (newEmail === user?.email) {
      toast.error('New email cannot be the same as current email');
      return;
    }
    void checkEmailAvailability(newEmail, user?.email, availabilitySetters, startCountdown);
  };

  const verifyOtpAndUpdate = (): Promise<void> =>
    apiVerifyOtpAndUpdate(otp, otpType, newUsername, newEmail, user?.email, {
      setOtpLoading,
      setShowUsernameChange,
      setNewUsername,
      setShowEmailChange,
      setNewEmail,
      setShowOtpModal,
      setOtp,
      setOtpSent,
    });

  const resendOtp = (): void => {
    if (otpType === 'username') {
      void sendOtpForUsernameChange(user?.email, newUsername, otpSetters, startCountdown);
    } else {
      void sendOtpForEmailChange(newEmail, user?.email, otpSetters, startCountdown);
    }
  };

  const handleCloseOtpModal = (): void => {
    setShowOtpModal(false);
    setOtp('');
    setOtpSent(false);
    if (otpType === 'username') {
      setShowUsernameChange(false);
      setNewUsername('');
    } else {
      setShowEmailChange(false);
      setNewEmail('');
    }
  };

  return {
    loading,
    newUsername,
    setNewUsername,
    showUsernameChange,
    setShowUsernameChange,
    newEmail,
    setNewEmail,
    showEmailChange,
    setShowEmailChange,
    showOtpModal,
    setShowOtpModal,
    otpType,
    otp,
    setOtp,
    otpLoading,
    otpSent,
    countdown,
    handleUsernameChange,
    handleEmailChange,
    verifyOtpAndUpdate,
    isValidEmail,
    resendOtp,
    handleCloseOtpModal,
  };
}
