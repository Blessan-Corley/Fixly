'use client';

import { useCallback, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { toast } from 'sonner';

import { updatePhoneNumber } from '../lib/services/profileClient';
import type { PhoneVerificationResult, ProfileUser } from '../types/profile';

export type UseProfilePhoneFlowResult = {
  showPhoneVerification: boolean;
  setShowPhoneVerification: Dispatch<SetStateAction<boolean>>;
  newPhoneNumber: string;
  setNewPhoneNumber: Dispatch<SetStateAction<string>>;
  showPhoneEdit: boolean;
  setShowPhoneEdit: Dispatch<SetStateAction<boolean>>;
  handleClosePhoneEdit: () => void;
  handlePhoneVerificationComplete: (result: PhoneVerificationResult) => Promise<void>;
  handlePhoneVerificationError: (error: Error) => void;
  handlePhoneNumberUpdate: () => Promise<void>;
};

export function useProfilePhoneFlow(
  user: ProfileUser | null,
  updateUser: (user: Partial<ProfileUser>) => void
): UseProfilePhoneFlowResult {
  const [showPhoneVerification, setShowPhoneVerification] = useState(false);
  const [newPhoneNumber, setNewPhoneNumber] = useState('');
  const [showPhoneEdit, setShowPhoneEdit] = useState(false);

  const handleClosePhoneEdit = useCallback((): void => {
    setShowPhoneEdit(false);
    setNewPhoneNumber('');
  }, []);

  const handlePhoneVerificationComplete = useCallback(
    async (result: PhoneVerificationResult): Promise<void> => {
      console.log('Phone verification completed:', result);

      if (result.user) {
        updateUser(result.user);
      }

      setShowPhoneVerification(false);
      setNewPhoneNumber('');
      toast.success('Phone number verified successfully!');
    },
    [updateUser]
  );

  const handlePhoneVerificationError = useCallback((error: Error): void => {
    console.error('Phone verification error:', error);
    toast.error(error.message || 'Phone verification failed');
  }, []);

  const handlePhoneNumberUpdate = useCallback(async (): Promise<void> => {
    if (!newPhoneNumber || newPhoneNumber.length !== 10) {
      toast.error('Please enter a valid 10-digit phone number');
      return;
    }

    if (!user) {
      toast.error('User not available');
      return;
    }

    try {
      const result = await updatePhoneNumber({ phoneNumber: newPhoneNumber });

      if (result.success) {
        updateUser({ ...user, phone: newPhoneNumber, phoneVerified: false });
        setShowPhoneEdit(false);
        setShowPhoneVerification(true);
        toast.success('Phone number updated! Please verify it now.');
      } else {
        toast.error(result.message ?? 'Failed to update phone number');
      }
    } catch (error) {
      console.error('Phone update error:', error);
      toast.error('Failed to update phone number');
    }
  }, [newPhoneNumber, updateUser, user]);

  return {
    showPhoneVerification,
    setShowPhoneVerification,
    newPhoneNumber,
    setNewPhoneNumber,
    showPhoneEdit,
    setShowPhoneEdit,
    handleClosePhoneEdit,
    handlePhoneVerificationComplete,
    handlePhoneVerificationError,
    handlePhoneNumberUpdate,
  };
}
