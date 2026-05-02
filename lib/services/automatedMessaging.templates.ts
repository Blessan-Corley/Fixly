/**
 * Message templates and internal helpers for the automated messaging service.
 */

import { logger } from '../logger';

import messageService from './messageService';

export type JobLike = {
  _id?: unknown;
  title?: string;
  createdBy?: unknown;
  assignedTo?: unknown;
};

export type UserLike = {
  _id?: unknown;
  name?: string;
};

export type MessageTemplateContext = {
  job?: JobLike | null;
  user?: UserLike | null;
  daysLeft?: number;
};

export type MessageTemplate = {
  title: string;
  content: (context: MessageTemplateContext) => string;
  tips: string[];
};

export type ConversationLookup = {
  _id?: unknown;
  participants?: unknown[];
};

export const MESSAGE_TEMPLATES: Record<string, MessageTemplate> = {
  WORK_STARTED: {
    title: 'Work Has Started',
    content: ({ job, user }) =>
      `${user?.name || 'The fixer'} has started working on "${job?.title || 'this job'}". Stay in touch for updates.`,
    tips: [
      'Ask for progress photos if needed',
      'Get an estimated completion time',
      'Raise blockers early',
      'Prepare to review once completed',
    ],
  },
  WORK_COMPLETED: {
    title: 'Work Completed',
    content: ({ job, user }) =>
      `${user?.name || 'The fixer'} marked "${job?.title || 'this job'}" as completed. Review the work and leave feedback.`,
    tips: [
      'Inspect the completed work thoroughly',
      'Rate the experience clearly',
      'Leave actionable feedback',
      'Request changes if needed',
    ],
  },
  REVIEW_COMPLETED: {
    title: 'Reviews Complete',
    content: ({ job }) =>
      `Both reviews for "${job?.title || 'this job'}" are complete. This conversation will now be archived shortly.`,
    tips: [
      'Contact support if you still need help',
      'You can reopen communication through support if required',
    ],
  },
  DEADLINE_REMINDER: {
    title: 'Deadline Reminder',
    content: ({ job, daysLeft }) =>
      `"${job?.title || 'this job'}" is due in ${daysLeft || 0} ${(daysLeft || 0) === 1 ? 'day' : 'days'}.`,
    tips: ['Confirm current progress', 'Adjust the plan if needed', 'Keep communication proactive'],
  },
  DISPUTE_CREATED: {
    title: 'Dispute Opened',
    content: ({ job }) =>
      `A dispute was opened for "${job?.title || 'this job'}". The Fixly team will review it and follow up.`,
    tips: [
      'Share relevant evidence',
      'Keep communication professional',
      'Support usually responds within 24-48 hours',
    ],
  },
};

export const toIdString = (value: unknown): string => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null && '_id' in (value as Record<string, unknown>)) {
    return String((value as Record<string, unknown>)._id);
  }
  return String(value);
};

export const buildSystemMessage = (template: MessageTemplate, context: MessageTemplateContext): string => {
  const body = template.content(context).trim();
  if (!template.tips.length) return body;
  return [body, '', 'Tips:', ...template.tips.map((tip, index) => `${index + 1}. ${tip}`)].join('\n');
};

export async function sendAutomatedMessage(
  conversationId: string,
  senderId: string,
  messageType: keyof typeof MESSAGE_TEMPLATES,
  context: MessageTemplateContext = {}
): Promise<boolean> {
  try {
    const template = MESSAGE_TEMPLATES[messageType];
    if (!template) return false;
    const content = buildSystemMessage(template, context);
    await messageService.sendSystemMessage(conversationId, senderId, content);
    return true;
  } catch (error: unknown) {
    logger.error({ error }, 'Error sending automated message');
    return false;
  }
}
