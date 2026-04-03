import mongoose from 'mongoose';

import type { Conversation, ConversationMessage, ConversationMethods, ConversationModel } from './types';

export const MessageSchema = new mongoose.Schema<ConversationMessage>({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  content: {
    type: String,
    required: true,
    maxlength: 1000,
  },
  messageType: {
    type: String,
    enum: ['text', 'image', 'file', 'system'],
    default: 'text',
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  readBy: {
    type: Map,
    of: Date,
    default: new Map(),
  },
  edited: {
    type: Boolean,
    default: false,
  },
  editedAt: { type: Date },
  deleted: {
    type: Boolean,
    default: false,
  },
  deletedAt: { type: Date },
  attachments: [
    {
      type: { type: String, enum: ['image', 'document', 'link'] },
      url: String,
      filename: String,
      size: Number,
      mimeType: String,
    },
  ],
  reactions: [
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
      type: {
        type: String,
        enum: ['thumbs_up', 'heart', 'laugh', 'wow', 'sad', 'angry'],
        required: true,
      },
      reactedAt: { type: Date, default: Date.now },
    },
  ],
  replyTo: { type: mongoose.Schema.Types.ObjectId },
});

export const ConversationSchema = new mongoose.Schema<
  Conversation,
  ConversationModel,
  ConversationMethods
>(
  {
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
    messages: [MessageSchema],
    relatedJob: { type: mongoose.Schema.Types.ObjectId, ref: 'Job' },
    title: { type: String, maxlength: 200 },
    conversationType: {
      type: String,
      enum: ['direct', 'job', 'support'],
      default: 'direct',
    },
    archived: { type: Boolean, default: false },
    archivedBy: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        archivedAt: { type: Date, default: Date.now },
      },
    ],
    muted: { type: Boolean, default: false },
    mutedBy: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        mutedUntil: { type: Date },
      },
    ],
    lastActivity: { type: Date, default: Date.now },
    lastMessage: {
      content: { type: String, default: '' },
      sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      messageType: {
        type: String,
        enum: ['text', 'image', 'file', 'system'],
        default: 'text',
      },
      timestamp: { type: Date },
    },
    metadata: {
      totalMessages: { type: Number, default: 0 },
      createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      tags: [String],
      priority: {
        type: String,
        enum: ['low', 'normal', 'high', 'urgent'],
        default: 'normal',
      },
    },
  },
  { timestamps: true }
);
