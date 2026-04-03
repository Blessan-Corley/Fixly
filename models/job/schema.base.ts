import mongoose from 'mongoose';

import type { AnyRecord, JobDocument } from './types';
import { attachmentDefinition } from './schema.attachment';
import { viewsDefinition, likesDefinition } from './schema.views';

export const jobBaseDefinition: AnyRecord = {
  title: {
    type: String,
    required: [true, 'Job title is required'],
    trim: true,
    minlength: [10, 'Job title must be at least 10 characters'],
    maxlength: [30, 'Job title cannot exceed 30 characters'],
  },
  description: {
    type: String,
    required: [true, 'Job description is required'],
    trim: true,
    minlength: [30, 'Job description must be at least 30 characters'],
    maxlength: [2000, 'Job description cannot exceed 2000 characters'],
  },
  type: {
    type: String,
    enum: {
      values: ['one-time', 'recurring', 'contract', 'project'],
      message: 'Invalid job type',
    },
    default: 'one-time',
  },
  urgency: {
    type: String,
    enum: {
      values: ['asap', 'flexible', 'scheduled'],
      message: 'Invalid urgency level',
    },
    default: 'flexible',
  },
  scheduledDate: {
    type: Date,
    required: function (this: JobDocument) {
      return this.urgency === 'scheduled';
    },
    validate: {
      validator: function (_this: JobDocument, date: Date | null | undefined) {
        return !date || date > new Date();
      },
      message: 'Scheduled date must be in the future',
    },
  },
  skillsRequired: [
    {
      type: String,
      required: [true, 'At least one skill is required'],
      trim: true,
      lowercase: true,
      validate: {
        validator: function (_this: JobDocument, skill: string) {
          return skill.length >= 2 && skill.length <= 50;
        },
        message: 'Skill must be between 2 and 50 characters',
      },
    },
  ],
  experienceLevel: {
    type: String,
    enum: {
      values: ['beginner', 'intermediate', 'expert'],
      message: 'Invalid experience level',
    },
    default: 'intermediate',
  },
  attachments: [attachmentDefinition],
  budget: {
    type: {
      type: String,
      enum: {
        values: ['fixed', 'negotiable', 'hourly'],
        message: 'Invalid budget type',
      },
      default: 'negotiable',
    },
    amount: {
      type: Number,
      min: [0, 'Budget amount cannot be negative'],
      max: [1000000, 'Budget amount cannot exceed â‚¹10,00,000'],
      validate: {
        validator: function (this: JobDocument, amount: number | null | undefined) {
          if (this.type === 'fixed' || this.type === 'hourly') {
            return typeof amount === 'number' && amount > 0;
          }
          return true;
        },
        message: 'Budget amount is required for fixed and hourly pricing',
      },
    },
    currency: {
      type: String,
      default: 'INR',
      enum: {
        values: ['INR', 'USD'],
        message: 'Invalid currency',
      },
    },
    materialsIncluded: {
      type: Boolean,
      default: false,
    },
  },
  location: {
    address: {
      type: String,
      required: [true, 'Address is required'],
      trim: true,
      maxlength: [200, 'Address cannot exceed 200 characters'],
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true,
      maxlength: [50, 'City name cannot exceed 50 characters'],
    },
    state: {
      type: String,
      required: [true, 'State is required'],
      trim: true,
      maxlength: [50, 'State name cannot exceed 50 characters'],
    },
    pincode: {
      type: String,
      match: [/^[0-9]{6}$/, 'Invalid pincode format (6 digits)'],
    },
    lat: {
      type: Number,
      min: [-90, 'Invalid latitude'],
      max: [90, 'Invalid latitude'],
    },
    lng: {
      type: Number,
      min: [-180, 'Invalid longitude'],
      max: [180, 'Invalid longitude'],
    },
  },
  deadline: {
    type: Date,
    required: function (this: JobDocument) {
      return this.urgency !== 'scheduled';
    },
    validate: {
      validator: function (this: JobDocument, date: Date | null | undefined) {
        if (!date && this.urgency === 'scheduled') return true;
        return !date || date > new Date();
      },
      message: 'Deadline must be in the future',
    },
  },
  status: {
    type: String,
    enum: {
      values: ['open', 'in_progress', 'completed', 'cancelled', 'disputed', 'expired'],
      message: 'Invalid job status',
    },
    default: 'open',
  },
  views: viewsDefinition,
  likes: likesDefinition,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Job creator is required'],
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  featured: {
    type: Boolean,
    default: false,
  },
  featuredUntil: {
    type: Date,
    validate: {
      validator: function (_this: JobDocument, date: Date | null | undefined) {
        return !date || date > new Date();
      },
      message: 'Featured until date must be in the future',
    },
  },
};
