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
  
  // Location with GeoJSON support for geospatial queries
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
    },
    // GeoJSON Point for geospatial queries (required for $geoNear)
    coordinates: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        validate: {
          validator: function(coords) {
            return coords.length === 2 && 
                   coords[0] >= -180 && coords[0] <= 180 && // longitude
                   coords[1] >= -90 && coords[1] <= 90;    // latitude
          },
          message: 'Invalid coordinates format [longitude, latitude]'
        }
      }
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
      values: ['open', 'in_progress', 'completed', 'cancelled', 'disputed', 'expired'],
      message: 'Invalid job status'
    },
    default: 'open'
  },

  // Analytics & Engagement with admin insights
  views: {
    count: {
      type: Number,
      default: 0
    },
    uniqueViewers: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      viewedAt: {
        type: Date,
        default: Date.now
      },
      ipAddress: String,
      userAgent: String
    }],
    dailyViews: [{
      date: {
        type: String, // YYYY-MM-DD format
        required: true
      },
      count: {
        type: Number,
        default: 0
      }
    }]
  },
  
  // Admin metadata for comprehensive management
  adminMetadata: {
    flaggedBy: [{
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      reason: String,
      flaggedAt: { type: Date, default: Date.now },
      status: { type: String, enum: ['pending', 'reviewed', 'resolved'], default: 'pending' }
    }],
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reviewedAt: Date,
    adminNotes: String,
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal'
    },
    tags: [String],
    isPromoted: { type: Boolean, default: false },
    promotedUntil: Date,
    qualityScore: { type: Number, min: 0, max: 100, default: 50 },
    riskLevel: { type: String, enum: ['low', 'medium', 'high'], default: 'low' },
    lastModifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  
  // Enhanced geolocation with precision tracking
  geoData: {
    preciseCoordinates: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: [Number] // [longitude, latitude] with high precision
    },
    accuracy: Number, // GPS accuracy in meters
    source: {
      type: String,
      enum: ['gps', 'geocoding', 'manual', 'ip_geolocation'],
      default: 'manual'
    },
    boundingBox: {
      northeast: { lat: Number, lng: Number },
      southwest: { lat: Number, lng: Number }
    },
    timezone: String,
    placeId: String, // Google Places API ID
    addressComponents: {
      streetNumber: String,
      route: String,
      locality: String,
      sublocality: String,
      administrativeAreaLevel1: String,
      administrativeAreaLevel2: String,
      country: String,
      postalCode: String
    }
  },

  likes: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    likedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Relationships with cached user info for admin searches
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Job creator is required']
  },
  createdByInfo: {
    username: String,
    name: String,
    email: String,
    role: String,
    isVerified: { type: Boolean, default: false },
    rating: { type: Number, default: 0 },
    completedJobs: { type: Number, default: 0 },
    lastActiveAt: Date
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  assignedToInfo: {
    username: String,
    name: String,
    email: String,
    role: String,
    isVerified: { type: Boolean, default: false },
    rating: { type: Number, default: 0 },
    completedJobs: { type: Number, default: 0 },
    lastActiveAt: Date
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
    priceVariance: {
      type: Number,
      default: 0 // Difference from job budget (positive = higher, negative = lower)
    },
    priceVariancePercentage: {
      type: Number,
      default: 0 // Percentage difference from job budget
    },
    negotiationNotes: {
      type: String,
      maxlength: [500, 'Negotiation notes cannot exceed 500 characters'],
      trim: true
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
    description: {
      type: String,
      maxlength: [600, 'Description cannot exceed 600 characters']
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
    likes: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Like user is required']
      },
      likedAt: {
        type: Date,
        default: Date.now
      }
    }],
    reactions: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      type: {
        type: String,
        enum: ['thumbs_up', 'thumbs_down', 'heart', 'laugh', 'wow', 'angry'],
        required: true
      },
      reactedAt: {
        type: Date,
        default: Date.now
      }
    }],
    mentions: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      startIndex: {
        type: Number,
        required: true
      },
      endIndex: {
        type: Number,
        required: true
      }
    }],
    edited: {
      isEdited: {
        type: Boolean,
        default: false
      },
      editedAt: {
        type: Date
      },
      editHistory: [{
        originalMessage: String,
        editedAt: {
          type: Date,
          default: Date.now
        }
      }]
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
      likes: [{
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: [true, 'Like user is required']
        },
        likedAt: {
          type: Date,
          default: Date.now
        }
      }],
      reactions: [{
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true
        },
        type: {
          type: String,
          enum: ['thumbs_up', 'thumbs_down', 'heart', 'laugh', 'wow', 'angry'],
          required: true
        },
        reactedAt: {
          type: Date,
          default: Date.now
        }
      }],
      mentions: [{
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true
        },
        startIndex: {
          type: Number,
          required: true
        },
        endIndex: {
          type: Number,
          required: true
        }
      }],
      edited: {
        isEdited: {
          type: Boolean,
          default: false
        },
        editedAt: {
          type: Date
        },
        editHistory: [{
          originalMessage: String,
          editedAt: {
            type: Date,
            default: Date.now
          }
        }]
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
  },
  
  // Search and geolocation metadata (for comprehensive location system)
  searchKeywords: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  hasGeoLocation: {
    type: Boolean,
    default: false
  },
  locationPrecision: {
    type: String,
    enum: ['1m', '10m', '100m', '1km', 'city', 'approximate'],
    default: 'approximate'
  },
  locationSource: {
    type: String,
    enum: ['gps_or_geocoding', 'user_input', 'city_search'],
    default: 'user_input'
  }
}, {
  timestamps: true
});

