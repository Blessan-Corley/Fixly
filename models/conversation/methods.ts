import { ConversationSchema } from './schema';
import type { ConversationDocument, ConversationMessage, ConversationModel } from './types';
import { toIdString } from './types';

ConversationSchema.index({ participants: 1 });
ConversationSchema.index({ relatedJob: 1 });
ConversationSchema.index({ updatedAt: -1 });
ConversationSchema.index({ 'messages.timestamp': -1 });
ConversationSchema.index({ 'messages.sender': 1 });

ConversationSchema.virtual('unreadCount').get(function (this: ConversationDocument) {
  const conversation = this;
  return function (userId: string) {
    return conversation.messages.filter(
      (message: ConversationMessage) =>
        toIdString(message.sender) !== userId.toString() && !message.readBy?.get(userId.toString())
    ).length;
  };
});

ConversationSchema.methods.addMessage = function (
  this: ConversationDocument,
  messageData: Pick<ConversationMessage, 'sender' | 'content'> & Partial<ConversationMessage>
) {
  this.messages.push(messageData as ConversationMessage);
  this.lastActivity = new Date();
  this.metadata.totalMessages = this.messages.length;
  this.lastMessage = {
    content: messageData.content ?? '',
    sender: messageData.sender,
    messageType: messageData.messageType ?? 'text',
    timestamp: new Date(),
  };
  return this.save();
};

ConversationSchema.methods.markAsRead = function (this: ConversationDocument, userId: string) {
  this.messages.forEach((message: ConversationMessage) => {
    if (toIdString(message.sender) !== userId.toString()) {
      if (!message.readBy) {
        message.readBy = new Map();
      }
      message.readBy.set(userId.toString(), new Date());
    }
  });
  return this.save();
};

ConversationSchema.methods.getOtherParticipant = function (
  this: ConversationDocument,
  currentUserId: string
) {
  return this.participants.find(
    (participant) => toIdString(participant) !== currentUserId.toString()
  );
};

ConversationSchema.methods.cleanupOldMessages = function (
  this: ConversationDocument,
  daysToKeep = 365
) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
  this.messages = this.messages.filter(
    (message: ConversationMessage) => message.timestamp > cutoffDate
  );
  return this.save();
};

ConversationSchema.statics.findOrCreateBetween = async function (
  this: ConversationModel,
  user1Id: string,
  user2Id: string,
  jobId: string | null = null
) {
  let conversation = await this.findOne({
    participants: { $all: [user1Id, user2Id] },
    ...(jobId && { relatedJob: jobId }),
  });

  if (!conversation) {
    conversation = new this({
      participants: [user1Id, user2Id],
      relatedJob: jobId,
      conversationType: jobId ? 'job' : 'direct',
      metadata: { createdBy: user1Id, totalMessages: 0 },
    });
    await conversation.save();
  }

  return conversation;
};

ConversationSchema.pre('save', function (this: ConversationDocument, next) {
  if (this.isModified('messages') && this.messages.length > 0) {
    this.lastActivity = new Date();
    this.metadata.totalMessages = this.messages.length;
    const latest = this.messages[this.messages.length - 1];
    this.lastMessage = {
      content: latest.content ?? '',
      sender: latest.sender,
      messageType: latest.messageType ?? 'text',
      timestamp: latest.timestamp ?? new Date(),
    };
  }
  next();
});
