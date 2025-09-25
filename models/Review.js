// models/Review.js
import mongoose from 'mongoose';

const ReviewSchema = new mongoose.Schema({
  job: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true
  },
  reviewer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  reviewee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  reviewType: {
    type: String,
    enum: ['client_to_fixer', 'fixer_to_client'],
    required: true
  },
  rating: {
    overall: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    // For client_to_fixer reviews
    workQuality: {
      type: Number,
      min: 1,
      max: 5
    },
    communication: {
      type: Number,
      min: 1,
      max: 5
    },
    punctuality: {
      type: Number,
      min: 1,
      max: 5
    },
    professionalism: {
      type: Number,
      min: 1,
      max: 5
    },
    // For fixer_to_client reviews
    clarity: {
      type: Number,
      min: 1,
      max: 5
    },
    responsiveness: {
      type: Number,
      min: 1,
      max: 5
    },
    paymentTimeliness: {
      type: Number,
      min: 1,
      max: 5
    }
  },
  title: {
    type: String,
    required: true,
    maxlength: 100,
    trim: true
  },
  comment: {
    type: String,
    required: true,
    maxlength: 1000,
    trim: true
  },
  pros: [{
    type: String,
    maxlength: 200,
    trim: true
  }],
  cons: [{
    type: String,
    maxlength: 200,
    trim: true
  }],
  wouldRecommend: {
    type: Boolean,
    default: true
  },
  wouldHireAgain: {
    type: Boolean // Only for client_to_fixer reviews
  },
  tags: [{
    type: String,
    enum: [
      'excellent_work', 'on_time', 'great_communication', 'professional',
      'exceeded_expectations', 'fair_price', 'clean_work', 'polite',
      'experienced', 'reliable', 'creative', 'efficient',
      'poor_quality', 'late', 'unprofessional', 'overpriced',
      'miscommunication', 'incomplete', 'rude', 'inexperienced'
    ]
  }],
  attachments: [{
    type: {
      type: String,
      enum: ['image', 'document']
    },
    url: String,
    filename: String,
    description: String
  }],
  isPublic: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verifiedAt: Date,
  response: {
    comment: {
      type: String,
      maxlength: 500,
      trim: true
    },
    respondedAt: {
      type: Date
    }
  },
  helpfulVotes: {
    count: {
      type: Number,
      default: 0
    },
    users: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }]
  },
  reportedBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reason: {
      type: String,
      enum: ['inappropriate', 'spam', 'false_review', 'personal_attack', 'other']
    },
    description: String,
    reportedAt: {
      type: Date,
      default: Date.now
    }
  }],
  status: {
    type: String,
    enum: ['pending', 'published', 'hidden', 'removed'],
    default: 'pending'
  },
  moderationNotes: String,
  publishedAt: Date
}, {
  timestamps: true
});

// Indexes for better query performance
ReviewSchema.index({ job: 1, reviewer: 1 }, { unique: true }); // One review per reviewer per job
ReviewSchema.index({ reviewee: 1, rating: -1 });
ReviewSchema.index({ createdAt: -1 });
ReviewSchema.index({ status: 1, isPublic: 1 });
ReviewSchema.index({ 'rating.overall': -1 });

// Virtual for average detailed rating
ReviewSchema.virtual('averageDetailedRating').get(function() {
  const ratings = [];
  
  if (this.reviewType === 'client_to_fixer') {
    if (this.rating.workQuality) ratings.push(this.rating.workQuality);
    if (this.rating.communication) ratings.push(this.rating.communication);
    if (this.rating.punctuality) ratings.push(this.rating.punctuality);
    if (this.rating.professionalism) ratings.push(this.rating.professionalism);
  } else {
    if (this.rating.clarity) ratings.push(this.rating.clarity);
    if (this.rating.responsiveness) ratings.push(this.rating.responsiveness);
    if (this.rating.paymentTimeliness) ratings.push(this.rating.paymentTimeliness);
  }
  
  return ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : this.rating.overall;
});

// Method to mark as helpful
ReviewSchema.methods.markAsHelpful = function(userId) {
  if (!this.helpfulVotes.users.includes(userId)) {
    this.helpfulVotes.users.push(userId);
    this.helpfulVotes.count += 1;
    return this.save();
  }
  return Promise.resolve(this);
};

// Method to remove helpful vote
ReviewSchema.methods.removeHelpfulVote = function(userId) {
  const index = this.helpfulVotes.users.indexOf(userId);
  if (index > -1) {
    this.helpfulVotes.users.splice(index, 1);
    this.helpfulVotes.count = Math.max(0, this.helpfulVotes.count - 1);
    return this.save();
  }
  return Promise.resolve(this);
};

// Static method to get average rating for a user
ReviewSchema.statics.getAverageRating = async function(userId) {
  const result = await this.aggregate([
    {
      $match: {
        reviewee: new mongoose.Types.ObjectId(userId),
        status: 'published',
        isPublic: true
      }
    },
    {
      $group: {
        _id: null,
        averageOverall: { $avg: '$rating.overall' },
        totalReviews: { $sum: 1 },
        ratingDistribution: {
          $push: '$rating.overall'
        }
      }
    }
  ]);

  if (result.length === 0) {
    return {
      average: 0,
      total: 0,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    };
  }

  const data = result[0];
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  
  data.ratingDistribution.forEach(rating => {
    const roundedRating = Math.round(rating);
    distribution[roundedRating] = (distribution[roundedRating] || 0) + 1;
  });

  return {
    average: Math.round(data.averageOverall * 10) / 10,
    total: data.totalReviews,
    distribution
  };
};

// Static method to get detailed ratings breakdown
ReviewSchema.statics.getDetailedRatings = async function(userId, reviewType = 'client_to_fixer') {
  const matchStage = {
    reviewee: new mongoose.Types.ObjectId(userId),
    reviewType,
    status: 'published',
    isPublic: true
  };

  const groupStage = reviewType === 'client_to_fixer' ? {
    _id: null,
    workQuality: { $avg: '$rating.workQuality' },
    communication: { $avg: '$rating.communication' },
    punctuality: { $avg: '$rating.punctuality' },
    professionalism: { $avg: '$rating.professionalism' },
    totalReviews: { $sum: 1 }
  } : {
    _id: null,
    clarity: { $avg: '$rating.clarity' },
    responsiveness: { $avg: '$rating.responsiveness' },
    paymentTimeliness: { $avg: '$rating.paymentTimeliness' },
    totalReviews: { $sum: 1 }
  };

  const result = await this.aggregate([
    { $match: matchStage },
    { $group: groupStage }
  ]);

  return result[0] || null;
};

// Pre-save middleware
ReviewSchema.pre('save', function(next) {
  if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  next();
});

// Post-save middleware to update user ratings
ReviewSchema.post('save', async function(doc) {
  if (doc.status === 'published') {
    try {
      const User = mongoose.model('User');
      const ratings = await this.constructor.getAverageRating(doc.reviewee);
      
      await User.findByIdAndUpdate(doc.reviewee, {
        'rating.average': ratings.average,
        'rating.count': ratings.total,
        'rating.distribution': ratings.distribution
      });
    } catch (error) {
      console.error('Error updating user rating:', error);
    }
  }
});

export default mongoose.models.Review || mongoose.model('Review', ReviewSchema);