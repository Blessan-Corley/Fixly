import connectDB from '@/lib/mongodb';
import Dispute from '@/models/Dispute';

export async function getDisputeById(disputeId: string) {
  await connectDB();
  return Dispute.findOne({ disputeId }).lean();
}
