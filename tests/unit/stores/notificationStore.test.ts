import { beforeEach, describe, expect, it } from 'vitest';

import { useNotificationStore } from '@/lib/stores/notificationStore';

type StoreNotification = {
  _id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  type: string;
};

function buildNotification(
  overrides: Partial<StoreNotification> = {}
): StoreNotification {
  return {
    _id: '1',
    title: 'Test',
    message: 'Test notification',
    read: false,
    createdAt: new Date().toISOString(),
    type: 'info',
    ...overrides,
  };
}

describe('notificationStore', () => {
  beforeEach(() => {
    useNotificationStore.getState().setNotifications([]);
  });

  it('starts with empty notifications and zero unread count', () => {
    const state = useNotificationStore.getState();
    expect(state.notifications).toHaveLength(0);
    expect(state.unreadCount).toBe(0);
  });

  it('adds a notification and increments unread count', () => {
    useNotificationStore.getState().addNotification(buildNotification());

    const state = useNotificationStore.getState();
    expect(state.notifications).toHaveLength(1);
    expect(state.unreadCount).toBe(1);
  });

  it('marks a notification as read and decrements unread count', () => {
    const store = useNotificationStore.getState();
    store.addNotification(buildNotification());

    store.markAsRead('1');

    expect(useNotificationStore.getState().unreadCount).toBe(0);
    expect(useNotificationStore.getState().notifications[0]?.read).toBe(true);
  });

  it('markAllAsRead sets unread count to zero', () => {
    const store = useNotificationStore.getState();
    store.addNotification(buildNotification({ _id: '1' }));
    store.addNotification(buildNotification({ _id: '2' }));

    store.markAllAsRead();

    expect(useNotificationStore.getState().unreadCount).toBe(0);
    expect(
      useNotificationStore.getState().notifications.every(
        (notification) => notification.read === true
      )
    ).toBe(true);
  });
});
