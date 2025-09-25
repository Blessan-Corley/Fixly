// lib/services/messageService.js - Enhanced messaging with Ably real-time integration
import { getServerAbly, CHANNELS, EVENTS } from '../ably';
import Conversation from '../../models/Conversation';
import Job from '../../models/Job';
import User from '../../models/User';
import { redisUtils } from '../redis';

export class MessageService {
  /**
   * Create private conversation when job application is accepted
   * Automatically sends job details and contact info as first message
   */
  static async createJobConversation(jobId, hirerId, fixerId) {
    try {
      // Get job details with populated fields
      const job = await Job.findById(jobId).populate('client', 'name username phone email');
      const fixer = await User.findById(fixerId).select('name username phone email');

      if (!job || !fixer) {
        throw new Error('Job or fixer not found');
      }

      // Check if conversation already exists
      let conversation = await Conversation.findOne({
        participants: { $all: [hirerId, fixerId] },
        relatedJob: jobId
      });

      if (!conversation) {
        // Create new conversation
        conversation = new Conversation({
          participants: [hirerId, fixerId],
          relatedJob: jobId,
          conversationType: 'job',
          title: `Job: ${job.title}`,
          metadata: {
            createdBy: hirerId,
            totalMessages: 0,
            priority: job.urgency === 'urgent' ? 'urgent' : 'normal'
          }
        });
      }

      // Create automated welcome message with job details and contact info
      const welcomeMessage = this.generateJobAssignmentMessage(job, fixer);

      const systemMessage = {
        sender: hirerId, // From hirer but marked as system
        content: welcomeMessage,
        messageType: 'system',
        timestamp: new Date(),
        readBy: {
          [hirerId]: new Date(),
          [fixerId]: new Date() // Mark as read for both to avoid notification spam
        }
      };

      conversation.messages.push(systemMessage);
      conversation.lastActivity = new Date();
      conversation.metadata.totalMessages = conversation.messages.length;

      await conversation.save();

      // Cache conversation for quick access
      const cacheKey = `conversation:job:${jobId}`;
      await redisUtils.setex(cacheKey, 3600, JSON.stringify({
        conversationId: conversation._id,
        participants: [hirerId, fixerId],
        jobId: jobId
      }));

      // Real-time broadcast via Ably
      await this.broadcastConversationCreated(conversation, job, fixer);

      return {
        success: true,
        conversationId: conversation._id,
        message: 'Job conversation created successfully'
      };

    } catch (error) {
      console.error('Error creating job conversation:', error);
      throw error;
    }
  }

  /**
   * Generate comprehensive job assignment message
   */
  static generateJobAssignmentMessage(job, fixer) {
    const hirerContact = job.client;

    return `🎉 **Congratulations! You've been assigned to this job.**

**📋 JOB DETAILS:**
• **Title:** ${job.title}
• **Budget:** ₹${job.budget?.amount?.toLocaleString() || 'Negotiable'}${job.budget?.materialsIncluded ? ' (materials included)' : ''}
• **Deadline:** ${job.deadline ? new Date(job.deadline).toLocaleDateString('en-IN') : 'Flexible'}
• **Urgency:** ${job.urgency?.charAt(0).toUpperCase() + job.urgency?.slice(1) || 'Normal'}

**📍 LOCATION:**
${job.location?.address || ''}
${job.location?.city}, ${job.location?.state} ${job.location?.pincode || ''}

**📝 DESCRIPTION:**
${job.description}

**🔧 SKILLS REQUIRED:**
${job.skillsRequired?.join(', ') || 'Not specified'}

**📞 CONTACT DETAILS:**
• **Name:** ${hirerContact.name}
• **Phone:** ${hirerContact.phone || 'Not provided'}
• **Email:** ${hirerContact.email || 'Not provided'}

**💼 NEXT STEPS:**
1. Review the job details carefully
2. Contact the hirer to discuss timing and specifics
3. Confirm your availability and start date
4. Ask any questions you may have

**✅ You can now communicate freely in this private chat. Good luck with the job!**`;
  }

