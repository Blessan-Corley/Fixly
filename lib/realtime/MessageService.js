// Production-grade messaging service
import realtimeManager from './RealtimeManager.js';
import notificationService from './NotificationService.js';

class MessageService {
  constructor() {
    this.messageTypes = {
      TEXT: 'text',
      IMAGE: 'image',
      FILE: 'file',
      SYSTEM: 'system',
      JOB_OFFER: 'job_offer',
      PAYMENT_REQUEST: 'payment_request'
    };
    
    this.conversationTypes = {
      DIRECT: 'direct',
      JOB_DISCUSSION: 'job_discussion',
      GROUP: 'group'
    };
  }
  
  // Send a message
  async sendMessage(senderId, recipientId, content, type = this.messageTypes.TEXT, metadata = {}) {
    const messageId = this.generateMessageId();
    const conversationId = this.getConversationId(senderId, recipientId);
    
    const message = {
      id: messageId,
      conversationId,
      senderId,
      recipientId,
      content,
      type,
      metadata,
      timestamp: Date.now(),
      read: false,
      delivered: false,
      edited: false,
      editedAt: null
    };
    
    try {
      // Store message in database
      await this.storeMessage(message);
      
      // Send real-time message to recipient
      const sent = realtimeManager.sendToUser(recipientId, {
        type: 'message_received',
        data: message
      });
      
      if (sent) {
        message.delivered = true;
        await this.updateMessageStatus(messageId, { delivered: true, deliveredAt: Date.now() });
      }
      
      // Send delivery confirmation to sender
      realtimeManager.sendToUser(senderId, {
        type: 'message_sent',
        data: {
          messageId,
          delivered: sent,
          timestamp: Date.now()
        }
      });
      
      // Send notification if recipient is offline or message is important
      const recipientOnline = realtimeManager.getUserPresence(recipientId).status === 'online';
      if (!recipientOnline || metadata.important) {
        const senderInfo = await this.getUserInfo(senderId);
        await notificationService.sendMessageNotification(
          recipientId,
          senderId,
          senderInfo.name,
          content,
          conversationId
        );
      }
      
      // Update conversation metadata
      await this.updateConversationLastMessage(conversationId, message);
      
      console.log(`💬 Message sent from ${senderId} to ${recipientId}: ${messageId}`);
      return message;
      
    } catch (error) {
      console.error('Failed to send message:', error);
      
      // Send error to sender
      realtimeManager.sendToUser(senderId, {
        type: 'message_error',
        data: {
          messageId,
          error: 'Failed to send message',
          timestamp: Date.now()
        }
      });
      
      throw error;
    }
  }
  
  // Send message to multiple recipients (group chat)
  async sendGroupMessage(senderId, recipientIds, content, type = this.messageTypes.TEXT, metadata = {}) {
    const messageId = this.generateMessageId();
    const groupId = metadata.groupId || this.generateGroupId(recipientIds);
    
    const results = [];
    
    for (const recipientId of recipientIds) {
      if (recipientId !== senderId) {
        try {
          const result = await this.sendMessage(senderId, recipientId, content, type, {
            ...metadata,
            groupId,
            isGroupMessage: true
          });
          results.push({ recipientId, success: true, messageId: result.id });
        } catch (error) {
          results.push({ recipientId, success: false, error: error.message });
        }
      }
    }
    
    return { messageId, results };
  }
  
  // Mark message as read
  async markMessageAsRead(messageId, userId) {
    try {
      await this.updateMessageStatus(messageId, { 
        read: true, 
        readAt: Date.now() 
      });
      
      // Get message details to send read receipt
      const message = await this.getMessage(messageId);
      if (message && message.senderId !== userId) {
        realtimeManager.sendToUser(message.senderId, {
          type: 'message_read',
          data: {
            messageId,
            readBy: userId,
            readAt: Date.now()
          }
        });
      }
      
      return true;
    } catch (error) {
      console.error('Failed to mark message as read:', error);
      return false;
    }
  }
  
  // Get conversation history
  async getConversationHistory(conversationId, limit = 50, offset = 0) {
    try {
      // TODO: Implement database query
      // This is a mock implementation
      const messages = [];
      
      // Send real-time update that conversation was accessed
      const participants = this.getConversationParticipants(conversationId);
      participants.forEach(userId => {
        realtimeManager.sendToUser(userId, {
          type: 'conversation_accessed',
          data: {
            conversationId,
            accessedAt: Date.now()
          }
        });
      });
      
      return {
        conversationId,
        messages,
        hasMore: offset + messages.length < 1000, // Mock total
        total: 1000
      };
    } catch (error) {
      console.error('Failed to get conversation history:', error);
      throw error;
    }
  }
  
  // Get user's conversations list
  async getUserConversations(userId, limit = 20) {
    try {
      // TODO: Implement database query
      const conversations = [
        {
          id: 'conv_123',
          type: this.conversationTypes.DIRECT,
          participants: [userId, 'other_user'],
          lastMessage: {
            content: 'Hello there!',
            timestamp: Date.now() - 3600000,
            senderId: 'other_user'
          },
          unreadCount: 2
        }
      ];
      
      return conversations;
    } catch (error) {
      console.error('Failed to get user conversations:', error);
      throw error;
    }
  }
  
