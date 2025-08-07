import mongoose from 'mongoose';

const jobSchema = new mongoose.Schema({
  // Basic Info
  title: {
    type: String,
    required: [true, 'Job title is required'],
    trim: true,
    minlength: [10, 'Job title must be at least 10 characters'],
    maxlength: [100, 'Job title cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Job description is required'],
    trim: true,
    minlength: [30, 'Job description must be at least 30 characters'],
    maxlength: [2000, 'Job description cannot exceed 2000 characters']
  },
  
  // Job Type & Urgency
  type: {
    type: String,
    enum: {
      values: ['one-time', 'recurring'],
      message: 'Invalid job type'
    },
    default: 'one-time'
  },
  urgency: {
    type: String,
    enum: {
      values: ['asap', 'flexible', 'scheduled'],
      message: 'Invalid urgency level'
    },
    default: 'flexible'
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
  
  // Skills & Requirements
  skillsRequired: [{
    type: String,
    required: [true, 'At least one skill is required'],
    trim: true,
    lowercase: true,
    validate: {
      validator: function(skill) {
        return skill.length >= 2 && skill.length <= 50;
      },
      message: 'Skill must be between 2 and 50 characters'
    }
  }],
  experienceLevel: {
    type: String,
    enum: {
      values: ['beginner', 'intermediate', 'expert'],
      message: 'Invalid experience level'
    },
    default: 'intermediate'
  },
  
  // Media & Attachments
  attachments: [{
    url: {
      type: String,
      required: [true, 'Attachment URL is required'],
      validate: {
        validator: function(url) {
          const urlRegex = /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp|pdf|doc|docx)$/i;
          return urlRegex.test(url);
        },
        message: 'Please provide a valid file URL'
      }
    },
    filename: {
      type: String,
      required: [true, 'Filename is required'],
      maxlength: [100, 'Filename cannot exceed 100 characters']
    },
    fileType: {
      type: String,
      enum: {
        values: ['image', 'video', 'document'],
        message: 'Invalid file type'
      }
    },
    size: {
      type: Number,
      min: [0, 'File size cannot be negative'],
      max: [10 * 1024 * 1024, 'File size cannot exceed 10MB'] // 10MB limit
    }
  }],
  
  // Budget & Payment
  budget: {
    type: {
      type: String,
      enum: {
        values: ['fixed', 'negotiable', 'hourly'],
        message: 'Invalid budget type'
      },
      default: 'negotiable'
    },
    amount: {
      type: Number,
      min: [0, 'Budget amount cannot be negative'],
      max: [1000000, 'Budget amount cannot exceed ₹10,00,000'],
      validate: {
        validator: function(amount) {
          if (this.type === 'fixed' || this.type === 'hourly') {
            return amount > 0;
          }
          return true;
        },
        message: 'Budget amount is required for fixed and hourly pricing'
      }
    },
    currency: {
      type: String,
      default: 'INR',
      enum: {
        values: ['INR', 'USD'],
        message: 'Invalid currency'
      }
    },
    materialsIncluded: {
      type: Boolean,
      default: false
    }
  },
  
  // Location
  location: {
    address: {
      type: String,
      required: [true, 'Address is required'],
      trim: true,
      maxlength: [200, 'Address cannot exceed 200 characters']
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true,
      maxlength: [50, 'City name cannot exceed 50 characters']
    },
    state: {
      type: String,
      required: [true, 'State is required'],
      trim: true,
      maxlength: [50, 'State name cannot exceed 50 characters']
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
    required: [true, 'Deadline is required'],
    validate: {
      validator: function(date) {
        return date > new Date();
      },
      message: 'Deadline must be in the future'
    }
  },
  estimatedDuration: {
    value: {
      type: Number,
      min: [1, 'Duration must be at least 1'],
      max: [365, 'Duration cannot exceed 365']
    },
    unit: {
      type: String,
      enum: {
        values: ['hours', 'days', 'weeks'],
        message: 'Invalid duration unit'
      },
      default: 'hours'
    }
  },
  
  // Job Lifecycle
  status: {
    type: String,
    enum: {
      values: ['open', 'in_progress', 'completed', 'cancelled', 'disputed'],
      message: 'Invalid job status'
    },
    default: 'open'
  },
  
  // Relationships
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Job creator is required']
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  
  // Applications
  applications: [{
    fixer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Fixer is required']
    },
    proposedAmount: {
      type: Number,
      required: [true, 'Proposed amount is required'],
      min: [0, 'Proposed amount cannot be negative'],
      max: [1000000, 'Proposed amount cannot exceed ₹10,00,000']
    },
    timeEstimate: {
      value: {
        type: Number,
        required: [true, 'Time estimate is required'],
        min: [1, 'Time estimate must be at least 1'],
        max: [365, 'Time estimate cannot exceed 365']
      },
      unit: {
        type: String,
        enum: {
          values: ['hours', 'days', 'weeks'],
          message: 'Invalid time unit'
        },
        default: 'hours'
      }
    },
    materialsList: [{
      item: {
        type: String,
        required: [true, 'Material item is required'],
        maxlength: [100, 'Material item cannot exceed 100 characters']
      },
      quantity: {
        type: Number,
        required: [true, 'Quantity is required'],
        min: [1, 'Quantity must be at least 1']
      },
      estimatedCost: {
        type: Number,
        min: [0, 'Estimated cost cannot be negative'],
        max: [100000, 'Estimated cost cannot exceed ₹1,00,000']
      }
    }],
    coverLetter: {
      type: String,
      maxlength: [800, 'Cover letter cannot exceed 800 characters']
    },
    workPlan: {
      type: String,
      maxlength: [1500, 'Work plan cannot exceed 1500 characters']
    },
    materialsIncluded: {
      type: Boolean,
      default: false
    },
    requirements: {
      type: String,
      maxlength: [500, 'Requirements cannot exceed 500 characters']
    },
    specialNotes: {
      type: String,
      maxlength: [300, 'Special notes cannot exceed 300 characters']
    },
    status: {
      type: String,
      enum: {
        values: ['pending', 'accepted', 'rejected', 'withdrawn'],
        message: 'Invalid application status'
      },
      default: 'pending'
    },
    appliedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Messages
  messages: [{
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Message sender is required']
    },
    message: {
      type: String,
      required: [true, 'Message content is required'],
      trim: true,
      minlength: [1, 'Message cannot be empty'],
      maxlength: [1000, 'Message cannot exceed 1000 characters']
    },
    attachments: [{
      url: {
        type: String,
        required: [true, 'Attachment URL is required'],
        validate: {
          validator: function(url) {
            const urlRegex = /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp|pdf|doc|docx)$/i;
            return urlRegex.test(url);
          },
          message: 'Please provide a valid file URL'
        }
      },
      filename: {
        type: String,
        required: [true, 'Filename is required'],
        maxlength: [100, 'Filename cannot exceed 100 characters']
      },
      fileType: {
        type: String,
        enum: {
          values: ['image', 'document'],
          message: 'Invalid file type'
        }
      }
    }],
    sentAt: {
      type: Date,
      default: Date.now
    },
    read: {
      type: Boolean,
      default: false
    }
  }],
  
  // Comments & Q&A
  comments: [{
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Comment author is required']
    },
    message: {
      type: String,
      required: [true, 'Comment message is required'],
      trim: true,
      minlength: [1, 'Comment cannot be empty'],
      maxlength: [500, 'Comment cannot exceed 500 characters']
    },
    replies: [{
      author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Reply author is required']
      },
      message: {
        type: String,
        required: [true, 'Reply message is required'],
        trim: true,
        minlength: [1, 'Reply cannot be empty'],
        maxlength: [500, 'Reply cannot exceed 500 characters']
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }],
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Progress Tracking
  progress: {
    arrivedAt: Date,
    startedAt: Date,
    completedAt: Date,
    markedDoneAt: Date,
    confirmedAt: Date,
    milestones: [{
      title: {
        type: String,
        required: [true, 'Milestone title is required'],
        maxlength: [100, 'Milestone title cannot exceed 100 characters']
      },
      description: {
        type: String,
        maxlength: [500, 'Milestone description cannot exceed 500 characters']
      },
      completed: {
        type: Boolean,
        default: false
      },
      completedAt: Date
    }],
    workImages: [{
      url: {
        type: String,
        required: [true, 'Work image URL is required'],
        validate: {
          validator: function(url) {
            const urlRegex = /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i;
            return urlRegex.test(url);
          },
          message: 'Please provide a valid image URL'
        }
      },
      caption: {
        type: String,
        maxlength: [200, 'Image caption cannot exceed 200 characters']
      },
      uploadedAt: {
        type: Date,
        default: Date.now
      }
    }]
  },
  
  // Featured Job (paid promotion)
  featured: {
    type: Boolean,
    default: false
  },
  featuredUntil: {
    type: Date,
    validate: {
      validator: function(date) {
        return !date || date > new Date();
      },
      message: 'Featured until date must be in the future'
    }
  },
  
  // Analytics
  views: {
    type: Number,
    default: 0,
    min: [0, 'Views cannot be negative']
  },
  viewedBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    viewedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Dispute
  dispute: {
    raised: {
      type: Boolean,
      default: false
    },
    raisedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reason: {
      type: String,
      maxlength: [200, 'Dispute reason cannot exceed 200 characters']
    },
    description: {
      type: String,
      maxlength: [1000, 'Dispute description cannot exceed 1000 characters']
    },
    evidence: [{
      type: String,
      validate: {
        validator: function(url) {
          const urlRegex = /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp|pdf|doc|docx)$/i;
          return urlRegex.test(url);
        },
        message: 'Please provide a valid file URL'
      }
    }],
    status: {
      type: String,
      enum: {
        values: ['pending', 'investigating', 'resolved', 'closed'],
        message: 'Invalid dispute status'
      },
      default: 'pending'
    },
    resolution: {
      type: String,
      maxlength: [1000, 'Dispute resolution cannot exceed 1000 characters']
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    resolvedAt: Date,
    createdAt: Date
  },
  
  // Completion & Review
  completion: {
    markedDoneBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    markedDoneAt: Date,
    completionNotes: {
      type: String,
      maxlength: [1000, 'Completion notes cannot exceed 1000 characters']
    },
    beforeImages: [{
      type: String,
      validate: {
        validator: function(url) {
          const urlRegex = /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i;
          return urlRegex.test(url);
        },
        message: 'Please provide a valid image URL'
      }
    }],
    afterImages: [{
      type: String,
      validate: {
        validator: function(url) {
          const urlRegex = /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i;
          return urlRegex.test(url);
        },
        message: 'Please provide a valid image URL'
      }
    }],
    confirmedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    confirmedAt: Date,
    rating: {
      type: Number,
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot exceed 5']
    },
    review: {
      type: String,
      maxlength: [1000, 'Review cannot exceed 1000 characters']
    },
    reviewReply: {
      type: String,
      maxlength: [500, 'Review reply cannot exceed 500 characters']
    },
    // Dual rating system - both parties can rate each other
    fixerRating: {
      rating: {
        type: Number,
        min: [1, 'Rating must be at least 1'],
        max: [5, 'Rating cannot exceed 5']
      },
      review: {
        type: String,
        maxlength: [500, 'Review cannot exceed 500 characters']
      },
      categories: {
        communication: { type: Number, min: 1, max: 5 },
        quality: { type: Number, min: 1, max: 5 },
        timeliness: { type: Number, min: 1, max: 5 },
        professionalism: { type: Number, min: 1, max: 5 }
      },
      ratedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      ratedAt: Date
    },
    hirerRating: {
      rating: {
        type: Number,
        min: [1, 'Rating must be at least 1'],
        max: [5, 'Rating cannot exceed 5']
      },
      review: {
        type: String,
        maxlength: [500, 'Review cannot exceed 500 characters']
      },
      categories: {
        communication: { type: Number, min: 1, max: 5 },
        quality: { type: Number, min: 1, max: 5 },
        timeliness: { type: Number, min: 1, max: 5 },
        professionalism: { type: Number, min: 1, max: 5 }
      },
      ratedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      ratedAt: Date
    }
  },
  
  // Cancellation
  cancellation: {
    cancelled: {
      type: Boolean,
      default: false
    },
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reason: {
      type: String,
      maxlength: [500, 'Cancellation reason cannot exceed 500 characters']
    },
    cancelledAt: Date,
    refundAmount: {
      type: Number,
      min: [0, 'Refund amount cannot be negative']
    }
  }
}, {
  timestamps: true
});

// Enhanced indexes for better query performance
jobSchema.index({ createdBy: 1, status: 1 });
jobSchema.index({ assignedTo: 1, status: 1 });
jobSchema.index({ 'location.city': 1, status: 1 });
jobSchema.index({ skillsRequired: 1, status: 1 });
jobSchema.index({ status: 1, createdAt: -1 });
jobSchema.index({ deadline: 1, status: 1 });
jobSchema.index({ urgency: 1, status: 1 });
jobSchema.index({ featured: 1, featuredUntil: 1 });
jobSchema.index({ 'budget.amount': 1, status: 1 });
jobSchema.index({ 'applications.fixer': 1 });
jobSchema.index({ 'applications.status': 1 }); // NEW: For application status queries
jobSchema.index({ 'location.state': 1, status: 1 }); // NEW: For state-based queries
jobSchema.index({ experienceLevel: 1, status: 1 }); // NEW: For experience-based queries
jobSchema.index({ type: 1, status: 1 }); // NEW: For job type queries
jobSchema.index({ 'budget.type': 1, status: 1 }); // NEW: For budget type queries
jobSchema.index({ 'dispute.raised': 1, status: 1 }); // NEW: For dispute queries
jobSchema.index({ 'completion.rating': -1 }); // NEW: For rating-based sorting
jobSchema.index({ views: -1, status: 1 }); // NEW: For popularity-based queries
jobSchema.index({ 'progress.startedAt': 1, status: 1 }); // NEW: For progress tracking
jobSchema.index({ 'cancellation.cancelled': 1 }); // NEW: For cancellation queries

// Compound indexes for complex queries
jobSchema.index({ 'location.city': 1, skillsRequired: 1, status: 1 }); // For location + skills
jobSchema.index({ 'budget.amount': 1, 'budget.type': 1, status: 1 }); // For budget filtering
jobSchema.index({ createdBy: 1, createdAt: -1 }); // For user's job history
jobSchema.index({ assignedTo: 1, createdAt: -1 }); // For fixer's assigned jobs
jobSchema.index({ status: 1, featured: 1, createdAt: -1 }); // For featured jobs listing

// Virtual for application count
jobSchema.virtual('applicationCount').get(function() {
  return this.applications.filter(app => app.status !== 'withdrawn').length;
});

// Virtual for time remaining
jobSchema.virtual('timeRemaining').get(function() {
  const now = new Date();
  const deadline = new Date(this.deadline);
  const diff = deadline - now;
  
  if (diff <= 0) return 'Expired';
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  if (days > 0) return `${days} days`;
  return `${hours} hours`;
});

// Virtual for is urgent
jobSchema.virtual('isUrgent').get(function() {
  const now = new Date();
  const deadline = new Date(this.deadline);
  const diff = deadline - now;
  return diff <= 24 * 60 * 60 * 1000; // Less than 24 hours
});

// Method to check if user can apply
jobSchema.methods.canApply = function(userId) {
  if (this.status !== 'open') return false;
  if (this.createdBy.toString() === userId.toString()) return false;
  if (this.deadline < new Date()) return false;
  
  const hasApplied = this.applications.some(app => 
    app.fixer.toString() === userId.toString() && 
    app.status !== 'withdrawn'
  );
  
  return !hasApplied;
};

// Method to get application by fixer
jobSchema.methods.getApplicationByFixer = function(fixerId) {
  return this.applications.find(app => 
    app.fixer.toString() === fixerId.toString()
  );
};

// Method to accept application
jobSchema.methods.acceptApplication = function(applicationId) {
  const application = this.applications.id(applicationId);
  if (!application) return false;
  
  // Mark this application as accepted
  application.status = 'accepted';
  this.assignedTo = application.fixer;
  this.status = 'in_progress';
  this.progress.startedAt = new Date();
  
  // Mark all other applications as rejected
  this.applications.forEach(app => {
    if (app._id.toString() !== applicationId.toString()) {
      app.status = 'rejected';
    }
  });
  
  return this.save();
};

// Method to mark job as done by fixer
jobSchema.methods.markDone = function(fixerId, notes = '', afterImages = []) {
  if (this.assignedTo.toString() !== fixerId.toString()) return false;
  if (this.status !== 'in_progress') return false;
  
  this.status = 'completed';
  this.progress.completedAt = new Date();
  this.progress.markedDoneAt = new Date();
  this.completion.markedDoneBy = fixerId;
  this.completion.markedDoneAt = new Date();
  this.completion.completionNotes = notes;
  this.completion.afterImages = afterImages;
  
  return this.save();
};

// Method to confirm completion by hirer
jobSchema.methods.confirmCompletion = function(hirerId, rating, review = '') {
  if (this.createdBy.toString() !== hirerId.toString()) return false;
  if (this.status !== 'completed') return false;
  
  this.completion.confirmedBy = hirerId;
  this.completion.confirmedAt = new Date();
  this.completion.rating = rating;
  this.completion.review = review;
  
  return this.save();
};

// Method to add comment
jobSchema.methods.addComment = function(authorId, message) {
  this.comments.push({
    author: authorId,
    message: message,
    createdAt: new Date()
  });
  
  return this.save();
};

// Method to add reply to comment
jobSchema.methods.addReply = function(commentId, authorId, message) {
  const comment = this.comments.id(commentId);
  if (!comment) return false;
  
  comment.replies.push({
    author: authorId,
    message: message,
    createdAt: new Date()
  });
  
  return this.save();
};

// Method to increment views
jobSchema.methods.addView = function(userId) {
  // Don't count views from the job poster
  if (this.createdBy.toString() === userId.toString()) return;
  
  // Check if user already viewed today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const viewedToday = this.viewedBy.some(view => 
    view.user.toString() === userId.toString() &&
    view.viewedAt >= today
  );
  
  if (!viewedToday) {
    this.views += 1;
    this.viewedBy.push({
      user: userId,
      viewedAt: new Date()
    });
    
    // Keep only last 100 views
    if (this.viewedBy.length > 100) {
      this.viewedBy = this.viewedBy.slice(-100);
    }
    
    return this.save();
  }
};

