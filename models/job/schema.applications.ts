import { Schema } from 'mongoose';

export const ApplicationSchema = new Schema(
  {
    fixer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Fixer is required'],
    },
    proposedAmount: {
      type: Number,
      required: [true, 'Proposed amount is required'],
      min: [0, 'Proposed amount cannot be negative'],
      max: [1000000, 'Proposed amount cannot exceed â‚¹10,00,000'],
    },
    priceVariance: {
      type: Number,
      default: 0,
    },
    priceVariancePercentage: {
      type: Number,
      default: 0,
    },
    negotiationNotes: {
      type: String,
      maxlength: [500, 'Negotiation notes cannot exceed 500 characters'],
      trim: true,
    },
    timeEstimate: {
      value: {
        type: Number,
        required: [true, 'Time estimate is required'],
        min: [1, 'Time estimate must be at least 1'],
        max: [365, 'Time estimate cannot exceed 365'],
      },
      unit: {
        type: String,
        enum: {
          values: ['hours', 'days', 'weeks'],
          message: 'Invalid time unit',
        },
        default: 'hours',
      },
    },
    materialsList: [
      {
        item: {
          type: String,
          required: [true, 'Material item is required'],
          maxlength: [100, 'Material item cannot exceed 100 characters'],
        },
        quantity: {
          type: Number,
          required: [true, 'Quantity is required'],
          min: [1, 'Quantity must be at least 1'],
        },
        estimatedCost: {
          type: Number,
          min: [0, 'Estimated cost cannot be negative'],
          max: [100000, 'Estimated cost cannot exceed â‚¹1,00,000'],
        },
      },
    ],
    description: {
      type: String,
      maxlength: [600, 'Description cannot exceed 600 characters'],
    },
    materialsIncluded: {
      type: Boolean,
      default: false,
    },
    requirements: {
      type: String,
      maxlength: [500, 'Requirements cannot exceed 500 characters'],
    },
    specialNotes: {
      type: String,
      maxlength: [300, 'Special notes cannot exceed 300 characters'],
    },
    status: {
      type: String,
      enum: {
        values: ['pending', 'accepted', 'rejected', 'withdrawn'],
        message: 'Invalid application status',
      },
      default: 'pending',
    },
    appliedAt: {
      type: Date,
      default: Date.now,
    },
    reviewedAt: Date,
    acceptedAt: Date,
    rejectedAt: Date,
    withdrawnAt: Date,
  },
  { _id: true }
);

export const jobApplicationsField = [ApplicationSchema];
