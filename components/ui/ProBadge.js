import { Crown } from 'lucide-react';

export default function ProBadge({ isPro, size = 'sm', showIcon = true, className = '' }) {
  if (!isPro) return null;
  
  const sizeClasses = {
    xs: 'text-[10px] px-1.5 py-0.5',
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-2.5 py-1.5',
    lg: 'text-base px-3 py-2'
  };

  const iconSizes = {
    xs: 'h-2.5 w-2.5',
    sm: 'h-3 w-3', 
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };

  return (
    <span className={`inline-flex items-center bg-gradient-to-r from-fixly-accent to-yellow-400 text-fixly-text font-bold rounded-full ${sizeClasses[size]} ml-1.5 ${className}`}>
      {showIcon && <Crown className={`${iconSizes[size]} mr-1`} />}
      PRO
    </span>
  );
}

// Utility function to check if user has pro subscription
export function isUserPro(user, subscriptionInfo) {
  return subscriptionInfo?.isPro || 
         (user?.plan?.type === 'pro' && user?.plan?.status === 'active');
}