// Method to raise dispute
jobSchema.methods.raiseDispute = function(userId, reason, description, evidence = []) {
  // Only involved parties can raise dispute
  if (this.createdBy.toString() !== userId.toString() && 
      this.assignedTo.toString() !== userId.toString()) {
    return false;
  }
  
  this.dispute.raised = true;
  this.dispute.raisedBy = userId;
  this.dispute.reason = reason;
  this.dispute.description = description;
  this.dispute.evidence = evidence;
  this.dispute.createdAt = new Date();
  this.status = 'disputed';
  
  return this.save();
};

// NEW: Method to cancel job
jobSchema.methods.cancelJob = function(userId, reason) {
  if (this.createdBy.toString() !== userId.toString()) return false;
  if (this.status !== 'open' && this.status !== 'in_progress') return false;
  
  this.cancellation.cancelled = true;
  this.cancellation.cancelledBy = userId;
  this.cancellation.reason = reason;
  this.cancellation.cancelledAt = new Date();
  this.status = 'cancelled';
  
  return this.save();
};

// NEW: Method to add milestone
jobSchema.methods.addMilestone = function(title, description) {
  this.progress.milestones.push({
    title,
    description,
    completed: false
  });
  
  return this.save();
};

// NEW: Method to complete milestone
jobSchema.methods.completeMilestone = function(milestoneId) {
  const milestone = this.progress.milestones.id(milestoneId);
  if (!milestone) return false;
  
  milestone.completed = true;
  milestone.completedAt = new Date();
  
  return this.save();
};

