// models/Dispute.js
import mongoose from 'mongoose';

const EvidenceSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['image', 'document', 'screenshot', 'chat_log'],
    required: true
  },
  url: {
    type: String,
    required: true
  },
  filename: String,
  description: {
    type: String,
    maxlength: 500
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  }
});

const MessageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  senderType: {
    type: String,
    enum: ['client', 'fixer', 'admin', 'moderator'],
    required: true
  },
  content: {
    type: String,
    required: true,
    maxlength: 2000
  },
  isPublic: {
    type: Boolean,
    default: true // Whether both parties can see this message
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const DisputeSchema = new mongoose.Schema({
  job: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true
  },
  disputeId: {
    type: String,
    unique: true,
    required: true
  },
  initiatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  againstUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  category: {
    type: String,
    enum: [
      'payment_issue',
      'work_quality',
      'communication_problem',
      'scope_disagreement',
      'timeline_issue',
      'unprofessional_behavior',
      'contract_violation',
      'safety_concern',
      'other'
    ],
    required: true
  },
  subcategory: {
    type: String,
    maxlength: 100
  },
  title: {
    type: String,
    required: true,
    maxlength: 150
  },
  description: {
    type: String,
    required: true,
    maxlength: 2000
  },
  desiredOutcome: {
    type: String,
    enum: [
      'refund',
      'partial_refund',
      'work_completion',
      'work_revision',
      'additional_payment',
      'mediation',
      'other'
    ],
    required: true
  },
  desiredOutcomeDetails: {
    type: String,
    maxlength: 1000
  },
  amount: {
    disputedAmount: Number,
    refundRequested: Number,
    additionalPaymentRequested: Number
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: [
      'pending',           // Just submitted, waiting for initial review
      'under_review',      // Being reviewed by admin
      'awaiting_response', // Waiting for other party's response
      'in_mediation',      // In mediation process
      'resolved',          // Resolved by agreement
      'escalated',         // Escalated to higher authority
      'closed',            // Closed without resolution
      'cancelled'          // Cancelled by initiator
    ],
    default: 'pending'
  },
  evidence: [EvidenceSchema],
  timeline: [{
    action: {
      type: String,
      enum: [
        'dispute_created',
        'response_submitted',
        'evidence_added',
        'admin_review_started',
        'mediation_started',
        'resolution_proposed',
        'resolution_accepted',
        'resolution_rejected',
        'dispute_escalated',
        'dispute_resolved',
        'dispute_closed'
      ],
      required: true
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    description: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    metadata: mongoose.Schema.Types.Mixed
  }],
  messages: [MessageSchema],
  assignedModerator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  moderatorNotes: {
    type: String,
    maxlength: 2000
  },
  response: {
    respondedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    content: {
      type: String,
      maxlength: 2000
    },
    counterEvidence: [EvidenceSchema],
    respondedAt: Date,
    acknowledgement: {
      type: String,
      enum: ['acknowledge', 'dispute', 'counter_claim']
    },
    counterClaim: {
      category: String,
      description: String,
      desiredOutcome: String,
      amount: Number
    }
  },
  resolution: {
    type: {
      type: String,
      enum: [
        'refund_full',
        'refund_partial',
        'additional_payment',
        'work_completion_required',
        'work_revision_required',
        'mutual_agreement',
        'no_action_required',
        'contract_termination',
        'warning_issued',
        'account_suspension'
      ]
    },
    amount: Number,
    description: String,
    agreedBy: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      agreedAt: Date,
      signature: String
    }],
    implementedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    implementedAt: Date,
    resolutionNotes: String
  },
  escalation: {
    reason: String,
    escalatedAt: Date,
    escalatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    escalatedTo: String, // External arbitration service
    externalCaseId: String
  },
  metadata: {
    automaticEscalationDate: Date,
    lastResponseDate: Date,
    responseDeadline: Date,
    totalMessages: {
      type: Number,
      default: 0
    },
    viewedBy: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      viewedAt: Date
    }],
    flags: [{
      type: {
        type: String,
        enum: ['urgent', 'legal_review', 'complex', 'high_value', 'repeat_offender']
      },
      setBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      setAt: Date,
      reason: String
    }]
  },
  isActive: {
    type: Boolean,
    default: true
  },
  closedAt: Date,
  closedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  closureReason: String
}, {
  timestamps: true
});

