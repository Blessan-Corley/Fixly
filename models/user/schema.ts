import { Schema } from 'mongoose';

import type { IUser } from '../../types/User';
import type { IUserModel } from './types';

export const userSchema = new Schema<IUser, IUserModel>(
  {
    // Authentication IDs
    uid: { type: String, unique: true, sparse: true },
    googleId: { type: String, unique: true, sparse: true },
    firebaseUid: { type: String, unique: true, sparse: true },

    // Basic Info
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },
    username: {
      type: String,
      required: [true, 'Username is required'],
      trim: true,
      lowercase: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [20, 'Username cannot exceed 20 characters'],
      validate: {
        validator: function (username: string) {
          if (!username) return false;
          if (!/^[a-z0-9_]+$/.test(username)) return false;
          if (username.startsWith('_') || username.endsWith('_')) return false;
          if (username.includes('__')) return false;
          if (/^\d+$/.test(username)) return false;
          const reserved = [
            'admin', 'administrator', 'root', 'system', 'support', 'help',
            'api', 'www', 'mail', 'email', 'fixly', 'user', 'users', 'profile',
            'dashboard', 'settings', 'auth', 'login', 'signup', 'test', 'demo',
            'temp', 'sample', 'null', 'undefined',
          ];
          return !reserved.includes(username);
        },
        message: 'Invalid username format or reserved word',
      },
    },
    usernameChangeCount: { type: Number, default: 0, max: 3 },
    lastUsernameChange: Date,
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      validate: {
        validator: (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
        message: 'Please enter a valid email address',
      },
    },
    phone: {
      type: String,
      unique: true,
      sparse: true,
      required: function (this: IUser) {
        return this.authMethod === 'email' || this.authMethod === 'phone';
      },
      validate: {
        validator: function (this: IUser, phone: string) {
          if (!phone) return this.authMethod !== 'email';
          const { env } = require('../../lib/env') as { env: { NODE_ENV: string } };
          if (env.NODE_ENV === 'development') return true;
          const cleanPhone = phone.replace(/[^\d+]/g, '');
          return /^(\+91[6-9]\d{9}|[6-9]\d{9})$/.test(cleanPhone);
        },
        message: 'Please enter a valid Indian phone number',
      },
    },
    passwordHash: {
      type: String,
      required: function (this: IUser) {
        return this.authMethod === 'email' && !this.uid && !this.googleId;
      },
      select: false,
    },
    authMethod: {
      type: String,
      enum: ['email', 'google', 'phone'],
      required: true,
      default: 'email',
    },
    providers: [{ type: String, enum: ['email', 'google', 'phone'] }],
    role: {
      type: String,
      enum: ['hirer', 'fixer', 'admin'],
      required: function (this: IUser) { return this.isRegistered === true; },
    },
    isRegistered: { type: Boolean, default: false },
    isVerified: { type: Boolean, default: false },
    verifiedAt: Date,
    emailVerified: { type: Boolean, default: false },
    phoneVerified: { type: Boolean, default: false },
    banned: { type: Boolean, default: false },
    suspended: { type: Boolean, default: false },
    suspendedAt: Date,
    suspendedReason: String,
    banDetails: {
      reason: String,
      description: String,
      type: { type: String, enum: ['temporary', 'permanent'] },
      duration: Number,
      bannedAt: Date,
      expiresAt: Date,
      bannedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      previousBans: [],
    },
    location: {
      coordinates: { latitude: Number, longitude: Number },
      address: String,
      city: String,
      state: String,
      accuracy: Number,
      timestamp: Date,
      source: { type: String, enum: ['gps', 'manual', 'home', 'network'] },
      homeAddress: {
        doorNo: String, street: String, district: String, state: String,
        postalCode: String, formattedAddress: String,
        coordinates: { latitude: Number, longitude: Number },
        setAt: Date,
      },
    },
    locationHistory: [
      {
        coordinates: { latitude: Number, longitude: Number },
        address: String, city: String, state: String,
        source: { type: String, enum: ['gps', 'manual', 'home', 'network'] },
        accuracy: Number, timestamp: Date,
        deviceInfo: { type: String, userAgent: String },
      },
    ],
    lastLocationUpdate: Date,
    profilePhoto: {
      url: String, cloudinaryPublicId: String, lastUpdated: Date,
      originalName: String, fileSize: Number,
      dimensions: { width: Number, height: Number },
    },
    picture: String,
    bio: { type: String, maxlength: [500, 'Bio must be less than 500 characters'] },
    website: String,
    experience: String,
    skills: [String],
    availableNow: { type: Boolean, default: true },
    serviceRadius: { type: Number, default: 10 },
    hourlyRate: Number,
    minimumJobValue: Number,
    maximumJobValue: Number,
    responseTime: String,
    workingHours: { start: String, end: String },
    workingDays: [String],
    autoApply: { type: Boolean, default: false },
    emergencyAvailable: { type: Boolean, default: false },
    portfolio: [Schema.Types.Mixed],
    savedJobs: [{ type: Schema.Types.ObjectId, ref: 'Job' }],
    privacy: {
      profileVisibility: { type: String, default: 'public' },
      showPhone: { type: Boolean, default: true },
      showEmail: { type: Boolean, default: false },
      showLocation: { type: Boolean, default: true },
      showRating: { type: Boolean, default: true },
      allowReviews: { type: Boolean, default: true },
      allowMessages: { type: Boolean, default: true },
      dataSharingConsent: { type: Boolean, default: false },
    },
    preferences: {
      theme: { type: String, default: 'light' },
      language: { type: String, default: 'en' },
      currency: { type: String, default: 'INR' },
      timezone: { type: String, default: 'Asia/Kolkata' },
      mapProvider: { type: String, default: 'google' },
      defaultView: { type: String, default: 'list' },
      emailNotifications: { type: Boolean, default: true },
      smsNotifications: { type: Boolean, default: false },
      pushNotifications: { type: Boolean, default: true },
      browserNotifications: { type: Boolean, default: false },
      jobApplications: { type: Boolean, default: true },
      jobUpdates: { type: Boolean, default: true },
      paymentUpdates: { type: Boolean, default: true },
      marketing: { type: Boolean, default: false },
      newsletter: { type: Boolean, default: true },
      weeklyDigest: { type: Boolean, default: true },
      instantAlerts: { type: Boolean, default: false },
      jobAlerts: { type: Boolean, default: true },
      marketingEmails: { type: Boolean, default: false },
    },
    plan: {
      type: { type: String, enum: ['free', 'pro'], default: 'free' },
      startDate: Date, endDate: Date,
      status: { type: String, enum: ['active', 'expired', 'cancelled', 'none'], default: 'none' },
      stripeCustomerId: String, stripeSubscriptionId: String,
      activatedAt: Date, paymentId: String,
      creditsUsed: { type: Number, default: 0 },
      subscribedAt: Date, expiresAt: Date,
      billingCycle: { type: String, enum: ['monthly', 'quarterly', 'yearly'] },
      amount: Number, features: [String], cancelledAt: Date,
    },
    pendingOrder: {
      orderId: String, sessionId: String, amount: Number, plan: String, planId: String,
      status: { type: String, enum: ['pending', 'processing', 'completed', 'failed'] },
      createdAt: Date,
    },
    jobsPosted: { type: Number, default: 0 },
    lastJobPostedAt: Date,
    jobsCompleted: { type: Number, default: 0 },
    totalEarnings: { type: Number, default: 0 },
    rating: {
      average: { type: Number, default: 0 },
      count: { type: Number, default: 0 },
      distribution: { type: Map, of: Number, default: {} },
    },
    notifications: [
      {
        type: { type: String },
        title: String, message: String,
        data: Schema.Types.Mixed,
        read: { type: Boolean, default: false },
        createdAt: { type: Date, default: Date.now },
        readAt: Date,
      },
    ],
    badges: [
      {
        type: String,
        enum: ['top_rated', 'fast_response', 'verified', 'new_fixer', 'experienced', 'reliable'],
      },
    ],
    verification: {
      status: { type: String, enum: ['none', 'pending', 'approved', 'rejected'], default: 'none' },
      documentType: String,
      documents: [
        {
          originalName: String, cloudinaryUrl: String, cloudinaryPublicId: String,
          fileType: String, fileSize: Number, uploadedAt: Date,
        },
      ],
      additionalInfo: String, submittedAt: Date, lastApplicationDate: Date,
      applicationId: String, rejectionReason: String, reviewedAt: Date,
      reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      otp: {
        code: String, expiresAt: Date, attempts: Number, lastSentAt: Date, purpose: String,
      },
    },
    isActive: { type: Boolean, default: true },
    deletedAt: Date, lastLoginAt: Date, lastActivityAt: Date,
    emailVerifiedAt: Date, phoneVerifiedAt: Date, profileCompletedAt: Date,
    registrationMetadata: {
      deviceInfo: { type: String, os: String, browser: String, userAgent: String },
      ip: String, timestamp: Date, source: String,
    },
  },
  { timestamps: true }
);
