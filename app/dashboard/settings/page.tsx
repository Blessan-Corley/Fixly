'use client';

import { motion } from 'framer-motion';
import { Loader } from 'lucide-react';
import dynamic from 'next/dynamic';

import {
  SettingsFooter,
  SettingsNavigation,
} from '../../../components/dashboard/settings/SettingsLayoutSections';
import { SettingsSectionContent } from '../../../components/dashboard/settings/SettingsSectionContent';
import { RoleGuard, useApp } from '../../providers';

import { useSettingsPage } from './useSettingsPage';

const SettingsModals = dynamic(
  () =>
    import('../../../components/dashboard/settings/SettingsModals').then((module) => ({
      default: module.SettingsModals,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center gap-2 rounded-md border border-fixly-border p-3 text-sm text-fixly-text-muted">
        <Loader className="h-4 w-4 animate-spin" />
        Loading settings tools...
      </div>
    ),
  }
);

export default function SettingsPage(): React.ReactElement {
  return (
    <RoleGuard roles={['hirer', 'fixer']} fallback={<div>Access denied</div>}>
      <SettingsContent />
    </RoleGuard>
  );
}

function SettingsContent(): React.ReactElement {
  const { user: appUser } = useApp();
  const {
    user,
    activeSection,
    setActiveSection,
    badgeStyle,
    compactMode,
    animationsEnabled,
    autoRefresh,
    settingSections,
    handleBadgeStyleChange,
    handleCompactModeChange,
    handleAnimationsChange,
    handleAutoRefreshChange,
    handleSignOut,
    themeControls,
    accountFlows,
    derived,
  } = useSettingsPage(appUser);

  const {
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
    otpType,
    otp,
    setOtp,
    otpLoading,
    countdown,
    verificationData,
    setVerificationData,
    uploadingVerification,
    showVerificationModal,
    setShowVerificationModal,
    handleUsernameChange,
    handleEmailChange,
    verifyOtpAndUpdate,
    isValidEmail,
    resendOtp,
    handleVerificationSubmit,
    handleDocumentUpload,
    removeDocument,
    handleCloseVerificationModal,
    handleCloseOtpModal,
  } = accountFlows;

  const { setLightTheme, setDarkTheme, setSystemTheme, isDark, isLight, isSystem } = themeControls;

  return (
    <div className="mx-auto max-w-6xl p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold text-fixly-text">Settings</h1>
        <p className="text-fixly-text-muted">Manage your account settings and preferences</p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
        <div className="lg:col-span-1">
          <SettingsNavigation
            sections={settingSections}
            activeSection={activeSection}
            onSelectSection={setActiveSection}
          />
        </div>

        <div className="lg:col-span-3">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
          >
            <SettingsSectionContent
              activeSection={activeSection}
              user={user}
              loading={loading}
              showEmailChange={showEmailChange}
              setShowEmailChange={setShowEmailChange}
              newEmail={newEmail}
              setNewEmail={setNewEmail}
              handleEmailChange={handleEmailChange}
              isValidEmail={isValidEmail}
              showUsernameChange={showUsernameChange}
              setShowUsernameChange={setShowUsernameChange}
              newUsername={newUsername}
              setNewUsername={setNewUsername}
              handleUsernameChange={handleUsernameChange}
              usernameChangeCount={derived.usernameChangeCount}
              verificationStatusUi={derived.verificationStatusUi}
              verificationReapplyDaysRemaining={derived.verificationReapplyDaysRemaining}
              onOpenVerificationModal={() => { setShowVerificationModal(true); }}
              badgeStyle={badgeStyle}
              onBadgeStyleChange={handleBadgeStyleChange}
              compactMode={compactMode}
              onCompactModeChange={handleCompactModeChange}
              isDark={isDark}
              isLight={isLight}
              isSystem={isSystem}
              setLightTheme={setLightTheme}
              setDarkTheme={setDarkTheme}
              setSystemTheme={setSystemTheme}
              animationsEnabled={animationsEnabled}
              onAnimationsChange={handleAnimationsChange}
              autoRefresh={autoRefresh}
              onAutoRefreshChange={handleAutoRefreshChange}
            />
          </motion.div>
        </div>
      </div>

      <SettingsFooter onSignOut={handleSignOut} />

      <SettingsModals
        user={user}
        showVerificationModal={showVerificationModal}
        verificationData={verificationData}
        setVerificationData={setVerificationData}
        uploadingVerification={uploadingVerification}
        onCloseVerificationModal={handleCloseVerificationModal}
        onHandleDocumentUpload={handleDocumentUpload}
        onRemoveDocument={removeDocument}
        onSubmitVerification={handleVerificationSubmit}
        showOtpModal={showOtpModal}
        otpType={otpType}
        newUsername={newUsername}
        newEmail={newEmail}
        otp={otp}
        setOtp={setOtp}
        otpLoading={otpLoading}
        countdown={countdown}
        onCloseOtpModal={handleCloseOtpModal}
        onVerifyOtpAndUpdate={verifyOtpAndUpdate}
        onResendOtp={resendOtp}
      />
    </div>
  );
}
