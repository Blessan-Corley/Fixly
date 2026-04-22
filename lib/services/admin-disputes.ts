// Phase 2: Replaced admin dispute stub access with shared dispute moderation services.
import {
  applyAdminDisputeStatusUpdate,
  syncJobDisputeState,
  type ApiDisputeStatus,
} from '@/lib/disputes/state';
import { logger } from '@/lib/logger';
import connectDB from '@/lib/mongodb';
import Dispute from '@/models/Dispute';
import User from '@/models/User';

export type AdminDisputesPagination = {
  page: number;
  limit: number;
};

export type AdminDisputesListFilters = AdminDisputesPagination & {
  status?: ApiDisputeStatus;
};

export type AdminDisputesListResult = {
  items: Array<Record<string, unknown>>;
  total: number;
};

export type UpdateAdminDisputeInput = {
  disputeId: string;
  status: ApiDisputeStatus;
  moderatorNotes?: string;
  assignedModerator?: string;
  adminUserId: string;
};

export async function listAdminDisputes(
  filters: AdminDisputesListFilters
): Promise<AdminDisputesListResult> {
  await connectDB();

  const query: Record<string, unknown> = {};
  if (filters.status) {
    query.status = filters.status;
  }

  const skip = (filters.page - 1) * filters.limit;
  const [items, total] = await Promise.all([
    Dispute.find(query)
      .populate('job', 'title status category budget')
      .populate('initiatedBy', 'name username email photoURL role')
      .populate('againstUser', 'name username email photoURL role')
      .populate('assignedModerator', 'name username email photoURL role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(filters.limit)
      .lean<Array<Record<string, unknown>>>(),
    Dispute.countDocuments(query),
  ]);

  return { items, total };
}

export async function updateAdminDisputeStatus(
  input: UpdateAdminDisputeInput
): Promise<Record<string, unknown> | null> {
  await connectDB();

  const dispute = await Dispute.findOne({ disputeId: input.disputeId });
  if (!dispute) {
    return null;
  }

  applyAdminDisputeStatusUpdate(
    dispute,
    input.status,
    input.adminUserId,
    input.moderatorNotes,
    input.assignedModerator
  );

  await dispute.save();
  await syncJobDisputeState({
    jobId: dispute.job,
    status: input.status,
    resolution: dispute.closureReason,
    resolvedBy: input.adminUserId,
    disputeId: dispute.disputeId,
  });

  // Notify both participants when a dispute is resolved or closed
  const isTerminal = input.status === 'resolved' || input.status === 'closed';
  if (isTerminal) {
    const resolution = dispute.closureReason ?? `Dispute ${input.status}`;
    const participantIds = [
      String(dispute.initiatedBy),
      String(dispute.againstUser),
    ].filter(Boolean);

    await Promise.all(
      participantIds.map(async (userId) => {
        try {
          const recipient = await User.findById(userId);
          if (!recipient) return;
          await recipient.addNotification(
            'dispute_resolved',
            'Dispute Resolved',
            `Your dispute has been ${input.status}. ${resolution}`,
            { disputeId: dispute.disputeId, resolution }
          );
        } catch (err) {
          logger.error(
            { err, userId, disputeId: dispute.disputeId },
            'Failed to notify user of dispute resolution'
          );
        }
      })
    );
  }

  return Dispute.findById(dispute._id)
    .populate('job', 'title status category budget')
    .populate('initiatedBy', 'name username email photoURL role')
    .populate('againstUser', 'name username email photoURL role')
    .populate('assignedModerator', 'name username email photoURL role')
    .lean<Record<string, unknown> | null>();
}