// Enhanced indexes for better query performance including geospatial and admin searches
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
jobSchema.index({ 'applications.status': 1 });
jobSchema.index({ 'location.state': 1, status: 1 });
jobSchema.index({ experienceLevel: 1, status: 1 });
jobSchema.index({ type: 1, status: 1 });
jobSchema.index({ 'budget.type': 1, status: 1 });
jobSchema.index({ 'dispute.raised': 1, status: 1 });
jobSchema.index({ 'completion.rating': -1 });
jobSchema.index({ 'views.count': -1, status: 1 });
jobSchema.index({ 'progress.startedAt': 1, status: 1 });
jobSchema.index({ 'cancellation.cancelled': 1 });
jobSchema.index({ 'likes.user': 1 });
// Geospatial indexes for location-based queries
jobSchema.index({ 'location.coordinates': '2dsphere' });
jobSchema.index({ 'geoData.preciseCoordinates': '2dsphere' });
jobSchema.index({ hasGeoLocation: 1, status: 1 });
jobSchema.index({ searchKeywords: 1, status: 1 });

// Admin-specific indexes for comprehensive management
jobSchema.index({ 'createdByInfo.username': 1 });
jobSchema.index({ 'createdByInfo.email': 1 });
jobSchema.index({ 'createdByInfo.role': 1, status: 1 });
jobSchema.index({ 'assignedToInfo.username': 1 });
jobSchema.index({ 'assignedToInfo.email': 1 });
jobSchema.index({ 'adminMetadata.priority': 1, createdAt: -1 });
jobSchema.index({ 'adminMetadata.qualityScore': -1 });
jobSchema.index({ 'adminMetadata.riskLevel': 1, status: 1 });
jobSchema.index({ 'adminMetadata.tags': 1 });
jobSchema.index({ 'adminMetadata.flaggedBy.status': 1, 'adminMetadata.flaggedBy.flaggedAt': -1 });
jobSchema.index({ 'adminMetadata.isPromoted': 1, 'adminMetadata.promotedUntil': 1 });
jobSchema.index({ 'adminMetadata.reviewedBy': 1, 'adminMetadata.reviewedAt': -1 });
jobSchema.index({ 'geoData.source': 1, 'geoData.accuracy': 1 });
jobSchema.index({ 'geoData.addressComponents.locality': 1, status: 1 });
jobSchema.index({ 'geoData.addressComponents.administrativeAreaLevel1': 1, status: 1 });
jobSchema.index({ 'geoData.addressComponents.country': 1, status: 1 });

// Text search indexes
jobSchema.index({ 
  title: 'text', 
  description: 'text', 
  'location.address': 'text',
  skillsRequired: 'text',
  'createdByInfo.username': 'text',
  'createdByInfo.name': 'text'
}, {
  name: 'JobTextSearchIndex',
  weights: {
    title: 10,
    skillsRequired: 8,
    description: 5,
    'createdByInfo.username': 3,
    'location.address': 2
  }
});

