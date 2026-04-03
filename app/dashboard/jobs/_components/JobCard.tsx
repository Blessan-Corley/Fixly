'use client';

import { motion } from 'framer-motion';
import {
  Calendar,
  DollarSign,
  Edit,
  Eye,
  MapPin,
  MoreVertical,
  RotateCcw,
  Trash2,
  Users,
  Clock,
} from 'lucide-react';

import { JobStatusBadge } from '@/app/dashboard/jobs/_components/JobStatusBadge';
import { formatCurrency, getTimeRemaining } from '@/app/dashboard/jobs/_lib/jobs.helpers';
import type { DashboardJob } from '@/app/dashboard/jobs/_lib/jobs.types';

type JobCardProps = {
  job: DashboardJob;
  index: number;
  onView: (jobId: string) => void;
  onEdit: (jobId: string) => void;
  onDelete: (jobId: string) => void;
  onRepost: (job: DashboardJob) => void;
};

export function JobCard({
  job,
  index,
  onView,
  onEdit,
  onDelete,
  onRepost,
}: JobCardProps): React.JSX.Element {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`card card-hover ${job.status === 'expired' ? 'border-2 border-red-500 bg-red-50/50' : ''}`}
    >
      <div className="mb-4 flex items-start justify-between">
        <div className="flex-1">
          <div className="mb-2 flex items-center space-x-2">
            <JobStatusBadge job={job} />
            {job.featured && (
              <span className="rounded-full bg-fixly-accent px-2 py-1 text-xs font-medium text-fixly-text">
                Featured
              </span>
            )}
            {job.status === 'completed' && job.completion.confirmedAt && (
              <span className="rounded-full border border-green-200 bg-green-100 px-2 py-1 text-xs text-green-800">
                Rs. {formatCurrency(job.budget.amount)} Paid
              </span>
            )}
          </div>

          <h3
            className="mb-2 cursor-pointer text-xl font-semibold text-fixly-text hover:text-fixly-accent"
            onClick={() => onView(job._id)}
          >
            {job.title}
          </h3>

          <p className="mb-3 line-clamp-2 text-fixly-text-muted">{job.description}</p>

          <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
            <div className="flex items-center text-fixly-text-muted">
              <DollarSign className="mr-1 h-4 w-4" />
              {job.budget.type === 'negotiable'
                ? 'Negotiable'
                : `Rs. ${formatCurrency(job.budget.amount)}`}
            </div>

            <div className="flex items-center text-fixly-text-muted">
              <MapPin className="mr-1 h-4 w-4" />
              {job.location.city}
            </div>

            <div className="flex items-center text-fixly-text-muted">
              <Clock className="mr-1 h-4 w-4" />
              {getTimeRemaining(job.deadline)}
            </div>

            <div className="flex items-center text-fixly-text-muted">
              <Users className="mr-1 h-4 w-4" />
              {job.applicationCount} applications
            </div>
          </div>
        </div>

        <div className="relative">
          <button className="rounded-lg p-2 hover:bg-fixly-accent/10" aria-label="More actions">
            <MoreVertical className="h-4 w-4 text-fixly-text-muted" />
          </button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-1">
        {job.skillsRequired.slice(0, 3).map((skill, skillIndex) => (
          <span key={`${job._id}-${skill}-${skillIndex}`} className="skill-chip text-xs">
            {skill}
          </span>
        ))}
        {job.skillsRequired.length > 3 && (
          <span className="text-xs text-fixly-text-muted">
            +{job.skillsRequired.length - 3} more
          </span>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-fixly-border pt-4">
        <div className="flex items-center space-x-4 text-sm text-fixly-text-muted">
          <div className="flex items-center">
            <Calendar className="mr-1 h-4 w-4" />
            Posted {new Date(job.createdAt).toLocaleDateString()}
          </div>
          <div className="flex items-center">
            <Eye className="mr-1 h-4 w-4" />
            {job.views.count} views
          </div>
        </div>

        <div className="flex space-x-2">
          <button onClick={() => onView(job._id)} className="btn-ghost text-sm">
            <Eye className="mr-1 h-4 w-4" />
            View
          </button>

          {job.status === 'open' && (
            <button onClick={() => onEdit(job._id)} className="btn-secondary text-sm">
              <Edit className="mr-1 h-4 w-4" />
              Edit
            </button>
          )}

          {job.status === 'expired' && (
            <>
              <button
                onClick={() => onRepost(job)}
                className="flex items-center rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700"
              >
                <RotateCcw className="mr-1 h-4 w-4" />
                Repost
              </button>
              <button
                onClick={() => onDelete(job._id)}
                className="flex items-center rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
              >
                <Trash2 className="mr-1 h-4 w-4" />
                Delete
              </button>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}
