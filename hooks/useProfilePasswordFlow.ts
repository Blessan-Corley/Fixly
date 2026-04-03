'use client';

import { useCallback, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { toast } from 'sonner';

import { DEFAULT_PASSWORD_DATA, DEFAULT_PASSWORD_VISIBILITY } from '../lib/profile/constants';
import {
  changePasswordWithOtp,
  sendPasswordResetOtp,
} from '../lib/services/profileClient';
import { validatePasswordRequirements } from '../lib/validations/profile';
import type { PasswordData, PasswordValidationResult, PasswordVisibility } from '../types/profile';

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

export type UseProfilePasswordFlowResult = {
  showPasswordChange: boolean;
  setShowPasswordChange: Dispatch<SetStateAction<boolean>>;
  passwordData: PasswordData;
  setPasswordData: Dispatch<SetStateAction<PasswordData>>;
  showPasswords: PasswordVisibility;
  setShowPasswords: Dispatch<SetStateAction<PasswordVisibility>>;
  passwordLoading: boolean;
  validatePassword: (password: string) => PasswordValidationResult;
  handlePasswordChange: () => Promise<void>;
  showOtpModal: boolean;
  setShowOtpModal: Dispatch<SetStateAction<boolean>>;
  otp: string;
  setOtp: Dispatch<SetStateAction<string>>;
  otpLoading: boolean;
  countdown: number;
  verifyOtpAndChangePassword: () => Promise<void>;
  resendPasswordOtp: () => void;
  handleClosePasswordOtpModal: () => void;
  handleCancelPasswordChange: () => void;
};

export function useProfilePasswordFlow(
  userEmail: string | undefined
): UseProfilePasswordFlowResult {
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [passwordData, setPasswordData] = useState<PasswordData>(DEFAULT_PASSWORD_DATA);
  const [showPasswords, setShowPasswords] = useState<PasswordVisibility>(DEFAULT_PASSWORD_VISIBILITY);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const validatePassword = useCallback((password: string): PasswordValidationResult => {
    return validatePasswordRequirements(password);
  }, []);

  const handleCancelPasswordChange = useCallback((): void => {
    setShowPasswordChange(false);
    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setShowPasswords({ current: false, new: false, confirm: false });
  }, []);

  const handleClosePasswordOtpModal = useCallback((): void => {
    setShowOtpModal(false);
    setOtp('');
    handleCancelPasswordChange();
  }, [handleCancelPasswordChange]);

  const handlePasswordChange = useCallback(async (): Promise<void> => {
    if (!passwordData.currentPassword) {
      toast.error('Current password is required');
      return;
    }

    const validation = validatePassword(passwordData.newPassword);
    if (!validation.isValid) {
      toast.error('New password does not meet requirements');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordData.currentPassword === passwordData.newPassword) {
      toast.error('New password must be different from current password');
      return;
    }

    setPasswordLoading(true);
    try {
      const result = await sendPasswordResetOtp({ email: userEmail, type: 'password_reset' });
      if (result.success) {
        setShowOtpModal(true);
        startCountdown(60, setCountdown);
        toast.success('OTP sent to your email for verification');
      } else {
        toast.error(result.message ?? 'Failed to send OTP');
      }
    } catch {
      toast.error('Failed to send OTP');
    } finally {
      setPasswordLoading(false);
    }
  }, [passwordData, userEmail, validatePassword]);

  const verifyOtpAndChangePassword = useCallback(async (): Promise<void> => {
    if (!otp || otp.length !== 6) {
      toast.error('Please enter a valid 6-digit OTP');
      return;
    }

    setOtpLoading(true);
    try {
      const result = await changePasswordWithOtp({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
        otp,
        email: userEmail,
      });

      if (result.success) {
        toast.success('Password changed successfully!');
        handleCancelPasswordChange();
        setShowOtpModal(false);
        setOtp('');
      } else {
        toast.error(result.message ?? 'Failed to change password');
      }
    } catch {
      toast.error('Failed to change password');
    } finally {
      setOtpLoading(false);
    }
  }, [handleCancelPasswordChange, otp, passwordData, userEmail]);

  const resendPasswordOtp = useCallback((): void => {
    void handlePasswordChange();
  }, [handlePasswordChange]);

  return {
    showPasswordChange,
    setShowPasswordChange,
    passwordData,
    setPasswordData,
    showPasswords,
    setShowPasswords,
    passwordLoading,
    validatePassword,
    handlePasswordChange,
    showOtpModal,
    setShowOtpModal,
    otp,
    setOtp,
    otpLoading,
    countdown,
    verifyOtpAndChangePassword,
    resendPasswordOtp,
    handleClosePasswordOtpModal,
    handleCancelPasswordChange,
  };
}