// Compound indexes for complex queries
jobSchema.index({ 'location.city': 1, skillsRequired: 1, status: 1 });
jobSchema.index({ 'budget.amount': 1, 'budget.type': 1, status: 1 });
jobSchema.index({ createdBy: 1, createdAt: -1 });
jobSchema.index({ assignedTo: 1, createdAt: -1 });
jobSchema.index({ status: 1, featured: 1, createdAt: -1 });

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
  return diff <= 24 * 60 * 60 * 1000;
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

// Method to increment views with analytics
jobSchema.methods.addView = function(userId, ipAddress, userAgent) {
  // Don't count views from the job poster
  if (this.createdBy.toString() === userId.toString()) return;
  
  // Initialize views object if not exists
  if (!this.views) {
    this.views = {
      count: 0,
      uniqueViewers: [],
      dailyViews: []
    };
  }
  
  // Check if user already viewed today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayString = today.toISOString().split('T')[0];
  
  const viewedToday = this.views.uniqueViewers.some(view => 
    view.userId && view.userId.toString() === userId.toString() &&
    new Date(view.viewedAt) >= today
  );
  
  if (!viewedToday) {
    // Increment total count
    this.views.count += 1;
    
    // Add to unique viewers
    this.views.uniqueViewers.push({
      userId: userId,
      viewedAt: new Date(),
      ipAddress: ipAddress,
      userAgent: userAgent
    });
    
    // Update daily views
    const existingDayIndex = this.views.dailyViews.findIndex(dv => dv.date === todayString);
    if (existingDayIndex > -1) {
      this.views.dailyViews[existingDayIndex].count += 1;
    } else {
      this.views.dailyViews.push({
        date: todayString,
        count: 1
      });
    }
    
    // Keep only last 30 days of daily views
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoString = thirtyDaysAgo.toISOString().split('T')[0];
    
    this.views.dailyViews = this.views.dailyViews.filter(dv => dv.date >= thirtyDaysAgoString);
    
    // Keep only last 1000 unique viewers
    if (this.views.uniqueViewers.length > 1000) {
      this.views.uniqueViewers = this.views.uniqueViewers.slice(-1000);
    }
  }
  
  return this.views.count;
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

// Method to cancel job
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

// Method to add milestone
jobSchema.methods.addMilestone = function(title, description) {
  this.progress.milestones.push({
    title,
    description,
    completed: false
  });
  
  return this.save();
};

// Method to complete milestone
jobSchema.methods.completeMilestone = function(milestoneId) {
  const milestone = this.progress.milestones.id(milestoneId);
  if (!milestone) return false;
  
  milestone.completed = true;
  milestone.completedAt = new Date();
  
  return this.save();
};

// Method to toggle like on job
jobSchema.methods.toggleLike = function(userId) {
  const existingLikeIndex = this.likes.findIndex(
    like => like.user.toString() === userId.toString()
  );
  
  if (existingLikeIndex > -1) {
    // Unlike: remove the existing like
    this.likes.splice(existingLikeIndex, 1);
    return { liked: false, likeCount: this.likes.length };
  } else {
    // Like: add a new like
    this.likes.push({ user: userId });
    return { liked: true, likeCount: this.likes.length };
  }
};

// Method to check if user liked the job
jobSchema.methods.isLikedBy = function(userId) {
  if (!userId) return false;
  return this.likes.some(like => like.user.toString() === userId.toString());
};

// Virtual for like count
jobSchema.virtual('likeCount').get(function() {
  return this.likes.length;
});

// Method to toggle like on comment
jobSchema.methods.toggleCommentLike = function(commentId, userId) {
  const comment = this.comments.id(commentId);
  if (!comment) return null;
  
  const existingLikeIndex = comment.likes.findIndex(
    like => like.user.toString() === userId.toString()
  );
  
  if (existingLikeIndex > -1) {
    // Unlike: remove the existing like
    comment.likes.splice(existingLikeIndex, 1);
    return { liked: false, likeCount: comment.likes.length };
  } else {
    // Like: add a new like
    comment.likes.push({ user: userId });
    return { liked: true, likeCount: comment.likes.length };
  }
};

// Method to toggle like on reply
jobSchema.methods.toggleReplyLike = function(commentId, replyId, userId) {
  const comment = this.comments.id(commentId);
  if (!comment) return null;
  
  const reply = comment.replies.id(replyId);
  if (!reply) return null;
  
  const existingLikeIndex = reply.likes.findIndex(
    like => like.user.toString() === userId.toString()
  );
  
  if (existingLikeIndex > -1) {
    // Unlike: remove the existing like
    reply.likes.splice(existingLikeIndex, 1);
    return { liked: false, likeCount: reply.likes.length };
  } else {
    // Like: add a new like
    reply.likes.push({ user: userId });
    return { liked: true, likeCount: reply.likes.length };
  }
};

// Method to delete comment (only by author or job creator)
jobSchema.methods.deleteComment = function(commentId, userId) {
  const comment = this.comments.id(commentId);
  if (!comment) return { success: false, message: 'Comment not found' };
  
  const isAuthor = comment.author.toString() === userId.toString();
  const isJobCreator = this.createdBy.toString() === userId.toString();
  
  if (!isAuthor && !isJobCreator) {
    return { success: false, message: 'Unauthorized to delete this comment' };
  }
  
  comment.deleteOne();
  return { success: true, message: 'Comment deleted successfully' };
};

// Method to delete reply (only by author or job creator)
jobSchema.methods.deleteReply = function(commentId, replyId, userId) {
  const comment = this.comments.id(commentId);
  if (!comment) return { success: false, message: 'Comment not found' };
  
  const reply = comment.replies.id(replyId);
  if (!reply) return { success: false, message: 'Reply not found' };
  
  const isAuthor = reply.author.toString() === userId.toString();
  const isJobCreator = this.createdBy.toString() === userId.toString();
  
  if (!isAuthor && !isJobCreator) {
    return { success: false, message: 'Unauthorized to delete this reply' };
  }
  
  reply.deleteOne();
  return { success: true, message: 'Reply deleted successfully' };
};

// Enhanced comment reaction methods
jobSchema.methods.toggleCommentReaction = function(commentId, userId, reactionType) {
  const comment = this.comments.id(commentId);
  if (!comment) return null;
  
  const existingReactionIndex = comment.reactions.findIndex(
    reaction => reaction.user.toString() === userId.toString()
  );
  
  if (existingReactionIndex > -1) {
    const existingReaction = comment.reactions[existingReactionIndex];
    if (existingReaction.type === reactionType) {
      // Remove reaction if same type
      comment.reactions.splice(existingReactionIndex, 1);
      return { reacted: false, reactionType: null, count: comment.reactions.length };
    } else {
      // Update reaction type
      existingReaction.type = reactionType;
      existingReaction.reactedAt = new Date();
      return { reacted: true, reactionType, count: comment.reactions.length };
    }
  } else {
    // Add new reaction
    comment.reactions.push({
      user: userId,
      type: reactionType,
      reactedAt: new Date()
    });
    return { reacted: true, reactionType, count: comment.reactions.length };
  }
};

jobSchema.methods.toggleReplyReaction = function(commentId, replyId, userId, reactionType) {
  const comment = this.comments.id(commentId);
  if (!comment) return null;
  
  const reply = comment.replies.id(replyId);
  if (!reply) return null;
  
  const existingReactionIndex = reply.reactions.findIndex(
    reaction => reaction.user.toString() === userId.toString()
  );
  
  if (existingReactionIndex > -1) {
    const existingReaction = reply.reactions[existingReactionIndex];
    if (existingReaction.type === reactionType) {
      // Remove reaction if same type
      reply.reactions.splice(existingReactionIndex, 1);
      return { reacted: false, reactionType: null, count: reply.reactions.length };
    } else {
      // Update reaction type
      existingReaction.type = reactionType;
      existingReaction.reactedAt = new Date();
      return { reacted: true, reactionType, count: reply.reactions.length };
    }
  } else {
    // Add new reaction
    reply.reactions.push({
      user: userId,
      type: reactionType,
      reactedAt: new Date()
    });
    return { reacted: true, reactionType, count: reply.reactions.length };
  }
};

// Comment editing methods
jobSchema.methods.editComment = function(commentId, userId, newMessage, mentions = []) {
  const comment = this.comments.id(commentId);
  if (!comment) return { success: false, message: 'Comment not found' };
  
  const isAuthor = comment.author.toString() === userId.toString();
  if (!isAuthor) {
    return { success: false, message: 'Only the author can edit this comment' };
  }
  
  // Store edit history
  if (!comment.edited.editHistory) {
    comment.edited.editHistory = [];
  }
  
  comment.edited.editHistory.push({
    originalMessage: comment.message,
    editedAt: new Date()
  });
  
  // Update comment
  comment.message = newMessage;
  comment.mentions = mentions;
  comment.edited.isEdited = true;
  comment.edited.editedAt = new Date();
  
  return { success: true, message: 'Comment updated successfully', comment };
};

jobSchema.methods.editReply = function(commentId, replyId, userId, newMessage, mentions = []) {
  const comment = this.comments.id(commentId);
  if (!comment) return { success: false, message: 'Comment not found' };
  
  const reply = comment.replies.id(replyId);
  if (!reply) return { success: false, message: 'Reply not found' };
  
  const isAuthor = reply.author.toString() === userId.toString();
  if (!isAuthor) {
    return { success: false, message: 'Only the author can edit this reply' };
  }
  
  // Store edit history
  if (!reply.edited.editHistory) {
    reply.edited.editHistory = [];
  }
  
  reply.edited.editHistory.push({
    originalMessage: reply.message,
    editedAt: new Date()
  });
  
  // Update reply
  reply.message = newMessage;
  reply.mentions = mentions;
  reply.edited.isEdited = true;
  reply.edited.editedAt = new Date();
  
  return { success: true, message: 'Reply updated successfully', reply };
};

// Enhanced static method to find jobs by filters with admin capabilities
jobSchema.statics.findWithFilters = function(filters = {}, isAdmin = false) {
  const query = {};
  
  // Base status filter (admins can see all statuses)
  if (!isAdmin) {
    query.status = filters.status || 'open';
  } else if (filters.status) {
    query.status = filters.status;
  }
  
  // Location filters
  if (filters.city) {
    query.$or = [
      { 'location.city': new RegExp(filters.city, 'i') },
      { 'geoData.addressComponents.locality': new RegExp(filters.city, 'i') }
    ];
  }
  
  if (filters.state) {
    query.$or = [
      ...(query.$or || []),
      { 'location.state': new RegExp(filters.state, 'i') },
      { 'geoData.addressComponents.administrativeAreaLevel1': new RegExp(filters.state, 'i') }
    ];
  }
  
  if (filters.country) {
    query['geoData.addressComponents.country'] = new RegExp(filters.country, 'i');
  }
  
  // Skills filter
  if (filters.skills && filters.skills.length > 0) {
    query.skillsRequired = { $in: filters.skills.map(skill => skill.toLowerCase()) };
  }
  
  // Budget filters
  if (filters.budget) {
    if (filters.budget.min) query['budget.amount'] = { $gte: filters.budget.min };
    if (filters.budget.max) {
      query['budget.amount'] = { 
        ...query['budget.amount'], 
        $lte: filters.budget.max 
      };
    }
  }
  
  // Basic filters
  if (filters.urgency) query.urgency = filters.urgency;
  if (filters.type) query.type = filters.type;
  if (filters.experienceLevel) query.experienceLevel = filters.experienceLevel;
  if (filters.budgetType) query['budget.type'] = filters.budgetType;
  
  // Date range filters
  if (filters.dateFrom || filters.dateTo) {
    query.createdAt = {};
    if (filters.dateFrom) query.createdAt.$gte = new Date(filters.dateFrom);
    if (filters.dateTo) query.createdAt.$lte = new Date(filters.dateTo);
  }
  
  // Admin-specific filters
  if (isAdmin) {
    if (filters.creatorUsername) {
      query['createdByInfo.username'] = new RegExp(filters.creatorUsername, 'i');
    }
    if (filters.creatorEmail) {
      query['createdByInfo.email'] = new RegExp(filters.creatorEmail, 'i');
    }
    if (filters.assignedToUsername) {
      query['assignedToInfo.username'] = new RegExp(filters.assignedToUsername, 'i');
    }
    if (filters.priority) {
      query['adminMetadata.priority'] = filters.priority;
    }
    if (filters.riskLevel) {
      query['adminMetadata.riskLevel'] = filters.riskLevel;
    }
    if (filters.qualityScoreMin) {
      query['adminMetadata.qualityScore'] = { $gte: filters.qualityScoreMin };
    }
    if (filters.qualityScoreMax) {
      query['adminMetadata.qualityScore'] = { 
        ...query['adminMetadata.qualityScore'],
        $lte: filters.qualityScoreMax 
      };
    }
    if (filters.flagged === true) {
      query['adminMetadata.flaggedBy.0'] = { $exists: true };
    }
    if (filters.promoted === true) {
      query['adminMetadata.isPromoted'] = true;
    }
    if (filters.tags && filters.tags.length > 0) {
      query['adminMetadata.tags'] = { $in: filters.tags };
    }
    if (filters.disputed === true) {
      query['dispute.raised'] = true;
    }
    if (filters.cancelled === true) {
      query['cancellation.cancelled'] = true;
    }
    if (filters.rating) {
      query['completion.rating'] = { $gte: filters.rating };
    }
    if (filters.viewsMin) {
      query['views.count'] = { $gte: filters.viewsMin };
    }
    if (filters.applicationsMin) {
      query.$expr = { $gte: [{ $size: '$applications' }, filters.applicationsMin] };
    }
  }
  
  // Text search
  if (filters.search) {
    query.$text = { $search: filters.search };
  }
  
  // Geospatial queries
  if (filters.near && filters.near.lat && filters.near.lng) {
    const maxDistance = filters.near.radius ? filters.near.radius * 1000 : 10000; // Default 10km
    query.$or = [
      {
        'location.coordinates': {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [filters.near.lng, filters.near.lat]
            },
            $maxDistance: maxDistance
          }
        }
      },
      {
        'geoData.preciseCoordinates': {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [filters.near.lng, filters.near.lat]
            },
            $maxDistance: maxDistance
          }
        }
      }
    ];
  }
  
  // Sorting
  const sort = {};
  if (filters.sortBy) {
    switch (filters.sortBy) {
      case 'newest':
        sort.createdAt = -1;
        break;
      case 'oldest':
        sort.createdAt = 1;
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
        sort['views.count'] = -1;
        break;
      case 'rating':
        sort['completion.rating'] = -1;
        break;
      case 'applications':
        sort.applicationCount = -1;
        break;
      case 'priority':
        if (isAdmin) {
          const priorityOrder = { 'urgent': 4, 'high': 3, 'normal': 2, 'low': 1 };
          sort['adminMetadata.priority'] = -1;
        }
        break;
      case 'quality':
        if (isAdmin) {
          sort['adminMetadata.qualityScore'] = -1;
        }
        break;
      case 'relevance':
        if (filters.search) {
          sort.score = { $meta: 'textScore' };
        }
        break;
      default:
        sort.createdAt = -1;
    }
  } else {
    if (!isAdmin) {
      sort.featured = -1; // Featured jobs first for public
    } else {
      sort['adminMetadata.priority'] = -1; // Priority first for admin
    }
    sort.createdAt = -1;
  }
  
  // Build query
  let queryBuilder = this.find(query);
  
  // Populate based on admin access
  if (isAdmin) {
    queryBuilder = queryBuilder
      .populate('createdBy', 'name username email photoURL rating location isVerified lastLogin')
      .populate('assignedTo', 'name username email photoURL rating location isVerified lastLogin')
      .populate('adminMetadata.reviewedBy', 'name username')
      .populate('adminMetadata.lastModifiedBy', 'name username');
  } else {
    queryBuilder = queryBuilder
      .populate('createdBy', 'name username photoURL rating location');
  }
  
  return queryBuilder.sort(sort);
};

