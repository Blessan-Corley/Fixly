'use client';

import { motion } from 'framer-motion';
import { Bell, BellRing, Briefcase, MessageSquare, Star } from 'lucide-react';
import { memo } from 'react';

import type {
  BadgeStyle,
  DashboardNotification,
} from '@/components/dashboard/layout/layout.types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/primitives/DropdownMenu';
import { useNotificationStore } from '@/lib/stores/notificationStore';

type NotificationBellProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isRealTimeConnected: boolean;
  badgeStyle: BadgeStyle;
  onMarkAllAsRead: () => void;
  onNotificationClick: (notification: DashboardNotification) => void;
  onViewAll: () => void;
};

export const NotificationBell = memo(function NotificationBell({
  open,
  onOpenChange,
  isRealTimeConnected,
  badgeStyle,
  onMarkAllAsRead,
  onNotificationClick,
  onViewAll,
}: NotificationBellProps) {
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const notifications = useNotificationStore(
    (state) => state.notifications as DashboardNotification[]
  );

  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <div className="notification-dropdown relative">
        <DropdownMenuTrigger asChild>
          <button
            className="group relative rounded-lg p-2 transition-all duration-200 hover:bg-fixly-accent/10"
            title={`${unreadCount} unread notifications${isRealTimeConnected ? ' (Real-time)' : ''}`}
          >
            <div className="relative">
              {unreadCount > 0 ? (
                <BellRing className="h-5 w-5 text-fixly-text transition-colors duration-200 group-hover:text-fixly-accent" />
              ) : (
                <Bell className="h-5 w-5 text-fixly-text transition-colors duration-200 group-hover:text-fixly-accent" />
              )}

              {isRealTimeConnected && (
                <div className="absolute -left-1 -top-1 h-2 w-2 animate-pulse rounded-full bg-green-500 shadow-sm"></div>
              )}
            </div>

            {(Number(unreadCount) || 0) > 0 &&
              (badgeStyle === 'dots' ? (
                <div className="absolute -right-1 -top-1 h-3 w-3 animate-pulse rounded-full bg-red-500 shadow-lg"></div>
              ) : (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 animate-pulse items-center justify-center rounded-full bg-red-500 text-xs font-medium text-white shadow-lg">
                  {(Number(unreadCount) || 0) > 99 ? '99+' : Number(unreadCount) || 0}
                </span>
              ))}
          </button>
        </DropdownMenuTrigger>
      </div>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="notification-dropdown w-80 rounded-lg border border-fixly-border bg-fixly-card p-0 shadow-fixly-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
      >
        <div className="border-b border-fixly-border p-4 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-fixly-text dark:text-gray-200">Notifications</h3>
              {isRealTimeConnected ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs text-green-700 dark:bg-green-900/20 dark:text-green-400">
                  <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500"></div>
                  Live
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-1 text-xs text-orange-700 dark:bg-orange-900/20 dark:text-orange-400">
                  <div className="h-1.5 w-1.5 rounded-full bg-orange-500"></div>
                  Offline
                </span>
              )}
            </div>
            {notifications.some((notification) => !notification.read) && (
              <button
                onClick={onMarkAllAsRead}
                className="text-xs font-medium text-fixly-accent transition-colors duration-200 hover:text-fixly-accent-dark dark:text-fixly-accent-light"
              >
                Mark all read
              </button>
            )}
          </div>
        </div>
        <div className="max-h-96 overflow-hidden">
          {notifications.length === 0 ? (
            <div className="p-8 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-fixly-accent/10 dark:bg-fixly-accent/20">
                <Bell className="h-6 w-6 text-fixly-accent dark:text-fixly-accent-light" />
              </div>
              <p className="text-sm text-fixly-text-muted dark:text-gray-400">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y divide-fixly-border dark:divide-gray-700">
              {notifications.slice(0, 5).map((notification, index) => (
                <motion.button
                  key={
                    notification.id ||
                    notification.messageId ||
                    `${notification.type}-${notification.createdAt || index}`
                  }
                  type="button"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`w-full cursor-pointer p-4 text-left transition-all duration-200 hover:bg-fixly-bg/50 dark:hover:bg-gray-800/50 ${
                    !notification.read
                      ? 'border-l-4 border-l-fixly-accent bg-fixly-accent/5 dark:bg-fixly-accent/10'
                      : ''
                  }`}
                  onClick={() => onNotificationClick(notification)}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      {notification.type === 'message' && (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-fixly-accent/20 dark:bg-fixly-accent/10">
                          <MessageSquare className="h-4 w-4 text-fixly-primary dark:text-fixly-primary" />
                        </div>
                      )}
                      {notification.type === 'job_applied' && (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/20">
                          <Briefcase className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </div>
                      )}
                      {notification.type?.includes('application') && (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/20">
                          <Star className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                        </div>
                      )}
                      {!['message', 'job_applied'].some((type) => notification.type?.includes(type)) &&
                        !notification.type?.includes('application') && (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
                            <Bell className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                          </div>
                        )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-start justify-between">
                        <p
                          className={`text-sm font-medium ${
                            !notification.read
                              ? 'text-fixly-text dark:text-gray-100'
                              : 'text-fixly-text-muted dark:text-gray-300'
                          }`}
                        >
                          {notification.title || 'Notification'}
                        </p>
                        <div className="ml-2 flex flex-shrink-0 items-center gap-2">
                          <span className="text-xs text-fixly-text-muted dark:text-gray-500">
                            {(() => {
                              const date = new Date(notification.createdAt || notification.id || Date.now());
                              const now = new Date();
                              const diffInMinutes = Math.floor(
                                (now.getTime() - date.getTime()) / (1000 * 60)
                              );

                              if (diffInMinutes < 1) return 'Just now';
                              if (diffInMinutes < 60) return `${diffInMinutes}m`;

                              const diffInHours = Math.floor(diffInMinutes / 60);
                              if (diffInHours < 24) return `${diffInHours}h`;

                              const diffInDays = Math.floor(diffInHours / 24);
                              if (diffInDays < 7) return `${diffInDays}d`;

                              return date.toLocaleDateString();
                            })()}
                          </span>
                          {!notification.read && (
                            <div className="h-2 w-2 animate-pulse rounded-full bg-fixly-accent"></div>
                          )}
                        </div>
                      </div>

                      <p className="line-clamp-2 text-xs leading-relaxed text-fixly-text-muted dark:text-gray-400">
                        {notification.message || 'You have a new notification.'}
                      </p>
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          )}
        </div>
        {notifications.length > 5 && (
          <div className="border-t border-fixly-border p-4">
            <button
              onClick={onViewAll}
              className="text-sm font-medium text-fixly-accent hover:text-fixly-accent-dark"
            >
              View all notifications
            </button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
});
