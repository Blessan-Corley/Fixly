import mongoose from 'mongoose';

export type DisputeEvidenceType = 'image' | 'document' | 'screenshot' | 'chat_log';
export type DisputeSenderType = 'client' | 'fixer' | 'admin' | 'moderator';
export type DisputePriority = 'low' | 'medium' | 'high' | 'urgent';
export type DisputeStatus =
  | 'pending'
  | 'under_review'
  | 'awaiting_response'
  | 'in_mediation'
  | 'resolved'
  | 'escalated'
  | 'closed'
  | 'cancelled';
export type DisputeCategory =
  | 'payment_issue'
  | 'work_quality'
  | 'communication_problem'
  | 'scope_disagreement'
  | 'timeline_issue'
  | 'unprofessional_behavior'
  | 'contract_violation'
  | 'safety_concern'
  | 'other';
export type DisputeDesiredOutcome =
  | 'refund'
  | 'partial_refund'
  | 'work_completion'
  | 'work_revision'
  | 'additional_payment'
  | 'mediation'
  | 'other';

export interface DisputeEvidence {
  type: DisputeEvidenceType;
  url: string;
  filename?: string;
  description?: string;
  uploadedAt: Date;
}

export interface DisputeMessage {
  sender: mongoose.Types.ObjectId | string;
  senderType: DisputeSenderType;
  content: string;
  isPublic: boolean;
  timestamp: Date;
}

export interface DisputeTimelineEntry {
  action: string;
  performedBy?: mongoose.Types.ObjectId | string;
  description?: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface Dispute {
  job: mongoose.Types.ObjectId | string;
  disputeId: string;
  initiatedBy: mongoose.Types.ObjectId | string;
  againstUser: mongoose.Types.ObjectId | string;
  category: DisputeCategory;
  subcategory?: string;
  title: string;
  description: string;
  desiredOutcome: DisputeDesiredOutcome;
  desiredOutcomeDetails?: string;
  amount?: {
    disputedAmount?: number;
    refundRequested?: number;
    additionalPaymentRequested?: number;
  };
  priority: DisputePriority;
  status: DisputeStatus;
  evidence: DisputeEvidence[];
  timeline: DisputeTimelineEntry[];
  messages: DisputeMessage[];
  assignedModerator?: mongoose.Types.ObjectId | string;
  moderatorNotes?: string;
  response?: {
    respondedBy?: mongoose.Types.ObjectId | string;
    content?: string;
    counterEvidence?: DisputeEvidence[];
    respondedAt?: Date;
    acknowledgement?: 'acknowledge' | 'dispute' | 'counter_claim';
    counterClaim?: {
      category?: string;
      description?: string;
      desiredOutcome?: string;
      amount?: number;
    };
  };
  resolution?: {
    type?:
      | 'refund_full'
      | 'refund_partial'
      | 'additional_payment'
      | 'work_completion_required'
      | 'work_revision_required'
      | 'mutual_agreement'
      | 'no_action_required'
      | 'contract_termination'
      | 'warning_issued'
      | 'account_suspension';
    amount?: number;
    description?: string;
    agreedBy?: Array<{
      user: mongoose.Types.ObjectId | string;
      agreedAt?: Date;
      signature?: string;
    }>;
    implementedBy?: mongoose.Types.ObjectId | string;
    implementedAt?: Date;
    resolutionNotes?: string;
  };
  escalation?: {
    reason?: string;
    escalatedAt?: Date;
    escalatedBy?: mongoose.Types.ObjectId | string;
    escalatedTo?: string;
    externalCaseId?: string;
  };
  metadata: {
    automaticEscalationDate?: Date;
    lastResponseDate?: Date;
    responseDeadline?: Date;
    totalMessages: number;
    viewedBy: Array<{
      user: mongoose.Types.ObjectId | string;
      viewedAt?: Date;
    }>;
    flags: Array<{
      type?: 'urgent' | 'legal_review' | 'complex' | 'high_value' | 'repeat_offender';
      setBy?: mongoose.Types.ObjectId | string;
      setAt?: Date;
      reason?: string;
    }>;
  };
  isActive: boolean;
  closedAt?: Date;
  closedBy?: mongoose.Types.ObjectId | string;
  closureReason?: string;
  createdAt?: Date;
}

export type DisputeDocument = mongoose.HydratedDocument<Dispute, DisputeMethods>;

export interface DisputeStatistics {
  total: number;
  pending: number;
  underReview: number;
  inMediation: number;
  resolved: number;
  escalated: number;
  avgResolutionTime: number;
}

export interface DisputeMethods {
  addTimelineEntry(
    action: string,
    performedBy: string,
    description: string,
    metadata?: Record<string, unknown>
  ): Promise<DisputeDocument>;
  addMessage(
    sender: string,
    senderType: DisputeSenderType,
    content: string,
    isPublic?: boolean
  ): Promise<DisputeDocument>;
  changeStatus(
    newStatus: DisputeStatus,
    performedBy: string,
    description?: string
  ): Promise<DisputeDocument>;
  isOverdue(): boolean;
}

export interface DisputeModel extends mongoose.Model<Dispute, object, DisputeMethods> {
  getStatistics(filter?: Record<string, unknown>): Promise<DisputeStatistics>;
}
