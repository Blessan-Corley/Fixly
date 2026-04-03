'use client';

import { motion } from 'framer-motion';
import { Eye, MapPin, Users } from 'lucide-react';
import { useEffect, useState } from 'react';

import { useJobRealtimeCounts } from '@/hooks/realtime/useJobActivity';

import { formatCurrency, formatDate } from '../_lib/search.formatters';
import type { JobSearchResult } from '../_lib/search.types';

type SearchJobCardProps = {
  job: JobSearchResult;
  onOpenJob: (jobId: string) => void;
};

export function SearchJobCard({ job, onOpenJob }: SearchJobCardProps): React.JSX.Element {
  const realtimeCounts = useJobRealtimeCounts(job._id, {
    applicationCount: job.applicationCount,
    commentCount: job.commentCount,
    viewCount: job.views.count ?? 0,
  });
  const [viewCount, setViewCount] = useState<number>(job.views.count ?? 0);
  const [applicationCount, setApplicationCount] = useState<number>(job.applicationCount);

  useEffect(() => {
    setViewCount(realtimeCounts.viewCount);
    setApplicationCount(realtimeCounts.applicationCount);
  }, [realtimeCounts.applicationCount, realtimeCounts.viewCount]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card cursor-pointer transition-shadow hover:shadow-lg"
      onClick={() => onOpenJob(job._id)}
    >
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center space-x-2">
          <span
            className={`rounded-full px-2 py-1 text-xs font-medium ${
              job.urgency === 'urgent'
                ? 'bg-red-100 text-red-600'
                : job.urgency === 'medium'
                  ? 'bg-orange-100 text-orange-600'
                  : 'bg-green-100 text-green-600'
            }`}
          >
            {job.urgency}
          </span>
          <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-600">
            {job.status}
          </span>
        </div>
        <div className="text-sm text-fixly-text-light">{formatDate(job.createdAt)}</div>
      </div>

      <h3 className="mb-2 line-clamp-2 text-lg font-semibold text-fixly-text">{job.title}</h3>

      <p className="mb-4 line-clamp-3 text-sm text-fixly-text-light">{job.description}</p>

      <div className="mb-4 flex flex-wrap gap-2">
        {job.skillsRequired.slice(0, 3).map((skill, index) => (
          <span
            key={`${job._id}-skill-${index}`}
            className="rounded-full bg-fixly-accent-light px-2 py-1 text-xs text-fixly-accent"
          >
            {skill}
          </span>
        ))}
        {job.skillsRequired.length > 3 && (
          <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600">
            +{job.skillsRequired.length - 3} more
          </span>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4 text-sm text-fixly-text-light">
          <div className="flex items-center">
            <MapPin className="mr-1 h-4 w-4" />
            {job.location.city ?? 'Remote'}
          </div>
          <div className="flex items-center">
            <Users className="mr-1 h-4 w-4" />
            {applicationCount}
          </div>
          <div className="flex items-center">
            <Eye className="mr-1 h-4 w-4" />
            {viewCount}
          </div>
        </div>
        <div className="text-lg font-bold text-fixly-accent">
          {job.budget.type === 'fixed'
            ? formatCurrency(job.budget.amount)
            : job.budget.type === 'range'
              ? `${formatCurrency(job.budget.min)} - ${formatCurrency(job.budget.max)}`
              : 'Negotiable'}
        </div>
      </div>
    </motion.div>
  );
}
