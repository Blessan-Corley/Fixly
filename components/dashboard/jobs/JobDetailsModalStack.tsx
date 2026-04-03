'use client';

import { MessageSquare } from 'lucide-react';
import dynamic from 'next/dynamic';
import type { Dispatch, SetStateAction } from 'react';

import type {
  JobApplicationFormData,
  RatingFormData,
} from '../../../app/dashboard/jobs/[jobId]/page.helpers';
import { getTimeRemaining } from '../../../app/dashboard/jobs/[jobId]/page.helpers';
import type {
  DashboardUser,
  JobAttachment,
  JobDetails,
} from '../../../app/dashboard/jobs/[jobId]/page.types';
import JobCommentsPanel from '../../jobs/comments/JobCommentsPanel';
import JobConfirmApplicationModal from '../../jobs/JobConfirmApplicationModal';
import JobImageLightbox from '../../jobs/JobImageLightbox';
import JobRatingModal from '../../jobs/JobRatingModal';

const JobApplicationModal = dynamic(() => import('../../jobs/JobApplicationModal'), {
  ssr: false,
  loading: () => <div className="p-4 text-sm text-fixly-text-muted">Loading application form...</div>,
});

interface JobDetailsModalStackProps {
  applicationData: JobApplicationFormData;
  applying: boolean;
  commentsCount: number;
  isApplicationModalOpen: boolean;
  isCommentsModalOpen: boolean;
  isConfirmModalOpen: boolean;
  isImageModalOpen: boolean;
  isRatingModalOpen: boolean;
  job: JobDetails;
  jobId: string;
  onApplicationDataChange: Dispatch<SetStateAction<JobApplicationFormData>>;
  onCloseApplicationModal: () => void;
  onCloseCommentsModal: () => void;
  onCloseConfirmModal: () => void;
  onCloseImageModal: () => void;
  onCloseRatingModal: () => void;
  onConfirmApplication: () => void;
  onOpenCommentsModal: () => void;
  onOpenApplicationModal: () => void;
  onRatingCategoryChange: (key: keyof RatingFormData['categories'], value: number) => void;
  onRatingChange: (rating: number) => void;
  onReviewChange: (review: string) => void;
  onSubmitDetailedApplication: () => void;
  onSubmitRating: () => void;
  ratingData: RatingFormData;
  selectedImage: JobAttachment | null;
  user: DashboardUser | null;
}

export default function JobDetailsModalStack({
  applicationData,
  applying,
  commentsCount,
  isApplicationModalOpen,
  isCommentsModalOpen,
  isConfirmModalOpen,
  isImageModalOpen,
  isRatingModalOpen,
  job,
  jobId,
  onApplicationDataChange,
  onCloseApplicationModal,
  onCloseCommentsModal,
  onCloseConfirmModal,
  onCloseImageModal,
  onCloseRatingModal,
  onConfirmApplication,
  onOpenCommentsModal,
  onOpenApplicationModal,
  onRatingCategoryChange,
  onRatingChange,
  onReviewChange,
  onSubmitDetailedApplication,
  onSubmitRating,
  ratingData,
  selectedImage,
  user,
}: JobDetailsModalStackProps): JSX.Element {
  return (
    <>
      <JobConfirmApplicationModal
        isOpen={isConfirmModalOpen}
        job={job}
        user={user}
        applying={applying}
        onCancel={onCloseConfirmModal}
        onCustomize={() => {
          onCloseConfirmModal();
          onOpenApplicationModal();
        }}
        onConfirm={onConfirmApplication}
        getTimeRemaining={getTimeRemaining}
      />

      <JobApplicationModal
        isOpen={isApplicationModalOpen}
        job={job}
        applicationData={applicationData}
        setApplicationData={onApplicationDataChange}
        applying={applying}
        onClose={onCloseApplicationModal}
        onSubmit={onSubmitDetailedApplication}
      />

      <JobRatingModal
        isOpen={isRatingModalOpen}
        userRole={user?.role}
        ratingData={ratingData}
        onClose={onCloseRatingModal}
        onSubmit={onSubmitRating}
        onRatingChange={onRatingChange}
        onCategoryChange={onRatingCategoryChange}
        onReviewChange={onReviewChange}
      />

      <button
        onClick={onOpenCommentsModal}
        className="fixed bottom-6 right-6 z-40 rounded-full bg-fixly-accent p-4 text-white shadow-lg transition-all duration-200 hover:scale-110 hover:bg-fixly-accent-dark"
        title="Open Comments"
      >
        <MessageSquare className="h-6 w-6" />
        {commentsCount > 0 && (
          <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
            {commentsCount > 99 ? '99+' : commentsCount}
          </span>
        )}
      </button>

      <JobCommentsPanel
        jobId={jobId}
        isOpen={isCommentsModalOpen}
        onClose={onCloseCommentsModal}
        initialCommentCount={commentsCount}
      />

      <JobImageLightbox
        isOpen={isImageModalOpen}
        image={selectedImage}
        onClose={onCloseImageModal}
      />
    </>
  );
}
