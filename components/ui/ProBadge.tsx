import { Crown } from 'lucide-react';

type ProBadgeSize = 'xs' | 'sm' | 'md' | 'lg';

interface PlanInfo {
  type?: string;
  status?: string;
}

interface ProUser {
  plan?: PlanInfo;
}

interface ProSubscriptionInfo {
  isPro?: boolean;
}

export interface ProBadgeProps {
  isPro?: boolean;
  size?: ProBadgeSize;
  showIcon?: boolean;
  className?: string;
}

const SIZE_CLASSES: Record<ProBadgeSize, string> = {
  xs: 'text-[10px] px-1.5 py-0.5',
  sm: 'text-xs px-2 py-1',
  md: 'text-sm px-2.5 py-1.5',
  lg: 'text-base px-3 py-2',
};

const ICON_SIZES: Record<ProBadgeSize, string> = {
  xs: 'h-2.5 w-2.5',
  sm: 'h-3 w-3',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
};

export default function ProBadge({
  isPro,
  size = 'sm',
  showIcon = true,
  className = '',
}: ProBadgeProps) {
  if (!isPro) return null;

  return (
    <span
      className={`inline-flex items-center rounded-full bg-gradient-to-r from-fixly-accent to-yellow-400 font-bold text-fixly-text ${SIZE_CLASSES[size]} ml-1.5 ${className}`}
    >
      {showIcon && <Crown className={`${ICON_SIZES[size]} mr-1`} />}
      PRO
    </span>
  );
}

export function isUserPro(
  user?: ProUser | null,
  subscriptionInfo?: ProSubscriptionInfo | null
): boolean {
  return Boolean(
    subscriptionInfo?.isPro || (user?.plan?.type === 'pro' && user?.plan?.status === 'active')
  );
}
