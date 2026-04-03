'use client';

import { motion } from 'framer-motion';
import { Briefcase, Calendar, Star } from 'lucide-react';
import { useRouter } from 'next/navigation';

import type { RecentJob } from './earnings.types';
import { formatCurrency } from './earnings.utils';

type RecentJobsListProps = {
  recentJobs: RecentJob[];
};

export default function RecentJobsList({ recentJobs }: RecentJobsListProps) {
  const router = useRouter();

  return (
    <div className="mt-8">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-fixly-text">Recent Completed Jobs</h2>
        <button
          onClick={() => router.push('/dashboard/applications')}
          className="text-fixly-accent hover:text-fixly-accent-dark"
        >
          View All Applications
        </button>
      </div>

      {recentJobs.length === 0 ? (
        <div className="card py-12 text-center">
          <Briefcase className="mx-auto mb-4 h-12 w-12 text-fixly-text-muted" />
          <h3 className="mb-2 text-lg font-medium text-fixly-text">No completed jobs yet</h3>
          <p className="mb-4 text-fixly-text-muted">
            Start applying to jobs and complete them to see earnings here
          </p>
          <button
            onClick={() => router.push('/dashboard/browse-jobs')}
            className="btn-primary"
          >
            Browse Jobs
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {recentJobs.map((job, index) => (
            <motion.div
              key={job._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="card card-hover"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h4 className="mb-1 font-medium text-fixly-text">{job.title}</h4>
                  <p className="mb-2 text-sm text-fixly-text-muted">
                    {job.createdBy?.name} • {job.location?.city}
                  </p>
                  <div className="flex items-center text-xs text-fixly-text-muted">
                    <Calendar className="mr-1 h-3 w-3" />
                    Completed {new Date(job.progress?.completedAt).toLocaleDateString()}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-lg font-bold text-green-600">
                    {formatCurrency(job.budget?.amount ?? 0)}
                  </div>
                  {job.completion?.rating && (
                    <div className="mt-1 flex items-center">
                      <Star className="mr-1 h-3 w-3 text-yellow-500" />
                      <span className="text-xs text-fixly-text-muted">
                        {job.completion.rating}/5
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
