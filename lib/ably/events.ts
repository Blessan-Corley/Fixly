// Phase 2: Expanded the typed realtime catalogue to absorb all remaining legacy event flows.
/**
 * FIXLY REALTIME EVENT CATALOGUE
 *
 * Single source of truth for all Ably channel names and event names.
 * Never use string literals for channel names or event names anywhere in the app.
 * Always import from this file.
 */

export const Channels = {
  /** User-specific private channel. Notifications, payment confirmations, personal updates. */
  user: (userId: string) => `private:user:${userId}`,

  /** Job-specific channel. Status changes, new applications, application updates. */
  job: (jobId: string) => `job:${jobId}`,

  /** Conversation-specific channel. Messages, reactions, read receipts, typing. */
  conversation: (conversationId: string) => `chat:${conversationId}`,

  /** Presence channel for a conversation. Who is online/typing. */
  conversationPresence: (conversationId: string) => `presence:chat:${conversationId}`,

  /** Public marketplace channel. New job postings, listing updates. */
  marketplace: 'marketplace:listings',

  /** Admin activity feed. User updates, flags, disputes, payment failures. */
  admin: 'admin:activity',
} as const;

export const Events = {
  user: {
    notificationSent: 'notification.sent',
    notificationRead: 'notification.read',
    notificationDeleted: 'notification.deleted',
    allNotificationsRead: 'notifications.all.read',
    paymentConfirmed: 'payment.confirmed',
    subscriptionActivated: 'subscription.activated',
    paymentFailed: 'payment.failed',
    profileUpdated: 'profile.updated',
    accountSuspended: 'account.suspended',
    messageNotification: 'message.notification',
    conversationCreated: 'conversation.created',
    locationUpdated: 'location.updated',
    locationUpdateRequested: 'location.update.requested',
    jobSuggestionsUpdated: 'job.suggestions.updated',
  },
  job: {
    statusChanged: 'job.status.changed',
    applicationSubmitted: 'application.submitted',
    applicationUpdated: 'application.updated',
    applicationAccepted: 'application.accepted',
    applicationRejected: 'application.rejected',
    applicationWithdrawn: 'application.withdrawn',
    jobAssigned: 'job.assigned',
    jobUpdated: 'job.updated',
    jobClosed: 'job.closed',
    jobCompleted: 'job.completed',
    reviewPosted: 'review.posted',
    disputeOpened: 'dispute.opened',
    disputeResolved: 'dispute.resolved',
    commentPosted: 'comment.posted',
    commentLiked: 'comment.liked',
    commentReacted: 'comment.reacted',
    commentEdited: 'comment.edited',
    commentReplied: 'comment.replied',
    commentDeleted: 'comment.deleted',
  },
  conversation: {
    messageSent: 'message.sent',
    messageUpdated: 'message.updated',
    messageRead: 'message.read',
    messagesRead: 'messages.read',
    messageReacted: 'message.reacted',
    typingStarted: 'typing.started',
    typingStopped: 'typing.stopped',
    conversationCreated: 'conversation.created',
  },
  marketplace: {
    jobPosted: 'job.posted',
    jobUpdated: 'job.updated',
    jobClosed: 'job.closed',
  },
  admin: {
    userUpdated: 'user.updated',
    userFlagged: 'user.flagged',
    jobFlagged: 'job.flagged',
    disputeCreated: 'dispute.created',
    paymentFailed: 'payment.failed',
    verificationRequested: 'verification.requested',
  },
} as const;

export interface NotificationSentPayload {
  notificationId: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  createdAt: string;
}

export interface PaymentConfirmedPayload {
  orderId: string;
  amount: number;
  currency: string;
  jobId?: string;
}

export interface SubscriptionActivatedPayload {
  planId: string;
  periodEnd?: string;
  activatedAt: string;
  subscriptionId?: string | null;
}

export interface JobStatusChangedPayload {
  jobId: string;
  previousStatus: string;
  newStatus: string;
  changedBy: string;
  changedAt: string;
}

export interface ApplicationSubmittedPayload {
  jobId: string;
  applicationId: string;
  fixerId: string;
  fixerName: string;
  fixerAvatar?: string;
}

export interface ApplicationUpdatedPayload {
  jobId: string;
  applicationId: string;
  previousStatus: string;
  newStatus: string;
}

export interface MessageSentPayload {
  conversationId: string;
  messageId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
  sentAt: string;
  type: 'text' | 'image' | 'file';
}

export interface TypingPayload {
  conversationId: string;
  userId: string;
  userName: string;
}

export interface DisputeOpenedPayload {
  disputeId: string;
  jobId: string;
  openedBy: string;
  reason: string;
}

export interface AdminActivityPayload {
  type: string;
  entityId: string;
  entityType: 'user' | 'job' | 'dispute' | 'payment';
  description: string;
  severity: 'info' | 'warning' | 'critical';
  timestamp: string;
}
