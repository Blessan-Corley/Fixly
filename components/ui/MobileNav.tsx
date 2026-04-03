'use client';

import { motion, AnimatePresence, type PanInfo } from 'framer-motion';
import { X, ChevronUp, Wifi, WifiOff, Battery, Signal } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { useApp } from '../../app/providers';
import { useRealTimeNotifications } from '../../hooks/realtime/useNotificationCenter';

import { type NavigationItem } from './mobile-nav.shared';
import SmartAvatar, { type SmartAvatarUser } from './SmartAvatar';
import { useMobileNavStatus } from './useMobileNavStatus';

interface MobileNavUser extends SmartAvatarUser {
  email?: string | null;
}

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
  navigationItems?: NavigationItem[];
  className?: string;
}

interface MobileBottomNavProps {
  navigationItems?: NavigationItem[];
  className?: string;
}

const getUnreadBadgeValue = (count: number): string => (count > 9 ? '9+' : String(count));

export default function MobileNav({
  isOpen,
  onClose,
  navigationItems = [],
  className = '',
}: MobileNavProps): React.JSX.Element {
  const router = useRouter();
  const { user } = useApp() as { user?: MobileNavUser | null };
  const { unreadCount } = useRealTimeNotifications();
  const { networkStatus, batteryLevel, connectionType } = useMobileNavStatus();

  const handleNavigation = (href: string): void => {
    router.push(href);
    onClose();
  };

  const statusTime = new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            drag="x"
            dragConstraints={{ left: -300, right: 0 }}
            dragElastic={0.2}
            onDragEnd={(_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
              if (info.offset.x < -100) {
                onClose();
              }
            }}
            className={`fixed left-0 top-0 z-50 flex h-full w-80 max-w-[85vw] flex-col bg-white shadow-2xl dark:bg-gray-900 ${className}`}
          >
            <div className="flex items-center justify-between bg-gray-50 px-4 py-2 text-xs font-medium dark:bg-gray-800">
              <div className="flex items-center gap-2">
                <span className="text-gray-600 dark:text-gray-300">{statusTime}</span>
                {!networkStatus && (
                  <div className="flex items-center gap-1 text-orange-600">
                    <WifiOff className="h-3 w-3" />
                    <span>Offline</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                {networkStatus ? (
                  <div className="flex items-center gap-1 text-gray-600 dark:text-gray-300">
                    <Signal className="h-3 w-3" />
                    {connectionType === 'unknown' || connectionType === 'wifi' ? (
                      <Wifi className="h-3 w-3" />
                    ) : (
                      <span className="text-[10px] uppercase">{connectionType}</span>
                    )}
                  </div>
                ) : (
                  <WifiOff className="h-3 w-3 text-gray-400" />
                )}
                {batteryLevel !== null && (
                  <div className="flex items-center gap-1 text-gray-600 dark:text-gray-300">
                    <Battery className="h-3 w-3" />
                    <span>{batteryLevel}%</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between border-b border-gray-200 p-6 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 shadow-lg">
                  <span className="text-lg font-bold text-white">F</span>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">Fixly</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {user?.name ?? 'Welcome'}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto py-4">
              <div className="space-y-1 px-4">
                {navigationItems.map((item, index) => {
                  const itemCount = item.count ?? 0;
                  return (
                    <motion.button
                      key={item.href}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => handleNavigation(item.href)}
                      className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-all duration-200 ${
                        item.current
                          ? 'bg-teal-50 text-teal-600 shadow-sm dark:bg-teal-900/20 dark:text-teal-400'
                          : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800'
                      }`}
                    >
                      <div className="relative">
                        <item.icon className="h-5 w-5" />
                        {itemCount > 0 && (
                          <div className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs font-medium text-white">
                            {getUnreadBadgeValue(itemCount)}
                          </div>
                        )}
                        {item.name === 'Notifications' && unreadCount > 0 && (
                          <div className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs font-medium text-white">
                            {getUnreadBadgeValue(unreadCount)}
                          </div>
                        )}
                      </div>
                      <span className="font-medium">{item.name}</span>
                      {item.highlight && (
                        <div className="ml-auto h-2 w-2 animate-pulse rounded-full bg-green-500" />
                      )}
                      {item.badge && (
                        <span className="ml-auto rounded-full bg-orange-500 px-2 py-1 text-xs font-medium text-white">
                          {item.badge}
                        </span>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </nav>

            <div className="border-t border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
              <button
                onClick={() => handleNavigation('/dashboard/profile')}
                className="flex w-full items-center gap-3 rounded-xl p-3 transition-colors hover:bg-white dark:hover:bg-gray-700"
              >
                <SmartAvatar user={user} size="default" className="h-10 w-10" />
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {user?.name ?? 'User Profile'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {user?.email ?? 'View profile'}
                  </p>
                </div>
                <ChevronUp className="h-4 w-4 rotate-90 text-gray-400" />
              </button>
            </div>

            <div className="absolute right-2 top-1/2 h-8 w-1 -translate-y-1/2 rounded-full bg-gray-300 opacity-50 dark:bg-gray-600" />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export function MobileBottomNav({
  navigationItems = [],
  className = '',
}: MobileBottomNavProps): React.JSX.Element {
  const router = useRouter();
  const { unreadCount } = useRealTimeNotifications();
  const bottomNavItems = navigationItems.slice(0, 5);

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900 md:hidden ${className}`}
    >
      <div className="grid h-16 grid-cols-5">
        {bottomNavItems.map((item) => {
          const itemCount = item.count ?? 0;
          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className={`flex flex-col items-center justify-center gap-1 transition-all duration-200 ${
                item.current
                  ? 'text-teal-600 dark:text-teal-400'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <div className="relative">
                <item.icon className="h-5 w-5" />
                {item.name === 'Notifications' && unreadCount > 0 && (
                  <div className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs font-medium text-white">
                    {getUnreadBadgeValue(unreadCount)}
                  </div>
                )}
                {itemCount > 0 && item.name !== 'Notifications' && (
                  <div className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs font-medium text-white">
                    {getUnreadBadgeValue(itemCount)}
                  </div>
                )}
              </div>
              <span className="text-xs font-medium">{item.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
