'use client';

import { motion } from 'framer-motion';
import { Calendar, Eye, Flag, Heart, MapPin, MessageCircle, Share2, Users } from 'lucide-react';

import JobCommentButton from '@/components/JobCommentButton';

import { formatDate, getStatusColor, getUrgencyColor } from '../_lib/jobDetails.formatters';
import type { JobDetails } from '../_lib/jobDetails.types';

type JobOverviewCardProps = {
  job: JobDetails;
  safeJobId: string;
  canSeeLocation: boolean;
};

export function JobOverviewCard({
  job,
  safeJobId,
  canSeeLocation,
}: JobOverviewCardProps): React.JSX.Element {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card">
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center space-x-2">
          <span
            className={`rounded-full border px-3 py-1 text-sm font-medium ${getStatusColor(job.status)}`}
          >
            {job.status.replace('_', ' ').charAt(0).toUpperCase() +
              job.status.replace('_', ' ').slice(1)}
          </span>
          <span
            className={`rounded-full border px-3 py-1 text-sm font-medium ${getUrgencyColor(job.urgency)}`}
          >
            {job.urgency.charAt(0).toUpperCase() + job.urgency.slice(1)} Priority
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            type="button"
            className="rounded-lg p-2 text-fixly-text-light hover:bg-fixly-bg hover:text-fixly-accent"
            aria-label="Save job"
          >
            <Heart className="h-5 w-5" />
          </button>
          <JobCommentButton
            jobId={safeJobId}
            commentCount={job.commentsCount}
            className="rounded-lg p-2 text-fixly-text-light hover:bg-fixly-bg hover:text-fixly-accent"
            showText={false}
          />
          <button
            type="button"
            className="rounded-lg p-2 text-fixly-text-light hover:bg-fixly-bg hover:text-fixly-accent"
            aria-label="Share job"
          >
            <Share2 className="h-5 w-5" />
          </button>
          <button
            type="button"
            className="rounded-lg p-2 text-fixly-text-light hover:bg-red-50 hover:text-red-500"
            aria-label="Report job"
          >
            <Flag className="h-5 w-5" />
          </button>
        </div>
      </div>

      <h1 className="mb-4 text-3xl font-bold text-fixly-text">{job.title}</h1>

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="flex items-center text-fixly-text-light">
          <MapPin className="mr-2 h-4 w-4" />
          <span className="text-sm">
            {canSeeLocation
              ? job.locationCity
              : job.distance !== null
                ? `${job.distance.toFixed(1)} km away`
                : 'Location shared after application'}
          </span>
        </div>
        <div className="flex items-center text-fixly-text-light">
          <Calendar className="mr-2 h-4 w-4" />
          <span className="text-sm">{formatDate(job.createdAt)}</span>
        </div>
        <div className="flex items-center text-fixly-text-light">
          <Eye className="mr-2 h-4 w-4" />
          <span className="text-sm">{job.viewsCount} views</span>
        </div>
        <div className="flex items-center text-fixly-text-light">
          <Users className="mr-2 h-4 w-4" />
          <span className="text-sm">{job.applicationCount} applications</span>
        </div>
        <div className="flex items-center text-fixly-text-light">
          <MessageCircle className="mr-2 h-4 w-4" />
          <span className="text-sm">{job.commentsCount} comments</span>
        </div>
      </div>

      {job.skillsRequired.length > 0 && (
        <div className="mb-6">
          <h3 className="mb-3 text-lg font-semibold text-fixly-text">Skills Required</h3>
          <div className="flex flex-wrap gap-2">
            {job.skillsRequired.map((skill) => (
              <span
                key={skill}
                className="rounded-full bg-fixly-accent-light px-3 py-1 text-sm text-fixly-accent"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
