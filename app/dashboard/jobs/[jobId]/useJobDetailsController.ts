'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  createInitialApplicationData,
  createInitialRatingData,
  type JobApplicationFormData,
  type RatingFormData,
} from './page.helpers';
import type {
  JobApplication,
  JobAttachment,
  JobComment,
  JobDetails,
} from './page.types';
import { useJobDetailsActions } from './useJobDetailsActions';
import { useJobDetailsApplications } from './useJobDetailsApplications';
import { createJobDetailsLoaders } from './useJobDetailsController.loaders';
import {
  type ActiveTab,
  type UseJobDetailsControllerParams,
  type UseJobDetailsControllerResult,
} from './useJobDetailsController.types';
import { useJobDetailsRealtime } from './useJobDetailsRealtime';

export const useJobDetailsController = ({
  jobId,
  user,
}: UseJobDetailsControllerParams): UseJobDetailsControllerResult => {
  const router = useRouter();

  const [job, setJob] = useState<JobDetails | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [applying, setApplying] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('details');
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [showApplicationModal, setShowApplicationModal] = useState<boolean>(false);
  const [comments, setComments] = useState<JobComment[]>([]);
  const [showInstagramComments, setShowInstagramComments] = useState<boolean>(false);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [showRatingModal, setShowRatingModal] = useState<boolean>(false);
  const [ratingData, setRatingData] = useState<RatingFormData>(createInitialRatingData);
  const [applicationData, setApplicationData] = useState<JobApplicationFormData>(
    createInitialApplicationData
  );
  const [showImageModal, setShowImageModal] = useState<boolean>(false);
  const [selectedImage, setSelectedImage] = useState<JobAttachment | null>(null);

  const fetchJobAbortRef = useRef<AbortController | null>(null);
  const trackViewAbortRef = useRef<AbortController | null>(null);
  const fetchApplicationsAbortRef = useRef<AbortController | null>(null);
  const fetchCommentsAbortRef = useRef<AbortController | null>(null);
  const submitApplicationAbortRef = useRef<AbortController | null>(null);
  const withdrawApplicationAbortRef = useRef<AbortController | null>(null);
  const updateJobStatusAbortRef = useRef<AbortController | null>(null);
  const submitRatingAbortRef = useRef<AbortController | null>(null);
  const assignApplicationAbortRef = useRef<AbortController | null>(null);
  const updateApplicationStatusAbortRef = useRef<AbortController | null>(null);

  const abortControllerRefs = useMemo(
    () => [
      fetchJobAbortRef,
      trackViewAbortRef,
      fetchApplicationsAbortRef,
      fetchCommentsAbortRef,
      submitApplicationAbortRef,
      withdrawApplicationAbortRef,
      updateJobStatusAbortRef,
      submitRatingAbortRef,
      assignApplicationAbortRef,
      updateApplicationStatusAbortRef,
    ],
    []
  );

  const abortPendingRequests = useCallback((): void => {
    abortControllerRefs.forEach((ref) => ref.current?.abort());
  }, [abortControllerRefs]);

  useEffect(() => {
    return () => {
      abortPendingRequests();
    };
  }, [abortPendingRequests]);

  const { fetchApplications, fetchComments, fetchJobDetails, trackJobView } = useMemo(
    () =>
      createJobDetailsLoaders({
        abortRefs: {
          fetchApplicationsAbortRef,
          fetchCommentsAbortRef,
          fetchJobAbortRef,
          trackViewAbortRef,
        },
        jobId,
        router,
        setApplications,
        setComments,
        setJob,
        setLoading,
        user,
      }),
    [jobId, router, user]
  );

  const refreshApplications = useCallback((): void => { void fetchApplications(); }, [fetchApplications]);
  const refreshComments = useCallback((): void => { void fetchComments(); }, [fetchComments]);
  const refreshJobDetails = useCallback((): void => { void fetchJobDetails(); }, [fetchJobDetails]);
  const refreshJobAndApplications = useCallback((): void => {
    void fetchJobDetails();
    void fetchApplications();
  }, [fetchApplications, fetchJobDetails]);

  useEffect(() => {
    void fetchJobDetails();
    void trackJobView();
  }, [fetchJobDetails, trackJobView]);

  useJobDetailsRealtime({
    jobId,
    job,
    setJob,
    applications,
    comments,
    refreshApplications,
    refreshComments,
    refreshJobAndApplications,
  });

  const { handleQuickApply, confirmApplication, handleDetailedApplication, handleAcceptApplication, handleRejectApplication } =
    useJobDetailsApplications({
      jobId,
      user,
      job,
      applicationData,
      submitApplicationAbortRef,
      assignApplicationAbortRef,
      updateApplicationStatusAbortRef,
      setJob,
      setApplying,
      setShowApplicationModal,
      setShowConfirmModal,
      refreshApplications,
    });

  const { handleJobAction, handleSubmitRating, handleMessageFixer, shareJob } = useJobDetailsActions({
    jobId,
    user,
    job,
    ratingData,
    updateJobStatusAbortRef,
    submitRatingAbortRef,
    setShowRatingModal,
    setRatingData,
    refreshJobDetails,
  });

  const isJobCreator = user?._id === job?.createdBy._id;
  const isAssignedFixer = user?._id === job?.assignedTo?._id;

  return {
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
  };
};
