'use client';

import { useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Bookmark, BookmarkX, Heart, Loader } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useMemo } from 'react';
import { toast } from 'sonner';

import JobCardRectangular from '@/components/JobCardRectangular';
import { Channels, Events } from '@/lib/ably/events';
import { useAblyChannel } from '@/lib/ably/hooks';
import { queryKeys, useSavedJobs, useSaveJob } from '@/lib/queries';

import { RoleGuard, useApp } from '../../providers';

type SavedJobRecord = Record<string, unknown> & {
  _id: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function normalizeSavedJobsResponse(value: unknown): SavedJobRecord[] {
  if (!isRecord(value) || !Array.isArray(value.data)) {
    return [];
  }

  return value.data.filter((job): job is SavedJobRecord => {
    return isRecord(job) && typeof job._id === 'string';
  });
}

function SavedJobsContent(): React.JSX.Element {
  const queryClient = useQueryClient();
  const { user } = useApp();
  const { data, isLoading, isError } = useSavedJobs();
  const { mutateAsync: updateSavedJob, isPending } = useSaveJob();

  const jobs = useMemo(() => normalizeSavedJobsResponse(data), [data]);

  useAblyChannel(
    Channels.marketplace,
    useCallback(
      (message) => {
        if (
          message.name === Events.marketplace.jobUpdated ||
          message.name === Events.marketplace.jobClosed
        ) {
          void queryClient.invalidateQueries({ queryKey: queryKeys.jobs.saved });
        }
      },
      [queryClient]
    )
  );

  const handleUnsave = async (jobId: string): Promise<void> => {
    try {
      await updateSavedJob({ jobId, saved: false });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to remove job from saved list.';
      toast.error(message);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-fixly-text">Saved Jobs</h1>
          <p className="mt-2 text-fixly-text-light">Your bookmarked opportunities, all in one place.</p>
        </div>
        <div className="grid grid-cols-1 gap-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={`saved-job-skeleton-${index}`}
              className="h-56 animate-pulse rounded-2xl border border-fixly-border bg-white"
            />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6 lg:p-8">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
          We couldn&apos;t load your saved jobs right now. Please try again in a moment.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-fixly-text">Saved Jobs</h1>
          <p className="mt-2 text-fixly-text-light">
            Keep track of promising jobs and jump back in whenever you&apos;re ready.
          </p>
        </div>
        <div className="inline-flex items-center rounded-full bg-fixly-accent/10 px-4 py-2 text-sm font-medium text-fixly-primary">
          <Heart className="mr-2 h-4 w-4" />
          {jobs.length} saved job{jobs.length === 1 ? '' : 's'}
        </div>
      </div>

      {jobs.length === 0 ? (
        <div className="card py-16 text-center">
          <Bookmark className="mx-auto h-12 w-12 text-fixly-text-muted" />
          <h2 className="mt-4 text-xl font-semibold text-fixly-text">
            You haven&apos;t saved any jobs yet
          </h2>
          <p className="mx-auto mt-2 max-w-md text-fixly-text-light">
            Browse jobs to find opportunities you like, then save them so they&apos;re easy to
            come back to later.
          </p>
          <Link href="/dashboard/browse-jobs" className="btn-primary mt-6 inline-flex">
            Browse Jobs
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {jobs.map((job, index) => (
            <motion.div
              key={job._id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
              className="relative"
            >
              <div className="absolute right-4 top-4 z-10">
                <button
                  type="button"
                  onClick={() => {
                    void handleUnsave(job._id);
                  }}
                  disabled={isPending}
                  className="inline-flex items-center rounded-full border border-fixly-border bg-white px-3 py-1.5 text-sm font-medium text-fixly-text shadow-sm transition hover:border-red-200 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isPending ? (
                    <Loader className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <BookmarkX className="mr-2 h-4 w-4" />
                  )}
                  Unsave
                </button>
              </div>
              <JobCardRectangular job={job} user={user ?? undefined} />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SavedJobsPage(): React.JSX.Element {
  return (
    <RoleGuard roles={['fixer']} fallback={<div className="p-6 lg:p-8">Access denied</div>}>
      <SavedJobsContent />
    </RoleGuard>
  );
}
