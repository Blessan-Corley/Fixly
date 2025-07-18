import mongoose from 'mongoose';

const jobSchema = new mongoose.Schema({
  // Basic Info
  title: {
    type: String,
    required: true,
    trim: true,
    maxLength: 100
  },
  description: {
    type: String,
    required: true,
    trim: true,
    minLength: 30,
    maxLength: 2000
  },
  
  // Job Type & Urgency
  type: {
    type: String,
    enum: ['one-time', 'recurring'],
    default: 'one-time'
  },
  urgency: {
    type: String,
    enum: ['asap', 'flexible', 'scheduled'],
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
    required: true,
    trim: true
  }],
  experienceLevel: {
    type: String,
    enum: ['beginner', 'intermediate', 'expert'],
    default: 'intermediate'
  },
  
  // Media & Attachments
  attachments: [{
    type: String, // File URLs
    url: String,
    filename: String,
    fileType: {
      type: String,
      enum: ['image', 'video', 'document']
    },
    size: Number
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
      min: 0
    },
    currency: {
      type: String,
      default: 'INR'
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
      required: true
    },
    city: {
      type: String,
      required: true
    },
    state: {
      type: String,
      required: true
    },
    pincode: {
      type: String,
      match: /^[0-9]{6}$/
    },
    lat: Number,
    lng: Number
  },
  
  // Timing
  deadline: {
    type: Date,
    required: true,
    validate: {
      validator: function(date) {
        return date > new Date();
      },
      message: 'Deadline must be in the future'
    }
  },
  estimatedDuration: {
    value: Number,
    unit: {
      type: String,
      enum: ['hours', 'days', 'weeks'],
      default: 'hours'
    }
  },
  
  // Job Lifecycle
  status: {
    type: String,
    enum: ['open', 'in_progress', 'completed', 'cancelled', 'disputed'],
    default: 'open'
  },
  
  // Relationships
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
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
      required: true
    },
    proposedAmount: {
      type: Number,
      required: true,
      min: 0
    },
    timeEstimate: {
      value: Number,
      unit: {
        type: String,
        enum: ['hours', 'days', 'weeks'],
        default: 'hours'
      }
    },
    materialsList: [{
      item: String,
      quantity: Number,
      estimatedCost: Number
    }],
    coverLetter: {
      type: String,
      maxLength: 1000
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'withdrawn'],
      default: 'pending'
    },
    appliedAt: {
      type: Date,
      default: Date.now
    }
  }],
  messages: [{
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxLength: 1000
    },
    attachments: [{
      url: String,
      filename: String,
      fileType: String
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
      required: true
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxLength: 500
    },
    replies: [{
      author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      message: {
        type: String,
        required: true,
        trim: true,
        maxLength: 500
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
    startedAt: Date,
    completedAt: Date,
    markedDoneAt: Date,
    confirmedAt: Date,
    milestones: [{
      title: String,
      description: String,
      completed: {
        type: Boolean,
        default: false
      },
      completedAt: Date
    }],
    workImages: [{
      url: String,
      caption: String,
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
  featuredUntil: Date,
  
  // Analytics
  views: {
    type: Number,
    default: 0
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
   completion: {
    markedDoneBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    markedDoneAt: Date,
    completionNotes: String,
    beforeImages: [String],
    afterImages: [String],
    confirmedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    confirmedAt: Date,
    
    // ADD THESE NEW REVIEW FIELDS:
    hirerReview: {
      rating: {
        type: Number,
        min: 1,
        max: 5
      },
      review: {
        type: String,
        maxLength: 1000
      },
      reviewedAt: Date,
      reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    },
    fixerReview: {
      rating: {
        type: Number,
        min: 1,
        max: 5
      },
      review: {
        type: String,
        maxLength: 1000
      },
      reviewedAt: Date,
      reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    }
  },
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
    reason: String,
    description: String,
    evidence: [String], // File URLs
    status: {
      type: String,
      enum: ['pending', 'investigating', 'resolved', 'closed'],
      default: 'pending'
    },
    resolution: String,
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
    completionNotes: String,
    beforeImages: [String],
    afterImages: [String],
    confirmedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    confirmedAt: Date,
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    review: {
      type: String,
      maxLength: 1000
    },
    reviewReply: {
      type: String,
      maxLength: 500
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
    reason: String,
    cancelledAt: Date,
    refundAmount: Number
  }
}, {
  timestamps: true
});

// Indexes for better query performance
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

// Virtual for application count
jobSchema.virtual('applicationCount').get(function() {
  return this.applications.length;
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

// Static method to find jobs by filters
jobSchema.statics.findWithFilters = function(filters = {}) {
  const query = { status: 'open' };
  
  if (filters.city) {
    query['location.city'] = new RegExp(filters.city, 'i');
  }
  
  if (filters.skills && filters.skills.length > 0) {
    query.skillsRequired = { $in: filters.skills };
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

// Pre-save middleware
jobSchema.pre('save', function(next) {
  // Convert skills to lowercase
  if (this.skillsRequired) {
    this.skillsRequired = this.skillsRequired.map(skill => skill.toLowerCase().trim());
  }
  
  // Update featured status
  if (this.featuredUntil && this.featuredUntil < new Date()) {
    this.featured = false;
  }
  
  next();
});

// Post-save middleware for notifications
jobSchema.post('save', function(doc) {
  // Send notifications for status changes
  if (doc.isModified('status')) {
    // Implementation would go here
  }
});

export default mongoose.models.Job || mongoose.model('Job', jobSchema);