// Admin-specific static methods
jobSchema.statics.findByAdminCriteria = function(criteria = {}) {
  const query = {};
  
  if (criteria.flagged) {
    query['adminMetadata.flaggedBy.0'] = { $exists: true };
    query['adminMetadata.flaggedBy.status'] = 'pending';
  }
  
  if (criteria.disputed) {
    query['dispute.raised'] = true;
    query['dispute.status'] = { $in: ['pending', 'investigating'] };
  }
  
  if (criteria.highRisk) {
    query['adminMetadata.riskLevel'] = 'high';
  }
  
  if (criteria.lowQuality) {
    query['adminMetadata.qualityScore'] = { $lt: 30 };
  }
  
  if (criteria.needsReview) {
    query.$or = [
      { 'adminMetadata.reviewedBy': { $exists: false } },
      { 'adminMetadata.flaggedBy.0': { $exists: true } },
      { 'dispute.raised': true },
      { 'adminMetadata.qualityScore': { $lt: 40 } }
    ];
  }
  
  return this.find(query)
    .populate('createdBy', 'name username email photoURL rating')
    .populate('assignedTo', 'name username email photoURL rating')
    .populate('adminMetadata.reviewedBy', 'name username')
    .sort({ 
      'adminMetadata.priority': -1,
      'adminMetadata.flaggedBy.flaggedAt': -1,
      createdAt: -1 
    });
};

