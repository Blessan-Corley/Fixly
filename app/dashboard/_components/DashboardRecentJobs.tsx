'use client';

import { motion } from 'framer-motion';
import { Briefcase, MapPin, Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { formatCurrency } from '../_lib/dashboard.helpers';
import type { RecentJob, DashboardUser } from '../_lib/dashboard.types';

type DashboardRecentJobsProps = {
  recentJobs: RecentJob[];
  user: DashboardUser | null;
};

export function DashboardRecentJobs({ recentJobs, user }: DashboardRecentJobsProps) {
  const router = useRouter();

  const sectionTitle =
    user?.role === 'hirer'
      ? 'Recent Jobs'
      : user?.role === 'fixer'
        ? 'Recent Applications'
        : 'Recent Activity';

  const viewAllHref =
    user?.role === 'hirer' ? '/dashboard/jobs' : '/dashboard/applications';

  const emptyLabel =
    user?.role === 'hirer' ? 'No jobs posted yet' : 'No applications sent yet';

  const emptySubLabel =
    user?.role === 'hirer'
      ? 'Post your first job to get started'
      : 'Apply to jobs to get started';

  return (
    <div className="mb-8">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-fixly-text">{sectionTitle}</h2>
        <button
          onClick={() => router.push(viewAllHref)}
          className="text-sm font-medium text-fixly-accent hover:text-fixly-accent-dark"
        >
          View All
        </button>
      </div>

      {recentJobs.length === 0 ? (
        <div className="card py-12 text-center">
          <Briefcase className="mx-auto mb-4 h-12 w-12 text-fixly-text-muted" />
          <div className="text-fixly-text-muted">{emptyLabel}</div>
          <div className="mt-1 text-sm text-fixly-text-muted">{emptySubLabel}</div>
        </div>
      ) : (
        <div className="space-y-4">
          {recentJobs.slice(0, 3).map((job, index) => (
            <motion.div
              key={job._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="card card-hover"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="font-medium text-fixly-text">{job.title}</div>
                  <div className="mt-1 text-sm text-fixly-text-muted">
                    {job.description.substring(0, 100)}...
                  </div>
                  <div className="mt-2 flex items-center text-xs text-fixly-text-muted">
                    <MapPin className="mr-1 h-3 w-3" />
                    {job.location.city}
                    <Clock className="ml-3 mr-1 h-3 w-3" />
                    {new Date(job.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="ml-4 text-right">
                  <div className="font-semibold text-fixly-text">
                    {job.budget?.amount ? formatCurrency(job.budget.amount) : 'Negotiable'}
                  </div>
                  <div
                    className={`rounded-full px-2 py-1 text-xs ${
                      job.status === 'open'
                        ? 'bg-green-100 text-green-800'
                        : job.status === 'in_progress'
                          ? 'bg-blue-100 text-blue-800'
                          : job.status === 'completed'
                            ? 'bg-gray-100 text-gray-800'
                            : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {job.status.replace('_', ' ').toUpperCase()}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
