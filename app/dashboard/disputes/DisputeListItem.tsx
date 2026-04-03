'use client';

import { motion } from 'framer-motion';
import { Calendar, DollarSign, MessageSquare, User } from 'lucide-react';
import Image from 'next/image';

import { formatDate, getCategoryIcon, getStatusColor, getStatusIcon } from './disputes.display';
import type { DisputeParty, DisputeRecord } from './disputes.types';

type DisputeListItemProps = {
  dispute: DisputeRecord;
  index: number;
  currentUserId: string | undefined;
  otherParty: DisputeParty;
  onClick: (disputeId: string) => void;
};

export default function DisputeListItem({
  dispute,
  index,
  currentUserId,
  otherParty,
  onClick,
}: DisputeListItemProps) {
  const isInitiator = dispute.initiatedBy._id === currentUserId;
  const disputedValue =
    dispute.amount?.disputedAmount ??
    dispute.amount?.refundRequested ??
    dispute.amount?.additionalPaymentRequested;
  const hasAmount = disputedValue !== undefined && disputedValue > 0;

  return (
    <motion.div
      key={dispute._id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="card cursor-pointer transition-shadow hover:shadow-md"
      onClick={() => onClick(dispute.disputeId)}
    >
      <div className="flex items-start justify-between">
        <div className="flex flex-1 items-start space-x-4">
          <div className="flex-shrink-0">
            <div className="rounded-lg bg-red-100 p-2">{getCategoryIcon(dispute.category)}</div>
          </div>

          <div className="min-w-0 flex-1">
            <div className="mb-2 flex items-center space-x-3">
              <h3 className="truncate font-semibold text-fixly-text">{dispute.title}</h3>
              <span
                className={`rounded-full border px-2 py-1 text-xs ${getStatusColor(dispute.status)}`}
              >
                {dispute.status.replace(/_/g, ' ')}
              </span>
              {dispute.priority === 'high' && (
                <span className="rounded-full bg-orange-100 px-2 py-1 text-xs text-orange-800">
                  High Priority
                </span>
              )}
              {dispute.priority === 'urgent' && (
                <span className="rounded-full bg-red-100 px-2 py-1 text-xs text-red-800">
                  Urgent
                </span>
              )}
            </div>

            <div className="mb-3 flex items-center space-x-4 text-sm text-fixly-text-light">
              <div className="flex items-center">
                <span className="capitalize">{dispute.category.replace(/_/g, ' ')}</span>
              </div>
              <div className="flex items-center">
                <Calendar className="mr-1 h-4 w-4" />
                {formatDate(dispute.createdAt)}
              </div>
              <div className="flex items-center">
                <span className="text-xs">#{dispute.disputeId}</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-fixly-accent-light">
                    {otherParty.photoURL ? (
                      <Image
                        src={otherParty.photoURL}
                        alt={`${otherParty.name} profile photo`}
                        width={24}
                        height={24}
                        unoptimized
                        className="h-6 w-6 rounded-full object-cover"
                      />
                    ) : (
                      <User className="h-3 w-3 text-fixly-accent" />
                    )}
                  </div>
                  <span className="text-sm text-fixly-text-light">
                    {isInitiator ? 'Against' : 'From'}: {otherParty.name}
                  </span>
                </div>

                {dispute.job && (
                  <div className="text-sm text-fixly-text-light">Job: {dispute.job.title}</div>
                )}
              </div>

              <div className="flex items-center space-x-3">
                {hasAmount && (
                  <div className="flex items-center text-sm text-fixly-text-light">
                    <DollarSign className="mr-1 h-4 w-4" />₹
                    {(disputedValue ?? 0).toLocaleString()}
                  </div>
                )}

                {dispute.metadata.totalMessages > 0 && (
                  <div className="flex items-center text-sm text-fixly-text-light">
                    <MessageSquare className="mr-1 h-4 w-4" />
                    {dispute.metadata.totalMessages}
                  </div>
                )}

                <div className="flex items-center text-sm text-fixly-text-light">
                  {getStatusIcon(dispute.status)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
