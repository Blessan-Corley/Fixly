'use client';

import { Bell, CreditCard, Globe, Palette, Shield, User } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { useTheme } from '../../../contexts/ThemeContext';
import { useSettingsAccountFlows } from '../../../hooks/useSettingsAccountFlows';
import { getVerificationStatusPresentation } from '../../../lib/settings/verification';
import { getVerificationReapplyDaysRemaining } from '../../../lib/validations/settings';
import type {
  BadgeStyle,
  SettingSection,
  SettingsSectionId,
  SettingsUser,
} from '../../../types/settings';
import type { AppUser } from '../../providers';

function readCookie(name: string): string | undefined {
  return document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${name}=`))
    ?.split('=')[1];
}

function saveCookie(name: string, value: string): void {
  document.cookie = `${name}=${value}; path=/; max-age=${365 * 24 * 60 * 60}`;
}

export type UseSettingsPageResult = ReturnType<typeof useSettingsPage>;

export function useSettingsPage(appUser: AppUser | null): {
  user: SettingsUser | null;
  activeSection: SettingsSectionId;
  setActiveSection: (id: SettingsSectionId) => void;
  badgeStyle: BadgeStyle;
  compactMode: boolean;
  animationsEnabled: boolean;
  autoRefresh: boolean;
  settingSections: SettingSection[];
  handleBadgeStyleChange: (style: BadgeStyle) => void;
  handleCompactModeChange: (enabled: boolean) => void;
  handleAnimationsChange: (enabled: boolean) => void;
  handleAutoRefreshChange: (enabled: boolean) => void;
  handleSignOut: () => void;
  themeControls: ReturnType<typeof useTheme>;
  accountFlows: ReturnType<typeof useSettingsAccountFlows>;
  derived: {
    usernameChangeCount: number;
    verificationReapplyDaysRemaining: number;
    verificationStatusUi: ReturnType<typeof getVerificationStatusPresentation>;
  };
} {
  const user = appUser as SettingsUser | null;
  const themeControls = useTheme();

  const checkUsernameAbortRef = useRef<AbortController | null>(null);
  const sendOtpAbortRef = useRef<AbortController | null>(null);
  const checkEmailAbortRef = useRef<AbortController | null>(null);
  const verifyOtpAbortRef = useRef<AbortController | null>(null);
  const updateSettingsAbortRef = useRef<AbortController | null>(null);
  const verificationAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      [
        checkUsernameAbortRef,
        sendOtpAbortRef,
        checkEmailAbortRef,
        verifyOtpAbortRef,
        updateSettingsAbortRef,
        verificationAbortRef,
      ].forEach((ref) => { if (ref.current) ref.current.abort(); });
    };
  }, []);

  const [activeSection, setActiveSection] = useState<SettingsSectionId>('profile');
  const [badgeStyle, setBadgeStyle] = useState<BadgeStyle>('numbers');
  const [compactMode, setCompactMode] = useState(false);
  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    const savedBadge = readCookie('badgeStyle');
    const savedCompact = readCookie('compactMode') === 'true';
    const savedAnimations = readCookie('animationsEnabled') !== 'false';
    const savedAutoRefresh = readCookie('autoRefresh') !== 'false';

    setBadgeStyle(savedBadge === 'dots' ? 'dots' : 'numbers');
    setCompactMode(savedCompact);
    setAnimationsEnabled(savedAnimations);
    setAutoRefresh(savedAutoRefresh);
  }, []);

  const accountFlows = useSettingsAccountFlows({ user });

  const handleBadgeStyleChange = (style: BadgeStyle): void => {
    setBadgeStyle(style);
    saveCookie('badgeStyle', style);
    toast.success('Badge style updated', { description: `Now showing ${style} for notifications` });
  };

  const handleCompactModeChange = (enabled: boolean): void => {
    setCompactMode(enabled);
    saveCookie('compactMode', String(enabled));
    toast.success(`Compact mode ${enabled ? 'enabled' : 'disabled'}`, {
      description: enabled ? 'Interface will use smaller elements' : 'Interface will use normal spacing',
    });
  };

  const handleAnimationsChange = (enabled: boolean): void => {
    setAnimationsEnabled(enabled);
    saveCookie('animationsEnabled', String(enabled));
    toast.success(`Animations ${enabled ? 'enabled' : 'disabled'}`, {
      description: enabled ? 'Smooth transitions will be shown' : 'Reduced motion for better performance',
    });
    if (enabled) {
      document.documentElement.classList.remove('reduce-motion');
    } else {
      document.documentElement.classList.add('reduce-motion');
    }
  };

  const handleAutoRefreshChange = (enabled: boolean): void => {
    setAutoRefresh(enabled);
    saveCookie('autoRefresh', String(enabled));
    toast.success(`Auto-refresh ${enabled ? 'enabled' : 'disabled'}`, {
      description: enabled ? 'Content will update automatically' : 'Manual refresh required for updates',
    });
  };

  const handleSignOut = (): void => {
    if (window.confirm('Are you sure you want to sign out?')) {
      window.location.href = '/api/auth/signout';
    }
  };

  const settingSections: SettingSection[] = [
    { id: 'profile', title: 'Profile Settings', icon: User, description: 'Manage your personal information' },
    { id: 'verification', title: 'Account Verification', icon: Shield, description: 'Verify your identity for trust and safety' },
    { id: 'notifications', title: 'Notifications', icon: Bell, description: 'Control your notification preferences' },
    { id: 'appearance', title: 'Appearance', icon: Palette, description: 'Customize your interface' },
    { id: 'language', title: 'Language & Region', icon: Globe, description: 'Set your language preferences' },
  ];

  if (user?.plan?.type === 'pro') {
    settingSections.push({ id: 'billing', title: 'Billing & Subscription', icon: CreditCard, description: 'Manage your subscription' });
  }

  const derived = {
    usernameChangeCount: user?.usernameChangeCount ?? 0,
    verificationReapplyDaysRemaining: getVerificationReapplyDaysRemaining(user?.verification?.lastApplicationDate),
    verificationStatusUi: getVerificationStatusPresentation(Boolean(user?.isVerified), user?.verification?.status),
  };

  return {
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
  };
}
