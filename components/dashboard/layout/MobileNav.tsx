'use client';

import { HelpCircle, Settings, Wrench, X } from 'lucide-react';

import type {
  BadgeStyle,
  DashboardNavigationItem,
  DashboardUser,
  SubscriptionInfo,
} from '@/components/dashboard/layout/layout.types';
import { formatRole } from '@/components/dashboard/layout/layout.types';
import ProBadge from '@/components/ui/ProBadge';
import SmartAvatar from '@/components/ui/SmartAvatar';

type MobileNavProps = {
  isOpen: boolean;
  user: DashboardUser | null;
  subscriptionInfo: SubscriptionInfo | null;
  navigationItems: DashboardNavigationItem[];
  badgeStyle: BadgeStyle;
  onNavigate: (href: string) => void;
  onClose: () => void;
};

export function MobileNav({
  isOpen,
  user,
  subscriptionInfo,
  navigationItems,
  badgeStyle,
  onNavigate,
  onClose,
}: MobileNavProps) {
  return (
    <aside
      className={`sidebar fixed left-0 top-0 z-50 h-full w-64 transition-transform duration-300 lg:hidden ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      <div className="flex h-full flex-col border-r border-fixly-border bg-fixly-card">
        <div className="flex items-center justify-between border-b border-fixly-border p-6">
          <div className="flex items-center">
            <Wrench className="mr-2 h-8 w-8 text-fixly-accent" />
            <span className="text-xl font-bold text-fixly-text">Fixly</span>
          </div>
          <button onClick={onClose} className="rounded p-1 hover:bg-fixly-accent/10">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="border-b border-fixly-border p-6">
          <div className="flex items-center">
            <SmartAvatar
              user={{
                ...user,
                image: user?.photoURL,
                profilePhoto: { url: user?.photoURL },
              }}
              size="default"
              showBorder={false}
            />
            <div className="ml-3 min-w-0 flex-1">
              <p className="flex items-center truncate text-sm font-medium text-fixly-text">
                {user?.name}
                <ProBadge isPro={subscriptionInfo?.isPro} size="xs" />
              </p>
              <p className="truncate text-xs text-fixly-text-muted">{formatRole(user?.role)}</p>
            </div>
          </div>

          {user?.role === 'fixer' && (
            <div className="mt-3">
              <div
                className={`rounded-full px-2 py-1 text-xs ${
                  subscriptionInfo?.isPro
                    ? 'bg-fixly-accent text-fixly-text'
                    : 'bg-orange-100 text-orange-800'
                }`}
              >
                {subscriptionInfo?.isPro
                  ? 'â­ Pro Member'
                  : `${Math.max(0, 3 - (Number(user?.plan?.creditsUsed) || 0))} free credits left`}
              </div>
            </div>
          )}
        </div>

        <nav className="scrollbar-hide flex-1 space-y-2 overflow-y-auto px-4 py-6">
          {navigationItems.map((item) => (
            <button
              key={item.name}
              onClick={() => {
                onNavigate(item.href);
                onClose();
              }}
              className={`sidebar-item w-full ${
                item.current ? 'sidebar-item-active' : ''
              } ${item.highlight ? 'ring-2 ring-fixly-accent' : ''}`}
            >
              <item.icon className="mr-3 h-5 w-5" />
              <span className="flex-1 text-left">{item.name}</span>
              {(Number(item.count) || 0) > 0 &&
                (badgeStyle === 'dots' ? (
                  <div className="h-3 w-3 rounded-full bg-red-500"></div>
                ) : (
                  <span className="min-w-[20px] rounded-full bg-red-500 px-2 py-1 text-center text-xs text-white">
                    {(Number(item.count) || 0) > 9 ? '9+' : Number(item.count) || 0}
                  </span>
                ))}
              {item.badge && (
                <span className="rounded-full bg-orange-500 px-2 py-1 text-xs text-white">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="space-y-2 border-t border-fixly-border p-4">
          <button onClick={() => onNavigate('/dashboard/settings')} className="sidebar-item w-full">
            <Settings className="mr-3 h-5 w-5" />
            Settings
          </button>
          <button onClick={() => onNavigate('/help')} className="sidebar-item w-full">
            <HelpCircle className="mr-3 h-5 w-5" />
            Help & Support
          </button>
        </div>
      </div>
    </aside>
  );
}
