import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  // Authentication IDs
  uid: {
    type: String,
    unique: true,
    sparse: true // For Firebase users
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true // For Google OAuth users
  },
  
  // Basic Info
  name: {
    type: String,
    required: true,
    trim: true
  },
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: /^[a-zA-Z0-9_]+$/
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  phone: {
    type: String,
    required: true,
    match: /^(\+91)?[6-9]\d{9}$/ // Updated for Indian numbers
  },
  passwordHash: {
  type: String,
  required: function() {
    return this.authMethod === 'email' && !this.uid && !this.googleId;
  },
  select: false  // ← Add this line - excludes from queries by default
  },
  
  // Authentication
  authMethod: {
    type: String,
    enum: ['email', 'phone', 'google', 'firebase'],
    required: true,
    default: 'email'
  },
  providers: [{
    type: String,
    enum: ['email', 'phone', 'google', 'firebase']
  }],
  
  // Role & Status
  role: {
    type: String,
    enum: ['hirer', 'fixer', 'admin'],
    required: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  phoneVerified: {
    type: Boolean,
    default: false
  },
  banned: {
    type: Boolean,
    default: false
  },
  bannedReason: String,
  
  // Location
  location: {
    city: {
      type: String,
      required: true
    },
    state: {
      type: String,
      required: true
    },
    lat: Number,
    lng: Number
  },
  
  // Profile
  profilePhoto: {
    type: String,
    default: '/default-avatar.png'
  },
  picture: {
    type: String,
    default: null // For Google profile pictures
  },
  bio: {
    type: String,
    maxLength: 500,
    default: ''
  },
  website: {
    type: String,
    default: ''
  },
  experience: {
    type: String,
    default: ''
  },
  
  // Fixer-specific fields
  skills: [{
    type: String,
    trim: true
  }],
  availableNow: {
    type: Boolean,
    default: true
  },
  serviceRadius: {
    type: Number,
    default: 10, // kilometers
    min: 1,
    max: 100
  },
  hourlyRate: {
    type: Number,
    default: null
  },
  minimumJobValue: {
    type: Number,
    default: null
  },
  maximumJobValue: {
    type: Number,
    default: null
  },
  responseTime: {
    type: String,
    default: '1' // hours
  },
  workingHours: {
    start: {
      type: String,
      default: '09:00'
    },
    end: {
      type: String,
      default: '18:00'
    }
  },
  workingDays: {
    type: [String],
    default: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
  },
  autoApply: {
    type: Boolean,
    default: false
  },
  emergencyAvailable: {
    type: Boolean,
    default: false
  },
  
  // Portfolio for fixers
  portfolio: [{
    title: String,
    description: String,
    images: [String],
    completedAt: Date,
    category: String,
    url: String // For portfolio URLs
  }],
  
  // Privacy settings
  privacy: {
    profileVisibility: {
      type: String,
      enum: ['public', 'verified', 'private'],
      default: 'public'
    },
    showPhone: {
      type: Boolean,
      default: true
    },
    showEmail: {
      type: Boolean,
      default: false
    },
    showLocation: {
      type: Boolean,
      default: true
    },
    showRating: {
      type: Boolean,
      default: true
    },
    allowReviews: {
      type: Boolean,
      default: true
    },
    allowMessages: {
      type: Boolean,
      default: true
    },
    dataSharingConsent: {
      type: Boolean,
      default: false
    }
  },
  
  // App preferences
  preferences: {
    // App settings
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'light'
    },
    language: {
      type: String,
      default: 'en'
    },
    currency: {
      type: String,
      default: 'INR'
    },
    timezone: {
      type: String,
      default: 'Asia/Kolkata'
    },
    mapProvider: {
      type: String,
      default: 'google'
    },
    defaultView: {
      type: String,
      enum: ['list', 'grid'],
      default: 'list'
    },
    
    // Notification preferences
    emailNotifications: {
      type: Boolean,
      default: true
    },
    smsNotifications: {
      type: Boolean,
      default: false
    },
    pushNotifications: {
      type: Boolean,
      default: true
    },
    jobApplications: {
      type: Boolean,
      default: true
    },
    jobUpdates: {
      type: Boolean,
      default: true
    },
    paymentUpdates: {
      type: Boolean,
      default: true
    },
    marketing: {
      type: Boolean,
      default: false
    },
    newsletter: {
      type: Boolean,
      default: true
    },
    weeklyDigest: {
      type: Boolean,
      default: true
    },
    instantAlerts: {
      type: Boolean,
      default: false
    },
    jobAlerts: {
      type: Boolean,
      default: true
    },
    marketingEmails: {
      type: Boolean,
      default: false
    }
  },
  
  // Subscription & Payments
  plan: {
    type: {
      type: String,
      enum: ['free', 'pro'],
      default: 'free'
    },
    startDate: Date,
    endDate: Date,
    status: {
      type: String,
      enum: ['active', 'expired', 'cancelled'],
      default: 'active'
    },
    paymentId: String,
    creditsUsed: {
      type: Number,
      default: 0
    }
  },
  
  // Job limits for hirers
  lastJobPostedAt: Date,
  jobsPosted: {
    type: Number,
    default: 0
  },
  
  // Stats
  jobsCompleted: {
    type: Number,
    default: 0
  },
  totalEarnings: {
    type: Number,
    default: 0
  },
  rating: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0
    }
  },
  
  // Badges
  badges: [{
    type: String,
    enum: ['top_rated', 'fast_response', 'verified', 'new_fixer', 'experienced', 'reliable']
  }],
  
  // Notifications
  notifications: [{
    type: {
      type: String,
      enum: ['job_applied', 'job_accepted', 'job_completed', 'payment_due', 'review_received', 'dispute_opened', 'settings_updated', 'privacy_updated', 'welcome']
    },
    title: String,
    message: String,
    read: {
      type: Boolean,
      default: false
    },
    data: mongoose.Schema.Types.Mixed,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Account status
  deletedAt: Date,
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Updated indexes for better query performance
userSchema.index({ role: 1 });
userSchema.index({ 'location.city': 1, role: 1 });
userSchema.index({ skills: 1, role: 1 });
userSchema.index({ availableNow: 1, role: 1 });
userSchema.index({ banned: 1 });
userSchema.index({ 'plan.type': 1, 'plan.status': 1 });
userSchema.index({ phone: 1 });
userSchema.index({ isActive: 1, deletedAt: 1 });
userSchema.index({ authMethod: 1 }); // New
userSchema.index({ providers: 1 }); // New

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return this.name;
});

