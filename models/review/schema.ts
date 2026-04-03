import mongoose from 'mongoose';

import type { Review, ReviewMethods, ReviewModel } from './types';

export const ReviewSchema = new mongoose.Schema<Review, ReviewModel, ReviewMethods>(
  {
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      required: true,
    },
    reviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reviewee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reviewType: {
      type: String,
      enum: ['client_to_fixer', 'fixer_to_client'],
      required: true,
    },
    rating: {
      overall: {
        type: Number,
        required: true,
        min: 1,
        max: 5,
      },
      workQuality: { type: Number, min: 1, max: 5 },
      communication: { type: Number, min: 1, max: 5 },
      punctuality: { type: Number, min: 1, max: 5 },
      professionalism: { type: Number, min: 1, max: 5 },
      clarity: { type: Number, min: 1, max: 5 },
      responsiveness: { type: Number, min: 1, max: 5 },
      paymentTimeliness: { type: Number, min: 1, max: 5 },
    },
    title: {
      type: String,
      required: true,
      maxlength: 100,
      trim: true,
    },
    comment: {
      type: String,
      required: true,
      maxlength: 1000,
      trim: true,
    },
    pros: [
      {
        type: String,
        maxlength: 200,
        trim: true,
      },
    ],
    cons: [
      {
        type: String,
        maxlength: 200,
        trim: true,
      },
    ],
    wouldRecommend: {
      type: Boolean,
      default: true,
    },
    wouldHireAgain: {
      type: Boolean,
    },
    tags: [
      {
        type: String,
        enum: [
          'excellent_work',
          'on_time',
          'great_communication',
          'professional',
          'exceeded_expectations',
          'fair_price',
          'clean_work',
          'polite',
          'experienced',
          'reliable',
          'creative',
          'efficient',
          'poor_quality',
          'late',
          'unprofessional',
          'overpriced',
          'miscommunication',
          'incomplete',
          'rude',
          'inexperienced',
          'clear_requirements',
          'responsive',
          'fair_payment',
          'understanding',
          'flexible',
          'prompt_payment',
          'good_communication',
          'unclear_requirements',
          'unresponsive',
          'payment_issues',
          'unrealistic_expectations',
          'poor_communication',
          'changed_requirements',
          'delayed_payment',
        ],
      },
    ],
    attachments: [
      {
        type: {
          type: String,
          enum: ['image', 'document'],
        },
        url: String,
        filename: String,
        description: String,
      },
    ],
    isPublic: {
      type: Boolean,
      default: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verifiedAt: Date,
    response: {
      comment: {
        type: String,
        maxlength: 500,
        trim: true,
      },
      respondedAt: {
        type: Date,
      },
    },
    helpfulVotes: {
      count: {
        type: Number,
        default: 0,
      },
      users: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
      ],
    },
    reportedBy: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        reason: {
          type: String,
          enum: ['inappropriate', 'spam', 'false_review', 'personal_attack', 'other'],
        },
        description: String,
        reportedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    status: {
      type: String,
      enum: ['pending', 'published', 'hidden', 'removed'],
      default: 'pending',
    },
    moderationNotes: String,
    publishedAt: Date,
  },
  {
    timestamps: true,
  }
);
