'use client';

import { CheckCircle, MessageSquare, Star, TrendingUp, X } from 'lucide-react';
import Image from 'next/image';

import type { JobApplication, JobDetails } from '../../app/dashboard/jobs/[jobId]/page.types';

type JobApplicationCardProps = {
  application: JobApplication;
  showFixerDetails: boolean;
  isJobCreator: boolean;
  jobStatus?: JobDetails['status'];
  onMessageFixer: (fixerId: string) => void;
  onRejectApplication: (applicationId: string) => void;
  onAcceptApplication: (applicationId: string) => void;
  onUpgrade: () => void;
  getTimeAgo: (timestamp?: string | Date) => string;
};

export function JobApplicationCard({
  application,
  showFixerDetails,
  isJobCreator,
  jobStatus,
  onMessageFixer,
  onRejectApplication,
  onAcceptApplication,
  onUpgrade,
  getTimeAgo,
}: JobApplicationCardProps): React.JSX.Element {
  return (
    <div className="card">
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center">
          <Image
            src={showFixerDetails ? application.fixer.photoURL || '/default-avatar.png' : '/default-avatar.png'}
            alt={`${showFixerDetails ? application.fixer.name ?? 'Fixer' : 'Fixer'} profile photo`}
            width={48}
            height={48}
            unoptimized
            className="mr-4 h-12 w-12 rounded-full object-cover"
          />
          <div>
            <h4 className="font-semibold text-fixly-text">
              {showFixerDetails ? application.fixer.name ?? 'Professional Fixer' : 'Professional Fixer'}
            </h4>
            <div className="flex items-center space-x-3 text-sm text-fixly-text-muted">
              <div className="flex items-center">
                <Star className="mr-1 h-3 w-3 text-yellow-500" />
                {showFixerDetails ? application.fixer.rating?.average?.toFixed(1) ?? '0.0' : '***'}
              </div>
              <span>•</span>
              <span>
                {showFixerDetails
                  ? `${application.fixer.jobsCompleted ?? 0} jobs completed`
                  : 'Experience available'}
              </span>
              {!showFixerDetails && (
                <span className="text-fixly-accent">• Upgrade to see details</span>
              )}
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="text-lg font-bold text-fixly-text">
            ₹{application.proposedAmount?.toLocaleString()}
          </div>
          {application.timeEstimate && (
            <div className="text-sm text-fixly-text-muted">
              {application.timeEstimate.value} {application.timeEstimate.unit}
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 space-y-4">
        {application.workPlan && (
          <div>
            <h5 className="mb-2 font-medium text-fixly-text">Work Plan & Approach</h5>
            <p className="whitespace-pre-wrap rounded-lg bg-fixly-bg p-3 text-fixly-text-light">
              {application.workPlan}
            </p>
          </div>
        )}

        {application.coverLetter && (
          <div>
            <h5 className="mb-2 font-medium text-fixly-text">Why Choose This Fixer</h5>
            <p className="whitespace-pre-wrap text-fixly-text-light">{application.coverLetter}</p>
          </div>
        )}

        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-medium text-blue-900">Materials:</span>
            <span className={`text-sm ${application.materialsIncluded ? 'text-green-600' : 'text-blue-600'}`}>
              {application.materialsIncluded ? 'Included in price' : 'Additional cost'}
            </span>
          </div>

          {application.materialsList && application.materialsList.length > 0 && (
            <div className="space-y-1">
              <p className="mb-1 text-sm font-medium text-blue-900">Materials List:</p>
              {application.materialsList.map((material, idx) => (
                <div
                  key={`${application._id}-material-${idx}`}
                  className="flex justify-between text-xs text-blue-800"
                >
                  <span>{material.item} (x{material.quantity})</span>
                  <span>₹{material.estimatedCost}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {application.requirements && (
          <div>
            <h5 className="mb-2 font-medium text-fixly-text">What They Need from You</h5>
            <p className="whitespace-pre-wrap rounded-lg border border-orange-200 bg-orange-50 p-3 text-fixly-text-light">
              {application.requirements}
            </p>
          </div>
        )}

        {application.specialNotes && (
          <div>
            <h5 className="mb-2 font-medium text-fixly-text">Special Notes & Conditions</h5>
            <p className="whitespace-pre-wrap rounded-lg border border-green-200 bg-green-50 p-3 text-fixly-text-light">
              {application.specialNotes}
            </p>
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-fixly-border pt-4">
        <div className="text-sm text-fixly-text-muted">Applied {getTimeAgo(application.appliedAt)}</div>

        <div className="flex space-x-2">
          <button
            onClick={() => onMessageFixer(application.fixer._id ?? '')}
            className="btn-ghost flex items-center text-sm"
            disabled={!application.fixer._id}
          >
            <MessageSquare className="mr-1 h-3 w-3" />
            Message
          </button>

          {jobStatus === 'open' && application.status === 'pending' && isJobCreator && (
            <>
              <button
                onClick={() => onRejectApplication(application._id)}
                className="btn-ghost flex items-center text-sm text-red-600 hover:bg-red-50"
              >
                <X className="mr-1 h-3 w-3" />
                Decline
              </button>
              <button
                onClick={() => onAcceptApplication(application._id)}
                className="btn-primary flex items-center text-sm"
              >
                <CheckCircle className="mr-1 h-3 w-3" />
                Accept & Hire
              </button>
            </>
          )}

          {application.status && application.status !== 'pending' && (
            <span
              className={`rounded-full px-2 py-1 text-xs font-medium ${
                application.status === 'accepted'
                  ? 'border border-green-200 bg-green-50 text-green-700'
                  : 'border border-red-200 bg-red-50 text-red-700'
              }`}
            >
              {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
            </span>
          )}
        </div>
      </div>

      {!showFixerDetails && (
        <div className="mt-4 rounded-lg border border-fixly-accent/20 bg-gradient-to-r from-fixly-accent/10 to-fixly-secondary/10 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <TrendingUp className="mr-2 h-5 w-5 text-fixly-accent" />
              <div>
                <h5 className="font-semibold text-fixly-text">Upgrade to Pro to see fixer details</h5>
                <p className="text-sm text-fixly-text-muted">
                  Get full access to fixer profiles, ratings, and contact information
                </p>
              </div>
            </div>
            <button
              onClick={onUpgrade}
              className="rounded-lg bg-fixly-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-fixly-accent-dark"
            >
              Upgrade Now
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
