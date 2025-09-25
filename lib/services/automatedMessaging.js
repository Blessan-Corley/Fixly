/**
 * Automated Messaging Service
 * Sends helpful system messages at key job milestones
 */

import Conversation from '../../models/Conversation';
import Job from '../../models/Job';
import User from '../../models/User';
import { publishToChannel } from '../ably';
import connectDB from '../db';

// System message templates
const MESSAGE_TEMPLATES = {
  JOB_ASSIGNED: {
    title: "🎉 Job Assignment Confirmed",
    content: (job, fixer) => `Great news! ${fixer.name} has been assigned to your job "${job.title}". You can now discuss the details and coordinate the work schedule.`,
    tips: [
      "💬 Use this chat to discuss specific requirements",
      "📅 Coordinate timing and availability",
      "📍 Share exact location if needed",
      "💡 Ask questions about the work process"
    ]
  },

  WORK_STARTED: {
    title: "🔧 Work Has Started",
    content: (job, fixer) => `${fixer.name} has started working on "${job.title}". Stay in touch for updates and don't hesitate to ask questions.`,
    tips: [
      "📸 Ask for progress photos if needed",
      "🕒 Get estimated completion time",
      "❓ Ask about any unexpected issues",
      "⭐ Prepare to review once completed"
    ]
  },

  WORK_COMPLETED: {
    title: "✅ Work Completed - Review Time",
    content: (job, fixer) => `${fixer.name} has marked "${job.title}" as completed! Please review the work and provide feedback.`,
    tips: [
      "👀 Inspect the completed work thoroughly",
      "⭐ Rate your experience (1-5 stars)",
      "💬 Leave detailed feedback",
      "🔄 Request changes if needed"
    ]
  },

  PAYMENT_REMINDER: {
    title: "💳 Payment Due",
    content: (job, amount) => `Your job "${job.title}" is ready for payment. Amount due: ₹${amount}`,
    tips: [
      "💰 Complete payment to close the job",
      "🧾 You'll receive a payment receipt",
      "⭐ Don't forget to leave a review",
      "🔒 Your payment is secure with Razorpay"
    ]
  },

  REVIEW_COMPLETED: {
    title: "🌟 Reviews Complete - Thank You!",
    content: (job) => `Thank you for completing reviews for "${job.title}". Your feedback helps maintain quality on Fixly.`,
    tips: [
      "🎯 This conversation will be archived soon",
      "📞 Contact support if you need help",
      "🔄 Feel free to post more jobs",
      "🏆 Build your reputation on Fixly"
    ]
  },

  WELCOME_HIRER: {
    title: "👋 Welcome to Your Job Chat",
    content: (job) => `Welcome to the conversation for "${job.title}". This is where you'll coordinate with your assigned fixer.`,
    tips: [
      "💬 Introduce yourself and your requirements",
      "📋 Share any specific details or preferences",
      "🕒 Discuss timing and availability",
      "📷 Share photos if helpful"
    ]
  },

  WELCOME_FIXER: {
    title: "🛠️ New Job Assignment",
    content: (job, hirer) => `You've been assigned to "${job.title}" by ${hirer.name}. Let's get started!`,
    tips: [
      "👋 Introduce yourself professionally",
      "❓ Ask any clarifying questions",
      "📅 Confirm availability and timeline",
      "🎯 Show enthusiasm for the job"
    ]
  },

  DEADLINE_REMINDER: {
    title: "⏰ Deadline Approaching",
    content: (job, daysLeft) => `Reminder: "${job.title}" deadline is in ${daysLeft} ${daysLeft === 1 ? 'day' : 'days'}. Please coordinate to ensure timely completion.`,
    tips: [
      "🕒 Confirm current progress status",
      "📅 Adjust timeline if needed",
      "💬 Communicate any challenges",
      "🎯 Focus on quality completion"
    ]
  },

  DISPUTE_CREATED: {
    title: "⚖️ Dispute Opened",
    content: (job) => `A dispute has been opened for "${job.title}". Our team will review and help resolve this matter.`,
    tips: [
      "📋 Provide all relevant details",
      "📷 Share photos or evidence if applicable",
      "🤝 Stay professional in communications",
      "⏱️ Response time: 24-48 hours"
    ]
  }
};