// Static method to find jobs by filters
jobSchema.statics.findWithFilters = function(filters = {}) {
  const query = { status: 'open' };
  
  if (filters.city) {
    query['location.city'] = new RegExp(filters.city, 'i');
  }
  
  if (filters.state) {
    query['location.state'] = new RegExp(filters.state, 'i');
  }
  
  if (filters.skills && filters.skills.length > 0) {
    query.skillsRequired = { $in: filters.skills.map(skill => skill.toLowerCase()) };
  }
  
  if (filters.budget) {
    if (filters.budget.min) query['budget.amount'] = { $gte: filters.budget.min };
    if (filters.budget.max) {
      query['budget.amount'] = { 
        ...query['budget.amount'], 
        $lte: filters.budget.max 
      };
    }
  }
  
  if (filters.urgency) {
    query.urgency = filters.urgency;
  }
  
  if (filters.type) {
    query.type = filters.type;
  }
  
  if (filters.experienceLevel) {
    query.experienceLevel = filters.experienceLevel;
  }
  
  if (filters.budgetType) {
    query['budget.type'] = filters.budgetType;
  }
  
  const sort = {};
  if (filters.sortBy) {
    switch (filters.sortBy) {
      case 'newest':
        sort.createdAt = -1;
        break;
      case 'deadline':
        sort.deadline = 1;
        break;
      case 'budget_high':
        sort['budget.amount'] = -1;
        break;
      case 'budget_low':
        sort['budget.amount'] = 1;
        break;
      case 'popular':
        sort.views = -1;
        break;
      default:
        sort.createdAt = -1;
    }
  } else {
    sort.featured = -1; // Featured jobs first
    sort.createdAt = -1;
  }
  
  return this.find(query)
    .populate('createdBy', 'name username photoURL rating location')
    .sort(sort);
};

