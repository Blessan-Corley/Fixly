import Dispute from '@/models/Dispute';
import Job from '@/models/Job';

import { mapJobDisputeStatus, toIdString } from './state.helpers';
import type { ActiveDisputeRef, ApiDisputeStatus, CreateDisputeRecordInput } from './state.types';

export async function syncJobDisputeOpened(input: {
  jobId: string;
  initiatedBy: string;
  reason: string;
  description: string;
}): Promise<void> {
  await Job.findByIdAndUpdate(input.jobId, {
    status: 'disputed',
    dispute: {
      raised: true,
      raisedBy: input.initiatedBy,
      reason: input.reason,
      description: input.description,
      createdAt: new Date(),
      status: 'pending',
    },
  });
}

export async function findActiveDisputeForJob(jobId: string): Promise<ActiveDisputeRef | null> {
  const existingDispute = await Dispute.findOne({
    job: jobId,
    isActive: true,
    status: { $nin: ['resolved', 'closed', 'cancelled'] },
  })
    .select('_id disputeId')
    .lean();

  if (!existingDispute?._id || typeof existingDispute.disputeId !== 'string') {
    return null;
  }

  return {
    _id: existingDispute._id,
    disputeId: existingDispute.disputeId,
  };
}

export async function createDisputeRecord(
  input: CreateDisputeRecordInput
): Promise<ActiveDisputeRef> {
  const dispute = new Dispute({
    job: input.jobId,
    initiatedBy: input.initiatedBy,
    againstUser: input.againstUser,
    category: input.category,
    subcategory: input.subcategory,
    title: input.title,
    description: input.description,
    desiredOutcome: input.desiredOutcome,
    desiredOutcomeDetails: input.desiredOutcomeDetails,
    amount: input.amount,
    priority: input.priority,
    evidence: input.evidence.map((item) => ({
      ...item,
      uploadedAt: item.uploadedAt ?? new Date(),
    })),
    status: 'pending',
    isActive: true,
  });

  dispute.timeline.push({
    action: 'dispute_created',
    performedBy: input.initiatedBy,
    description: 'Dispute created and submitted for review',
    timestamp: new Date(),
  });

  await dispute.save();
  await syncJobDisputeOpened({
    jobId: input.jobId,
    initiatedBy: input.initiatedBy,
    reason: input.category,
    description: input.description,
  });

  return {
    _id: dispute._id,
    disputeId: dispute.disputeId,
  };
}

export async function syncJobDisputeState(input: {
  jobId: unknown;
  status: ApiDisputeStatus;
  resolution?: string;
  resolvedBy?: string;
}): Promise<void> {
  const jobId = toIdString(input.jobId);
  if (!jobId) return;

  const disputeStatus = mapJobDisputeStatus(input.status);
  const update: Record<string, unknown> = { 'dispute.status': disputeStatus };

  if (disputeStatus === 'resolved' || disputeStatus === 'closed') {
    update['dispute.resolution'] = input.resolution ?? `Dispute ${input.status}`;
    update['dispute.resolvedBy'] = input.resolvedBy;
    update['dispute.resolvedAt'] = new Date();
  }

  await Job.findByIdAndUpdate(jobId, update);
}
