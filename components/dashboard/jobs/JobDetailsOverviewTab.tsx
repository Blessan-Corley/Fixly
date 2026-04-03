'use client';

import {
  Award,
  Briefcase,
  Clock,
  Eye,
  MapPin,
  Zap,
} from 'lucide-react';
import { type MouseEvent as ReactMouseEvent, type SyntheticEvent } from 'react';

import type {
  DashboardUser,
  JobAttachment,
  JobDetails,
} from '../../../app/dashboard/jobs/[jobId]/page.types';

import { JobAttachmentsGallery } from './overviewTab/JobAttachmentsGallery';
import { JobCreditsCard } from './overviewTab/JobCreditsCard';
import { JobPostedByCard } from './overviewTab/JobPostedByCard';
import { JobTimelineSection } from './overviewTab/JobTimelineSection';

interface JobDetailsOverviewTabProps {
  experienceLevelLabel: string;
  formatDateValue: (
    value?: string | Date,
    locale?: string,
    options?: Intl.DateTimeFormatOptions
  ) => string;
  getTimeRemaining: (deadline?: string | number | Date | null) => string;
  job: JobDetails;
  onAttachmentVideoClick: (event: ReactMouseEvent<HTMLVideoElement>) => void;
  onAttachmentVideoEnded: (event: SyntheticEvent<HTMLVideoElement>) => void;
  onImageSelect: (attachment: JobAttachment) => void;
  onUpgrade: () => void;
  user: DashboardUser | null;
}

export default function JobDetailsOverviewTab({
  experienceLevelLabel,
  formatDateValue,
  getTimeRemaining,
  job,
  onAttachmentVideoClick,
  onAttachmentVideoEnded,
  onImageSelect,
  onUpgrade,
  user,
}: JobDetailsOverviewTabProps): React.JSX.Element {
  const timeRemaining = getTimeRemaining(job.deadline);

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <div>
          <h3 className="mb-4 text-lg font-semibold text-fixly-text">Job Description</h3>
          <div className="prose prose-fixly max-w-none">
            <p className="whitespace-pre-wrap leading-relaxed text-fixly-text-light">
              {job.description}
            </p>
          </div>
        </div>

        {job.attachments && job.attachments.length > 0 && (
          <JobAttachmentsGallery
            attachments={job.attachments}
            onImageSelect={onImageSelect}
            onVideoClick={onAttachmentVideoClick}
            onVideoEnded={onAttachmentVideoEnded}
          />
        )}

        <div>
          <h3 className="mb-4 text-lg font-semibold text-fixly-text">Location</h3>
          <div className="rounded-lg bg-fixly-bg p-4">
            <div className="flex items-start">
              <MapPin className="mr-3 mt-1 h-5 w-5 text-fixly-accent" />
              <div>
                <p className="font-medium text-fixly-text">
                  {job.location.city}, {job.location.state}
                </p>
                {job.location.address && (
                  <p className="mt-1 text-sm text-fixly-text-muted">{job.location.address}</p>
                )}
                {job.location.pincode && (
                  <p className="text-sm text-fixly-text-muted">PIN: {job.location.pincode}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {(job.estimatedDuration?.value || job.experienceLevel !== 'intermediate') && (
          <div>
            <h3 className="mb-4 text-lg font-semibold text-fixly-text">Requirements</h3>
            <div className="space-y-3">
              {job.estimatedDuration?.value && (
                <div className="flex items-center">
                  <Clock className="mr-3 h-4 w-4 text-fixly-accent" />
                  <span className="text-fixly-text">
                    Estimated Duration: {job.estimatedDuration.value} {job.estimatedDuration.unit}
                  </span>
                </div>
              )}
              <div className="flex items-center">
                <Award className="mr-3 h-4 w-4 text-fixly-accent" />
                <span className="text-fixly-text">Experience Level: {experienceLevelLabel}</span>
              </div>
            </div>
          </div>
        )}

        <JobTimelineSection
          createdAt={job.createdAt}
          deadline={job.deadline}
          scheduledDate={job.scheduledDate}
          timeRemaining={timeRemaining}
          formatDateValue={formatDateValue}
        />

        <div>
          <h3 className="mb-4 text-lg font-semibold text-fixly-text">Job Details</h3>
          <div className="space-y-3 rounded-lg bg-fixly-bg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Briefcase className="mr-3 h-4 w-4 text-fixly-accent" />
                <span className="text-fixly-text-muted">Job Type</span>
              </div>
              <span className="font-medium capitalize text-fixly-text">
                {job.type?.replace('-', ' ') ?? 'Not specified'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Zap className="mr-3 h-4 w-4 text-fixly-accent" />
                <span className="text-fixly-text-muted">Urgency</span>
              </div>
              <span
                className={`rounded px-2 py-1 text-xs font-medium capitalize ${
                  job.urgency === 'asap'
                    ? 'bg-red-100 text-red-800'
                    : job.urgency === 'scheduled'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-green-100 text-green-800'
                }`}
              >
                {job.urgency}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Eye className="mr-3 h-4 w-4 text-fixly-accent" />
                <span className="text-fixly-text-muted">Views</span>
              </div>
              <span className="font-medium text-fixly-text">{job.views?.count ?? 0} views</span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="card">
          <h3 className="mb-4 font-semibold text-fixly-text">Budget</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-fixly-text-muted">Type</span>
              <span className="font-medium capitalize text-fixly-text">{job.budget.type}</span>
            </div>
            {job.budget.type !== 'negotiable' && (
              <div className="flex items-center justify-between">
                <span className="text-fixly-text-muted">Amount</span>
                <span className="font-medium text-fixly-text">
                  INR {job.budget.amount?.toLocaleString()}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-fixly-text-muted">Materials</span>
              <span className="text-sm text-fixly-text">
                {job.budget.materialsIncluded ? 'Included' : 'Not Included'}
              </span>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="mb-4 font-semibold text-fixly-text">Timing</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-fixly-text-muted">Posted</span>
              <span className="text-sm text-fixly-text">{formatDateValue(job.createdAt)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-fixly-text-muted">Deadline</span>
              <span className="text-sm text-fixly-text">{formatDateValue(job.deadline)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-fixly-text-muted">Urgency</span>
              <span className="text-sm capitalize text-fixly-text">{job.urgency}</span>
            </div>
            {job.scheduledDate && (
              <div className="flex items-center justify-between">
                <span className="text-fixly-text-muted">Scheduled</span>
                <span className="text-sm text-fixly-text">
                  {formatDateValue(job.scheduledDate)}
                </span>
              </div>
            )}
          </div>
        </div>

        <JobPostedByCard createdBy={job.createdBy} />

        {user?.role === 'fixer' && <JobCreditsCard plan={user.plan} onUpgrade={onUpgrade} />}

        <div className="card">
          <h3 className="mb-4 font-semibold text-fixly-text">Job Stats</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-fixly-text-muted">Views</span>
              <span className="text-sm text-fixly-text">{job.views?.count ?? 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-fixly-text-muted">Applications</span>
              <span className="text-sm text-fixly-text">{job.applicationCount ?? 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-fixly-text-muted">Type</span>
              <span className="text-sm capitalize text-fixly-text">
                {job.type?.replace('_', ' ') ?? 'Not specified'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
