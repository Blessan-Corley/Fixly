import { PRIORITY } from '@/lib/ably';
import {
  NOTIFICATION_TYPES,
  type NotificationTemplate,
} from '@/lib/services/notifications/notification.types';
import { asString } from '@/lib/services/notifications/preferences';

export const NOTIFICATION_TEMPLATES: Record<string, NotificationTemplate> = {
  JOB_APPLICATION_RECEIVED: {
    type: NOTIFICATION_TYPES.JOB_APPLICATION,
    title: 'New Job Application',
    getMessage: (data) =>
      `${asString(data.fixerName, 'A fixer')} applied to your job "${asString(data.jobTitle, 'your job')}"`,
    priority: PRIORITY.HIGH,
    actionData: (data) => ({ action: 'view_applications', jobId: data.jobId }),
  },
  APPLICATION_ACCEPTED: {
    type: NOTIFICATION_TYPES.APPLICATION_ACCEPTED,
    title: 'Application Accepted!',
    getMessage: (data) =>
      `Congratulations! Your application for "${asString(data.jobTitle, 'a job')}" was accepted`,
    priority: PRIORITY.CRITICAL,
    actionData: (data) => ({ action: 'view_job', jobId: data.jobId }),
  },
  JOB_COMMENT: {
    type: NOTIFICATION_TYPES.JOB_COMMENT,
    title: 'New Comment',
    getMessage: (data) =>
      `${asString(data.commenterName, 'Someone')} commented on "${asString(data.jobTitle, 'a job')}"`,
    priority: PRIORITY.MEDIUM,
    actionData: (data) => ({ action: 'view_comment', jobId: data.jobId, commentId: data.commentId }),
  },
  COMMENT_REPLY: {
    type: NOTIFICATION_TYPES.COMMENT_REPLY,
    title: 'Comment Reply',
    getMessage: (data) => `${asString(data.replierName, 'Someone')} replied to your comment`,
    priority: PRIORITY.MEDIUM,
    actionData: (data) => ({ action: 'view_reply', jobId: data.jobId, commentId: data.commentId }),
  },
  COMMENT_LIKE: {
    type: NOTIFICATION_TYPES.COMMENT_LIKE,
    title: 'Comment Liked',
    getMessage: (data) => `${asString(data.likerName, 'Someone')} liked your comment`,
    priority: PRIORITY.LOW,
    actionData: (data) => ({ action: 'view_comment', jobId: data.jobId, commentId: data.commentId }),
  },
  PRIVATE_MESSAGE: {
    type: NOTIFICATION_TYPES.PRIVATE_MESSAGE,
    title: 'New Message',
    getMessage: (data) => `${asString(data.senderName, 'Someone')}: ${asString(data.messagePreview)}`,
    priority: PRIORITY.HIGH,
    actionData: (data) => ({
      action: 'open_chat',
      jobId: data.jobId,
      conversationId: data.conversationId,
    }),
  },
  JOB_STATUS_CHANGED: {
    type: NOTIFICATION_TYPES.JOB_STATUS,
    title: 'Job Status Updated',
    getMessage: (data) =>
      `"${asString(data.jobTitle, 'Job')}" status changed to ${asString(data.newStatus, 'updated')}`,
    priority: PRIORITY.HIGH,
    actionData: (data) => ({ action: 'view_job', jobId: data.jobId }),
  },
  WELCOME: {
    type: NOTIFICATION_TYPES.WELCOME,
    title: 'Welcome to Fixly!',
    getMessage: (data) =>
      `Hi ${asString(data.userName, 'there')}! Welcome to Fixly. Start exploring jobs in your area.`,
    priority: PRIORITY.MEDIUM,
    actionData: () => ({ action: 'view_dashboard' }),
  },
  SUBSCRIPTION_SUCCESS: {
    type: NOTIFICATION_TYPES.SUBSCRIPTION,
    title: 'Pro Subscription Active',
    getMessage: () => 'Your Fixly Pro subscription is now active!',
    priority: PRIORITY.HIGH,
    actionData: () => ({ action: 'view_dashboard' }),
  },
};
