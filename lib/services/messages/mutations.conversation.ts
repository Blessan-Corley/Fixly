import { logger } from '@/lib/logger';
import { redisUtils } from '@/lib/redis';
import { invalidateConversationCaches } from '@/lib/services/messages/cache';
import type {
  ConversationDoc,
  ConversationMessage,
  CreateConversationResult,
  JobDoc,
  PopulatedUser,
} from '@/lib/services/messages/message.types';
import { broadcastConversationCreated } from '@/lib/services/messages/publisher';
import { asArray, formatRupee, toIdString } from '@/lib/services/messages/utils';
import Conversation from '@/models/Conversation';
import Job from '@/models/Job';
import User from '@/models/User';

export function generateJobAssignmentMessage(job: JobDoc): string {
  const client = job.client || {};
  const deadline = job.deadline ? new Date(job.deadline).toLocaleDateString('en-IN') : 'Flexible';
  const urgency = job.urgency
    ? `${job.urgency.charAt(0).toUpperCase()}${job.urgency.slice(1)}`
    : 'Normal';

  return [
    'Congratulations! You have been assigned to this job.',
    '',
    'JOB DETAILS',
    `- Title: ${job.title || 'Untitled job'}`,
    `- Budget: ${formatRupee(job.budget?.amount)}${job.budget?.materialsIncluded ? ' (materials included)' : ''}`,
    `- Deadline: ${deadline}`,
    `- Urgency: ${urgency}`,
    '',
    'LOCATION',
    `${job.location?.address || ''}`,
    `${job.location?.city || ''}, ${job.location?.state || ''} ${job.location?.pincode || ''}`.trim(),
    '',
    'DESCRIPTION',
    `${job.description || 'No description provided.'}`,
    '',
    'SKILLS REQUIRED',
    `${(job.skillsRequired || []).join(', ') || 'Not specified'}`,
    '',
    'CONTACT DETAILS',
    `- Name: ${client.name || 'Not provided'}`,
    `- Phone: ${client.phone || 'Not provided'}`,
    `- Email: ${client.email || 'Not provided'}`,
    '',
    'NEXT STEPS',
    '1. Review the job details carefully',
    '2. Contact the hirer to discuss timing and specifics',
    '3. Confirm your availability and start date',
    '4. Ask questions you may have',
    '',
    'You can now communicate freely in this private chat. Good luck!',
  ].join('\n');
}

export async function createJobConversation(
  jobId: string,
  hirerId: string,
  fixerId: string
): Promise<CreateConversationResult> {
  try {
    const job = (await Job.findById(jobId).populate(
      'client',
      'name username phone email'
    )) as JobDoc | null;
    const fixer = (await User.findById(fixerId).select(
      'name username phone email'
    )) as PopulatedUser | null;

    if (!job || !fixer) throw new Error('Job or fixer not found');

    let conversation = (await Conversation.findOne({
      participants: { $all: [hirerId, fixerId] },
      relatedJob: jobId,
    })) as ConversationDoc | null;

    if (!conversation) {
      conversation = new Conversation({
        participants: [hirerId, fixerId],
        relatedJob: jobId,
        conversationType: 'job',
        title: `Job: ${job.title || 'Untitled job'}`,
        metadata: {
          createdBy: hirerId,
          totalMessages: 0,
          priority: job.urgency === 'urgent' ? 'urgent' : 'normal',
        },
      }) as ConversationDoc;
    }

    const systemMessage: ConversationMessage = {
      sender: hirerId,
      content: generateJobAssignmentMessage(job),
      messageType: 'system',
      timestamp: new Date(),
      readBy: new Map([
        [hirerId, new Date()],
        [fixerId, new Date()],
      ]),
    };

    conversation.messages = asArray<ConversationMessage>(conversation.messages);
    conversation.messages.push(systemMessage);
    conversation.lastActivity = new Date();
    conversation.metadata = conversation.metadata || {};
    conversation.metadata.totalMessages = conversation.messages.length;

    await conversation.save();
    await invalidateConversationCaches([hirerId, fixerId], toIdString(conversation._id));

    await redisUtils.setex(
      `conversation:job:${jobId}`,
      3600,
      JSON.stringify({ conversationId: conversation._id, participants: [hirerId, fixerId], jobId })
    );

    await broadcastConversationCreated(conversation, job, fixer);

    return {
      success: true,
      conversationId: conversation._id,
      message: 'Job conversation created successfully',
    };
  } catch (error: unknown) {
    logger.error('Error creating job conversation:', error);
    throw error;
  }
}
