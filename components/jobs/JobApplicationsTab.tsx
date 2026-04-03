'use client';

import { TrendingUp, Users } from 'lucide-react';

import type {
  ExtendedUserPlan,
  JobApplication,
  JobDetails,
} from '../../app/dashboard/jobs/[jobId]/page.types';

import { JobApplicationCard } from './JobApplicationCard';

type CurrentUser = {
  plan?: ExtendedUserPlan;
};

type JobApplicationsTabProps = {
  applications: JobApplication[];
  user?: CurrentUser | null;
  isJobCreator: boolean;
  jobStatus?: JobDetails['status'];
  onMessageFixer: (fixerId: string) => void;
  onRejectApplication: (applicationId: string) => void;
  onAcceptApplication: (applicationId: string) => void;
  onUpgrade: () => void;
  getTimeAgo: (timestamp?: string | Date) => string;
};

export default function JobApplicationsTab({
  applications,
  user,
  isJobCreator,
  jobStatus,
  onMessageFixer,
  onRejectApplication,
  onAcceptApplication,
  onUpgrade,
  getTimeAgo,
}: JobApplicationsTabProps): React.JSX.Element {
  if (applications.length === 0) {
    return (
      <div className="py-12 text-center">
        <Users className="mx-auto mb-4 h-12 w-12 text-fixly-text-muted" />
        <h3 className="mb-2 text-lg font-medium text-fixly-text">No applications yet</h3>
        <p className="text-fixly-text-muted">
          Applications will appear here when fixers apply to this job.
        </p>
      </div>
    );
  }

  const isProUser = user?.plan?.type === 'pro' && user?.plan?.status === 'active';

  return (
    <div className="space-y-6">
      {applications.map((application) => (
        <JobApplicationCard
          key={application._id}
          application={application}
          showFixerDetails={isProUser}
          isJobCreator={isJobCreator}
          jobStatus={jobStatus}
          onMessageFixer={onMessageFixer}
          onRejectApplication={onRejectApplication}
          onAcceptApplication={onAcceptApplication}
          onUpgrade={onUpgrade}
          getTimeAgo={getTimeAgo}
        />
      ))}

      {applications.length > 0 && user?.plan?.type !== 'pro' && (
        <div className="mt-6 rounded-lg border border-fixly-accent/20 bg-fixly-accent/5 p-6 text-center">
          <TrendingUp className="mx-auto mb-3 h-12 w-12 text-fixly-accent" />
          <h3 className="mb-2 text-lg font-semibold text-fixly-text">
            Get More from Your Job Applications
          </h3>
          <p className="mb-4 text-fixly-text-muted">
            Upgrade to Pro to see complete fixer profiles, contact information, and make informed
            hiring decisions.
          </p>
          <button
            onClick={onUpgrade}
            className="rounded-lg bg-fixly-accent px-6 py-3 font-medium text-white transition-colors hover:bg-fixly-accent-dark"
          >
            Upgrade to Pro - ₹199/month
          </button>
        </div>
      )}
    </div>
  );
}
