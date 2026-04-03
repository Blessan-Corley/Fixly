'use client';

import { motion } from 'framer-motion';

import { formatDate } from '../_lib/jobDetails.formatters';
import type { JobDetails } from '../_lib/jobDetails.types';

type JobStatisticsCardProps = {
  job: JobDetails;
};

export function JobStatisticsCard({ job }: JobStatisticsCardProps): React.JSX.Element {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.6 }}
      className="card"
    >
      <h3 className="mb-4 text-lg font-bold text-fixly-text">Job Statistics</h3>
      <div className="space-y-3">
        <div className="flex justify-between">
          <span className="text-fixly-text-light">Posted</span>
          <span className="text-fixly-text">{formatDate(job.createdAt)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-fixly-text-light">Applications</span>
          <span className="text-fixly-text">{job.applicationCount}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-fixly-text-light">Views</span>
          <span className="text-fixly-text">{job.viewsCount}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-fixly-text-light">Comments</span>
          <span className="text-fixly-text">{job.commentsCount}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-fixly-text-light">Job ID</span>
          <span className="font-mono text-xs text-fixly-text">{job._id.slice(-8)}</span>
        </div>
      </div>
    </motion.div>
  );
}
