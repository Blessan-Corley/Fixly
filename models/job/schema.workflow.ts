import { Schema } from 'mongoose';

import type { JobDocument } from './types';

export const MilestoneSchema = new Schema(
  {
    title: {
      type: String,
      required: [true, 'Milestone title is required'],
      maxlength: [100, 'Milestone title cannot exceed 100 characters'],
    },
    description: {
      type: String,
      maxlength: [500, 'Milestone description cannot exceed 500 characters'],
    },
    completed: {
      type: Boolean,
      default: false,
    },
    completedAt: Date,
  },
  { _id: true }
);

export const ProgressSchema = new Schema(
  {
    arrivedAt: Date,
    startedAt: Date,
    completedAt: Date,
    markedDoneAt: Date,
    confirmedAt: Date,
    milestones: [MilestoneSchema],
    workImages: [
      {
        url: {
          type: String,
          required: [true, 'Work image URL is required'],
          validate: {
            validator: function (_this: JobDocument, url: string) {
              const urlRegex = /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i;
              return urlRegex.test(url);
            },
            message: 'Please provide a valid image URL',
          },
        },
        caption: {
          type: String,
          maxlength: [200, 'Image caption cannot exceed 200 characters'],
        },
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { _id: false }
);

export const DisputeSchema = new Schema(
  {
    raised: {
      type: Boolean,
      default: false,
    },
    raisedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    reason: {
      type: String,
      maxlength: [200, 'Dispute reason cannot exceed 200 characters'],
    },
    description: {
      type: String,
      maxlength: [1000, 'Dispute description cannot exceed 1000 characters'],
    },
    evidence: [
      {
        type: String,
        validate: {
          validator: function (_this: JobDocument, url: string) {
            const urlRegex = /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp|pdf|doc|docx)$/i;
            return urlRegex.test(url);
          },
          message: 'Please provide a valid file URL',
        },
      },
    ],
    status: {
      type: String,
      enum: {
        values: ['pending', 'investigating', 'resolved', 'closed'],
        message: 'Invalid dispute status',
      },
      default: 'pending',
    },
    resolution: {
      type: String,
      maxlength: [1000, 'Dispute resolution cannot exceed 1000 characters'],
    },
    resolvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    resolvedAt: Date,
    createdAt: Date,
  },
  { _id: false }
);

export const PartyRatingSchema = new Schema(
  {
    rating: {
      type: Number,
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot exceed 5'],
    },
    review: {
      type: String,
      maxlength: [500, 'Review cannot exceed 500 characters'],
    },
    categories: {
      communication: { type: Number, min: 1, max: 5 },
      quality: { type: Number, min: 1, max: 5 },
      timeliness: { type: Number, min: 1, max: 5 },
      professionalism: { type: Number, min: 1, max: 5 },
    },
    ratedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    ratedAt: Date,
  },
  { _id: false }
);

export const CompletionSchema = new Schema(
  {
    markedDoneBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    markedDoneAt: Date,
    completionNotes: {
      type: String,
      maxlength: [1000, 'Completion notes cannot exceed 1000 characters'],
    },
    beforeImages: [
      {
        type: String,
        validate: {
          validator: function (_this: JobDocument, url: string) {
            const urlRegex = /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i;
            return urlRegex.test(url);
          },
          message: 'Please provide a valid image URL',
        },
      },
    ],
    afterImages: [
      {
        type: String,
        validate: {
          validator: function (_this: JobDocument, url: string) {
            const urlRegex = /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i;
            return urlRegex.test(url);
          },
          message: 'Please provide a valid image URL',
        },
      },
    ],
    confirmedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    confirmedAt: Date,
    rating: {
      type: Number,
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot exceed 5'],
    },
    review: {
      type: String,
      maxlength: [1000, 'Review cannot exceed 1000 characters'],
    },
    reviewReply: {
      type: String,
      maxlength: [500, 'Review reply cannot exceed 500 characters'],
    },
    fixerRating: PartyRatingSchema,
    hirerRating: PartyRatingSchema,
    reviewStatus: {
      type: String,
      enum: {
        values: ['pending', 'partial', 'completed', 'expired'],
        message: 'Invalid review status',
      },
      default: 'pending',
    },
    messagingClosed: {
      type: Boolean,
      default: false,
    },
    messagingClosedAt: Date,
    reviewMessagesSent: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

export const CancellationSchema = new Schema(
  {
    cancelled: {
      type: Boolean,
      default: false,
    },
    cancelledBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    reason: {
      type: String,
      maxlength: [500, 'Cancellation reason cannot exceed 500 characters'],
    },
    cancelledAt: Date,
    refundAmount: {
      type: Number,
      min: [0, 'Refund amount cannot be negative'],
    },
  },
  { _id: false }
);
