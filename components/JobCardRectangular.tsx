'use client';

import { motion } from 'framer-motion';
import { Loader } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { memo, useEffect, useMemo, useState } from 'react';

import { useJobRealtimeCounts } from '../hooks/realtime/useJobActivity';
import { calculateDistance } from '../utils/locationUtils';

import { JobCardActions, JobCardMetaRow, JobCardSkillTags } from './JobCardRectangular.parts';
import type { JobCardData, JobCardRectangularProps, UserData } from './JobCardRectangular.types';
import { getDeadlineInfo, getUrgencyColor, sanitizeText, formatTimeAgo } from './JobCardRectangular.utils';

const JobCommentsPanel = dynamic(() => import('./jobs/comments/JobCommentsPanel'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center gap-2 rounded-md border border-fixly-border p-2 text-xs text-fixly-text-muted">
      <Loader className="h-3 w-3 animate-spin" />
      Loading comments...
    </div>
  ),
});

function JobCardRectangular({
  job,
  user,
  onApply,
  isApplying = false,
  userLocation = null,
  showDistance = true,
  onClick,
}: JobCardRectangularProps): JSX.Element {
  const router = useRouter();
  const [showComments, setShowComments] = useState<boolean>(false);
  const [viewCount, setViewCount] = useState<number>(job.viewCount ?? job.views?.count ?? 0);
  const [commentCount, setCommentCount] = useState<number>(job.commentCount ?? 0);
  const [timeAgo, setTimeAgo] = useState<string>('');
  const [distance, setDistance] = useState<number | null>(null);

  const realtimeCounts = useJobRealtimeCounts(job._id, {
    viewCount: job.viewCount ?? job.views?.count ?? 0,
    commentCount: job.commentCount ?? 0,
    applicationCount:
      typeof job.applicationCount === 'number'
        ? job.applicationCount
        : Array.isArray(job.applications)
          ? job.applications.length
          : 0,
  });

  const userId = user?.id ?? user?._id;

  const hasApplied = useMemo<boolean>(() => {
    if (!userId || !Array.isArray(job.applications)) return false;

    return job.applications.some((application) => {
      if (!application || typeof application !== 'object') return false;

      const fixer = (application as { fixer?: unknown }).fixer;
      if (!fixer) return false;

      if (typeof fixer === 'string') return fixer === userId;

      if (typeof fixer === 'object') {
        const fixerData = fixer as { _id?: string; id?: string; toString?: () => string };
        return (
          fixerData._id === userId || fixerData.id === userId || fixerData.toString?.() === userId
        );
      }

      return false;
    });
  }, [job.applications, userId]);

  useEffect(() => {
    setViewCount(realtimeCounts.viewCount);
    setCommentCount(realtimeCounts.commentCount);
  }, [realtimeCounts.commentCount, realtimeCounts.viewCount]);

  useEffect(() => {
    const update = (): void => {
      setTimeAgo(formatTimeAgo(job.createdAt));
    };

    update();
    const timer = setInterval(update, 30000);
    return () => clearInterval(timer);
  }, [job.createdAt]);

  useEffect(() => {
    if (!showDistance || !userLocation || !job.location?.lat || !job.location?.lng) {
      setDistance(null);
      return;
    }

    const distanceKm = calculateDistance(
      userLocation.lat,
      userLocation.lng,
      job.location.lat,
      job.location.lng
    );
    setDistance(distanceKm);
  }, [job.location?.lat, job.location?.lng, showDistance, userLocation]);

  const handleViewDetails = async (): Promise<void> => {
    if (!job._id) return;

    try {
      const response = await fetch(`/api/jobs/${job._id}/view`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const payload = (await response.json()) as { viewCount?: unknown };
      const nextViewCount = typeof payload.viewCount === 'number' ? payload.viewCount : null;
      if (response.ok && nextViewCount !== null) {
        setViewCount(nextViewCount);
      }
    } catch (error) {
      console.error('Error updating view count:', error);
    }

    if (onClick) {
      onClick(job);
      return;
    }

    router.push(`/dashboard/jobs/${job._id}`);
  };

  const handleApply = async (): Promise<void> => {
    if (onApply && job._id) {
      await onApply(job._id);
    }
  };

  const getSkillMatchPercentage = (userData: UserData | null | undefined): number => {
    const userSkills = userData?.skills ?? [];
    const jobSkills = job.skillsRequired ?? [];
    if (!userSkills.length || !jobSkills.length) return 0;

    const normalizedUserSkills = userSkills.map((skill) => skill.toLowerCase());
    const matches = jobSkills.filter((skill) =>
      normalizedUserSkills.includes(skill.toLowerCase())
    ).length;

    return Math.round((matches / jobSkills.length) * 100);
  };

  const skillMatch = getSkillMatchPercentage(user);
  const deadlineInfo = getDeadlineInfo(job.deadline);
  const displayedSkills = job.skillsRequired ?? [];

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        whileHover={{ y: -2 }}
        className={`touch-scroll rounded-xl border border-fixly-border bg-fixly-card p-4 transition-all duration-200 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:hover:shadow-lg ${
          deadlineInfo.urgent ? 'shadow-lg ring-2 ring-orange-300' : ''
        }`}
      >
        <div className="mb-3 flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-2">
              <h3 className="truncate text-lg font-semibold text-fixly-text">
                {job.title ?? 'Untitled Job'}
              </h3>
              <div className="flex items-center gap-2">
                {skillMatch > 0 && (
                  <span className="rounded-full bg-fixly-accent px-2 py-1 text-xs text-white">
                    {skillMatch}% match
                  </span>
                )}
                <span
                  className={`rounded-full border px-2 py-1 text-xs font-semibold ${
                    job.budget?.materialsIncluded
                      ? 'border-green-200 bg-green-100 text-green-700'
                      : 'border-orange-200 bg-orange-100 text-orange-700'
                  }`}
                >
                  {job.budget?.materialsIncluded ? 'Materials Included' : 'Bring Materials'}
                </span>
                <span
                  className={`rounded-full px-2 py-1 text-xs font-semibold ${deadlineInfo.color} ${deadlineInfo.bgColor}`}
                >
                  {deadlineInfo.text}
                </span>
              </div>
            </div>

            <JobCardMetaRow
              timeAgo={timeAgo || formatTimeAgo(job.createdAt)}
              viewCount={viewCount}
              distance={distance}
              showDistance={showDistance}
              userLocation={userLocation}
              locationCity={job.location?.city}
            />
          </div>

          <span
            className={`rounded-full border px-2 py-1 text-xs font-medium ${getUrgencyColor(job.urgency)}`}
          >
            {job.urgency ?? 'normal'}
          </span>
        </div>

        <p className="mb-3 line-clamp-2 text-sm text-fixly-text-light">
          {sanitizeText(job.description)}
        </p>

        <JobCardSkillTags skills={displayedSkills} userSkills={user?.skills} />

        <JobCardActions
          budget={job.budget}
          deadline={job.deadline}
          commentCount={commentCount}
          hasApplied={hasApplied}
          isApplying={isApplying}
          onViewDetails={handleViewDetails}
          onOpenComments={() => setShowComments(true)}
          onApply={handleApply}
        />
      </motion.div>

      <JobCommentsPanel
        jobId={job._id}
        isOpen={showComments}
        onClose={() => setShowComments(false)}
        initialCommentCount={commentCount}
      />
    </>
  );
}

export default memo(JobCardRectangular);
export type { JobCardData, JobCardRectangularProps };