// Indexes for better query performance
DisputeSchema.index({ job: 1 });
DisputeSchema.index({ initiatedBy: 1 });
DisputeSchema.index({ againstUser: 1 });
DisputeSchema.index({ status: 1 });
DisputeSchema.index({ assignedModerator: 1 });
DisputeSchema.index({ category: 1 });
DisputeSchema.index({ createdAt: -1 });
DisputeSchema.index({ 'resolution.implementedAt': -1 });

// Pre-save middleware to generate dispute ID
DisputeSchema.pre('save', async function(next) {
  if (this.isNew && !this.disputeId) {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const day = String(new Date().getDate()).padStart(2, '0');
    const random = Math.random().toString(36).substr(2, 6).toUpperCase();
    this.disputeId = `DSP-${year}${month}${day}-${random}`;
  }
  
  // Update response deadline if status changes
  if (this.isModified('status') && this.status === 'awaiting_response') {
    this.metadata.responseDeadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  }

  // Set automatic escalation date
  if (this.isModified('status') && this.status === 'in_mediation') {
    this.metadata.automaticEscalationDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 days
  }

  next();
});

// Method to add timeline entry
DisputeSchema.methods.addTimelineEntry = function(action, performedBy, description, metadata = {}) {
  this.timeline.push({
    action,
    performedBy,
    description,
    metadata,
    timestamp: new Date()
  });
  return this.save();
};

// Method to add message
DisputeSchema.methods.addMessage = function(sender, senderType, content, isPublic = true) {
  this.messages.push({
    sender,
    senderType,
    content,
    isPublic,
    timestamp: new Date()
  });
  
  this.metadata.totalMessages = this.messages.length;
  this.metadata.lastResponseDate = new Date();
  
  return this.save();
};

// Method to change status
DisputeSchema.methods.changeStatus = function(newStatus, performedBy, description) {
  const oldStatus = this.status;
  this.status = newStatus;
  
  this.addTimelineEntry(
    `status_changed_to_${newStatus}`,
    performedBy,
    description || `Status changed from ${oldStatus} to ${newStatus}`
  );
  
  return this.save();
};

// Static method to get dispute statistics
DisputeSchema.statics.getStatistics = async function(filter = {}) {
  const pipeline = [
    { $match: filter },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
        underReview: { $sum: { $cond: [{ $eq: ['$status', 'under_review'] }, 1, 0] } },
        inMediation: { $sum: { $cond: [{ $eq: ['$status', 'in_mediation'] }, 1, 0] } },
        resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
        escalated: { $sum: { $cond: [{ $eq: ['$status', 'escalated'] }, 1, 0] } },
        avgResolutionTime: { $avg: { $subtract: ['$resolution.implementedAt', '$createdAt'] } }
      }
    }
  ];

  const result = await this.aggregate(pipeline);
  return result[0] || {
    total: 0,
    pending: 0,
    underReview: 0,
    inMediation: 0,
    resolved: 0,
    escalated: 0,
    avgResolutionTime: 0
  };
};

// Method to check if dispute is overdue
DisputeSchema.methods.isOverdue = function() {
  if (this.status === 'awaiting_response' && this.metadata.responseDeadline) {
    return new Date() > this.metadata.responseDeadline;
  }
  
  if (this.status === 'in_mediation' && this.metadata.automaticEscalationDate) {
    return new Date() > this.metadata.automaticEscalationDate;
  }
  
  return false;
};

// Virtual for other party
DisputeSchema.virtual('otherParty').get(function() {
  return this.againstUser;
});

// Virtual for dispute age in days
DisputeSchema.virtual('ageInDays').get(function() {
  return Math.floor((new Date() - this.createdAt) / (1000 * 60 * 60 * 24));
});

export default mongoose.models.Dispute || mongoose.model('Dispute', DisputeSchema);