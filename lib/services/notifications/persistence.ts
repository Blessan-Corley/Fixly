// Phase 2: Added notification deletion helpers for the real user notification API.
import connectDB from '@/lib/mongodb';
import {
  type NotificationPriority,
  type StoredNotification,
  type UserDocument,
} from '@/lib/services/notifications/notification.types';
import {
  asString,
  getCategory,
  toStoredNotification,
} from '@/lib/services/notifications/preferences';
import User from '@/models/User';

export async function createStoredNotificationRecord(payload: {
  userId: string;
  type: string;
  title: string;
  message: string;
  actionUrl: string;
  data: Record<string, unknown>;
  priority: NotificationPriority;
}): Promise<StoredNotification | null> {
  await connectDB();
  const user = (await User.findById(payload.userId)) as UserDocument | null;
  if (!user) {
    return null;
  }

  const notificationData = {
    ...payload.data,
    actionUrl: payload.actionUrl || '/dashboard',
    priority: payload.priority,
    category: getCategory(payload.type),
  };

  const savedUser = (await user.addNotification(
    payload.type,
    payload.title,
    payload.message,
    notificationData
  )) as UserDocument;

  const latestRaw = Array.isArray(savedUser.notifications) ? savedUser.notifications[0] : null;
  if (!latestRaw) {
    return null;
  }

  return toStoredNotification(payload.userId, latestRaw);
}

export async function getStoredNotifications(
  userId: string,
  {
    limit = 20,
    offset = 0,
    category,
    type,
    search,
    unreadOnly = false,
  }: {
    limit?: number;
    offset?: number;
    category?: string;
    type?: string;
    search?: string;
    unreadOnly?: boolean;
  } = {}
): Promise<{ notifications: StoredNotification[]; total: number; unreadCount: number; hasMore: boolean }> {
  await connectDB();
  const user = (await User.findById(userId).select('notifications')) as UserDocument | null;
  if (!user || !Array.isArray(user.notifications)) {
    return { notifications: [], total: 0, unreadCount: 0, hasMore: false };
  }

  let notifications = user.notifications.map((item) => toStoredNotification(userId, item));

  if (category) {
    notifications = notifications.filter((item) => item.category === category);
  }
  if (type) {
    notifications = notifications.filter((item) => item.type === type);
  }
  if (search) {
    const query = search.trim().toLowerCase();
    if (query) {
      notifications = notifications.filter(
        (item) =>
          item.title.toLowerCase().includes(query) || item.body.toLowerCase().includes(query)
      );
    }
  }
  if (unreadOnly) {
    notifications = notifications.filter((item) => !item.read);
  }

  const unreadCount = user.notifications.filter((item) => item.read !== true).length;
  const safeOffset = Math.max(0, offset);
  const safeLimit = Math.max(1, limit);
  const page = notifications.slice(safeOffset, safeOffset + safeLimit);

  return {
    notifications: page,
    total: notifications.length,
    unreadCount,
    hasMore: notifications.length > safeOffset + safeLimit,
  };
}

export async function markStoredNotificationsAsRead(
  userId: string,
  notificationIds: string[] = []
): Promise<boolean> {
  await connectDB();
  const user = (await User.findById(userId).select('notifications')) as UserDocument | null;
  if (!user || !Array.isArray(user.notifications)) return false;

  const ids = new Set(notificationIds.filter(Boolean));
  let changed = false;

  user.notifications = user.notifications.map((raw) => {
    const notification = (raw ?? {}) as Record<string, unknown>;
    const notificationId = asString(notification.id);
    const shouldMark = ids.size === 0 || ids.has(notificationId);
    if (shouldMark && notification.read !== true) {
      changed = true;
      return { ...notification, read: true, readAt: new Date() };
    }
    return notification;
  });

  if (!changed) return false;
  await user.save();
  return true;
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  await connectDB();
  const user = (await User.findById(userId).select('notifications')) as UserDocument | null;
  if (!user || !Array.isArray(user.notifications)) return 0;
  return user.notifications.filter((item) => item.read !== true).length;
}

export async function deleteStoredNotifications(
  userId: string,
  notificationIds: string[] = []
): Promise<{ deletedCount: number; unreadCount: number }> {
  await connectDB();
  const user = (await User.findById(userId).select('notifications')) as UserDocument | null;
  if (!user || !Array.isArray(user.notifications)) {
    return { deletedCount: 0, unreadCount: 0 };
  }

  const ids = new Set(notificationIds.filter(Boolean));
  const deleteAll = ids.size === 0;
  const beforeCount = user.notifications.length;

  user.notifications = user.notifications.filter((raw) => {
    if (deleteAll) {
      return false;
    }

    const notification = (raw ?? {}) as Record<string, unknown>;
    const notificationId = asString(notification.id);
    const legacyId = asString(notification._id);
    return !ids.has(notificationId) && !ids.has(legacyId);
  });

  const deletedCount = beforeCount - user.notifications.length;
  if (deletedCount === 0 && !deleteAll) {
    return {
      deletedCount: 0,
      unreadCount: user.notifications.filter((item) => item.read !== true).length,
    };
  }

  await user.save();

  return {
    deletedCount,
    unreadCount: user.notifications.filter((item) => item.read !== true).length,
  };
}

export async function getPushNotificationUser(userId: string): Promise<UserDocument | null> {
  await connectDB();
  return (await User.findById(userId).select('pushSubscription preferences')) as UserDocument | null;
}

export async function getEmailNotificationUser(userId: string): Promise<UserDocument | null> {
  await connectDB();
  return (await User.findById(userId).select('email name preferences')) as UserDocument | null;
}

export async function getRevieweeActionUrl(revieweeId: string): Promise<string> {
  await connectDB();
  const reviewee = await User.findById(revieweeId).select('username').lean<{ username?: string } | null>();
  return reviewee?.username && reviewee.username.trim().length > 0
    ? `/profile/${reviewee.username}/reviews`
    : '/dashboard';
}
