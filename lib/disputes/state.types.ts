export type ApiDisputeStatus =
  | 'pending'
  | 'under_review'
  | 'awaiting_response'
  | 'in_mediation'
  | 'resolved'
  | 'escalated'
  | 'closed'
  | 'cancelled';

export type TimelineEntry = {
  action: string;
  performedBy?: unknown;
  description?: string;
  timestamp: Date;
};

export type DisputeDocumentLike = {
  job?: unknown;
  status: ApiDisputeStatus;
  isActive?: boolean;
  closedAt?: Date;
  closedBy?: unknown;
  closureReason?: string;
  moderatorNotes?: string;
  assignedModerator?: unknown;
  response?: {
    respondedBy?: unknown;
    content?: string;
    counterEvidence?: Array<{
      type: 'image' | 'document' | 'screenshot' | 'chat_log';
      url: string;
      filename?: string;
      description?: string;
      uploadedAt: Date;
    }>;
    respondedAt?: Date;
    acknowledgement?: 'acknowledge' | 'dispute' | 'counter_claim';
    counterClaim?: {
      category?: string;
      description?: string;
      desiredOutcome?: string;
      amount?: number;
    };
  };
  timeline: TimelineEntry[];
};

export type RespondentResponseInput = {
  content: string;
  counterEvidence: Array<{
    type: 'image' | 'document' | 'screenshot' | 'chat_log';
    url: string;
    filename?: string;
    description?: string;
    uploadedAt: Date;
  }>;
  acknowledgement: 'acknowledge' | 'dispute' | 'counter_claim';
  counterClaim?: {
    category?: string;
    description?: string;
    desiredOutcome?: string;
    amount?: number;
  };
};

export type DisputeEvidenceInput = {
  type: 'image' | 'document' | 'screenshot' | 'chat_log';
  url: string;
  filename?: string;
  description?: string;
  uploadedAt?: Date;
};

export type DisputePriority = 'low' | 'medium' | 'high' | 'urgent';

export type CreateDisputeRecordInput = {
  jobId: string;
  initiatedBy: string;
  againstUser: string;
  category: string;
  subcategory?: string;
  title: string;
  description: string;
  desiredOutcome: string;
  desiredOutcomeDetails?: string;
  amount?: {
    disputedAmount?: number;
    refundRequested?: number;
    additionalPaymentRequested?: number;
  };
  priority: DisputePriority;
  evidence: DisputeEvidenceInput[];
};

export type ActiveDisputeRef = {
  _id: unknown;
  disputeId: string;
};
