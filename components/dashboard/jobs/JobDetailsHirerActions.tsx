'use client';

import { CheckCircle, MessageSquare, Star, Users } from 'lucide-react';

import type { JobDetails } from '../../../app/dashboard/jobs/[jobId]/page.types';

type JobAction = 'confirm_completion' | 'confirm_progress' | 'mark_arrived' | 'mark_completed' | 'mark_in_progress';

type JobDetailsHirerActionsProps = {
  applicationsCount: number;
  job: JobDetails;
  jobId: string;
  onJobAction: (action: JobAction) => void;
  onOpenApplications: () => void;
  onOpenRatingModal: () => void;
  routerPush: (href: string) => void;
};

export function JobDetailsHirerActions({
  applicationsCount,
  job,
  jobId,
  onJobAction,
  onOpenApplications,
  onOpenRatingModal,
  routerPush,
}: JobDetailsHirerActionsProps): JSX.Element {
  return (
    <div className="flex space-x-3">
      {job.status === 'open' && applicationsCount > 0 && (
        <button
          type="button"
          onClick={onOpenApplications}
          className="btn-primary flex items-center"
        >
          <Users className="mr-2 h-4 w-4" />
          Review Applications ({applicationsCount})
        </button>
      )}

      {job.status === 'in_progress' && (
        <>
          <button
            type="button"
            onClick={() => routerPush(`/dashboard/jobs/${jobId}/messages`)}
            className="btn-secondary flex items-center"
          >
            <MessageSquare className="mr-2 h-4 w-4" />
            Message Fixer
          </button>

          <button
            type="button"
            onClick={() => onJobAction('confirm_progress')}
            className="btn-ghost flex items-center text-green-600"
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            Confirm Progress
          </button>
        </>
      )}

      {job.status === 'completed' && !job.completion?.confirmedBy && (
        <button
          type="button"
          onClick={() => onJobAction('confirm_completion')}
          className="btn-primary flex items-center"
        >
          <CheckCircle className="mr-2 h-4 w-4" />
          Mark as Completed
        </button>
      )}

      {job.status === 'completed' && job.completion?.confirmedBy && (
        <div className="space-y-2">
          {!job.completion?.hirerRating && (
            <button
              type="button"
              onClick={onOpenRatingModal}
              className="btn-secondary flex items-center"
            >
              <Star className="mr-2 h-4 w-4" />
              Rate Fixer
            </button>
          )}

          {job.completion?.hirerRating && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-3">
              <div className="flex items-center text-sm text-green-700">
                <Star className="mr-1 h-4 w-4" />
                <span>You rated this fixer {job.completion.hirerRating.rating} star</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
