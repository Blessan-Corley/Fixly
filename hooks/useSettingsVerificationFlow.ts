'use client';

import { useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { toast } from 'sonner';

import { fetchWithCsrf } from '@/lib/api/fetchWithCsrf';
import { createEmptyVerificationFormData } from '../lib/settings/forms';
import {
  canAddVerificationDocuments,
  getVerificationReapplyDaysRemaining,
  validateVerificationUploadFiles,
} from '../lib/validations/settings';
import type { SettingsUser, VerificationFormData } from '../types/settings';

export type UseSettingsVerificationFlowResult = {
  verificationData: VerificationFormData;
  setVerificationData: Dispatch<SetStateAction<VerificationFormData>>;
  uploadingVerification: boolean;
  showVerificationModal: boolean;
  setShowVerificationModal: Dispatch<SetStateAction<boolean>>;
  handleVerificationSubmit: () => Promise<void>;
  handleDocumentUpload: (files: FileList | null) => void;
  removeDocument: (index: number) => void;
  handleCloseVerificationModal: () => void;
};

export function useSettingsVerificationFlow(
  user: SettingsUser | null
): UseSettingsVerificationFlowResult {
  const [verificationData, setVerificationData] = useState<VerificationFormData>(
    createEmptyVerificationFormData()
  );
  const [uploadingVerification, setUploadingVerification] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);

  const handleVerificationSubmit = async (): Promise<void> => {
    if (!verificationData.documentType || verificationData.documentFiles.length === 0) {
      toast.error('Please select document type and upload at least one document');
      return;
    }

    const daysRemaining = getVerificationReapplyDaysRemaining(
      user?.verification?.lastApplicationDate
    );
    if (daysRemaining > 0) {
      toast.error(
        `You can only apply for verification once every 7 days. Please wait ${daysRemaining} more days.`
      );
      return;
    }

    setUploadingVerification(true);
    try {
      const formData = new FormData();
      verificationData.documentFiles.forEach((file) => {
        formData.append('documents', file);
      });
      formData.append('documentType', verificationData.documentType);
      formData.append('additionalInfo', verificationData.additionalInfo);

      const response = await fetchWithCsrf('/api/user/verification/apply', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        toast.success(
          'Verification documents submitted successfully! We will review them within 3-5 business days.'
        );
        setShowVerificationModal(false);
        setVerificationData(createEmptyVerificationFormData());
        window.location.reload();
      } else {
        toast.error(data.message || 'Failed to submit verification');
      }
    } catch {
      toast.error('Failed to submit verification documents');
    } finally {
      setUploadingVerification(false);
    }
  };

  const handleDocumentUpload = (files: FileList | null): void => {
    if (!files) {
      return;
    }

    const { validFiles, errors } = validateVerificationUploadFiles(files);
    errors.forEach((message) => toast.error(message));

    if (!canAddVerificationDocuments(verificationData.documentFiles.length, validFiles.length)) {
      toast.error('Maximum 3 documents allowed');
      return;
    }

    setVerificationData((prev) => ({
      ...prev,
      documentFiles: [...prev.documentFiles, ...validFiles],
    }));
  };

  const removeDocument = (index: number): void => {
    setVerificationData((prev) => ({
      ...prev,
      documentFiles: prev.documentFiles.filter((_, i) => i !== index),
    }));
  };

  const handleCloseVerificationModal = (): void => {
    setShowVerificationModal(false);
    setVerificationData(createEmptyVerificationFormData());
  };

  return {
    verificationData,
    setVerificationData,
    uploadingVerification,
    showVerificationModal,
    setShowVerificationModal,
    handleVerificationSubmit,
    handleDocumentUpload,
    removeDocument,
    handleCloseVerificationModal,
  };
}
