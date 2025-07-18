import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  // Basic Info
  uid: {
    type: String,
    unique: true,
    sparse: true // For Firebase users
  },
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
    match: /^[+]?[0-9\s\-()]+$/
  },
  passwordHash: {
    type: String,
    required: function() {
      return !this.uid; // Password required only for non-Firebase users
    }
  },
  
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
  photoURL: {
    type: String,
    default: '/default-avatar.png'
  },
  bio: {
    type: String,
    maxLength: 500
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
  workRadius: {
    type: Number,
    default: 10, // kilometers
    min: 1,
    max: 50
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
      enum: ['job_applied', 'job_accepted', 'job_completed', 'payment_due', 'review_received', 'dispute_opened']
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
  
  // Portfolio for fixers
  portfolio: [{
    title: String,
    description: String,
    images: [String],
    completedAt: Date,
    category: String
  }],
  
  // Preferences
  preferences: {
    emailNotifications: {
      type: Boolean,
      default: true
    },
    smsNotifications: {
      type: Boolean,
      default: true
    },
    jobAlerts: {
      type: Boolean,
      default: true
    },
    marketingEmails: {
      type: Boolean,
      default: false
    }
  }
}, {
  timestamps: true
});

// Indexes for better query performance
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ uid: 1 });
userSchema.index({ role: 1 });
userSchema.index({ 'location.city': 1, role: 1 });
userSchema.index({ skills: 1, role: 1 });
userSchema.index({ availableNow: 1, role: 1 });
userSchema.index({ banned: 1 });
userSchema.index({ 'plan.type': 1, 'plan.status': 1 });

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
    'location.city': new RegExp(city, 'i')
  };
  
  if (skills.length > 0) {
    query.skills = { $in: skills };
  }
  
  return this.find(query).sort({ 'rating.average': -1, jobsCompleted: -1 });
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