// Method to check if user can post a job (6-hour limit)
userSchema.methods.canPostJob = function() {
  if (!this.lastJobPostedAt) return true;
  const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
  return this.lastJobPostedAt < sixHoursAgo;
};

// Method to check if fixer can apply to jobs
userSchema.methods.canApplyToJob = function() {
  if (this.role !== 'fixer') return false;
  if (this.banned) return false;
  if (this.plan.type === 'pro' && this.plan.status === 'active') return true;
  return this.plan.creditsUsed < 3;
};

// Method to add notification
userSchema.methods.addNotification = function(type, title, message, data = {}) {
  this.notifications.unshift({
    type,
    title,
    message,
    data,
    createdAt: new Date()
  });
  
  // Keep only last 50 notifications
  if (this.notifications.length > 50) {
    this.notifications = this.notifications.slice(0, 50);
  }
  
  return this.save();
};

// Method to calculate average rating
userSchema.methods.updateRating = function(newRating) {
  const currentTotal = this.rating.average * this.rating.count;
  this.rating.count += 1;
  this.rating.average = (currentTotal + newRating) / this.rating.count;
  this.rating.average = Math.round(this.rating.average * 10) / 10; // Round to 1 decimal
  return this.save();
};

// NEW: Method to link Google account
userSchema.methods.linkGoogleAccount = function(googleId, picture) {
  this.googleId = googleId;
  this.picture = picture || this.profilePhoto;
  this.emailVerified = true;
  this.isVerified = true;
  this.authMethod = 'google';
  
  if (!this.providers.includes('google')) {
    this.providers.push('google');
  }
  
  return this.save();
};

// Method to update badges based on performance
userSchema.methods.updateBadges = function() {
  const badges = [];
  
  // Rating-based badges
  if (this.rating.average >= 4.5 && this.rating.count >= 10) {
    badges.push('top_rated');
  }
  
  // Experience-based badges
  if (this.jobsCompleted >= 50) {
    badges.push('experienced');
  } else if (this.jobsCompleted <= 3) {
    badges.push('new_fixer');
  }
  
  // Verification badge
  if (this.isVerified) {
    badges.push('verified');
  }
  
  // Reliability badge (completion rate > 90%)
  if (this.jobsCompleted >= 10 && this.rating.average >= 4.0) {
    badges.push('reliable');
  }
  
  this.badges = badges;
  return this.save();
};

// Static method to find fixers by location and skills
userSchema.statics.findNearbyFixers = function(city, skills = [], radius = 10) {
  const query = {
    role: 'fixer',
    banned: false,
    availableNow: true,
    isActive: true,
    deletedAt: { $exists: false },
    'location.city': new RegExp(city, 'i')
  };
  
  if (skills.length > 0) {
    query.skills = { $in: skills };
  }
  
  return this.find(query).sort({ 'rating.average': -1, jobsCompleted: -1 });
};

// NEW: Static method to find by Google ID
userSchema.statics.findByGoogleId = function(googleId) {
  return this.findOne({ googleId });
};

// NEW: Static method to find by email or Google ID
userSchema.statics.findByEmailOrGoogleId = function(email, googleId) {
  const query = { email: email.toLowerCase() };
  if (googleId) {
    query.$or = [
      { email: email.toLowerCase() },
      { googleId }
    ];
  }
  return this.findOne(query);
};

// Pre-save middleware
userSchema.pre('save', function(next) {
  // Ensure phone number is properly formatted
  if (this.phone && !this.phone.startsWith('+')) {
    this.phone = '+91' + this.phone.replace(/[^\d]/g, '');
  }
  
  // Convert skills to lowercase
  if (this.skills) {
    this.skills = this.skills.map(skill => skill.toLowerCase().trim());
  }
  
  next();
});

// Post-save middleware to update badges
userSchema.post('save', function(doc) {
  if (doc.role === 'fixer' && doc.isModified('rating')) {
    doc.updateBadges();
  }
});

export default mongoose.models.User || mongoose.model('User', userSchema);