/**
 * Send automated system message
 */
async function sendAutomatedMessage(conversationId, messageType, context = {}) {
  try {
    await connectDB();

    const conversation = await Conversation.findById(conversationId)
      .populate('participants', 'name username photoURL role');

    if (!conversation) {
      console.error('Conversation not found:', conversationId);
      return false;
    }

    const template = MESSAGE_TEMPLATES[messageType];
    if (!template) {
      console.error('Unknown message template:', messageType);
      return false;
    }

    // Generate message content based on template and context
    const messageContent = template.content(context.job, context.user, context.amount, context.daysLeft);

    const systemMessage = {
      sender: null, // System message
      type: 'system',
      content: messageContent,
      metadata: {
        title: template.title,
        tips: template.tips,
        messageType,
        jobId: context.job?._id,
        timestamp: new Date()
      },
      timestamp: new Date(),
      isRead: false
    };

    // Add message to conversation
    conversation.messages.push(systemMessage);
    conversation.lastMessage = {
      content: template.title,
      sender: null,
      timestamp: new Date(),
      type: 'system'
    };
    conversation.updatedAt = new Date();

    await conversation.save();

    // Publish to real-time channel
    const channelName = `conversation:${conversationId}`;
    await publishToChannel(channelName, 'message', {
      conversationId,
      message: systemMessage,
      messageCount: conversation.messages.length
    });

    // Also publish to user channels for notification
    for (const participant of conversation.participants) {
      await publishToChannel(`user:${participant._id}:notifications`, 'new_message', {
        conversationId,
        jobTitle: context.job?.title,
        messageType: 'system',
        title: template.title
      });
    }

    console.log(`Automated message sent: ${messageType} for conversation ${conversationId}`);
    return true;

  } catch (error) {
    console.error('Error sending automated message:', error);
    return false;
  }
}

/**
 * Job assignment messaging
 */
export async function sendJobAssignmentMessage(jobId) {
  try {
    await connectDB();

    const job = await Job.findById(jobId)
      .populate('createdBy', 'name username')
      .populate('assignedTo', 'name username');

    if (!job || !job.assignedTo) {
      return false;
    }

    // Find or create conversation
    let conversation = await Conversation.findOne({
      job: jobId,
      participants: { $all: [job.createdBy._id, job.assignedTo._id] }
    });

    if (!conversation) {
      conversation = new Conversation({
        participants: [job.createdBy._id, job.assignedTo._id],
        job: jobId,
        messages: []
      });
      await conversation.save();
    }

    // Send assignment confirmation message
    await sendAutomatedMessage(conversation._id, 'JOB_ASSIGNED', {
      job,
      user: job.assignedTo
    });

    // Send welcome messages to both parties
    setTimeout(async () => {
      await sendAutomatedMessage(conversation._id, 'WELCOME_HIRER', { job });
    }, 2000);

    setTimeout(async () => {
      await sendAutomatedMessage(conversation._id, 'WELCOME_FIXER', {
        job,
        user: job.createdBy
      });
    }, 4000);

    return true;
  } catch (error) {
    console.error('Error in job assignment messaging:', error);
    return false;
  }
}

/**
 * Work status update messaging
 */
export async function sendWorkStatusMessage(jobId, status) {
  try {
    await connectDB();

    const job = await Job.findById(jobId)
      .populate('createdBy', 'name username')
      .populate('assignedTo', 'name username');

    if (!job) return false;

    const conversation = await Conversation.findOne({
      job: jobId,
      participants: { $all: [job.createdBy._id, job.assignedTo._id] }
    });

    if (!conversation) return false;

    let messageType;
    switch (status) {
      case 'in_progress':
        messageType = 'WORK_STARTED';
        break;
      case 'completed':
        messageType = 'WORK_COMPLETED';
        break;
      default:
        return false;
    }

    await sendAutomatedMessage(conversation._id, messageType, {
      job,
      user: job.assignedTo
    });

    return true;
  } catch (error) {
    console.error('Error in work status messaging:', error);
    return false;
  }
}