jobSchema.statics.getJobStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        open: { $sum: { $cond: [{ $eq: ['$status', 'open'] }, 1, 0] } },
        inProgress: { $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] } },
        completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
        disputed: { $sum: { $cond: ['$dispute.raised', 1, 0] } },
        flagged: { $sum: { $cond: [{ $gt: [{ $size: { $ifNull: ['$adminMetadata.flaggedBy', []] } }, 0] }, 1, 0] } },
        avgBudget: { $avg: '$budget.amount' },
        avgViews: { $avg: '$views.count' },
        avgRating: { $avg: '$completion.rating' }
      }
    }
  ]);
};

jobSchema.statics.getLocationStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$location.city',
        count: { $sum: 1 },
        avgBudget: { $avg: '$budget.amount' },
        state: { $first: '$location.state' }
      }
    },
    { $sort: { count: -1 } },
    { $limit: 50 }
  ]);
};

// Static method to find urgent jobs
jobSchema.statics.findUrgentJobs = function() {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  
  return this.find({
    status: 'open',
    deadline: { $lte: tomorrow }
  }).populate('createdBy', 'name username photoURL rating location');
};

// Static method to find jobs by user
jobSchema.statics.findByUser = function(userId, role = 'created') {
  const query = role === 'created' ? { createdBy: userId } : { assignedTo: userId };
  
  return this.find(query)
    .populate('createdBy', 'name username photoURL rating location')
    .populate('assignedTo', 'name username photoURL rating location')
    .sort({ createdAt: -1 });
};

