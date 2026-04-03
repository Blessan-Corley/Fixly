import { create } from 'zustand';

export type Notification = {
  _id?: string;
  id?: string;
  messageId?: string;
  title?: string;
  message?: string;
  read?: boolean;
  createdAt?: string;
  type?: string;
  [key: string]: unknown;
};

export type NotificationStoreState = {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  addNotification: (notification: Notification) => void;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  setNotifications: (notifications: Notification[]) => void;
  removeNotification: (notificationId: string) => void;
};

function getNotificationId(notification: Notification): string | null {
  return notification._id ?? notification.id ?? notification.messageId ?? null;
}

function countUnread(notifications: Notification[]): number {
  return notifications.reduce((count, notification) => {
    return notification.read === true ? count : count + 1;
  }, 0);
}

export const useNotificationStore = create<NotificationStoreState>((set) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  addNotification: (notification: Notification): void => {
    set((state) => {
      const nextId = getNotificationId(notification);
      const existingIndex =
        nextId == null
          ? -1
          : state.notifications.findIndex((item) => getNotificationId(item) === nextId);

      if (existingIndex >= 0) {
        const notifications = [...state.notifications];
        notifications[existingIndex] = {
          ...notifications[existingIndex],
          ...notification,
        };

        return {
          notifications,
          unreadCount: countUnread(notifications),
        };
      }

      const notifications = [notification, ...state.notifications];
      return {
        notifications,
        unreadCount: countUnread(notifications),
      };
    });
  },
  markAsRead: (notificationId: string): void => {
    set((state) => {
      const notifications = state.notifications.map((notification) => {
        const currentId = getNotificationId(notification);
        if (currentId !== notificationId || notification.read === true) {
          return notification;
        }

        return {
          ...notification,
          read: true,
        };
      });

      return {
        notifications,
        unreadCount: countUnread(notifications),
      };
    });
  },
  markAllAsRead: (): void => {
    set((state) => {
      const notifications = state.notifications.map((notification) => ({
        ...notification,
        read: true,
      }));

      return {
        notifications,
        unreadCount: 0,
      };
    });
  },
  setNotifications: (notifications: Notification[]): void => {
    set({
      notifications,
      unreadCount: countUnread(notifications),
    });
  },
  removeNotification: (notificationId: string): void => {
    set((state) => {
      const notifications = state.notifications.filter((notification) => {
        return getNotificationId(notification) !== notificationId;
      });

      return {
        notifications,
        unreadCount: countUnread(notifications),
      };
    });
  },
}));
