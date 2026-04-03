export type DisputeStatus =
  | 'pending'
  | 'under_review'
  | 'awaiting_response'
  | 'in_mediation'
  | 'resolved'
  | 'escalated'
  | 'closed'
  | 'cancelled';

export type SenderType = 'client' | 'fixer' | 'admin' | 'moderator';
export type ResponseAcknowledgement = 'acknowledge' | 'dispute' | 'counter_claim';

export interface DisputeParty {
  _id: string;
  name: string;
  username: string;
  photoURL: string;
  role: string;
}

export interface DisputeAmount {
  disputedAmount: number;
  refundRequested: number;
  additionalPaymentRequested: number;
}

export interface DisputeEvidence {
  type: 'image' | 'document' | 'screenshot' | 'chat_log';
  url: string;
  filename: string;
  description: string;
}

export interface DisputeMessage {
  sender: DisputeParty;
  senderType: SenderType;
  content: string;
  timestamp: string;
}

export interface DisputeCounterClaim {
  category: string;
  description: string;
  desiredOutcome: string;
  amount: number | null;
}

export interface DisputeResponse {
  respondedBy: string;
  content: string;
  respondedAt: string;
  acknowledgement: ResponseAcknowledgement;
  counterClaim: DisputeCounterClaim | null;
}

export interface DisputeTimelineEntry {
  action: string;
  description: string;
  timestamp: string;
}

export interface DisputeJobSummary {
  _id: string;
  title: string;
  category: string;
  status: string;
  budgetAmount: number | null;
}

export interface DisputeDetail {
  disputeId: string;
  title: string;
  description: string;
  category: string;
  subcategory: string;
  desiredOutcome: string;
  desiredOutcomeDetails: string;
  status: DisputeStatus;
  createdAt: string;
  initiatedBy: DisputeParty;
  againstUser: DisputeParty;
  assignedModerator: DisputeParty | null;
  amount: DisputeAmount;
  evidence: DisputeEvidence[];
  response: DisputeResponse | null;
  messages: DisputeMessage[];
  timeline: DisputeTimelineEntry[];
  job: DisputeJobSummary | null;
}

export interface ResponseFormData {
  content: string;
  acknowledgement: ResponseAcknowledgement;
  counterClaim: {
    category: string;
    description: string;
    desiredOutcome: string;
    amount: string;
  };
}
