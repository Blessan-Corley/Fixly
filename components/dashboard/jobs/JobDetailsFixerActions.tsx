'use client';

import {
  AlertCircle,
  Briefcase,
  CheckCircle,
  Loader,
  MessageSquare,
  Star,
  Zap,
} from 'lucide-react';

import type { DashboardUser, JobDetails } from '../../../app/dashboard/jobs/[jobId]/page.types';

type JobDetailsFixerActionsProps = {
  applying: boolean;
  canApply: boolean;
  job: JobDetails;
  jobId: string;
  onOpenDetailedApplication: () => void;
  onQuickApply: () => void;
  onUpgrade: () => void;
  routerPush: (href: string) => void;
  user: DashboardUser | null;
};

export function JobDetailsFixerActions({
  applying,
  canApply,
  job,
  jobId,
  onOpenDetailedApplication,
  onQuickApply,
  onUpgrade,
  routerPush,
  user,
}: JobDetailsFixerActionsProps): JSX.Element | null {
  if (user?.role !== 'fixer' || job.status !== 'open') return null;

  return (
    <div className="space-y-3">
      {user?.plan?.type !== 'pro' && (user?.plan?.creditsUsed ?? 0) >= 3 && (
        <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
          <div className="flex items-center">
            <AlertCircle className="mr-2 h-5 w-5 text-orange-600" />
            <div>
              <p className="font-medium text-orange-800">No Free Credits Left</p>
              <p className="text-sm text-orange-700">
                You've used all 3 free job applications. Upgrade to Pro for unlimited access.
              </p>
            </div>
          </div>
          <button type="button" onClick={onUpgrade} className="btn-primary mt-3 text-sm">
            Upgrade to Pro - INR 99/month
          </button>
        </div>
      )}

      <div className="flex space-x-3">
        {job.hasApplied ? (
          <div className="flex items-center text-green-600">
            <CheckCircle className="mr-2 h-5 w-5" />
            Application Sent
          </div>
        ) : (
          <>
            {canApply ? (
              <>
                <button
                  type="button"
                  onClick={onQuickApply}
                  disabled={applying}
                  className="btn-primary flex items-center"
                >
                  {applying ? (
                    <Loader className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Zap className="mr-2 h-4 w-4" />
                  )}
                  Apply
                </button>

                <button
                  type="button"
                  onClick={onOpenDetailedApplication}
                  className="btn-secondary flex items-center"
                >
                  <Briefcase className="mr-2 h-4 w-4" />
                  Detailed Application
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  disabled
                  className="btn-disabled flex cursor-not-allowed items-center opacity-50"
                  title="No credits left - upgrade to Pro"
                >
                  <Zap className="mr-2 h-4 w-4" />
                  Apply (No Credits)
                </button>

                <button
                  type="button"
                  onClick={onUpgrade}
                  className="btn-primary flex items-center"
                >
                  <Star className="mr-2 h-4 w-4" />
                  Upgrade to Apply
                </button>
              </>
            )}
          </>
        )}

        {job.canMessage && canApply && (
          <button
            type="button"
            onClick={() => routerPush(`/dashboard/jobs/${jobId}/messages`)}
            className="btn-ghost flex items-center"
          >
            <MessageSquare className="mr-2 h-4 w-4" />
            Message Hirer
          </button>
        )}

        {!canApply && (
          <div className="text-sm italic text-fixly-text-muted">
            Messaging disabled - upgrade to Pro to message hirers
          </div>
        )}
      </div>
    </div>
  );
}