  /**
   * Send real-time message with Ably broadcasting
   */
  static async sendMessage(conversationId, senderId, content, messageType = 'text') {
    try {
      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        throw new Error('Conversation not found');
      }

      // Check if user is participant
      if (!conversation.participants.includes(senderId)) {
        throw new Error('Access denied');
      }

      // Create message
      const newMessage = {
        sender: senderId,
        content: content.trim(),
        messageType,
        timestamp: new Date(),
        readBy: {
          [senderId]: new Date()
        }
      };

      // Add to conversation
      conversation.messages.push(newMessage);
      conversation.lastActivity = new Date();
      conversation.metadata.totalMessages = conversation.messages.length;

      await conversation.save();

      // Get populated message for response
      const populatedConversation = await Conversation.findById(conversationId)
        .populate('messages.sender', 'name username photoURL')
        .lean();

      const savedMessage = populatedConversation.messages[populatedConversation.messages.length - 1];

      // Real-time broadcast via Ably
      await this.broadcastNewMessage(conversation, savedMessage);

      return {
        success: true,
        message: savedMessage,
        conversationId: conversationId
      };

    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  /**
   * Broadcast conversation creation via Ably
   */
  static async broadcastConversationCreated(conversation, job, fixer) {
    try {
      const ably = getServerAbly();
      if (!ably) return;

      // Broadcast to both participants
      for (const participantId of conversation.participants) {
        const userChannel = ably.channels.get(CHANNELS.userNotifications(participantId));

        await userChannel.publish(EVENTS.CONVERSATION_CREATED, {
          conversationId: conversation._id,
          type: 'job_assignment',
          title: `Job Assigned: ${job.title}`,
          message: `You can now communicate privately about this job`,
          jobId: job._id,
          jobTitle: job.title,
          otherParticipant: participantId.toString() === job.client._id.toString() ?
            { name: fixer.name, username: fixer.username } :
            { name: job.client.name, username: job.client.username },
          timestamp: new Date().toISOString(),
          actionUrl: `/dashboard/messages?conversation=${conversation._id}`
        });
      }

      console.log(`✅ Conversation creation broadcasted for job ${job._id}`);
    } catch (error) {
      console.error('Error broadcasting conversation creation:', error);
    }
  }

  /**
   * Broadcast new message via Ably
   */
  static async broadcastNewMessage(conversation, message) {
    try {
      const ably = getServerAbly();
      if (!ably) return;

      // Broadcast to conversation channel
      const conversationChannel = ably.channels.get(CHANNELS.conversation(conversation._id));

      await conversationChannel.publish(EVENTS.MESSAGE_SENT, {
        conversationId: conversation._id,
        message: {
          _id: message._id,
          content: message.content,
          sender: message.sender,
          timestamp: message.timestamp,
          messageType: message.messageType
        },
        totalMessages: conversation.metadata.totalMessages
      });

      // Send notification to other participants
      const otherParticipants = conversation.participants.filter(
        p => p.toString() !== message.sender._id.toString()
      );

      for (const participantId of otherParticipants) {
        const userChannel = ably.channels.get(CHANNELS.userNotifications(participantId));

        await userChannel.publish(EVENTS.MESSAGE_NOTIFICATION, {
          conversationId: conversation._id,
          senderName: message.sender.name,
          content: message.content.length > 50 ?
            message.content.substring(0, 50) + '...' :
            message.content,
          timestamp: message.timestamp,
          actionUrl: `/dashboard/messages?conversation=${conversation._id}`
        });
      }

      console.log(`✅ Message broadcasted for conversation ${conversation._id}`);
    } catch (error) {
      console.error('Error broadcasting message:', error);
    }
  }

  /**
   * Get conversation with caching
   */
  static async getConversation(conversationId, userId) {
    try {
      // Check cache first
      const cacheKey = `conversation:${conversationId}:${userId}`;
      const cached = await redisUtils.get(cacheKey);

      if (cached) {
        return JSON.parse(cached);
      }

      // Get from database
      const conversation = await Conversation.findById(conversationId)
        .populate([
          {
            path: 'participants',
            select: 'name username email photoURL role rating isOnline lastSeen'
          },
          {
            path: 'messages.sender',
            select: 'name username photoURL'
          },
          {
            path: 'relatedJob',
            select: 'title status budget location client fixer'
          }
        ])
        .lean();

      if (!conversation) {
        throw new Error('Conversation not found');
      }

      // Check access
      const isParticipant = conversation.participants.some(
        p => p._id.toString() === userId
      );

      if (!isParticipant) {
        throw new Error('Access denied');
      }

      // Cache for 5 minutes
      await redisUtils.setex(cacheKey, 300, JSON.stringify(conversation));

      return conversation;

    } catch (error) {
      console.error('Error getting conversation:', error);
      throw error;
    }
  }

  /**
   * Mark messages as read with real-time updates
   */
  static async markAsRead(conversationId, userId) {
    try {
      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        throw new Error('Conversation not found');
      }

      // Update read status
      let hasUnreadMessages = false;
      conversation.messages.forEach(message => {
        if (message.sender.toString() !== userId &&
            (!message.readBy || !message.readBy.get(userId))) {

          if (!message.readBy) {
            message.readBy = new Map();
          }
          message.readBy.set(userId, new Date());
          hasUnreadMessages = true;
        }
      });

      if (hasUnreadMessages) {
        await conversation.save();

        // Clear cache
        const cacheKey = `conversation:${conversationId}:${userId}`;
        await redisUtils.del(cacheKey);

        // Broadcast read receipt via Ably
        const ably = getServerAbly();
        if (ably) {
          const conversationChannel = ably.channels.get(CHANNELS.conversation(conversationId));
          await conversationChannel.publish(EVENTS.MESSAGES_READ, {
            conversationId,
            readBy: userId,
            timestamp: new Date().toISOString()
          });
        }
      }

      return { success: true };

    } catch (error) {
      console.error('Error marking messages as read:', error);
      throw error;
    }
  }

