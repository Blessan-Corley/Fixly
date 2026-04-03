'use client';

import { Bell, BellRing, Calendar, Flag } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState, type ChangeEvent } from 'react';
import { toast } from 'sonner';

import {
  useDeleteNotification,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from '@/lib/queries/notifications';
import { useNotificationStore } from '@/lib/stores/notificationStore';

import type {
  CategoryStats,
  FilterStatus,
  Filters,
  NotificationCategory,
  NotificationRecord,
  StatCard,
} from './notifications.types';
import { normalizeNotification } from './notifications.utils';

export type UseNotificationsPageResult = ReturnType<typeof useNotificationsPage>;

export function useNotificationsPage(): {
  loading: boolean;
  notificationsFetching: boolean;
  isError: boolean;
  error: Error | null;
  unreadCount: number;
  filters: Filters;
  activeTab: NotificationCategory;
  setActiveTab: (tab: NotificationCategory) => void;
  markingAsRead: Set<string>;
  filteredNotifications: NotificationRecord[];
  categoryStats: CategoryStats;
  statCards: StatCard[];
  onSearchChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onTypeChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  handleNotificationClick: (notification: NotificationRecord) => void;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
} {
  const router = useRouter();
  const storeNotifications = useNotificationStore((state) => state.notifications);
  const unreadCount = useNotificationStore((state) => state.unreadCount);

  const [markingAsRead, setMarkingAsRead] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<Filters>({ type: 'all', status: 'all', search: '' });
  const [activeTab, setActiveTab] = useState<NotificationCategory>('all');

  const { mutateAsync: markRead } = useMarkNotificationRead();
  const { mutateAsync: markAllRead } = useMarkAllNotificationsRead();
  const { mutateAsync: deleteNotificationMutation } = useDeleteNotification();

  const {
    data: notificationsResponse,
    isLoading: loading,
    isFetching: notificationsFetching,
    isError,
    error,
  } = useNotifications({
    limit: 50,
    type: filters.type !== 'all' ? filters.type : undefined,
    status: filters.status !== 'all' ? filters.status : undefined,
    search: filters.search.trim() || undefined,
  });

  const hasActiveServerFilters =
    filters.type !== 'all' || filters.status !== 'all' || filters.search.trim().length > 0;

  const notifications = useMemo<NotificationRecord[]>(() => {
    const responseRecord =
      notificationsResponse && typeof notificationsResponse === 'object' ? notificationsResponse : {};
    const responseNotifications =
      'notifications' in responseRecord && Array.isArray(responseRecord.notifications)
        ? responseRecord.notifications
        : [];
    const source = hasActiveServerFilters ? responseNotifications : storeNotifications;
    return source
      .map((item, index) => normalizeNotification(item, index))
      .filter((item): item is NotificationRecord => item !== null);
  }, [hasActiveServerFilters, notificationsResponse, storeNotifications]);

  const markAsRead = async (notificationId: string): Promise<void> => {
    try {
      setMarkingAsRead((prev) => new Set(Array.from(prev).concat(notificationId)));
      await markRead(notificationId);
    } catch (err: unknown) {
      console.error('Error marking notification as read:', err);
      toast.error('Failed to update notification');
    } finally {
      setMarkingAsRead((prev) => {
        const next = new Set(prev);
        next.delete(notificationId);
        return next;
      });
    }
  };

  const markAllAsRead = async (): Promise<void> => {
    try {
      await markAllRead();
      toast.success('All notifications marked as read');
    } catch (err: unknown) {
      console.error('Error marking all notifications as read:', err);
      toast.error('Unable to mark all notifications as read');
    }
  };

  const deleteNotification = async (notificationId: string): Promise<void> => {
    try {
      await deleteNotificationMutation(notificationId);
    } catch (err: unknown) {
      console.error('Error deleting notification:', err);
      toast.error('Unable to delete notification');
    }
  };

  const handleNotificationClick = (notification: NotificationRecord): void => {
    if (!notification.read) void markAsRead(notification.id);

    if (notification.actionUrl) {
      router.push(notification.actionUrl);
      return;
    }

    const routes: Partial<Record<NotificationCategory, string>> = {
      jobs: '/dashboard/jobs',
      messages: '/dashboard/messages',
      payments: '/dashboard/earnings',
      reviews: '/dashboard/profile',
    };
    const route = routes[notification.category];
    if (route) router.push(route);
  };

  const onSearchChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setFilters((prev) => ({ ...prev, search: event.target.value }));
  };

  const onTypeChange = (value: string): void => {
    setFilters((prev) => ({ ...prev, type: value }));
  };

  const onStatusChange = (value: string): void => {
    const status: FilterStatus = value === 'read' || value === 'unread' ? value : 'all';
    setFilters((prev) => ({ ...prev, status }));
  };

  const filteredNotifications = useMemo<NotificationRecord[]>(() => {
    const searchText = filters.search.trim().toLowerCase();
    return notifications
      .filter((item) => {
        if (activeTab === 'unread') return !item.read;
        if (activeTab !== 'all') return item.category === activeTab;
        return true;
      })
      .filter((item) => {
        if (!searchText) return true;
        return (
          item.title.toLowerCase().includes(searchText) ||
          item.message.toLowerCase().includes(searchText)
        );
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [activeTab, filters.search, notifications]);

  const categoryStats = useMemo<CategoryStats>(() => ({
    all: notifications.length,
    unread: unreadCount,
    jobs: notifications.filter((item) => item.category === 'jobs').length,
    messages: notifications.filter((item) => item.category === 'messages').length,
    payments: notifications.filter((item) => item.category === 'payments').length,
    system: notifications.filter((item) => item.category === 'system').length,
    reviews: notifications.filter((item) => item.category === 'reviews').length,
    social: notifications.filter((item) => item.category === 'social').length,
    other: notifications.filter((item) => item.category === 'other').length,
  }), [notifications, unreadCount]);

  const statCards = useMemo<StatCard[]>(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return [
      { label: 'Total', value: notifications.length, icon: Bell, style: 'bg-blue-50', iconStyle: 'text-blue-700' },
      { label: 'Unread', value: unreadCount, icon: BellRing, style: 'bg-red-50', iconStyle: 'text-red-700' },
      { label: 'This Week', value: notifications.filter((item) => new Date(item.createdAt).getTime() > weekAgo).length, icon: Calendar, style: 'bg-green-50', iconStyle: 'text-green-700' },
      { label: 'Important', value: notifications.filter((item) => item.priority === 'high' || item.priority === 'urgent').length, icon: Flag, style: 'bg-orange-50', iconStyle: 'text-orange-700' },
    ];
  }, [notifications, unreadCount]);

  return {
    loading,
    notificationsFetching,
    isError,
    error: error as Error | null,
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
  };
}