  // Send typing indicator
  async sendTypingIndicator(senderId, recipientId, isTyping = true) {
    const conversationId = this.getConversationId(senderId, recipientId);
    
    realtimeManager.sendToUser(recipientId, {
      type: 'typing_indicator',
      data: {
        conversationId,
        senderId,
        isTyping,
        timestamp: Date.now()
      }
    });
  }
  
  // Edit message
  async editMessage(messageId, newContent, editedBy) {
    try {
      const message = await this.getMessage(messageId);
      if (!message) {
        throw new Error('Message not found');
      }
      
      if (message.senderId !== editedBy) {
        throw new Error('Not authorized to edit this message');
      }
      
      // Update message in database
      await this.updateMessageStatus(messageId, {
        content: newContent,
        edited: true,
        editedAt: Date.now()
      });
      
      // Send real-time update to recipient
      realtimeManager.sendToUser(message.recipientId, {
        type: 'message_edited',
        data: {
          messageId,
          newContent,
          editedAt: Date.now()
        }
      });
      
      return true;
    } catch (error) {
      console.error('Failed to edit message:', error);
      throw error;
    }
  }
  
  // Delete message
  async deleteMessage(messageId, deletedBy) {
    try {
      const message = await this.getMessage(messageId);
      if (!message) {
        throw new Error('Message not found');
      }
      
      if (message.senderId !== deletedBy) {
        throw new Error('Not authorized to delete this message');
      }
      
      // Mark as deleted in database
      await this.updateMessageStatus(messageId, {
        deleted: true,
        deletedAt: Date.now(),
        deletedBy
      });
      
      // Send real-time update to recipient
      realtimeManager.sendToUser(message.recipientId, {
        type: 'message_deleted',
        data: {
          messageId,
          deletedAt: Date.now()
        }
      });
      
      return true;
    } catch (error) {
      console.error('Failed to delete message:', error);
      throw error;
    }
  }
  
  // Send file/image message
  async sendFileMessage(senderId, recipientId, fileData, type = this.messageTypes.FILE) {
    const fileId = this.generateFileId();
    
    // TODO: Upload file to storage service
    const fileUrl = await this.uploadFile(fileData, fileId);
    
    const message = await this.sendMessage(senderId, recipientId, fileUrl, type, {
      fileName: fileData.name,
      fileSize: fileData.size,
      fileType: fileData.type,
      fileId
    });
    
    return message;
  }
  
  // Create job-related conversation
  async createJobConversation(jobId, jobOwnerId, applicantId, initialMessage = null) {
    const conversationId = `job_${jobId}_${jobOwnerId}_${applicantId}`;
    
    const conversation = {
      id: conversationId,
      type: this.conversationTypes.JOB_DISCUSSION,
      participants: [jobOwnerId, applicantId],
      jobId,
      createdAt: Date.now(),
      metadata: {
        jobTitle: await this.getJobTitle(jobId)
      }
    };
    
    // Store conversation
    await this.storeConversation(conversation);
    
    // Send initial system message
    if (initialMessage) {
      await this.sendMessage('system', applicantId, initialMessage, this.messageTypes.SYSTEM, {
        conversationId,
        isWelcomeMessage: true
      });
    }
    
    // Notify participants
    [jobOwnerId, applicantId].forEach(userId => {
      realtimeManager.sendToUser(userId, {
        type: 'conversation_created',
        data: conversation
      });
    });
    
    return conversation;
  }
  
  // Helper methods
  generateMessageId() {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  generateGroupId(participantIds) {
    return `group_${participantIds.sort().join('_')}_${Date.now()}`;
  }
  
  generateFileId() {
    return `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  getConversationId(userId1, userId2) {
    return [userId1, userId2].sort().join('_');
  }
  
  getConversationParticipants(conversationId) {
    // Parse conversation ID to get participants
    return conversationId.split('_');
  }
  
  // Database operations (implement based on your DB)
  async storeMessage(message) {
    // TODO: Implement database storage
    console.log('📝 Storing message:', message.id);
  }
  
  async getMessage(messageId) {
    // TODO: Implement database query
    return null;
  }
  
  async updateMessageStatus(messageId, updates) {
    // TODO: Implement database update
    console.log(`📝 Updating message ${messageId}:`, updates);
  }
  
  async updateConversationLastMessage(conversationId, message) {
    // TODO: Implement database update
    console.log(`📝 Updating conversation ${conversationId} last message`);
  }
  
  async storeConversation(conversation) {
    // TODO: Implement database storage
    console.log('📝 Storing conversation:', conversation.id);
  }
  
  async getUserInfo(userId) {
    // TODO: Implement user lookup
    return { name: `User ${userId}` };
  }
  
  async getJobTitle(jobId) {
    // TODO: Implement job lookup
    return `Job ${jobId}`;
  }
  
  async uploadFile(fileData, fileId) {
    // TODO: Implement file upload
    return `https://example.com/files/${fileId}`;
  }
}

// Export singleton instance
const messageService = new MessageService();
export default messageService;