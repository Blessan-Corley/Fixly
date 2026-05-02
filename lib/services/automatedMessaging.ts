/**
 * Automated Messaging Service
 * Sends job lifecycle system messages through the canonical conversation flow.
 */

import Conversation from '../../models/Conversation';
import Job from '../../models/Job';
import dbConnect from '../db';
import { logger } from '../logger';

import {
  MESSAGE_TEMPLATES,
  sendAutomatedMessage,
  toIdString,
  type ConversationLookup,
  type JobLike,
  type UserLike,
} from './automatedMessaging.templates';

export { sendAutomatedMessage, MESSAGE_TEMPLATES };

async function findJobConversation(jobId: string): Promise<ConversationLookup | null> {
  return (await Conversation.findOne({ relatedJob: jobId }).select(
    '_id participants'
  )) as ConversationLookup | null;
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
    if (!job?.createdBy || !job?.assignedTo) return false;

    const conversation = await findJobConversation(jobId);
    if (!conversation?._id) return false;

    const senderId = toIdString(job.assignedTo);
    const messageType =
      status === 'in_progress' ? 'WORK_STARTED' : status === 'completed' ? 'WORK_COMPLETED' : null;
    if (!messageType || !senderId) return false;

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
    if (!job?.createdBy || !job?.assignedTo) return false;

    const conversation = await findJobConversation(jobId);
    if (!conversation?._id) return false;

    const senderId = toIdString(job.createdBy) || toIdString(conversation.participants?.[0]);
    if (!senderId) return false;

    return sendAutomatedMessage(String(conversation._id), senderId, 'REVIEW_COMPLETED', { job });
  } catch (error: unknown) {
    logger.error({ error, jobId }, 'Error in review completion messaging');
    return false;
  }
}

export async function sendDeadlineReminder(jobId: string, daysLeft: number): Promise<boolean> {
  try {
    const job = await getJobWithParticipants(jobId);
    if (!job?.createdBy || !job?.assignedTo) return false;

    const conversation = await findJobConversation(jobId);
    if (!conversation?._id) return false;

    const senderId = toIdString(job.createdBy) || toIdString(conversation.participants?.[0]);
    if (!senderId) return false;

    return sendAutomatedMessage(String(conversation._id), senderId, 'DEADLINE_REMINDER', { job, daysLeft });
  } catch (error: unknown) {
    logger.error({ error, jobId, daysLeft }, 'Error in deadline reminder messaging');
    return false;
  }
}

export async function sendDisputeMessage(jobId: string): Promise<boolean> {
  try {
    const job = await getJobWithParticipants(jobId);
    if (!job?.createdBy || !job?.assignedTo) return false;

    const conversation = await findJobConversation(jobId);
    if (!conversation?._id) return false;

    const senderId = toIdString(job.createdBy) || toIdString(conversation.participants?.[0]);
    if (!senderId) return false;

    return sendAutomatedMessage(String(conversation._id), senderId, 'DISPUTE_CREATED', { job });
  } catch (error: unknown) {
    logger.error({ error, jobId }, 'Error in dispute messaging');
    return false;
  }
}
