'use client';

import { AlertTriangle, ArrowLeft, CheckCircle, Clock, Eye, Flag, MessageSquare, Scale } from 'lucide-react';

import { formatDateTime } from '@/app/dashboard/disputes/[disputeId]/_lib/dispute.helpers';
import type { DisputeDetail, DisputeStatus } from '@/app/dashboard/disputes/[disputeId]/_lib/dispute.types';

function getStatusIcon(status: DisputeStatus) {
  const iconClass = 'h-5 w-5';
  switch (status) {
    case 'pending':
      return <Clock className={`${iconClass} text-yellow-500`} />;
    case 'under_review':
      return <Eye className={`${iconClass} text-blue-500`} />;
    case 'awaiting_response':
      return <MessageSquare className={`${iconClass} text-orange-500`} />;
    case 'in_mediation':
      return <Scale className={`${iconClass} text-fixly-primary`} />;
    case 'resolved':
      return <CheckCircle className={`${iconClass} text-green-500`} />;
    case 'escalated':
      return <Flag className={`${iconClass} text-red-500`} />;
    default:
      return <AlertTriangle className={`${iconClass} text-gray-400`} />;
  }
}

function getStatusColor(status: DisputeStatus) {
  switch (status) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'under_review':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'awaiting_response':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'in_mediation':
      return 'bg-fixly-accent/20 text-fixly-primary border-fixly-accent/30';
    case 'resolved':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'escalated':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-600 border-gray-200';
  }
}

type DisputeHeaderProps = {
  dispute: DisputeDetail;
  onBack: () => void;
};

export function DisputeHeader({ dispute, onBack }: DisputeHeaderProps): React.JSX.Element {
  return (
    <div className="mb-8">
      <button
        onClick={onBack}
        className="mb-4 flex items-center text-fixly-text-light hover:text-fixly-accent"
      >
        <ArrowLeft className="mr-2 h-5 w-5" />
        Back to Disputes
      </button>

      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-4">
          <div className="rounded-lg bg-red-100 p-3">
            <Scale className="h-8 w-8 text-red-600" />
          </div>
          <div>
            <h1 className="mb-2 text-3xl font-bold text-fixly-text">{dispute.title}</h1>
            <div className="flex items-center space-x-4">
              <span
                className={`rounded-full border px-3 py-1 text-sm ${getStatusColor(dispute.status)}`}
              >
                {getStatusIcon(dispute.status)}
                <span className="ml-2">{dispute.status.replace(/_/g, ' ')}</span>
              </span>
              <span className="text-sm text-fixly-text-light">#{dispute.disputeId}</span>
              <span className="text-sm text-fixly-text-light">
                {formatDateTime(dispute.createdAt)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
