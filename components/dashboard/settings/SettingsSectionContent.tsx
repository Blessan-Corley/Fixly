'use client';

import type { Dispatch, SetStateAction } from 'react';

import type { BadgeStyle, SettingsSectionId, SettingsUser } from '../../../types/settings';

import { SettingsAppearancePanel } from './SettingsAppearancePanel';
import { SettingsNotificationPanel } from './SettingsNotificationPanel';
import { SettingsProfilePanel } from './SettingsProfilePanel';
import {
  SettingsVerificationPanel,
  type VerificationStatusUi,
} from './SettingsVerificationPanel';

export type { VerificationStatusUi };

export type SettingsSectionContentProps = {
  activeSection: SettingsSectionId;
  user: SettingsUser | null;
  loading: boolean;
  showEmailChange: boolean;
  setShowEmailChange: Dispatch<SetStateAction<boolean>>;
  newEmail: string;
  setNewEmail: Dispatch<SetStateAction<string>>;
  handleEmailChange: () => void;
  isValidEmail: (email: string) => boolean;
  showUsernameChange: boolean;
  setShowUsernameChange: Dispatch<SetStateAction<boolean>>;
  newUsername: string;
  setNewUsername: Dispatch<SetStateAction<string>>;
  handleUsernameChange: () => void;
  usernameChangeCount: number;
  verificationStatusUi: VerificationStatusUi;
  verificationReapplyDaysRemaining: number;
  onOpenVerificationModal: () => void;
  badgeStyle: BadgeStyle;
  onBadgeStyleChange: (style: BadgeStyle) => void;
  compactMode: boolean;
  onCompactModeChange: (enabled: boolean) => void;
  isDark: boolean;
  isLight: boolean;
  isSystem: boolean;
  setLightTheme: () => void;
  setDarkTheme: () => void;
  setSystemTheme: () => void;
  animationsEnabled: boolean;
  onAnimationsChange: (enabled: boolean) => void;
  autoRefresh: boolean;
  onAutoRefreshChange: (enabled: boolean) => void;
};

export function SettingsSectionContent(props: SettingsSectionContentProps) {
  const {
    activeSection,
    user,
    loading,
    showEmailChange,
    setShowEmailChange,
    newEmail,
    setNewEmail,
    handleEmailChange,
    isValidEmail,
    showUsernameChange,
    setShowUsernameChange,
    newUsername,
    setNewUsername,
    handleUsernameChange,
    usernameChangeCount,
    verificationStatusUi,
    verificationReapplyDaysRemaining,
    onOpenVerificationModal,
    badgeStyle,
    onBadgeStyleChange,
    compactMode,
    onCompactModeChange,
    isDark,
    isLight,
    isSystem,
    setLightTheme,
    setDarkTheme,
    setSystemTheme,
    animationsEnabled,
    onAnimationsChange,
    autoRefresh,
    onAutoRefreshChange,
  } = props;

  const profileProps = {
    user,
    loading,
    showEmailChange,
    setShowEmailChange,
    newEmail,
    setNewEmail,
    handleEmailChange,
    isValidEmail,
    showUsernameChange,
    setShowUsernameChange,
    newUsername,
    setNewUsername,
    handleUsernameChange,
    usernameChangeCount,
  };

  switch (activeSection) {
    case 'profile':
      return <SettingsProfilePanel {...profileProps} />;
    case 'verification':
      return (
        <SettingsVerificationPanel
          user={user}
          verificationStatusUi={verificationStatusUi}
          verificationReapplyDaysRemaining={verificationReapplyDaysRemaining}
          onOpenVerificationModal={onOpenVerificationModal}
        />
      );
    case 'notifications':
      return (
        <SettingsNotificationPanel
          user={user}
          badgeStyle={badgeStyle}
          onBadgeStyleChange={onBadgeStyleChange}
          compactMode={compactMode}
          onCompactModeChange={onCompactModeChange}
        />
      );
    case 'appearance':
      return (
        <SettingsAppearancePanel
          isDark={isDark}
          isLight={isLight}
          isSystem={isSystem}
          setLightTheme={setLightTheme}
          setDarkTheme={setDarkTheme}
          setSystemTheme={setSystemTheme}
          compactMode={compactMode}
          handleCompactModeChange={onCompactModeChange}
          animationsEnabled={animationsEnabled}
          handleAnimationsChange={onAnimationsChange}
          autoRefresh={autoRefresh}
          handleAutoRefreshChange={onAutoRefreshChange}
        />
      );
    case 'language':
      return (
        <div className="card">
          <p className="text-fixly-text-muted">Language settings coming soon...</p>
        </div>
      );
    case 'billing':
      return (
        <div className="card">
          <p className="text-fixly-text-muted">
            <a href="/dashboard/subscription" className="text-fixly-primary hover:underline">
              Go to Subscription page
            </a>
          </p>
        </div>
      );
    default:
      return <SettingsProfilePanel {...profileProps} />;
  }
}
