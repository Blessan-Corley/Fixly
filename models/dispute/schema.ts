import mongoose from 'mongoose';

import type { Dispute, DisputeEvidence, DisputeMessage, DisputeModel, DisputeMethods } from './types';

export const EvidenceSchema = new mongoose.Schema<DisputeEvidence>({
  type: {
    type: String,
    enum: ['image', 'document', 'screenshot', 'chat_log'],
    required: true,
  },
  url: { type: String, required: true },
  filename: String,
  description: { type: String, maxlength: 500 },
  uploadedAt: { type: Date, default: Date.now },
});

export const MessageSchema = new mongoose.Schema<DisputeMessage>({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  senderType: {
    type: String,
    enum: ['client', 'fixer', 'admin', 'moderator'],
    required: true,
  },
  content: { type: String, required: true, maxlength: 2000 },
  isPublic: { type: Boolean, default: true },
  timestamp: { type: Date, default: Date.now },
});

export const DisputeSchema = new mongoose.Schema<Dispute, DisputeModel, DisputeMethods>(
  {
    job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
    disputeId: { type: String, unique: true, required: true },
    initiatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    againstUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
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
        'other',
      ],
      required: true,
    },
    subcategory: { type: String, maxlength: 100 },
    title: { type: String, required: true, maxlength: 150 },
    description: { type: String, required: true, maxlength: 2000 },
    desiredOutcome: {
      type: String,
      enum: [
        'refund',
        'partial_refund',
        'work_completion',
        'work_revision',
        'additional_payment',
        'mediation',
        'other',
      ],
      required: true,
    },
    desiredOutcomeDetails: { type: String, maxlength: 1000 },
    amount: {
      disputedAmount: Number,
      refundRequested: Number,
      additionalPaymentRequested: Number,
    },
    priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
    status: {
      type: String,
      enum: [
        'pending',
        'under_review',
        'awaiting_response',
        'in_mediation',
        'resolved',
        'escalated',
        'closed',
        'cancelled',
      ],
      default: 'pending',
    },
    evidence: [EvidenceSchema],
    timeline: [
      {
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
            'dispute_closed',
          ],
          required: true,
        },
        performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        description: String,
        timestamp: { type: Date, default: Date.now },
        metadata: mongoose.Schema.Types.Mixed,
      },
    ],
    messages: [MessageSchema],
    assignedModerator: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    moderatorNotes: { type: String, maxlength: 2000 },
    response: {
      respondedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      content: { type: String, maxlength: 2000 },
      counterEvidence: [EvidenceSchema],
      respondedAt: Date,
      acknowledgement: { type: String, enum: ['acknowledge', 'dispute', 'counter_claim'] },
      counterClaim: {
        category: String,
        description: String,
        desiredOutcome: String,
        amount: Number,
      },
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
          'account_suspension',
        ],
      },
      amount: Number,
      description: String,
      agreedBy: [
        {
          user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
          agreedAt: Date,
          signature: String,
        },
      ],
      implementedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      implementedAt: Date,
      resolutionNotes: String,
    },
    escalation: {
      reason: String,
      escalatedAt: Date,
      escalatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      escalatedTo: String,
      externalCaseId: String,
    },
    metadata: {
      automaticEscalationDate: Date,
      lastResponseDate: Date,
      responseDeadline: Date,
      totalMessages: { type: Number, default: 0 },
      viewedBy: [
        {
          user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
          viewedAt: Date,
        },
      ],
      flags: [
        {
          type: {
            type: String,
            enum: ['urgent', 'legal_review', 'complex', 'high_value', 'repeat_offender'],
          },
          setBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
          setAt: Date,
          reason: String,
        },
      ],
    },
    isActive: { type: Boolean, default: true },
    closedAt: Date,
    closedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    closureReason: String,
  },
  { timestamps: true }
);
