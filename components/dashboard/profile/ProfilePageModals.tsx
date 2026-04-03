'use client';

import type { Dispatch, SetStateAction } from 'react';

import type { PhoneVerificationResult, ProfileLocation, ProfileUser } from '../../../types/profile';

import ProfileEmailChangeModal from './ProfileEmailChangeModal';
import ProfileLocationModal from './ProfileLocationModal';
import ProfileOtpModal from './ProfileOtpModal';
import ProfilePhoneEditModal from './ProfilePhoneEditModal';
import ProfilePhoneVerificationModal from './ProfilePhoneVerificationModal';

type AsyncOrSyncHandler = () => void | Promise<void>;

export type ProfilePageModalsProps = {
  user: ProfileUser | null;
  showOtpModal: boolean;
  otp: string;
  setOtp: Dispatch<SetStateAction<string>>;
  otpLoading: boolean;
  countdown: number;
  passwordLoading: boolean;
  onCloseOtpModal: () => void;
  onVerifyOtpAndChangePassword: AsyncOrSyncHandler;
  onResendPasswordOtp: () => void;
  showLocationPicker: boolean;
  location: ProfileLocation | null;
  onCloseLocationPicker: () => void;
  onLocationSelect: (selectedLocation: ProfileLocation | null) => void;
  showPhoneEdit: boolean;
  newPhoneNumber: string;
  setNewPhoneNumber: Dispatch<SetStateAction<string>>;
  onClosePhoneEdit: () => void;
  onPhoneNumberUpdate: AsyncOrSyncHandler;
  showPhoneVerification: boolean;
  onClosePhoneVerification: () => void;
  onPhoneVerificationComplete: (result: PhoneVerificationResult) => void | Promise<void>;
  onPhoneVerificationError: (error: Error) => void;
  showEmailChange: boolean;
  newEmail: string;
  setNewEmail: Dispatch<SetStateAction<string>>;
  emailOtp: string;
  setEmailOtp: Dispatch<SetStateAction<string>>;
  emailOtpSent: boolean;
  emailChangeLoading: boolean;
  emailOtpCountdown: number;
  onCancelEmailChange: () => void;
  onSendEmailOtp: AsyncOrSyncHandler;
  onVerifyEmailChange: AsyncOrSyncHandler;
};

export function ProfilePageModals({
  user,
  showOtpModal,
  otp,
  setOtp,
  otpLoading,
  countdown,
  passwordLoading,
  onCloseOtpModal,
  onVerifyOtpAndChangePassword,
  onResendPasswordOtp,
  showLocationPicker,
  location,
  onCloseLocationPicker,
  onLocationSelect,
  showPhoneEdit,
  newPhoneNumber,
  setNewPhoneNumber,
  onClosePhoneEdit,
  onPhoneNumberUpdate,
  showPhoneVerification,
  onClosePhoneVerification,
  onPhoneVerificationComplete,
  onPhoneVerificationError,
  showEmailChange,
  newEmail,
  setNewEmail,
  emailOtp,
  setEmailOtp,
  emailOtpSent,
  emailChangeLoading,
  emailOtpCountdown,
  onCancelEmailChange,
  onSendEmailOtp,
  onVerifyEmailChange,
}: ProfilePageModalsProps): React.JSX.Element {
  return (
    <>
      {showOtpModal ? (
        <ProfileOtpModal
          user={user}
          otp={otp}
          setOtp={setOtp}
          otpLoading={otpLoading}
          countdown={countdown}
          passwordLoading={passwordLoading}
          onClose={onCloseOtpModal}
          onVerify={onVerifyOtpAndChangePassword}
          onResend={onResendPasswordOtp}
        />
      ) : null}

      {showLocationPicker ? (
        <ProfileLocationModal
          location={location}
          onClose={onCloseLocationPicker}
          onLocationSelect={onLocationSelect}
        />
      ) : null}

      {showPhoneEdit ? (
        <ProfilePhoneEditModal
          newPhoneNumber={newPhoneNumber}
          setNewPhoneNumber={setNewPhoneNumber}
          onClose={onClosePhoneEdit}
          onUpdate={onPhoneNumberUpdate}
        />
      ) : null}

      {showPhoneVerification ? (
        <ProfilePhoneVerificationModal
          user={user}
          newPhoneNumber={newPhoneNumber}
          onClose={onClosePhoneVerification}
          onVerificationComplete={onPhoneVerificationComplete}
          onVerificationError={onPhoneVerificationError}
        />
      ) : null}

      {showEmailChange ? (
        <ProfileEmailChangeModal
          user={user}
          newEmail={newEmail}
          setNewEmail={setNewEmail}
          emailOtp={emailOtp}
          setEmailOtp={setEmailOtp}
          emailOtpSent={emailOtpSent}
          emailChangeLoading={emailChangeLoading}
          emailOtpCountdown={emailOtpCountdown}
          onCancel={onCancelEmailChange}
          onSendOtp={onSendEmailOtp}
          onVerify={onVerifyEmailChange}
        />
      ) : null}
    </>
  );
}