// Enhanced pre-save middleware with admin features
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
    
    // Update promoted status
    if (this.adminMetadata?.promotedUntil && this.adminMetadata.promotedUntil < new Date()) {
      this.adminMetadata.isPromoted = false;
    }
    
    // Validate budget amount for fixed/hourly jobs
    if ((this.budget.type === 'fixed' || this.budget.type === 'hourly') && 
        (!this.budget.amount || this.budget.amount <= 0)) {
      throw new Error('Budget amount is required for fixed and hourly pricing');
    }
    
    // Generate search keywords
    if (this.isModified('title') || this.isModified('description') || this.isModified('skillsRequired')) {
      const keywords = new Set();
      
      // Add title words
      if (this.title) {
        this.title.toLowerCase().split(/\s+/).forEach(word => {
          if (word.length > 2) keywords.add(word);
        });
      }
      
      // Add skills
      if (this.skillsRequired) {
        this.skillsRequired.forEach(skill => keywords.add(skill));
      }
      
      // Add description words (limit to important words)
      if (this.description) {
        const descWords = this.description.toLowerCase().split(/\s+/);
        const importantWords = descWords.filter(word => 
          word.length > 4 && !['with', 'this', 'that', 'will', 'need', 'want'].includes(word)
        ).slice(0, 20); // Limit to 20 important words
        importantWords.forEach(word => keywords.add(word));
      }
      
      this.searchKeywords = Array.from(keywords);
    }
    
    // Set GeoJSON coordinates if lat/lng provided
    if (this.isModified('location.lat') || this.isModified('location.lng')) {
      if (this.location.lat && this.location.lng) {
        this.location.coordinates = {
          type: 'Point',
          coordinates: [this.location.lng, this.location.lat]
        };
        this.hasGeoLocation = true;
        
        // Also set precise coordinates if not already set
        if (!this.geoData?.preciseCoordinates?.coordinates) {
          if (!this.geoData) this.geoData = {};
          this.geoData.preciseCoordinates = {
            type: 'Point',
            coordinates: [this.location.lng, this.location.lat]
          };
        }
      }
    }
    
    // Calculate quality score based on completeness
    if (this.isNew || this.isModified()) {
      let score = 0;
      
      // Basic info completeness (40 points)
      if (this.title && this.title.length >= 10) score += 10;
      if (this.description && this.description.length >= 50) score += 15;
      if (this.skillsRequired && this.skillsRequired.length > 0) score += 10;
      if (this.budget.amount > 0) score += 5;
      
      // Location completeness (20 points)
      if (this.location.address) score += 5;
      if (this.location.city) score += 5;
      if (this.location.lat && this.location.lng) score += 10;
      
      // Additional details (25 points)
      if (this.deadline) score += 5;
      if (this.estimatedDuration?.value) score += 5;
      if (this.attachments && this.attachments.length > 0) score += 10;
      if (this.experienceLevel) score += 5;
      
      // Engagement factors (15 points)
      if (this.views?.count > 10) score += 5;
      if (this.applications && this.applications.length > 0) score += 5;
      if (this.likes && this.likes.length > 0) score += 5;
      
      if (!this.adminMetadata) this.adminMetadata = {};
      this.adminMetadata.qualityScore = Math.min(score, 100);
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

// Method to update cached user info
jobSchema.methods.updateCreatedByInfo = function(userInfo) {
  this.createdByInfo = {
    username: userInfo.username,
    name: userInfo.name,
    email: userInfo.email,
    role: userInfo.role || 'user',
    isVerified: userInfo.isVerified || false,
    rating: userInfo.rating || 0,
    completedJobs: userInfo.completedJobs || 0,
    lastActiveAt: userInfo.lastActiveAt || new Date()
  };
  return this.save();
};

jobSchema.methods.updateAssignedToInfo = function(userInfo) {
  this.assignedToInfo = {
    username: userInfo.username,
    name: userInfo.name,
    email: userInfo.email,
    role: userInfo.role || 'user',
    isVerified: userInfo.isVerified || false,
    rating: userInfo.rating || 0,
    completedJobs: userInfo.completedJobs || 0,
    lastActiveAt: userInfo.lastActiveAt || new Date()
  };
  return this.save();
};

// Admin methods
jobSchema.methods.flagJob = function(userId, reason) {
  if (!this.adminMetadata) this.adminMetadata = {};
  if (!this.adminMetadata.flaggedBy) this.adminMetadata.flaggedBy = [];
  
  this.adminMetadata.flaggedBy.push({
    userId,
    reason,
    flaggedAt: new Date(),
    status: 'pending'
  });
  
  return this.save();
};

jobSchema.methods.updatePriority = function(priority, userId) {
  if (!this.adminMetadata) this.adminMetadata = {};
  this.adminMetadata.priority = priority;
  this.adminMetadata.lastModifiedBy = userId;
  return this.save();
};

jobSchema.methods.addAdminNote = function(note, userId) {
  if (!this.adminMetadata) this.adminMetadata = {};
  this.adminMetadata.adminNotes = note;
  this.adminMetadata.lastModifiedBy = userId;
  return this.save();
};

jobSchema.methods.promoteJob = function(userId, promotedUntil) {
  if (!this.adminMetadata) this.adminMetadata = {};
  this.adminMetadata.isPromoted = true;
  this.adminMetadata.promotedUntil = promotedUntil;
  this.adminMetadata.lastModifiedBy = userId;
  return this.save();
};

// Post-save middleware for notifications
jobSchema.post('save', function(doc) {
  // Send notifications for status changes
  if (doc.isModified('status')) {
    // Implementation would go here
  }
});

export default mongoose.models.Job || mongoose.model('Job', jobSchema);