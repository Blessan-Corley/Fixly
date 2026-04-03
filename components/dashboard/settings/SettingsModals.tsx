'use client';

import type { Dispatch, SetStateAction } from 'react';

import type { OtpType, SettingsUser, VerificationFormData } from '../../../types/settings';

import { OtpModal } from './OtpModal';
import { VerificationModal } from './VerificationModal';

export type SettingsModalsProps = {
  user: SettingsUser | null;
  showVerificationModal: boolean;
  verificationData: VerificationFormData;
  setVerificationData: Dispatch<SetStateAction<VerificationFormData>>;
  uploadingVerification: boolean;
  onCloseVerificationModal: () => void;
  onHandleDocumentUpload: (files: FileList | null) => void;
  onRemoveDocument: (index: number) => void;
  onSubmitVerification: () => void | Promise<void>;
  showOtpModal: boolean;
  otpType: OtpType;
  newUsername: string;
  newEmail: string;
  otp: string;
  setOtp: Dispatch<SetStateAction<string>>;
  otpLoading: boolean;
  countdown: number;
  onCloseOtpModal: () => void;
  onVerifyOtpAndUpdate: () => void | Promise<void>;
  onResendOtp: () => void;
};

export function SettingsModals({
  user,
  showVerificationModal,
  verificationData,
  setVerificationData,
  uploadingVerification,
  onCloseVerificationModal,
  onHandleDocumentUpload,
  onRemoveDocument,
  onSubmitVerification,
  showOtpModal,
  otpType,
  newUsername,
  newEmail,
  otp,
  setOtp,
  otpLoading,
  countdown,
  onCloseOtpModal,
  onVerifyOtpAndUpdate,
  onResendOtp,
}: SettingsModalsProps): React.JSX.Element {
  return (
    <>
      {showVerificationModal && (
        <VerificationModal
          verificationData={verificationData}
          setVerificationData={setVerificationData}
          uploadingVerification={uploadingVerification}
          onClose={onCloseVerificationModal}
          onHandleDocumentUpload={onHandleDocumentUpload}
          onRemoveDocument={onRemoveDocument}
          onSubmit={onSubmitVerification}
        />
      )}
      {showOtpModal && (
        <OtpModal
          user={user}
          otpType={otpType}
          newUsername={newUsername}
          newEmail={newEmail}
          otp={otp}
          setOtp={setOtp}
          otpLoading={otpLoading}
          countdown={countdown}
          onClose={onCloseOtpModal}
          onVerifyAndUpdate={onVerifyOtpAndUpdate}
          onResend={onResendOtp}
        />
      )}
    </>
  );
}
