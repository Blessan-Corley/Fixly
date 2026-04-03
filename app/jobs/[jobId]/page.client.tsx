'use client';

import { ArrowLeft } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';

import { ApplyActionCard } from './_components/ApplyActionCard';
import { ClientInformationCard } from './_components/ClientInformationCard';
import { DisputeHelpCard } from './_components/DisputeHelpCard';
import { JobApplicationFormCard } from './_components/JobApplicationFormCard';
import { JobBudgetTimelineCard } from './_components/JobBudgetTimelineCard';
import { JobCompletionCard } from './_components/JobCompletionCard';
import { JobCompletionModal } from './_components/JobCompletionModal';
import { JobDescriptionCard } from './_components/JobDescriptionCard';
import { JobDetailsErrorState } from './_components/JobDetailsErrorState';
import { JobDetailsLoadingState } from './_components/JobDetailsLoadingState';
import { JobOverviewCard } from './_components/JobOverviewCard';
import { JobReviewsCard } from './_components/JobReviewsCard';
import { JobStatisticsCard } from './_components/JobStatisticsCard';
import { useJobDetailsPage } from './_hooks/useJobDetailsPage';

export default function JobDetailsPage(): React.JSX.Element | null {
  const params = useParams();
  const router = useRouter();

  const rawJobId = params?.jobId;
  const jobId = Array.isArray(rawJobId) ? rawJobId[0] : rawJobId;
  const safeJobId = typeof jobId === 'string' ? jobId : '';

  const {
    job,
    reviews,
    loading,
    error,
    loadingReviews,
    applying,
    completingJob,
    showApplicationForm,
    showCompletionConfirm,
    applicationData,
    sessionUserId,
    viewerRole,
    hasApplied,
    canSeeLocation,
    canWriteReview,
    hasUserReview,
    canFileDispute,
    canCompleteJob,
    setShowApplicationForm,
    setShowCompletionConfirm,
    setApplicationData,
    handleApplyToJob,
    handleCompleteJob,
  } = useJobDetailsPage(safeJobId);

  if (loading) {
    return <JobDetailsLoadingState />;
  }

  if (error) {
    return <JobDetailsErrorState message={error} onBack={() => router.back()} />;
  }

  if (!job) {
    return null;
  }

  return (
    <div className="min-h-screen bg-fixly-bg">
      <div className="border-b border-fixly-border bg-fixly-card">
        <div className="mx-auto max-w-6xl px-4 py-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center text-fixly-text-light hover:text-fixly-text"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Jobs
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <JobOverviewCard job={job} safeJobId={safeJobId} canSeeLocation={canSeeLocation} />
            <JobDescriptionCard description={job.description} />
            <JobBudgetTimelineCard job={job} />

            {showApplicationForm && (
              <JobApplicationFormCard
                data={applicationData}
                applying={applying}
                setData={setApplicationData}
                onSubmit={() => {
                  void handleApplyToJob();
                }}
                onCancel={() => setShowApplicationForm(false)}
              />
            )}

            {job.status === 'completed' && (
              <JobReviewsCard
                reviews={reviews}
                loadingReviews={loadingReviews}
                canWriteReview={canWriteReview}
                hasUserReview={hasUserReview}
                onWriteReview={() => router.push(`/jobs/${safeJobId}/review`)}
                onViewAllReviews={() => router.push(`/jobs/${safeJobId}/reviews`)}
              />
            )}
          </div>

          <div className="space-y-6">
            <ClientInformationCard
              job={job}
              viewerRole={viewerRole}
              onMessageClient={() => router.push(`/dashboard/messages?user=${job.createdBy?.id}`)}
            />
            <ApplyActionCard
              isAuthenticated={Boolean(sessionUserId)}
              viewerRole={viewerRole}
              hasApplied={hasApplied}
              jobStatus={job.status}
              onSignIn={() => router.push('/auth/signin')}
              onViewApplications={() => router.push('/dashboard/applications')}
              onOpenApplicationForm={() => setShowApplicationForm(true)}
            />
            {canCompleteJob && (
              <JobCompletionCard
                completingJob={completingJob}
                onMarkComplete={() => setShowCompletionConfirm(true)}
              />
            )}
            {canFileDispute && (
              <DisputeHelpCard onFileDispute={() => router.push(`/jobs/${job._id}/dispute`)} />
            )}
            <JobStatisticsCard job={job} />
          </div>
        </div>
      </div>

      {showCompletionConfirm && (
        <JobCompletionModal
          completingJob={completingJob}
          onConfirm={() => {
            void handleCompleteJob();
          }}
          onCancel={() => setShowCompletionConfirm(false)}
        />
      )}
    </div>
  );
}
