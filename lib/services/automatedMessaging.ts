/**
 * Automated Messaging Service
 * Sends job lifecycle system messages through the canonical conversation flow.
 */

import Conversation from '../../models/Conversation';
import Job from '../../models/Job';
import dbConnect from '../db';
import { logger } from '../logger';

import messageService from './messageService';

type JobLike = {
  _id?: unknown;
  title?: string;
  createdBy?: unknown;
  assignedTo?: unknown;
};

type UserLike = {
  _id?: unknown;
  name?: string;
};

type MessageTemplateContext = {
  job?: JobLike | null;
  user?: UserLike | null;
  daysLeft?: number;
};

type MessageTemplate = {
  title: string;
  content: (context: MessageTemplateContext) => string;
  tips: string[];
};

type ConversationLookup = {
  _id?: unknown;
  participants?: unknown[];
};

const MESSAGE_TEMPLATES: Record<string, MessageTemplate> = {
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

const toIdString = (value: unknown): string => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null && '_id' in (value as Record<string, unknown>)) {
    return String((value as Record<string, unknown>)._id);
  }
  return String(value);
};

const buildSystemMessage = (template: MessageTemplate, context: MessageTemplateContext): string => {
  const body = template.content(context).trim();
  if (!template.tips.length) {
    return body;
  }

  return [body, '', 'Tips:', ...template.tips.map((tip, index) => `${index + 1}. ${tip}`)].join(
    '\n'
  );
};

async function findJobConversation(jobId: string): Promise<ConversationLookup | null> {
  return (await Conversation.findOne({ relatedJob: jobId }).select(
    '_id participants'
  )) as ConversationLookup | null;
}

async function sendAutomatedMessage(
  conversationId: string,
  senderId: string,
  messageType: keyof typeof MESSAGE_TEMPLATES,
  context: MessageTemplateContext = {}
): Promise<boolean> {
  try {
    const template = MESSAGE_TEMPLATES[messageType];
    if (!template) {
      return false;
    }

    const content = buildSystemMessage(template, context);
    await messageService.sendSystemMessage(conversationId, senderId, content);
    return true;
  } catch (error: unknown) {
    logger.error({ error }, 'Error sending automated message');
    return false;
  }
}

async function getJobWithParticipants(jobId: string): Promise<JobLike | null> {
  await dbConnect();

  return (await Job.findById(jobId)
    .populate('createdBy', 'name')
    .populate('assignedTo', 'name')) as JobLike | null;
}

export async function sendWorkStatusMessage(jobId: string, status: string): Promise<boolean> {
  try {
    const job = await getJobWithParticipants(jobId);
    if (!job?.createdBy || !job?.assignedTo) {
      return false;
    }

    const conversation = await findJobConversation(jobId);
    if (!conversation?._id) {
      return false;
    }

    const senderId =
      status === 'in_progress' ? toIdString(job.assignedTo) : toIdString(job.assignedTo);
    const messageType =
      status === 'in_progress' ? 'WORK_STARTED' : status === 'completed' ? 'WORK_COMPLETED' : null;
    if (!messageType || !senderId) {
      return false;
    }

    return sendAutomatedMessage(String(conversation._id), senderId, messageType, {
      job,
      user: job.assignedTo as UserLike,
    });
  } catch (error: unknown) {
    logger.error({ error, jobId, status }, 'Error in work status messaging');
    return false;
  }
}

export async function sendReviewCompletionMessage(jobId: string): Promise<boolean> {
  try {
    const job = await getJobWithParticipants(jobId);
    if (!job?.createdBy || !job?.assignedTo) {
      return false;
    }

    const conversation = await findJobConversation(jobId);
    if (!conversation?._id) {
      return false;
    }

    const senderId = toIdString(job.createdBy) || toIdString(conversation.participants?.[0]);
    if (!senderId) {
      return false;
    }

    return sendAutomatedMessage(String(conversation._id), senderId, 'REVIEW_COMPLETED', { job });
  } catch (error: unknown) {
    logger.error({ error, jobId }, 'Error in review completion messaging');
    return false;
  }
}

export async function sendDeadlineReminder(jobId: string, daysLeft: number): Promise<boolean> {
  try {
    const job = await getJobWithParticipants(jobId);
    if (!job?.createdBy || !job?.assignedTo) {
      return false;
    }

    const conversation = await findJobConversation(jobId);
    if (!conversation?._id) {
      return false;
    }

    const senderId = toIdString(job.createdBy) || toIdString(conversation.participants?.[0]);
    if (!senderId) {
      return false;
    }

    return sendAutomatedMessage(String(conversation._id), senderId, 'DEADLINE_REMINDER', {
      job,
      daysLeft,
    });
  } catch (error: unknown) {
    logger.error({ error, jobId, daysLeft }, 'Error in deadline reminder messaging');
    return false;
  }
}

export async function sendDisputeMessage(jobId: string): Promise<boolean> {
  try {
    const job = await getJobWithParticipants(jobId);
    if (!job?.createdBy || !job?.assignedTo) {
      return false;
    }

    const conversation = await findJobConversation(jobId);
    if (!conversation?._id) {
      return false;
    }

    const senderId = toIdString(job.createdBy) || toIdString(conversation.participants?.[0]);
    if (!senderId) {
      return false;
    }

    return sendAutomatedMessage(String(conversation._id), senderId, 'DISPUTE_CREATED', { job });
  } catch (error: unknown) {
    logger.error({ error, jobId }, 'Error in dispute messaging');
    return false;
  }
}

export { sendAutomatedMessage, MESSAGE_TEMPLATES };
