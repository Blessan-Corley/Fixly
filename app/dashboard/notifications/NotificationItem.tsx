'use client';

import { motion } from 'framer-motion';
import { Check, Flag, Loader, Trash2 } from 'lucide-react';

import type { NotificationRecord } from './notifications.types';
import {
  formatRelativeTime,
  iconForType,
  notificationIdentity,
  styleForType,
} from './notifications.utils';

type NotificationItemProps = {
  notification: NotificationRecord;
  index: number;
  isMarkingAsRead: boolean;
  onNotificationClick: (notification: NotificationRecord) => void;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
};

export default function NotificationItem({
  notification,
  index,
  isMarkingAsRead,
  onNotificationClick,
  onMarkAsRead,
  onDelete,
}: NotificationItemProps) {
  return (
    <motion.div
      key={notificationIdentity(notification)}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.015 }}
      className={`cursor-pointer rounded-lg border p-4 transition-all duration-200 hover:shadow-md ${
        notification.read
          ? 'border-fixly-border bg-white'
          : 'border-fixly-accent/25 bg-fixly-accent/5'
      }`}
      onClick={() => onNotificationClick(notification)}
    >
      <div className="flex items-start justify-between">
        <div className="flex flex-1 items-start space-x-3">
          <div className={`rounded-lg border p-2 ${styleForType(notification.type)}`}>
            {iconForType(notification.type)}
          </div>

          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center space-x-2">
              <h4 className="truncate text-sm font-semibold text-fixly-text">
                {notification.title}
              </h4>
              {!notification.read && (
                <div className="h-2 w-2 flex-shrink-0 rounded-full bg-fixly-accent" />
              )}
              {(notification.priority === 'high' || notification.priority === 'urgent') && (
                <Flag className="h-3 w-3 flex-shrink-0 text-red-500" />
              )}
            </div>

            <p className="mb-2 line-clamp-2 text-sm text-fixly-text-light">
              {notification.message}
            </p>

            <span className="text-xs text-fixly-text-muted">
              {formatRelativeTime(notification.createdAt)}
            </span>
          </div>
        </div>

        <div className="ml-4 flex items-center space-x-2">
          {!notification.read && (
            <button
              onClick={(event) => {
                event.stopPropagation();
                onMarkAsRead(notification.id);
              }}
              disabled={isMarkingAsRead}
              className="p-1 text-fixly-text-muted transition-colors hover:text-fixly-accent"
              title="Mark as read"
            >
              {isMarkingAsRead ? (
                <Loader className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
            </button>
          )}

          <button
            onClick={(event) => {
              event.stopPropagation();
              onDelete(notification.id);
            }}
            className="p-1 text-fixly-text-muted transition-colors hover:text-red-500"
            title="Delete notification"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
