'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Menu, Wrench } from 'lucide-react';
import { useState } from 'react';

import type {
  BadgeStyle,
  DashboardNavigationItem,
  DashboardUser,
  SubscriptionInfo,
} from '@/components/dashboard/layout/layout.types';
import { formatRole } from '@/components/dashboard/layout/layout.types';
import ProBadge from '@/components/ui/ProBadge';
import SmartAvatar from '@/components/ui/SmartAvatar';

import { SidebarNav } from './SidebarNav';

type DesktopSidebarProps = {
  user: DashboardUser | null;
  subscriptionInfo: SubscriptionInfo | null;
  navigationItems: DashboardNavigationItem[];
  badgeStyle: BadgeStyle;
  onNavigate: (href: string) => void;
  onHoverChange?: (isHovered: boolean) => void;
};

export function DesktopSidebar({
  user,
  subscriptionInfo,
  navigationItems,
  badgeStyle,
  onNavigate,
  onHoverChange,
}: DesktopSidebarProps): React.JSX.Element {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  const showExpanded = !isCollapsed || isHovered;

  const handleMouseEnter = (): void => {
    setIsHovered(true);
    onHoverChange?.(true);
  };

  const handleMouseLeave = (): void => {
    setIsHovered(false);
    onHoverChange?.(false);
  };

  return (
    <motion.aside
      initial={false}
      animate={{ width: showExpanded ? 256 : 72 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className={`z-50 hidden overflow-hidden border-r border-fixly-border bg-fixly-card transition-shadow duration-300 lg:fixed lg:inset-y-0 lg:flex lg:flex-col ${
        showExpanded ? 'shadow-2xl shadow-black/20' : 'shadow-lg'
      }`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="flex h-full flex-col">
        <div className="flex min-h-[76px] items-center justify-center border-b border-fixly-border p-4">
          {showExpanded ? (
            <motion.div
              className="flex w-full items-center justify-between"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2, delay: 0.1 }}
            >
              <div className="flex items-center">
                <Wrench className="mr-2 h-8 w-8 flex-shrink-0 text-fixly-accent" />
                <motion.span
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: 0.15 }}
                  className="whitespace-nowrap text-xl font-bold text-fixly-text"
                >
                  Fixly
                </motion.span>
              </div>

              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2, delay: 0.2 }}
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="flex-shrink-0 rounded-lg p-1.5 transition-colors hover:bg-fixly-accent/10"
                title={isCollapsed ? 'Pin sidebar open' : 'Collapse sidebar'}
              >
                <Menu className="h-4 w-4 text-fixly-text" />
              </motion.button>
            </motion.div>
          ) : (
            <div className="flex flex-col items-center">
              <button
                onClick={() => setIsCollapsed(false)}
                className="mb-2 rounded-lg p-2 transition-colors hover:bg-fixly-accent/10"
                title="Pin sidebar open"
              >
                <Wrench className="h-6 w-6 text-fixly-accent" />
              </button>
            </div>
          )}
        </div>

        <div className="border-b border-fixly-border p-4">
          <div className={`flex items-center ${!showExpanded ? 'justify-center' : ''}`}>
            <SmartAvatar
              user={{
                ...user,
                image: user?.photoURL,
                profilePhoto: { url: user?.photoURL },
              }}
              size="default"
              showBorder={false}
              className="flex-shrink-0"
              showTooltip={!showExpanded}
            />

            <AnimatePresence>
              {showExpanded && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2, delay: 0.1 }}
                  className="ml-3 min-w-0 flex-1"
                >
                  <p className="flex items-center truncate text-sm font-medium text-fixly-text">
                    {user?.name}
                    <ProBadge isPro={subscriptionInfo?.isPro} size="xs" className="ml-1" />
                  </p>
                  <p className="truncate text-xs text-fixly-text-muted">{formatRole(user?.role)}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <AnimatePresence>
            {user?.role === 'fixer' && showExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2, delay: 0.1 }}
                className="mt-3 overflow-hidden"
              >
                <div
                  className={`inline-block rounded-full px-2 py-1 text-xs ${
                    subscriptionInfo?.isPro
                      ? 'bg-fixly-accent text-fixly-text'
                      : 'bg-orange-100 text-orange-800'
                  }`}
                >
                  {subscriptionInfo?.isPro
                    ? '⭐ Pro Member'
                    : `${Math.max(0, 3 - (Number(user?.plan?.creditsUsed) || 0))} free credits left`}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <SidebarNav
          navigationItems={navigationItems}
          showExpanded={showExpanded}
          badgeStyle={badgeStyle}
          onNavigate={onNavigate}
        />
      </div>
    </motion.aside>
  );
}
