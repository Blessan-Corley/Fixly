import {
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  Eye,
  FileText,
  Flag,
  MessageSquare,
  Scale,
  Shield,
  XCircle,
} from 'lucide-react';
import type { ReactNode } from 'react';

import type { DisputeCategory, DisputeStatus } from './disputes.types';

export function formatDate(dateValue: string): string {
  const timestamp = new Date(dateValue);
  if (Number.isNaN(timestamp.getTime())) {
    return 'Unknown date';
  }

  return timestamp.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function getStatusIcon(status: DisputeStatus): ReactNode {
  const iconClass = 'h-4 w-4';
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
    case 'closed':
      return <XCircle className={`${iconClass} text-gray-500`} />;
    case 'cancelled':
      return <XCircle className={`${iconClass} text-gray-400`} />;
    default:
      return <AlertTriangle className={`${iconClass} text-gray-400`} />;
  }
}

export function getStatusColor(status: DisputeStatus): string {
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
    case 'closed':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    case 'cancelled':
      return 'bg-gray-100 text-gray-600 border-gray-200';
    default:
      return 'bg-gray-100 text-gray-600 border-gray-200';
  }
}

export function getCategoryIcon(category: DisputeCategory): ReactNode {
  const iconClass = 'h-4 w-4';
  switch (category) {
    case 'payment_issue':
      return <DollarSign className={iconClass} />;
    case 'work_quality':
      return <Shield className={iconClass} />;
    case 'communication_problem':
      return <MessageSquare className={iconClass} />;
    case 'timeline_issue':
      return <Clock className={iconClass} />;
    case 'safety_concern':
      return <AlertTriangle className={iconClass} />;
    default:
      return <FileText className={iconClass} />;
  }
}