/**
 * Payment reminder messaging
 */
export async function sendPaymentReminder(jobId) {
  try {
    await connectDB();

    const job = await Job.findById(jobId)
      .populate('createdBy', 'name username')
      .populate('assignedTo', 'name username');

    if (!job || job.status !== 'completed') return false;

    const conversation = await Conversation.findOne({
      job: jobId,
      participants: { $all: [job.createdBy._id, job.assignedTo._id] }
    });

    if (!conversation) return false;

    await sendAutomatedMessage(conversation._id, 'PAYMENT_REMINDER', {
      job,
      amount: job.budget?.agreed || job.budget?.max
    });

    return true;
  } catch (error) {
    console.error('Error in payment reminder:', error);
    return false;
  }
}

/**
 * Review completion messaging
 */
export async function sendReviewCompletionMessage(jobId) {
  try {
    await connectDB();

    const job = await Job.findById(jobId);
    if (!job) return false;

    const conversation = await Conversation.findOne({
      job: jobId,
      participants: { $all: [job.createdBy, job.assignedTo] }
    });

    if (!conversation) return false;

    await sendAutomatedMessage(conversation._id, 'REVIEW_COMPLETED', { job });

    return true;
  } catch (error) {
    console.error('Error in review completion messaging:', error);
    return false;
  }
}

/**
 * Deadline reminder messaging
 */
export async function sendDeadlineReminder(jobId, daysLeft) {
  try {
    await connectDB();

    const job = await Job.findById(jobId);
    if (!job) return false;

    const conversation = await Conversation.findOne({
      job: jobId,
      participants: { $all: [job.createdBy, job.assignedTo] }
    });

    if (!conversation) return false;

    await sendAutomatedMessage(conversation._id, 'DEADLINE_REMINDER', {
      job,
      daysLeft
    });

    return true;
  } catch (error) {
    console.error('Error in deadline reminder:', error);
    return false;
  }
}

/**
 * Dispute creation messaging
 */
export async function sendDisputeMessage(jobId) {
  try {
    await connectDB();

    const job = await Job.findById(jobId);
    if (!job) return false;

    const conversation = await Conversation.findOne({
      job: jobId,
      participants: { $all: [job.createdBy, job.assignedTo] }
    });

    if (!conversation) return false;

    await sendAutomatedMessage(conversation._id, 'DISPUTE_CREATED', { job });

    return true;
  } catch (error) {
    console.error('Error in dispute messaging:', error);
    return false;
  }
}

/**
 * Schedule automated reminders
 */
export async function scheduleAutomatedReminders() {
  try {
    await connectDB();

    // Find jobs approaching deadline (2 days before)
    const twoDaysFromNow = new Date();
    twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);

    const upcomingDeadlines = await Job.find({
      status: 'in_progress',
      'timeline.deadline': {
        $gte: new Date(),
        $lte: twoDaysFromNow
      }
    });

    for (const job of upcomingDeadlines) {
      const daysLeft = Math.ceil((job.timeline.deadline - new Date()) / (1000 * 60 * 60 * 24));
      await sendDeadlineReminder(job._id, daysLeft);
    }

    // Find completed jobs pending payment (24 hours after completion)
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const pendingPayments = await Job.find({
      status: 'completed',
      'completion.completedAt': { $lte: oneDayAgo },
      'payment.status': { $ne: 'completed' }
    });

    for (const job of pendingPayments) {
      await sendPaymentReminder(job._id);
    }

    console.log(`Processed ${upcomingDeadlines.length} deadline reminders and ${pendingPayments.length} payment reminders`);

  } catch (error) {
    console.error('Error in scheduled automated reminders:', error);
  }
}

export {
  sendAutomatedMessage,
  MESSAGE_TEMPLATES
};