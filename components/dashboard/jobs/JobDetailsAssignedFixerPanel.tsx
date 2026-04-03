'use client';

import { CheckCircle, Clock, MapPin, MessageSquare, Star } from 'lucide-react';

import type { JobDetails } from '../../../app/dashboard/jobs/[jobId]/page.types';

type JobAction = 'confirm_completion' | 'confirm_progress' | 'mark_arrived' | 'mark_completed' | 'mark_in_progress';

type JobDetailsAssignedFixerPanelProps = {
  job: JobDetails;
  jobId: string;
  onJobAction: (action: JobAction) => void;
  onOpenRatingModal: () => void;
  routerPush: (href: string) => void;
};

export function JobDetailsAssignedFixerPanel({
  job,
  jobId,
  onJobAction,
  onOpenRatingModal,
  routerPush,
}: JobDetailsAssignedFixerPanelProps): JSX.Element {
  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <div className="mb-2 flex items-center justify-between">
          <h4 className="font-medium text-blue-900">Job Status</h4>
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              job.status === 'in_progress'
                ? 'bg-blue-100 text-blue-800'
                : job.status === 'completed'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-800'
            }`}
          >
            {job.status?.replace('_', ' ').toUpperCase() || 'UNKNOWN'}
          </span>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span>Assigned:</span>
            <span className="text-green-600">Assigned to you</span>
          </div>

          <div className="flex items-center justify-between">
            <span>Arrival:</span>
            {job.progress?.arrivedAt ? (
              <span className="text-green-600">
                Arrived at {new Date(job.progress.arrivedAt).toLocaleString()}
              </span>
            ) : (
              <span className="text-gray-500">Not marked</span>
            )}
          </div>

          <div className="flex items-center justify-between">
            <span>Progress:</span>
            {job.progress?.startedAt ? (
              <span className="text-green-600">
                Work started at {new Date(job.progress.startedAt).toLocaleString()}
              </span>
            ) : (
              <span className="text-gray-500">Not started</span>
            )}
          </div>

          <div className="flex items-center justify-between">
            <span>Completion:</span>
            {job.progress?.completedAt ? (
              <span className="text-green-600">
                Completed at {new Date(job.progress.completedAt).toLocaleString()}
              </span>
            ) : (
              <span className="text-gray-500">Not completed</span>
            )}
          </div>
        </div>
      </div>

      <div className="flex space-x-3">
        <button
          type="button"
          onClick={() => routerPush(`/dashboard/jobs/${jobId}/messages`)}
          className="btn-secondary flex items-center"
        >
          <MessageSquare className="mr-2 h-4 w-4" />
          Message Client
        </button>

        {job.status === 'in_progress' && (
          <>
            {!job.progress?.arrivedAt && (
              <button
                type="button"
                onClick={() => onJobAction('mark_arrived')}
                className="btn-ghost flex items-center text-green-600"
              >
                <MapPin className="mr-2 h-4 w-4" />
                I've Arrived
              </button>
            )}

            {job.progress?.arrivedAt && !job.progress?.startedAt && (
              <button
                type="button"
                onClick={() => onJobAction('mark_in_progress')}
                className="btn-ghost flex items-center text-blue-600"
              >
                <Clock className="mr-2 h-4 w-4" />
                Start Work
              </button>
            )}

            {job.progress?.startedAt && (
              <button
                type="button"
                onClick={() => onJobAction('mark_completed')}
                className="btn-primary flex items-center"
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Mark as Done
              </button>
            )}
          </>
        )}
      </div>

      {job.status === 'completed' && !job.completion?.confirmedBy && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3">
          <div className="flex items-center text-green-700">
            <CheckCircle className="mr-2 h-5 w-5" />
            <span className="text-sm">Work completed. Waiting for client confirmation.</span>
          </div>
        </div>
      )}

      {job.status === 'completed' && job.completion?.confirmedBy && (
        <div className="space-y-2">
          {!job.completion?.fixerRating && (
            <button
              type="button"
              onClick={onOpenRatingModal}
              className="btn-secondary flex items-center"
            >
              <Star className="mr-2 h-4 w-4" />
              Rate Client
            </button>
          )}

          {job.completion?.fixerRating && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-3">
              <div className="flex items-center text-sm text-green-700">
                <Star className="mr-1 h-4 w-4" />
                <span>You rated this client {job.completion.fixerRating.rating} star</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
