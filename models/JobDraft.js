// models/JobDraft.js - Job Draft Schema for Auto-save and Manual Save Functionality
import mongoose from 'mongoose';

const jobDraftSchema = new mongoose.Schema({
  // Basic Draft Info
  title: {
    type: String,
    trim: true,
    maxlength: [30, 'Job title cannot exceed 30 characters'],
    default: ''
  },
  description: {
    type: String,
    trim: true,
    maxlength: [2000, 'Job description cannot exceed 2000 characters'],
    default: ''
  },

  // Skills & Requirements
  skillsRequired: [{
    type: String,
    trim: true,
    lowercase: true,
    validate: {
      validator: function(skill) {
        return skill.length >= 2 && skill.length <= 50;
      },
      message: 'Skill must be between 2 and 50 characters'
    }
  }],

  // Budget & Payment
  budget: {
    type: {
      type: String,
      enum: ['fixed', 'negotiable', 'hourly'],
      default: 'negotiable'
    },
    amount: {
      type: Number,
      min: [0, 'Budget amount cannot be negative'],
      max: [1000000, 'Budget amount cannot exceed ₹10,00,000']
    },
    currency: {
      type: String,
      default: 'INR',
      enum: ['INR', 'USD']
    }
  },

  // Location
  location: {
    address: {
      type: String,
      trim: true,
      maxlength: [200, 'Address cannot exceed 200 characters'],
      default: ''
    },
    city: {
      type: String,
      trim: true,
      maxlength: [50, 'City name cannot exceed 50 characters'],
      default: ''
    },
    state: {
      type: String,
      trim: true,
      maxlength: [50, 'State name cannot exceed 50 characters'],
      default: ''
    },
    pincode: {
      type: String,
      match: [/^[0-9]{6}$/, 'Invalid pincode format (6 digits)']
    },
    lat: {
      type: Number,
      min: [-90, 'Invalid latitude'],
      max: [90, 'Invalid latitude']
    },
    lng: {
      type: Number,
      min: [-180, 'Invalid longitude'],
      max: [180, 'Invalid longitude']
    }
  },

  // Timing
  deadline: {
    type: Date,
    validate: {
      validator: function(date) {
        return !date || date > new Date();
      },
      message: 'Deadline must be in the future'
    }
  },
  scheduledDate: {
    type: Date,
    validate: {
      validator: function(date) {
        return !date || date > new Date();
      },
      message: 'Scheduled date must be in the future'
    }
  },
  urgency: {
    type: String,
    enum: ['asap', 'flexible', 'scheduled'],
    default: 'flexible'
  },

  // Media & Attachments (Cloudinary URLs)
  attachments: [{
    id: {
      type: String,
      required: [true, 'Attachment ID is required']
    },
    url: {
      type: String,
      required: [true, 'Attachment URL is required']
    },
    publicId: {
      type: String,
      required: [true, 'Cloudinary public ID is required']
    },
    filename: {
      type: String,
      required: [true, 'Filename is required'],
      maxlength: [100, 'Filename cannot exceed 100 characters']
    },
    type: {
      type: String,
      required: [true, 'File type is required']
    },
    size: {
      type: Number,
      required: [true, 'File size is required'],
      min: [0, 'File size cannot be negative']
    },
    isImage: {
      type: Boolean,
      required: [true, 'Image flag is required']
    },
    isVideo: {
      type: Boolean,
      required: [true, 'Video flag is required']
    },
    width: Number,
    height: Number,
    duration: Number, // For videos
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Draft Metadata
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Draft creator is required']
  },

  // Draft Management
  draftStatus: {
    type: String,
    enum: ['active', 'auto_saved', 'manually_saved', 'abandoned'],
    default: 'active'
  },

  // Step Tracking
  currentStep: {
    type: Number,
    min: 1,
    max: 4,
    default: 1
  },
  completedSteps: [{
    step: {
      type: Number,
      min: 1,
      max: 4,
      required: true
    },
    completedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Save History
  saveHistory: [{
    saveType: {
      type: String,
      enum: ['auto', 'manual', 'step_change'],
      required: true
    },
    step: {
      type: Number,
      min: 1,
      max: 4,
      required: true
    },
    savedAt: {
      type: Date,
      default: Date.now
    },
    dataSnapshot: {
      type: mongoose.Schema.Types.Mixed // Store the form data at time of save
    }
  }],

  // Auto-save tracking
  lastAutoSave: {
    type: Date,
    default: Date.now
  },
  autoSaveCount: {
    type: Number,
    default: 0
  },

  // Manual save tracking
  lastManualSave: {
    type: Date
  },
  manualSaveCount: {
    type: Number,
    default: 0
  },

  // Interaction tracking
  lastActivity: {
    type: Date,
    default: Date.now
  },
  totalTimeSpent: {
    type: Number, // in milliseconds
    default: 0
  },
  interactionCount: {
    type: Number,
    default: 0
  },

  // Validation Status
  validationStatus: {
    step1: {
      isValid: { type: Boolean, default: false },
      errors: [String],
      lastChecked: Date
    },
    step2: {
      isValid: { type: Boolean, default: false },
      errors: [String],
      lastChecked: Date
    },
    step3: {
      isValid: { type: Boolean, default: false },
      errors: [String],
      lastChecked: Date
    },
    step4: {
      isValid: { type: Boolean, default: false },
      errors: [String],
      lastChecked: Date
    }
  },

  // Completion tracking
  completionPercentage: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  estimatedCompletionTime: {
    type: Number, // in minutes
    default: 0
  },

  // Conversion tracking (when draft becomes a job)
  convertedToJob: {
    type: Boolean,
    default: false
  },
  convertedJobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job'
  },
  convertedAt: {
    type: Date
  },

  // Expiry and cleanup
  expiresAt: {
    type: Date,
    default: function() {
      // Auto-delete after 14 days if not converted
      return new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    },
    index: { expireAfterSeconds: 0 } // MongoDB TTL index
  }

}, {
  timestamps: true, // adds createdAt and updatedAt
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
jobDraftSchema.index({ createdBy: 1, draftStatus: 1 });
jobDraftSchema.index({ lastActivity: -1 });
jobDraftSchema.index({ expiresAt: 1 }); // TTL index
jobDraftSchema.index({ convertedToJob: 1 });
jobDraftSchema.index({ createdBy: 1, createdAt: -1 });
jobDraftSchema.index({ draftStatus: 1, lastActivity: -1 });

// Virtual for age in hours
jobDraftSchema.virtual('ageInHours').get(function() {
  const now = new Date();
  const created = new Date(this.createdAt);
  const diff = now - created;
  return Math.floor(diff / (1000 * 60 * 60));
});

// Virtual for time until expiry
jobDraftSchema.virtual('hoursUntilExpiry').get(function() {
  const now = new Date();
  const expires = new Date(this.expiresAt);
  const diff = expires - now;
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60)));
});

// Virtual for is expired
jobDraftSchema.virtual('isExpired').get(function() {
  return new Date() > this.expiresAt;
});

// Virtual for photo count
jobDraftSchema.virtual('photoCount').get(function() {
  return this.attachments.filter(att => att.isImage).length;
});

// Virtual for video count
jobDraftSchema.virtual('videoCount').get(function() {
  return this.attachments.filter(att => att.isVideo).length;
});

// Method to update activity timestamp
jobDraftSchema.methods.updateActivity = function() {
  this.lastActivity = new Date();
  this.interactionCount += 1;
  return this.save();
};

// Method to add auto-save record
jobDraftSchema.methods.addAutoSave = function(step, dataSnapshot) {
  this.saveHistory.push({
    saveType: 'auto',
    step: step,
    savedAt: new Date(),
    dataSnapshot: dataSnapshot
  });

  this.lastAutoSave = new Date();
  this.autoSaveCount += 1;
  this.lastActivity = new Date();

  // Keep only last 50 saves
  if (this.saveHistory.length > 50) {
    this.saveHistory = this.saveHistory.slice(-50);
  }

  return this.save();
};

// Method to add manual save record
jobDraftSchema.methods.addManualSave = function(step, dataSnapshot) {
  this.saveHistory.push({
    saveType: 'manual',
    step: step,
    savedAt: new Date(),
    dataSnapshot: dataSnapshot
  });

  this.lastManualSave = new Date();
  this.manualSaveCount += 1;
  this.lastActivity = new Date();
  this.draftStatus = 'manually_saved';

  // Keep only last 50 saves
  if (this.saveHistory.length > 50) {
    this.saveHistory = this.saveHistory.slice(-50);
  }

  return this.save();
};

// Method to update step completion
jobDraftSchema.methods.updateStepCompletion = function(step) {
  const existingStep = this.completedSteps.find(s => s.step === step);
  if (!existingStep) {
    this.completedSteps.push({
      step: step,
      completedAt: new Date()
    });
  }

  this.currentStep = Math.max(this.currentStep, step);
  this.lastActivity = new Date();

  // Calculate completion percentage
  this.completionPercentage = (this.completedSteps.length / 4) * 100;

  return this.save();
};

// Method to update validation status
jobDraftSchema.methods.updateValidationStatus = function(step, isValid, errors = []) {
  const stepKey = `step${step}`;
  if (this.validationStatus[stepKey]) {
    this.validationStatus[stepKey].isValid = isValid;
    this.validationStatus[stepKey].errors = errors;
    this.validationStatus[stepKey].lastChecked = new Date();
  }

  return this.save();
};

// Method to convert draft to job
jobDraftSchema.methods.convertToJob = function(jobId) {
  this.convertedToJob = true;
  this.convertedJobId = jobId;
  this.convertedAt = new Date();
  this.draftStatus = 'active'; // Mark as converted

  return this.save();
};

// Method to mark as abandoned
jobDraftSchema.methods.markAbandoned = function() {
  this.draftStatus = 'abandoned';
  this.lastActivity = new Date();

  return this.save();
};

// Method to extend expiry
jobDraftSchema.methods.extendExpiry = function(days = 7) {
  const newExpiry = new Date(this.expiresAt);
  newExpiry.setDate(newExpiry.getDate() + days);
  this.expiresAt = newExpiry;

  return this.save();
};

// Static method to find user's active drafts
jobDraftSchema.statics.findUserDrafts = function(userId, limit = 10) {
  return this.find({
    createdBy: userId,
    draftStatus: { $in: ['active', 'auto_saved', 'manually_saved'] },
    convertedToJob: false
  })
  .sort({ lastActivity: -1 })
  .limit(limit);
};

// Static method to find expired drafts for cleanup
jobDraftSchema.statics.findExpiredDrafts = function() {
  return this.find({
    expiresAt: { $lt: new Date() },
    convertedToJob: false
  });
};

// Static method to get draft analytics
jobDraftSchema.statics.getDraftAnalytics = function(userId) {
  return this.aggregate([
    { $match: { createdBy: mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: null,
        totalDrafts: { $sum: 1 },
        convertedDrafts: { $sum: { $cond: ['$convertedToJob', 1, 0] } },
        averageCompletionPercentage: { $avg: '$completionPercentage' },
        totalTimeSpent: { $sum: '$totalTimeSpent' },
        averageAutoSaves: { $avg: '$autoSaveCount' },
        averageManualSaves: { $avg: '$manualSaveCount' }
      }
    }
  ]);
};

// Pre-save middleware
jobDraftSchema.pre('save', function(next) {
  try {
    // Convert skills to lowercase
    if (this.skillsRequired) {
      this.skillsRequired = this.skillsRequired.map(skill => skill.toLowerCase().trim());
    }

    // Update completion percentage based on filled fields
    let completedFields = 0;
    const totalFields = 8; // title, description, skills, budget, location, deadline, urgency, attachments

    if (this.title && this.title.trim().length >= 10) completedFields++;
    if (this.description && this.description.trim().length >= 30) completedFields++;
    if (this.skillsRequired && this.skillsRequired.length > 0) completedFields++;
    if (this.budget && this.budget.type && (this.budget.type === 'negotiable' || this.budget.amount > 0)) completedFields++;
    if (this.location && this.location.address && this.location.city) completedFields++;
    if (this.deadline) completedFields++;
    if (this.urgency) completedFields++;
    if (this.attachments && this.attachments.filter(att => att.isImage).length > 0) completedFields++;

    this.completionPercentage = Math.round((completedFields / totalFields) * 100);

    next();
  } catch (error) {
    next(error);
  }
});

export default mongoose.models.JobDraft || mongoose.model('JobDraft', jobDraftSchema);