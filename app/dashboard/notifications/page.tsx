// Phase 2: Rewired the notifications page to the real API and added robust loading and error states.
'use client';

import { Bell, BellRing, CheckCheck, Settings } from 'lucide-react';
import { useRouter } from 'next/navigation';

import NotificationItem from './NotificationItem';
import NotificationsFilterBar from './NotificationsFilterBar';
import NotificationStatCards from './NotificationStatCards';
import { useNotificationsPage } from './useNotificationsPage';

export default function NotificationsPage(): React.ReactElement {
  const router = useRouter();
  const {
    loading,
    notificationsFetching,
    isError,
    error,
    unreadCount,
    filters,
    activeTab,
    setActiveTab,
    markingAsRead,
    filteredNotifications,
    categoryStats,
    statCards,
    onSearchChange,
    onTypeChange,
    onStatusChange,
    handleNotificationClick,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotificationsPage();

  if (loading || notificationsFetching) {
    return (
      <div className="p-6 lg:p-8">
        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={`notification-skeleton-${index}`} className="card animate-pulse">
              <div className="flex items-center">
                <div className="h-12 w-12 rounded-lg bg-fixly-accent/10" />
                <div className="ml-4 flex-1 space-y-2">
                  <div className="h-5 rounded bg-fixly-accent/10" />
                  <div className="h-4 w-2/3 rounded bg-fixly-accent/10" />
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={`notification-row-skeleton-${index}`} className="rounded-lg border border-fixly-border bg-white p-4">
              <div className="animate-pulse space-y-3">
                <div className="flex items-center justify-between">
                  <div className="h-5 w-1/3 rounded bg-fixly-accent/10" />
                  <div className="h-4 w-20 rounded bg-fixly-accent/10" />
                </div>
                <div className="h-4 rounded bg-fixly-accent/10" />
                <div className="h-4 w-5/6 rounded bg-fixly-accent/10" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6 lg:p-8">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
          <BellRing className="mx-auto mb-4 h-10 w-10 text-red-600" />
          <h2 className="mb-2 text-xl font-semibold text-red-700">Unable to load notifications</h2>
          <p className="mb-4 text-red-600">
            {error instanceof Error ? error.message : 'Please try again in a moment.'}
          </p>
          <button onClick={() => { window.location.reload(); }} className="btn-secondary">
            Refresh
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8 flex flex-col justify-between lg:flex-row lg:items-center">
        <div className="flex items-center">
          <div className="relative">
            <Bell className="mr-4 h-8 w-8 text-fixly-accent" />
            {unreadCount > 0 && (
              <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </div>
          <div>
            <h1 className="mb-1 text-2xl font-bold text-fixly-text">Notifications</h1>
            <p className="text-fixly-text-light">
              {unreadCount > 0
                ? `${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}`
                : 'All caught up.'}
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center space-x-4 lg:mt-0">
          <button
            onClick={() => { router.push('/dashboard/settings'); }}
            className="btn-ghost flex items-center"
          >
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </button>
          {unreadCount > 0 && (
            <button onClick={() => { void markAllAsRead(); }} className="btn-secondary flex items-center">
              <CheckCheck className="mr-2 h-4 w-4" />
              Mark All Read
            </button>
          )}
        </div>
      </div>

      <NotificationStatCards statCards={statCards} />

      <NotificationsFilterBar
        filters={filters}
        activeTab={activeTab}
        categoryStats={categoryStats}
        onSearchChange={onSearchChange}
        onTypeChange={onTypeChange}
        onStatusChange={onStatusChange}
        onTabChange={setActiveTab}
      />

      {filteredNotifications.length === 0 ? (
        <div className="py-12 text-center">
          <Bell className="mx-auto mb-4 h-12 w-12 text-fixly-text-muted" />
          <h3 className="mb-2 text-lg font-medium text-fixly-text">No notifications</h3>
          <p className="text-fixly-text-muted">You are all caught up. New notifications will appear here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredNotifications.map((notification, index) => (
            <NotificationItem
              key={`${notification.id}:${notification.type}:${notification.createdAt}`}
              notification={notification}
              index={index}
              isMarkingAsRead={markingAsRead.has(notification.id)}
              onNotificationClick={handleNotificationClick}
              onMarkAsRead={(id) => { void markAsRead(id); }}
              onDelete={(id) => { void deleteNotification(id); }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
