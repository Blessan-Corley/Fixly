// models/Conversation.js
import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true,
    maxlength: 1000
  },
  messageType: {
    type: String,
    enum: ['text', 'image', 'file', 'system'],
    default: 'text'
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  readBy: {
    type: Map,
    of: Date,
    default: new Map()
  },
  edited: {
    type: Boolean,
    default: false
  },
  editedAt: {
    type: Date
  },
  deleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date
  },
  attachments: [{
    type: {
      type: String,
      enum: ['image', 'document', 'link']
    },
    url: String,
    filename: String,
    size: Number,
    mimeType: String
  }],
  replyTo: {
    type: mongoose.Schema.Types.ObjectId
  }
});

const ConversationSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  messages: [MessageSchema],
  relatedJob: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job'
  },
  title: {
    type: String,
    maxlength: 200
  },
  conversationType: {
    type: String,
    enum: ['direct', 'job', 'support'],
    default: 'direct'
  },
  archived: {
    type: Boolean,
    default: false
  },
  archivedBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    archivedAt: {
      type: Date,
      default: Date.now
    }
  }],
  muted: {
    type: Boolean,
    default: false
  },
  mutedBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    mutedUntil: {
      type: Date
    }
  }],
  lastActivity: {
    type: Date,
    default: Date.now
  },
  metadata: {
    totalMessages: {
      type: Number,
      default: 0
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    tags: [String],
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal'
    }
  }
}, {
  timestamps: true
});

// Indexes for better query performance
ConversationSchema.index({ participants: 1 });
ConversationSchema.index({ relatedJob: 1 });
ConversationSchema.index({ updatedAt: -1 });
ConversationSchema.index({ 'messages.timestamp': -1 });
ConversationSchema.index({ 'messages.sender': 1 });

// Virtual for unread count per user
ConversationSchema.virtual('unreadCount').get(function() {
  return function(userId) {
    return this.messages.filter(message => 
      message.sender.toString() !== userId.toString() &&
      (!message.readBy || !message.readBy.get(userId.toString()))
    ).length;
  };
});

// Method to add a message
ConversationSchema.methods.addMessage = function(messageData) {
  this.messages.push(messageData);
  this.lastActivity = new Date();
  this.metadata.totalMessages = this.messages.length;
  return this.save();
};

// Method to mark messages as read
ConversationSchema.methods.markAsRead = function(userId) {
  this.messages.forEach(message => {
    if (message.sender.toString() !== userId.toString()) {
      if (!message.readBy) {
        message.readBy = new Map();
      }
      message.readBy.set(userId.toString(), new Date());
    }
  });
  return this.save();
};

// Method to get other participant
ConversationSchema.methods.getOtherParticipant = function(currentUserId) {
  return this.participants.find(p => p._id.toString() !== currentUserId.toString());
};

// Static method to find or create conversation between users
ConversationSchema.statics.findOrCreateBetween = async function(user1Id, user2Id, jobId = null) {
  // Try to find existing conversation
  let conversation = await this.findOne({
    participants: { $all: [user1Id, user2Id] },
    ...(jobId && { relatedJob: jobId })
  });

  if (!conversation) {
    // Create new conversation
    conversation = new this({
      participants: [user1Id, user2Id],
      relatedJob: jobId,
      conversationType: jobId ? 'job' : 'direct',
      metadata: {
        createdBy: user1Id,
        totalMessages: 0
      }
    });
    await conversation.save();
  }

  return conversation;
};

// Pre-save middleware to update lastActivity
ConversationSchema.pre('save', function(next) {
  if (this.isModified('messages')) {
    this.lastActivity = new Date();
    this.metadata.totalMessages = this.messages.length;
  }
  next();
});

// Clean up old messages (optional - for performance)
ConversationSchema.methods.cleanupOldMessages = function(daysToKeep = 365) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
  
  this.messages = this.messages.filter(message => 
    message.timestamp > cutoffDate
  );
  
  return this.save();
};

export default mongoose.models.Conversation || mongoose.model('Conversation', ConversationSchema);