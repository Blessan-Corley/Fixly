'use client';
import { useRouter } from 'next/navigation';
import { use } from 'react';
import { toast } from 'sonner';

import { canApplyToJob } from '@/utils/creditUtils';

import JobDetailsModalStack from '../../../../components/dashboard/jobs/JobDetailsModalStack';
import {
  JobDetailsHeaderSection,
  JobDetailsLoadingState,
  JobDetailsNotFoundState,
} from '../../../../components/dashboard/jobs/JobDetailsPageSections';
import JobDetailsTabsSection from '../../../../components/dashboard/jobs/JobDetailsTabsSection';
import { useApp } from '../../../providers';

import { formatExperienceLevel } from './page.helpers';
import type { DashboardUser } from './page.types';
import { useJobDetailsController } from './useJobDetailsController';

type RouteParams = Promise<{
  jobId: string;
}>;

type JobDetailsPageProps = {
  params: RouteParams;
};

export default function JobDetailsPage(props: JobDetailsPageProps): JSX.Element {
  const params = use(props.params);
  const { jobId } = params;
  const { user: appUser } = useApp();
  const user = appUser as DashboardUser | null;
  const router = useRouter();

  const {
    activeTab,
    applicationData,
    applications,
    applying,
    comments,
    confirmApplication,
    handleAcceptApplication,
    handleDetailedApplication,
    handleJobAction,
    handleMessageFixer,
    handleQuickApply,
    handleRejectApplication,
    handleSubmitRating,
    isAssignedFixer,
    isJobCreator,
    job,
    loading,
    ratingData,
    selectedImage,
    setActiveTab,
    setApplicationData,
    setRatingData,
    setSelectedImage,
    setShowApplicationModal,
    setShowConfirmModal,
    setShowImageModal,
    setShowInstagramComments,
    setShowRatingModal,
    shareJob,
    showApplicationModal,
    showConfirmModal,
    showImageModal,
    showInstagramComments,
    showRatingModal,
  } = useJobDetailsController({
    jobId,
    user,
  });

  if (loading) {
    return <JobDetailsLoadingState onBack={() => router.back()} />;
  }

  if (!job) {
    return <JobDetailsNotFoundState onBack={() => router.back()} />;
  }

  const jobSkillMatchPercentage = job.skillMatchPercentage ?? 0;
  const experienceLevelLabel = formatExperienceLevel(job.experienceLevel);
  const canCurrentUserApply = canApplyToJob(user);

  return (
    <div className="mx-auto max-w-6xl p-6 lg:p-8">
      <JobDetailsHeaderSection
        applicationsCount={job.applicationCount ?? applications.length}
        applying={applying}
        canApply={canCurrentUserApply}
        isAssignedFixer={isAssignedFixer}
        isJobCreator={isJobCreator}
        job={job}
        jobId={jobId}
        jobSkillMatchPercentage={jobSkillMatchPercentage}
        onBack={() => router.back()}
        onJobAction={handleJobAction}
        onOpenApplications={() => setActiveTab('applications')}
        onOpenDetailedApplication={() => setShowApplicationModal(true)}
        onOpenRatingModal={() => setShowRatingModal(true)}
        onQuickApply={() => {
          void handleQuickApply();
        }}
        onReport={() => toast.info('Report feature will be added in the next refactor phase')}
        onShare={() => {
          void shareJob();
        }}
        onUpgrade={() => router.push('/dashboard/subscription')}
        routerPush={(href) => router.push(href)}
        user={user}
      />

      <JobDetailsTabsSection
        activeTab={activeTab}
        applications={applications}
        commentsCount={job.commentCount ?? comments.length}
        experienceLevelLabel={experienceLevelLabel}
        isJobCreator={isJobCreator}
        job={job}
        onAcceptApplication={handleAcceptApplication}
        onImageSelect={(attachment) => {
          setSelectedImage(attachment);
          setShowImageModal(true);
        }}
        onMessageFixer={handleMessageFixer}
        onOpenComments={() => setShowInstagramComments(true)}
        onRejectApplication={handleRejectApplication}
        onSelectTab={setActiveTab}
        onUpgrade={() => router.push('/dashboard/subscription')}
        user={user}
      />

      <JobDetailsModalStack
        applicationData={applicationData}
        applying={applying}
        commentsCount={job.commentCount ?? comments.length}
        isApplicationModalOpen={showApplicationModal}
        isCommentsModalOpen={showInstagramComments}
        isConfirmModalOpen={showConfirmModal}
        isImageModalOpen={showImageModal}
        isRatingModalOpen={showRatingModal}
        job={job}
        jobId={jobId}
        onApplicationDataChange={setApplicationData}
        onCloseApplicationModal={() => setShowApplicationModal(false)}
        onCloseCommentsModal={() => setShowInstagramComments(false)}
        onCloseConfirmModal={() => setShowConfirmModal(false)}
        onCloseImageModal={() => setShowImageModal(false)}
        onCloseRatingModal={() => setShowRatingModal(false)}
        onConfirmApplication={() => {
          void confirmApplication();
        }}
        onOpenApplicationModal={() => setShowApplicationModal(true)}
        onOpenCommentsModal={() => setShowInstagramComments(true)}
        onRatingCategoryChange={(key, value) =>
          setRatingData((previousRating) => ({
            ...previousRating,
            categories: { ...previousRating.categories, [key]: value },
          }))
        }
        onRatingChange={(rating) =>
          setRatingData((previousRating) => ({
            ...previousRating,
            rating,
          }))
        }
        onReviewChange={(review) =>
          setRatingData((previousRating) => ({
            ...previousRating,
            review,
          }))
        }
        onSubmitDetailedApplication={() => {
          void handleDetailedApplication();
        }}
        onSubmitRating={() => {
          void handleSubmitRating();
        }}
        ratingData={ratingData}
        selectedImage={selectedImage}
        user={user}
      />
    </div>
  );
}
