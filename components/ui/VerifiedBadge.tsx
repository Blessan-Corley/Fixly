'use client';

import { CheckCircle, Shield } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type BadgeSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
type BadgeVariant = 'default' | 'premium';

export interface VerifiedUser {
  isVerified?: boolean;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  rating?: {
    average?: number;
  };
}

interface BadgeConfig {
  badgeStyle: string;
  icon: LucideIcon;
  text: string;
  title: string;
}

export interface VerifiedBadgeProps {
  user?: VerifiedUser | null;
  size?: BadgeSize;
  showText?: boolean;
  variant?: BadgeVariant;
  className?: string;
}

const SIZE_CLASSES: Record<BadgeSize, string> = {
  xs: 'h-3 w-3',
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
  xl: 'h-8 w-8',
};

const TEXT_SIZES: Record<BadgeSize, string> = {
  xs: 'text-xs',
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
};

function getBadgeConfig(user: VerifiedUser, variant: BadgeVariant): BadgeConfig | null {
  const isVerified = Boolean(user.isVerified || (user.emailVerified && user.phoneVerified));
  const hasPartialVerification = Boolean(user.emailVerified || user.phoneVerified);

  if (!isVerified && !hasPartialVerification) return null;

  if (isVerified) {
    return {
      badgeStyle:
        variant === 'premium'
          ? 'text-fixly-primary bg-fixly-accent/20 border-fixly-accent/30'
          : 'text-green-600 bg-green-100 border-green-200',
      icon: variant === 'premium' ? Shield : CheckCircle,
      text: variant === 'premium' ? 'Premium Verified' : 'Verified',
      title: 'Email and phone verified • Trusted member',
    };
  }

  if (user.emailVerified && user.phoneVerified) {
    return {
      badgeStyle: 'text-green-600 bg-green-100 border-green-200',
      icon: CheckCircle,
      text: 'Verified',
      title: 'Email and phone verified',
    };
  }

  if (user.emailVerified) {
    return {
      badgeStyle: 'text-blue-600 bg-blue-100 border-blue-200',
      icon: CheckCircle,
      text: 'Email Verified',
      title: 'Email address verified',
    };
  }

  if (user.phoneVerified) {
    return {
      badgeStyle: 'text-blue-600 bg-blue-100 border-blue-200',
      icon: CheckCircle,
      text: 'Phone Verified',
      title: 'Phone number verified',
    };
  }

  return null;
}

export default function VerifiedBadge({
  user,
  size = 'sm',
  showText = false,
  variant = 'default',
  className = '',
}: VerifiedBadgeProps) {
  if (!user) return null;

  const config = getBadgeConfig(user, variant);
  if (!config) return null;

  const IconComponent = config.icon;
  const iconSize = SIZE_CLASSES[size] ?? SIZE_CLASSES.sm;
  const textSize = TEXT_SIZES[size] ?? TEXT_SIZES.sm;

  if (!showText) {
    return (
      <div
        className={`inline-flex items-center justify-center rounded-full border ${config.badgeStyle} ${className}`}
        title={config.title}
        style={{
          minWidth: size === 'xs' ? '16px' : size === 'sm' ? '20px' : '24px',
          minHeight: size === 'xs' ? '16px' : size === 'sm' ? '20px' : '24px',
          padding: size === 'xs' ? '2px' : '3px',
        }}
      >
        <IconComponent className={iconSize} />
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 ${config.badgeStyle} ${textSize} font-medium ${className}`}
      title={config.title}
    >
      <IconComponent className={iconSize} />
      <span>{config.text}</span>
    </div>
  );
}

export interface VerificationStatusProps {
  user?: VerifiedUser | null;
  className?: string;
}

interface VerificationItem {
  type: 'email' | 'phone' | 'account';
  label: string;
  icon: LucideIcon;
  color: string;
}

export function VerificationStatus({ user, className = '' }: VerificationStatusProps) {
  if (!user) return null;

  const verifications: VerificationItem[] = [];

  if (user.emailVerified) {
    verifications.push({
      type: 'email',
      label: 'Email verified',
      icon: CheckCircle,
      color: 'text-green-600',
    });
  }

  if (user.phoneVerified) {
    verifications.push({
      type: 'phone',
      label: 'Phone verified',
      icon: CheckCircle,
      color: 'text-green-600',
    });
  }

  if (user.isVerified && verifications.length === 2) {
    verifications.push({
      type: 'account',
      label: 'Account fully verified',
      icon: Shield,
      color: 'text-fixly-primary',
    });
  }

  if (verifications.length === 0) {
    return (
      <div className={`text-sm text-gray-500 ${className}`}>
        <span>Verification pending</span>
      </div>
    );
  }

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {verifications.map((verification) => {
        const IconComponent = verification.icon;
        return (
          <div
            key={verification.type}
            className={`flex items-center gap-1 text-xs ${verification.color}`}
          >
            <IconComponent className="h-3 w-3" />
            <span>{verification.label}</span>
          </div>
        );
      })}
    </div>
  );
}

export interface PremiumVerifiedBadgeProps {
  user?: VerifiedUser | null;
  size?: BadgeSize;
  showText?: boolean;
  className?: string;
}

export function PremiumVerifiedBadge({
  user,
  size = 'sm',
  showText = true,
  className = '',
}: PremiumVerifiedBadgeProps) {
  if (!user?.isVerified || !user?.rating?.average || user.rating.average < 4.5) return null;

  return (
    <VerifiedBadge
      user={user}
      size={size}
      showText={showText}
      variant="premium"
      className={className}
    />
  );
}
