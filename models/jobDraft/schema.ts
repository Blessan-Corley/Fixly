import mongoose from 'mongoose';

import type { JobDraft, JobDraftModel, JobDraftMethods } from './types';

export const jobDraftSchema = new mongoose.Schema<JobDraft, JobDraftModel, JobDraftMethods>(
  {
    title: {
      type: String,
      trim: true,
      maxlength: [30, 'Job title cannot exceed 30 characters'],
      default: '',
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Job description cannot exceed 2000 characters'],
      default: '',
    },
    skillsRequired: [
      {
        type: String,
        trim: true,
        lowercase: true,
        validate: {
          validator: (skill: string) => skill.length >= 2 && skill.length <= 50,
          message: 'Skill must be between 2 and 50 characters',
        },
      },
    ],
    budget: {
      type: {
        type: String,
        enum: ['fixed', 'negotiable', 'hourly'],
        default: 'negotiable',
      },
      amount: {
        type: Number,
        min: [0, 'Budget amount cannot be negative'],
        max: [1000000, 'Budget amount cannot exceed ₹10,00,000'],
      },
      currency: { type: String, default: 'INR', enum: ['INR', 'USD'] },
    },
    location: {
      address: { type: String, trim: true, maxlength: [200, 'Address cannot exceed 200 characters'], default: '' },
      city: { type: String, trim: true, maxlength: [50, 'City name cannot exceed 50 characters'], default: '' },
      state: { type: String, trim: true, maxlength: [50, 'State name cannot exceed 50 characters'], default: '' },
      pincode: { type: String, match: [/^[0-9]{6}$/, 'Invalid pincode format (6 digits)'] },
      lat: { type: Number, min: [-90, 'Invalid latitude'], max: [90, 'Invalid latitude'] },
      lng: { type: Number, min: [-180, 'Invalid longitude'], max: [180, 'Invalid longitude'] },
    },
    deadline: {
      type: Date,
      validate: {
        validator: (date: Date) => !date || date > new Date(),
        message: 'Deadline must be in the future',
      },
    },
    scheduledDate: {
      type: Date,
      validate: {
        validator: (date: Date) => !date || date > new Date(),
        message: 'Scheduled date must be in the future',
      },
    },
    urgency: { type: String, enum: ['asap', 'flexible', 'scheduled'], default: 'flexible' },
    attachments: [
      {
        id: { type: String, required: [true, 'Attachment ID is required'] },
        url: { type: String, required: [true, 'Attachment URL is required'] },
        publicId: { type: String, required: [true, 'Cloudinary public ID is required'] },
        filename: { type: String, required: false, default: 'unknown', maxlength: [100, 'Filename cannot exceed 100 characters'] },
        type: { type: String, required: [true, 'File type is required'] },
        size: { type: Number, required: [true, 'File size is required'], min: [0, 'File size cannot be negative'] },
        isImage: { type: Boolean, required: [true, 'Image flag is required'] },
        isVideo: { type: Boolean, required: [true, 'Video flag is required'] },
        width: Number,
        height: Number,
        duration: Number,
        createdAt: { type: Date, default: Date.now },
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Draft creator is required'],
    },
    draftStatus: {
      type: String,
      enum: ['active', 'auto_saved', 'manually_saved', 'abandoned'],
      default: 'active',
    },
    currentStep: { type: Number, min: 1, max: 4, default: 1 },
    completedSteps: [
      {
        step: { type: Number, min: 1, max: 4, required: true },
        completedAt: { type: Date, default: Date.now },
      },
    ],
    saveHistory: [
      {
        saveType: { type: String, enum: ['auto', 'manual', 'step_change'], required: true },
        step: { type: Number, min: 1, max: 4, required: true },
        savedAt: { type: Date, default: Date.now },
        dataSnapshot: { type: mongoose.Schema.Types.Mixed },
      },
    ],
    lastAutoSave: { type: Date, default: Date.now },
    autoSaveCount: { type: Number, default: 0 },
    lastManualSave: { type: Date },
    manualSaveCount: { type: Number, default: 0 },
    lastActivity: { type: Date, default: Date.now },
    totalTimeSpent: { type: Number, default: 0 },
    interactionCount: { type: Number, default: 0 },
    validationStatus: {
      step1: { isValid: { type: Boolean, default: false }, errors: [String], lastChecked: Date },
      step2: { isValid: { type: Boolean, default: false }, errors: [String], lastChecked: Date },
      step3: { isValid: { type: Boolean, default: false }, errors: [String], lastChecked: Date },
      step4: { isValid: { type: Boolean, default: false }, errors: [String], lastChecked: Date },
    },
    completionPercentage: { type: Number, min: 0, max: 100, default: 0 },
    estimatedCompletionTime: { type: Number, default: 0 },
    convertedToJob: { type: Boolean, default: false },
    convertedJobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job' },
    convertedAt: { type: Date },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);
