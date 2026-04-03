'use client';

import { DollarSign, Reply, Shield, User } from 'lucide-react';
import NextImage from 'next/image';

import { formatCurrency, formatDateTime } from '@/app/dashboard/disputes/[disputeId]/_lib/dispute.helpers';
import type { DisputeDetail } from '@/app/dashboard/disputes/[disputeId]/_lib/dispute.types';

type DisputeSidebarProps = {
  dispute: DisputeDetail;
  canRespond: boolean;
  showResponseForm: boolean;
  onOpenResponseForm: () => void;
  onViewJob: (jobId: string) => void;
};

export function DisputeSidebar({
  dispute,
  canRespond,
  showResponseForm,
  onOpenResponseForm,
  onViewJob,
}: DisputeSidebarProps): React.JSX.Element {
  const disputeJob = dispute.job;

  return (
    <div className="space-y-6">
      <div className="card">
        <h3 className="mb-4 text-lg font-semibold text-fixly-text">Related Job</h3>
        {disputeJob ? (
          <div className="space-y-3">
            <div>
              <h4 className="font-medium text-fixly-text">{disputeJob.title}</h4>
              <p className="text-sm capitalize text-fixly-text-light">{disputeJob.category}</p>
            </div>
            <div className="flex items-center text-sm text-fixly-text-light">
              <DollarSign className="mr-2 h-4 w-4" />
              {formatCurrency(disputeJob.budgetAmount)}
            </div>
            <div className="flex items-center text-sm text-fixly-text-light">
              <span className="capitalize">Status: {disputeJob.status}</span>
            </div>
            <button
              onClick={() => onViewJob(disputeJob._id)}
              className="btn-ghost w-full text-sm"
            >
              View Job Details
            </button>
          </div>
        ) : (
          <p className="text-fixly-text-light">Job information not available</p>
        )}
      </div>

      <div className="card">
        <h3 className="mb-4 text-lg font-semibold text-fixly-text">Participants</h3>
        <div className="space-y-4">
          {[
            { label: 'Initiated By', party: dispute.initiatedBy },
            { label: 'Against', party: dispute.againstUser },
          ].map(({ label, party }) => (
            <div key={label}>
              <h4 className="mb-2 text-sm font-medium text-fixly-text">{label}</h4>
              <div className="flex items-center space-x-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-fixly-accent-light">
                  {party.photoURL ? (
                    <NextImage
                      src={party.photoURL}
                      alt={`${party.name} profile photo`}
                      width={40}
                      height={40}
                      unoptimized
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <User className="h-5 w-5 text-fixly-accent" />
                  )}
                </div>
                <div>
                  <h5 className="font-medium text-fixly-text">{party.name}</h5>
                  <p className="text-sm text-fixly-text-light">@{party.username}</p>
                </div>
              </div>
            </div>
          ))}

          {dispute.assignedModerator && (
            <div>
              <h4 className="mb-2 text-sm font-medium text-fixly-text">Assigned Moderator</h4>
              <div className="flex items-center space-x-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                  <Shield className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <h5 className="font-medium text-fixly-text">{dispute.assignedModerator.name}</h5>
                  <p className="text-sm capitalize text-fixly-text-light">
                    {dispute.assignedModerator.role}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <h3 className="mb-4 text-lg font-semibold text-fixly-text">Timeline</h3>
        <div className="space-y-3">
          {dispute.timeline.map((entry, index) => (
            <div key={index} className="flex items-start space-x-3">
              <div className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-fixly-accent"></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-fixly-text">{entry.action.replace(/_/g, ' ')}</p>
                {entry.description && (
                  <p className="text-xs text-fixly-text-light">{entry.description}</p>
                )}
                <p className="text-xs text-fixly-text-muted">{formatDateTime(entry.timestamp)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {canRespond && !showResponseForm && (
        <div className="card">
          <h3 className="mb-4 text-lg font-semibold text-fixly-text">Actions</h3>
          <button
            onClick={onOpenResponseForm}
            className="btn-primary flex w-full items-center justify-center"
          >
            <Reply className="mr-2 h-4 w-4" />
            Submit Response
          </button>
        </div>
      )}
    </div>
  );
}
