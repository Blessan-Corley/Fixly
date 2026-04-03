import mongoose from 'mongoose';

import type {
  LocationPreference,
  LocationPreferenceMethods,
  LocationPreferenceModel,
} from './types';

export const locationPreferenceSchema = new mongoose.Schema<
  LocationPreference,
  LocationPreferenceModel,
  LocationPreferenceMethods
>(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    currentLocation: {
      lat: { type: Number, min: -90, max: 90, required: false },
      lng: { type: Number, min: -180, max: 180, required: false },
      accuracy: { type: Number, min: 0, required: false },
      address: { type: String, trim: true, maxlength: 200 },
      city: { type: String, trim: true, maxlength: 100 },
      state: { type: String, trim: true, maxlength: 100 },
      pincode: { type: String, trim: true, match: /^[0-9]{6}$/ },
    },
    preferences: {
      maxTravelDistance: { type: Number, min: 1, max: 100, default: 25 },
      preferredCities: [{ type: String, trim: true }],
      autoLocationEnabled: { type: Boolean, default: false },
      locationSharingConsent: { type: Boolean, default: false, required: true },
    },
    privacy: {
      shareExactLocation: { type: Boolean, default: false },
      shareApproximateLocation: { type: Boolean, default: true },
      trackLocationHistory: { type: Boolean, default: false },
    },
    locationHistory: [
      {
        lat: Number,
        lng: Number,
        timestamp: { type: Date, default: Date.now },
        accuracy: Number,
        source: { type: String, enum: ['gps', 'ip', 'manual'], default: 'gps' },
        address: String,
        city: String,
        state: String,
        pincode: String,
        isSignificantMove: { type: Boolean, default: false },
        distanceFromPrevious: Number,
      },
    ],
    recentLocations: [
      {
        lat: Number,
        lng: Number,
        city: String,
        state: String,
        timestamp: Date,
        usageCount: { type: Number, default: 1 },
      },
    ],
    lastUpdated: { type: Date, default: Date.now },
    lastLocationUpdate: { type: Date },
    ipLocation: {
      lat: Number,
      lng: Number,
      city: String,
      country: String,
      timestamp: Date,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);