// NEW: Static method to find urgent jobs
jobSchema.statics.findUrgentJobs = function() {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  
  return this.find({
    status: 'open',
    deadline: { $lte: tomorrow }
  }).populate('createdBy', 'name username photoURL rating location');
};

// NEW: Static method to find jobs by user
jobSchema.statics.findByUser = function(userId, role = 'created') {
  const query = role === 'created' ? { createdBy: userId } : { assignedTo: userId };
  
  return this.find(query)
    .populate('createdBy', 'name username photoURL rating location')
    .populate('assignedTo', 'name username photoURL rating location')
    .sort({ createdAt: -1 });
};

// Pre-save middleware
jobSchema.pre('save', function(next) {
  try {
  // Convert skills to lowercase
  if (this.skillsRequired) {
    this.skillsRequired = this.skillsRequired.map(skill => skill.toLowerCase().trim());
  }
  
  // Update featured status
  if (this.featuredUntil && this.featuredUntil < new Date()) {
    this.featured = false;
  }
    
    // Validate budget amount for fixed/hourly jobs
    if ((this.budget.type === 'fixed' || this.budget.type === 'hourly') && 
        (!this.budget.amount || this.budget.amount <= 0)) {
      throw new Error('Budget amount is required for fixed and hourly pricing');
    }
  
  next();
  } catch (error) {
    next(error);
  }
});

// Post-save middleware for notifications
jobSchema.post('save', function(doc) {
  // Send notifications for status changes
  if (doc.isModified('status')) {
    // Implementation would go here
  }
});

export default mongoose.models.Job || mongoose.model('Job', jobSchema);