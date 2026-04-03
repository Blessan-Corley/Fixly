'use client';

import {
  ArrowLeft,
  Clock,
  DollarSign,
  Edit,
  Flag,
  MapPin,
  Share2,
  Users,
} from 'lucide-react';

import { getUrgencyColor } from '../../../app/dashboard/jobs/[jobId]/page.helpers';
import type { DashboardUser, JobDetails } from '../../../app/dashboard/jobs/[jobId]/page.types';

import { JobDetailsAssignedFixerPanel } from './JobDetailsAssignedFixerPanel';
import { JobDetailsFixerActions } from './JobDetailsFixerActions';
import { JobDetailsHirerActions } from './JobDetailsHirerActions';

export { JobDetailsLoadingState, JobDetailsNotFoundState } from './JobDetailsEmptyStates';

type JobAction =
  | 'confirm_completion'
  | 'confirm_progress'
  | 'mark_arrived'
  | 'mark_completed'
  | 'mark_in_progress';

interface JobDetailsHeaderSectionProps {
  applicationsCount: number;
  applying: boolean;
  canApply: boolean;
  isAssignedFixer: boolean;
  isJobCreator: boolean;
  job: JobDetails;
  jobId: string;
  jobSkillMatchPercentage: number;
  onBack: () => void;
  onJobAction: (action: JobAction) => void;
  onOpenApplications: () => void;
  onOpenDetailedApplication: () => void;
  onOpenRatingModal: () => void;
  onQuickApply: () => void;
  onReport: () => void;
  onShare: () => void;
  onUpgrade: () => void;
  routerPush: (href: string) => void;
  user: DashboardUser | null;
}

export function JobDetailsHeaderSection({
  applicationsCount,
  applying,
  canApply,
  isAssignedFixer,
  isJobCreator,
  job,
  jobId,
  jobSkillMatchPercentage,
  onBack,
  onJobAction,
  onOpenApplications,
  onOpenDetailedApplication,
  onOpenRatingModal,
  onQuickApply,
  onReport,
  onShare,
  onUpgrade,
  routerPush,
  user,
}: JobDetailsHeaderSectionProps): JSX.Element {
  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <button type="button" onClick={onBack} className="btn-ghost flex items-center">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </button>

        <div className="flex items-center space-x-2">
          <button type="button" onClick={onShare} className="btn-ghost flex items-center">
            <Share2 className="mr-1 h-4 w-4" />
            Share
          </button>

          {!isJobCreator && (
            <button
              type="button"
              onClick={onReport}
              className="btn-ghost flex items-center text-red-600 hover:bg-red-50"
            >
              <Flag className="mr-1 h-4 w-4" />
              Report
            </button>
          )}

          {isJobCreator && job.status === 'open' && (
            <button
              type="button"
              onClick={() => routerPush(`/dashboard/jobs/${jobId}/edit`)}
              className="btn-secondary flex items-center"
            >
              <Edit className="mr-1 h-4 w-4" />
              Edit
            </button>
          )}
        </div>
      </div>

      <div className="card mb-8">
        <div className="mb-6 flex items-start justify-between">
          <div className="flex-1">
            <div className="mb-3 flex items-center space-x-3">
              {job.featured && (
                <span className="rounded-full bg-fixly-accent px-2 py-1 text-xs font-medium text-fixly-text">
                  Featured
                </span>
              )}
              <span
                className={`rounded-full border px-2 py-1 text-xs ${getUrgencyColor(job.urgency)}`}
              >
                {job.urgency.toUpperCase()}
              </span>
              <span
                className={`rounded-full px-2 py-1 text-xs ${
                  job.status === 'open'
                    ? 'bg-green-100 text-green-800'
                    : job.status === 'in_progress'
                      ? 'bg-blue-100 text-blue-800'
                      : job.status === 'completed'
                        ? 'bg-gray-100 text-gray-800'
                        : 'bg-orange-100 text-orange-800'
                }`}
              >
                {job.status?.replace('_', ' ').toUpperCase() || 'UNKNOWN'}
              </span>
            </div>

            <h1 className="mb-3 text-3xl font-bold text-fixly-text">{job.title}</h1>

            <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
              <div className="flex items-center text-fixly-text-muted">
                <DollarSign className="mr-1 h-4 w-4" />
                {job.budget.type === 'negotiable'
                  ? 'Negotiable'
                  : `INR ${job.budget.amount?.toLocaleString()}`}
              </div>

              <div className="flex items-center text-fixly-text-muted">
                <MapPin className="mr-1 h-4 w-4" />
                {job.location.city}, {job.location.state}
                {job.isLocalJob && <span className="ml-2 text-xs text-green-600">Local</span>}
              </div>

              <div className="flex items-center text-fixly-text-muted">
                <Clock className="mr-1 h-4 w-4" />
                Deadline:{' '}
                {job.deadline
                  ? job.deadline instanceof Date
                    ? job.deadline.toLocaleDateString('en-IN')
                    : job.deadline
                  : 'Not specified'}
              </div>

              <div className="flex items-center text-fixly-text-muted">
                <Users className="mr-1 h-4 w-4" />
                {job.applicationCount} applications
              </div>
            </div>
          </div>

          {user?.role === 'fixer' && jobSkillMatchPercentage > 0 && (
            <div className="ml-6 text-center">
              <div className="text-2xl font-bold text-fixly-accent">
                {Math.round(jobSkillMatchPercentage)}%
              </div>
              <div className="text-xs text-fixly-text-muted">Skill Match</div>
            </div>
          )}
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          {job.skillsRequired.map((skill, index) => (
            <span
              key={index}
              className={`skill-chip ${user?.skills?.includes(skill.toLowerCase()) ? 'skill-chip-selected' : ''}`}
            >
              {skill}
            </span>
          ))}
        </div>

        <JobDetailsFixerActions
          applying={applying}
          canApply={canApply}
          job={job}
          jobId={jobId}
          onOpenDetailedApplication={onOpenDetailedApplication}
          onQuickApply={onQuickApply}
          onUpgrade={onUpgrade}
          routerPush={routerPush}
          user={user}
        />

        {isJobCreator && (
          <JobDetailsHirerActions
            applicationsCount={applicationsCount}
            job={job}
            jobId={jobId}
            onJobAction={onJobAction}
            onOpenApplications={onOpenApplications}
            onOpenRatingModal={onOpenRatingModal}
            routerPush={routerPush}
          />
        )}

        {isAssignedFixer && (
          <JobDetailsAssignedFixerPanel
            job={job}
            jobId={jobId}
            onJobAction={onJobAction}
            onOpenRatingModal={onOpenRatingModal}
            routerPush={routerPush}
          />
        )}
      </div>
    </>
  );
}