  /**
   * Get user's conversations with unread counts
   */
  static async getUserConversations(userId, limit = 50) {
    try {
      const cacheKey = `user_conversations:${userId}`;
      const cached = await redisUtils.get(cacheKey);

      if (cached) {
        return JSON.parse(cached);
      }

      const conversations = await Conversation.find({
        participants: userId
      })
        .populate([
          {
            path: 'participants',
            select: 'name username email photoURL role rating isOnline lastSeen'
          },
          {
            path: 'relatedJob',
            select: 'title status budget'
          }
        ])
        .sort({ updatedAt: -1 })
        .limit(limit)
        .lean();

      // Process conversations with metadata
      const processedConversations = conversations.map(conv => {
        const otherParticipant = conv.participants.find(
          p => p._id.toString() !== userId
        );

        const lastMessage = conv.messages[conv.messages.length - 1];
        const unreadCount = conv.messages.filter(msg =>
          msg.sender.toString() !== userId &&
          (!msg.readBy || !msg.readBy.get(userId))
        ).length;

        return {
          _id: conv._id,
          participant: otherParticipant,
          relatedJob: conv.relatedJob,
          title: conv.title,
          lastMessage: lastMessage ? {
            content: lastMessage.content,
            timestamp: lastMessage.timestamp,
            sender: lastMessage.sender.toString() === userId ? 'me' : 'them',
            messageType: lastMessage.messageType
          } : null,
          unreadCount,
          updatedAt: conv.updatedAt,
          conversationType: conv.conversationType
        };
      });

      // Cache for 2 minutes
      await redisUtils.setex(cacheKey, 120, JSON.stringify(processedConversations));

      return processedConversations;

    } catch (error) {
      console.error('Error getting user conversations:', error);
      throw error;
    }
  }
}

export default MessageService;