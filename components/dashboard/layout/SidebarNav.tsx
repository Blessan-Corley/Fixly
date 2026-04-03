'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { HelpCircle, Settings } from 'lucide-react';

import type { BadgeStyle, DashboardNavigationItem } from '@/components/dashboard/layout/layout.types';

const FOOTER_NAV = [
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  { name: 'Help & Support', href: '/help', icon: HelpCircle },
] as const;

type SidebarNavProps = {
  navigationItems: DashboardNavigationItem[];
  showExpanded: boolean;
  badgeStyle: BadgeStyle;
  onNavigate: (href: string) => void;
};

export function SidebarNav({
  navigationItems,
  showExpanded,
  badgeStyle,
  onNavigate,
}: SidebarNavProps): React.JSX.Element {
  return (
    <>
      <nav className="flex-1 space-y-1 px-2 py-4">
        {navigationItems.map((item) => (
          <motion.div key={item.name} className="relative">
            <button
              onClick={() => onNavigate(item.href)}
              className={`group relative flex w-full items-center rounded-xl p-3 transition-all duration-200 ${
                !showExpanded ? 'justify-center' : ''
              } ${
                item.current
                  ? 'border border-fixly-primary/20 bg-fixly-primary-bg text-fixly-primary'
                  : 'text-fixly-text-secondary hover:bg-fixly-primary-bg hover:text-fixly-primary'
              } ${item.highlight ? 'ring-2 ring-fixly-accent' : ''}`}
              title={!showExpanded ? item.name : ''}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />

              <AnimatePresence>
                {showExpanded && (
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2, delay: 0.05 }}
                    className="ml-3 whitespace-nowrap text-sm font-medium"
                  >
                    {item.name}
                  </motion.span>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {showExpanded && ((Number(item.count) || 0) > 0 || item.badge) && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.2 }}
                    className="ml-auto flex items-center space-x-1"
                  >
                    {(Number(item.count) || 0) > 0 &&
                      (badgeStyle === 'dots' ? (
                        <div className="h-2 w-2 rounded-full bg-red-500"></div>
                      ) : (
                        <span className="min-w-[18px] rounded-full bg-red-500 px-1.5 py-0.5 text-center text-xs text-white">
                          {(Number(item.count) || 0) > 9 ? '9+' : Number(item.count) || 0}
                        </span>
                      ))}
                    {item.badge && (
                      <span className="rounded-full bg-orange-500 px-1.5 py-0.5 text-xs text-white">
                        {item.badge}
                      </span>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {!showExpanded && (Number(item.count) || 0) > 0 && (
                <div className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-fixly-card bg-red-500"></div>
              )}
            </button>

            {!showExpanded && (
              <div className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 transform whitespace-nowrap rounded-lg border border-fixly-border bg-fixly-text px-3 py-2 text-xs text-fixly-bg opacity-0 shadow-lg transition-all duration-200 group-hover:opacity-100">
                {item.name}
                {((Number(item.count) || 0) > 0 || item.badge) && (
                  <span className="ml-2 text-fixly-accent">
                    {(Number(item.count) || 0) > 0 && `(${Number(item.count) || 0})`}
                    {item.badge && ` • ${item.badge}`}
                  </span>
                )}
                <div className="absolute right-full top-1/2 -translate-y-1/2 transform border-4 border-transparent border-r-fixly-text"></div>
              </div>
            )}
          </motion.div>
        ))}
      </nav>

      <div className="space-y-1 border-t border-fixly-border p-2">
        {FOOTER_NAV.map((item) => (
          <motion.div key={item.name} className="relative">
            <button
              onClick={() => onNavigate(item.href)}
              className={`group flex w-full items-center rounded-xl p-3 text-fixly-text-secondary transition-all duration-200 hover:bg-fixly-primary-bg hover:text-fixly-primary ${
                !showExpanded ? 'justify-center' : ''
              }`}
              title={!showExpanded ? item.name : ''}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />

              <AnimatePresence>
                {showExpanded && (
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2, delay: 0.05 }}
                    className="ml-3 whitespace-nowrap text-sm font-medium"
                  >
                    {item.name}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>

            {!showExpanded && (
              <div className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 transform whitespace-nowrap rounded-lg border border-fixly-border bg-fixly-text px-3 py-2 text-xs text-fixly-bg opacity-0 shadow-lg transition-all duration-200 group-hover:opacity-100">
                {item.name}
                <div className="absolute right-full top-1/2 -translate-y-1/2 transform border-4 border-transparent border-r-fixly-text"></div>
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </>
  );
}
