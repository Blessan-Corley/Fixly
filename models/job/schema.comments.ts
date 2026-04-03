import { Schema } from 'mongoose';

const REACTION_TYPES = ['thumbs_up', 'thumbs_down', 'heart', 'laugh', 'wow', 'angry'] as const;

export const LikeSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Like user is required'],
    },
    likedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

export const ReactionSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: REACTION_TYPES,
      required: true,
    },
    reactedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

export const MentionSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    startIndex: {
      type: Number,
      required: true,
    },
    endIndex: {
      type: Number,
      required: true,
    },
  },
  { _id: true }
);

export const EditHistorySchema = new Schema(
  {
    originalMessage: String,
    editedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

export const ReplySchema = new Schema(
  {
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Reply author is required'],
    },
    message: {
      type: String,
      required: [true, 'Reply message is required'],
      trim: true,
      minlength: [1, 'Reply cannot be empty'],
      maxlength: [500, 'Reply cannot exceed 500 characters'],
    },
    likes: [LikeSchema],
    reactions: [ReactionSchema],
    mentions: [MentionSchema],
    edited: {
      isEdited: {
        type: Boolean,
        default: false,
      },
      editedAt: {
        type: Date,
      },
      editHistory: [EditHistorySchema],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

export const CommentSchema = new Schema(
  {
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Comment author is required'],
    },
    message: {
      type: String,
      required: [true, 'Comment message is required'],
      trim: true,
      minlength: [1, 'Comment cannot be empty'],
      maxlength: [500, 'Comment cannot exceed 500 characters'],
    },
    likes: [LikeSchema],
    reactions: [ReactionSchema],
    mentions: [MentionSchema],
    edited: {
      isEdited: {
        type: Boolean,
        default: false,
      },
      editedAt: {
        type: Date,
      },
      editHistory: [EditHistorySchema],
    },
    replies: [ReplySchema],
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

export const jobCommentsField = [CommentSchema];
