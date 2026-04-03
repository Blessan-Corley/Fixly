'use client';

import { Loader } from 'lucide-react';
import dynamic from 'next/dynamic';

import {
  ProfileBasicInformationSection,
  ProfileLocationSection,
  ProfileSkillsServicesSection,
} from '../../../components/dashboard/profile/ProfileMainSections';
import { ProfilePasswordSecuritySection } from '../../../components/dashboard/profile/ProfilePasswordSecuritySection';
import {
  ProfileEditActionButtons,
  ProfilePreferencesSection,
} from '../../../components/dashboard/profile/ProfilePreferencesSection';
import { ProfileSidebarSections } from '../../../components/dashboard/profile/ProfileSidebarSections';

import { useProfilePage } from './useProfilePage';

const ProfilePageModals = dynamic(
  () =>
    import('../../../components/dashboard/profile/ProfilePageModals').then((module) => ({
      default: module.ProfilePageModals,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center gap-2 rounded-md border border-fixly-border p-3 text-sm text-fixly-text-muted">
        <Loader className="h-4 w-4 animate-spin" />
        Loading profile tools...
      </div>
    ),
  }
);

export default function ProfilePage() {
  const {
    user,
    loading,
    uploading,
    editing,
    name,
    bio,
    location,
    skills,
    availableNow,
    serviceRadius,
    preferences,
    showLocationPicker,
    setAvailableNow,
    setServiceRadius,
    setShowLocationPicker,
    handleNameChange,
    handleBioChange,
    handleSkillsChange,
    handlePreferenceChange,
    handleLocationSelect,
    handlePhotoUpload,
    handleSave,
    handleCancelEdit,
    handleStartEdit,
    securityFlows,
  } = useProfilePage();

  const {
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
    otp,
    setOtp,
    otpLoading,
    countdown,
    verifyOtpAndChangePassword,
    resendPasswordOtp,
    handleClosePasswordOtpModal,
    handleCancelPasswordChange,
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
  } = securityFlows;

  if (!user) {
    return (
      <div className="p-6 lg:p-8">
        <div className="flex min-h-[400px] items-center justify-center">
          <Loader className="h-8 w-8 animate-spin text-fixly-accent" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-7xl p-4 md:p-6 lg:p-8">
      <div className="mb-6 md:mb-8">
        <h1 className="mb-2 text-xl font-bold text-fixly-text md:text-2xl">My Profile</h1>
        <p className="text-sm text-fixly-text-light md:text-base">
          Manage your profile information and preferences
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-3">
        <div className="space-y-4 md:space-y-6">
          <ProfileSidebarSections
            user={user}
            uploading={uploading}
            onPhotoUpload={handlePhotoUpload}
          />
        </div>

        <div className="space-y-4 md:space-y-6 lg:col-span-2">
          <ProfileBasicInformationSection
            user={user}
            editing={editing}
            name={name}
            bio={bio}
            onEdit={handleStartEdit}
            onNameChange={handleNameChange}
            onBioChange={handleBioChange}
            onOpenEmailChange={() => setShowEmailChange(true)}
            onOpenPhoneChange={() => setShowPhoneEdit(true)}
            onOpenPhoneVerification={() => setShowPhoneVerification(true)}
          />
          <ProfileLocationSection
            user={user}
            editing={editing}
            location={location}
            onEdit={handleStartEdit}
            onClearLocation={() => setShowLocationPicker(false)}
            onOpenLocationPicker={() => setShowLocationPicker(true)}
          />
          <ProfileSkillsServicesSection
            user={user}
            editing={editing}
            skills={skills}
            availableNow={availableNow}
            serviceRadius={serviceRadius}
            onEdit={handleStartEdit}
            onSkillsChange={handleSkillsChange}
            onAvailableNowChange={setAvailableNow}
            onServiceRadiusChange={setServiceRadius}
          />
          <ProfilePasswordSecuritySection
            showPasswordChange={showPasswordChange}
            setShowPasswordChange={setShowPasswordChange}
            passwordData={passwordData}
            setPasswordData={setPasswordData}
            showPasswords={showPasswords}
            setShowPasswords={setShowPasswords}
            passwordLoading={passwordLoading}
            validatePassword={validatePassword}
            onSubmitPasswordChange={handlePasswordChange}
            onCancelPasswordChange={handleCancelPasswordChange}
          />
          <ProfilePreferencesSection
            editing={editing}
            user={user}
            preferences={preferences}
            onEdit={handleStartEdit}
            onPreferenceChange={handlePreferenceChange}
          />
          <ProfileEditActionButtons
            editing={editing}
            loading={loading}
            onSave={handleSave}
            onCancel={handleCancelEdit}
          />
        </div>
      </div>

      <ProfilePageModals
        user={user}
        showOtpModal={showOtpModal}
        otp={otp}
        setOtp={setOtp}
        otpLoading={otpLoading}
        countdown={countdown}
        passwordLoading={passwordLoading}
        onCloseOtpModal={handleClosePasswordOtpModal}
        onVerifyOtpAndChangePassword={verifyOtpAndChangePassword}
        onResendPasswordOtp={resendPasswordOtp}
        showLocationPicker={showLocationPicker}
        location={location}
        onCloseLocationPicker={() => setShowLocationPicker(false)}
        onLocationSelect={handleLocationSelect}
        showPhoneEdit={showPhoneEdit}
        newPhoneNumber={newPhoneNumber}
        setNewPhoneNumber={setNewPhoneNumber}
        onClosePhoneEdit={handleClosePhoneEdit}
        onPhoneNumberUpdate={handlePhoneNumberUpdate}
        showPhoneVerification={showPhoneVerification}
        onClosePhoneVerification={() => setShowPhoneVerification(false)}
        onPhoneVerificationComplete={handlePhoneVerificationComplete}
        onPhoneVerificationError={handlePhoneVerificationError}
        showEmailChange={showEmailChange}
        newEmail={newEmail}
        setNewEmail={setNewEmail}
        emailOtp={emailOtp}
        setEmailOtp={setEmailOtp}
        emailOtpSent={emailOtpSent}
        emailChangeLoading={emailChangeLoading}
        emailOtpCountdown={emailOtpCountdown}
        onCancelEmailChange={handleCancelEmailChange}
        onSendEmailOtp={handleSendEmailOtp}
        onVerifyEmailChange={handleVerifyEmailChange}
      />
    </div>
  );
}
