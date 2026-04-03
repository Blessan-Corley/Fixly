'use client';

import { AlertCircle, CheckCircle, Eye, Shield } from 'lucide-react';

import { formatDate } from '@/app/dashboard/admin/_lib/admin.helpers';
import type {
  VerificationAction,
  VerificationApplication,
  VerificationStatus,
} from '@/app/dashboard/admin/_lib/admin.types';

type AdminVerificationTabProps = {
  verificationFilter: VerificationStatus;
  applications: VerificationApplication[];
  onVerificationFilterChange: (value: VerificationStatus) => void;
  onOpenReview: (application: VerificationApplication) => void;
  onVerificationAction: (
    userId: string,
    action: VerificationAction,
    rejectionReason?: string
  ) => void;
};

export function AdminVerificationTab({
  verificationFilter,
  applications,
  onVerificationFilterChange,
  onOpenReview,
  onVerificationAction,
}: AdminVerificationTabProps): React.JSX.Element {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <select
          value={verificationFilter}
          onChange={(e) => onVerificationFilterChange(e.target.value as VerificationStatus)}
          className="select-field w-48"
        >
          <option value="pending">Pending Review</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-fixly-border">
              <th className="px-4 py-3 text-left font-medium text-fixly-text">Applicant</th>
              <th className="px-4 py-3 text-left font-medium text-fixly-text">Document Type</th>
              <th className="px-4 py-3 text-left font-medium text-fixly-text">Status</th>
              <th className="px-4 py-3 text-left font-medium text-fixly-text">Submitted</th>
              <th className="px-4 py-3 text-left font-medium text-fixly-text">Actions</th>
            </tr>
          </thead>
          <tbody>
            {applications.map((application) => (
              <tr key={application.id} className="border-b border-fixly-border hover:bg-fixly-bg">
                <td className="px-4 py-3">
                  <div>
                    <div className="font-medium text-fixly-text">{application.userName}</div>
                    <div className="text-sm text-fixly-text-muted">{application.userEmail}</div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-800">
                    {application.documentType.replace('_', ' ').toUpperCase()}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-medium ${
                      application.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : application.status === 'approved'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="text-sm text-fixly-text">{formatDate(application.submittedAt)}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onOpenReview(application)}
                      className="btn-ghost px-2 py-1 text-sm"
                    >
                      <Eye className="mr-1 h-4 w-4" />
                      Review
                    </button>
                    {application.status === 'pending' && (
                      <>
                        <button
                          onClick={() => onVerificationAction(application.id, 'approve')}
                          className="rounded bg-green-100 px-2 py-1 text-sm text-green-800 hover:bg-green-200"
                        >
                          <CheckCircle className="mr-1 h-4 w-4" />
                          Approve
                        </button>
                        <button
                          onClick={() => onOpenReview(application)}
                          className="rounded bg-red-100 px-2 py-1 text-sm text-red-800 hover:bg-red-200"
                        >
                          <AlertCircle className="mr-1 h-4 w-4" />
                          Reject
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {applications.length === 0 && (
        <div className="py-8 text-center">
          <Shield className="mx-auto mb-4 h-16 w-16 text-fixly-text-muted" />
          <h3 className="mb-2 text-lg font-medium text-fixly-text">
            No {verificationFilter} applications
          </h3>
          <p className="text-fixly-text-muted">
            {verificationFilter === 'pending'
              ? 'All verification applications have been reviewed.'
              : `No ${verificationFilter} verification applications found.`}
          </p>
        </div>
      )}
    </div>
  );
}
