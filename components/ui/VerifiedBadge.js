// components/ui/VerifiedBadge.js
'use client';

import { CheckCircle, Shield, Star } from 'lucide-react';

export default function VerifiedBadge({ 
  user, 
  size = 'sm', 
  showText = false, 
  variant = 'default',
  className = '' 
}) {
  if (!user) return null;

  const isVerified = user.isVerified || (user.emailVerified && user.phoneVerified);
  const hasPartialVerification = user.emailVerified || user.phoneVerified;

  if (!isVerified && !hasPartialVerification) return null;

  const sizeClasses = {
    xs: 'h-3 w-3',
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
    xl: 'h-8 w-8'
  };

  const textSizes = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl'
  };

  const iconSize = sizeClasses[size] || sizeClasses.sm;
  const textSize = textSizes[size] || textSizes.sm;

  // Determine badge style based on verification level
  let badgeStyle, icon, text, title;

  if (isVerified) {
    // Fully verified
    badgeStyle = variant === 'premium' 
      ? 'text-purple-600 bg-purple-100 border-purple-200'
      : 'text-green-600 bg-green-100 border-green-200';
    icon = variant === 'premium' ? Shield : CheckCircle;
    text = variant === 'premium' ? 'Premium Verified' : 'Verified';
    title = 'Email and phone verified • Trusted member';
  } else if (user.emailVerified && user.phoneVerified) {
    // Both verifications complete but not marked as verified
    badgeStyle = 'text-green-600 bg-green-100 border-green-200';
    icon = CheckCircle;
    text = 'Verified';
    title = 'Email and phone verified';
  } else if (user.emailVerified) {
    // Only email verified
    badgeStyle = 'text-blue-600 bg-blue-100 border-blue-200';
    icon = CheckCircle;
    text = 'Email Verified';
    title = 'Email address verified';
  } else if (user.phoneVerified) {
    // Only phone verified
    badgeStyle = 'text-blue-600 bg-blue-100 border-blue-200';
    icon = CheckCircle;
    text = 'Phone Verified';
    title = 'Phone number verified';
  }

  const IconComponent = icon;

  if (!showText) {
    // Icon only badge
    return (
      <div
        className={`inline-flex items-center justify-center rounded-full border ${badgeStyle} ${className}`}
        title={title}
        style={{ 
          minWidth: size === 'xs' ? '16px' : size === 'sm' ? '20px' : '24px',
          minHeight: size === 'xs' ? '16px' : size === 'sm' ? '20px' : '24px',
          padding: size === 'xs' ? '2px' : '3px'
        }}
      >
        <IconComponent className={iconSize} />
      </div>
    );
  }

  // Badge with text
  return (
    <div
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border ${badgeStyle} ${textSize} font-medium ${className}`}
      title={title}
    >
      <IconComponent className={iconSize} />
      {showText && <span>{text}</span>}
    </div>
  );
}

// Verification status indicator for profiles
export function VerificationStatus({ user, className = '' }) {
  if (!user) return null;

  const verifications = [];

  if (user.emailVerified) {
    verifications.push({
      type: 'email',
      label: 'Email verified',
      icon: CheckCircle,
      color: 'text-green-600'
    });
  }

  if (user.phoneVerified) {
    verifications.push({
      type: 'phone',
      label: 'Phone verified',
      icon: CheckCircle,
      color: 'text-green-600'
    });
  }

  if (user.isVerified && verifications.length === 2) {
    verifications.push({
      type: 'account',
      label: 'Account fully verified',
      icon: Shield,
      color: 'text-purple-600'
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

// Premium verified badge for top-rated users
export function PremiumVerifiedBadge({ user, size = 'sm', showText = true, className = '' }) {
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