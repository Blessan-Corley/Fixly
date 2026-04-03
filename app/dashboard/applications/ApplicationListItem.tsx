'use client';

import { motion } from 'framer-motion';
import { Calendar, Clock, DollarSign, Eye, MapPin, MessageSquare, Star, X } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

import type { ApplicationItem } from './applications.types';
import { getStatusColor, getStatusIcon } from './applications.utils';

type ApplicationListItemProps = {
  application: ApplicationItem;
  index: number;
  onWithdraw: (jobId: string) => void;
};

export default function ApplicationListItem({
  application,
  index,
  onWithdraw,
}: ApplicationListItemProps) {
  const router = useRouter();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="card card-hover"
    >
      <div className="mb-4 flex items-start justify-between">
        <div className="flex-1">
          {/* Status + Featured badges */}
          <div className="mb-2 flex items-center space-x-3">
            <span
              className={`flex items-center rounded-full border px-3 py-1 text-xs ${getStatusColor(application.status)}`}
            >
              {getStatusIcon(application.status)}
              <span className="ml-1">{application.status.toUpperCase()}</span>
            </span>
            {application.job.featured && (
              <span className="rounded-full bg-fixly-accent px-2 py-1 text-xs font-medium text-fixly-text">
                Featured
              </span>
            )}
          </div>

          {/* Job title */}
          <h3
            className="mb-2 cursor-pointer text-xl font-semibold text-fixly-text hover:text-fixly-accent"
            onClick={() => router.push(`/dashboard/jobs/${application.job._id}`)}
          >
            {application.job.title}
          </h3>

          {/* Description */}
          <p className="mb-3 line-clamp-2 text-fixly-text-muted">{application.job.description}</p>

          {/* Details grid */}
          <div className="mb-4 grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
            <div className="flex items-center text-fixly-text-muted">
              <DollarSign className="mr-1 h-4 w-4" />
              {application.proposedAmount != null
                ? `₹${application.proposedAmount.toLocaleString()}`
                : 'Not specified'}
            </div>

            <div className="flex items-center text-fixly-text-muted">
              <MapPin className="mr-1 h-4 w-4" />
              {application.job.location.city}
            </div>

            <div className="flex items-center text-fixly-text-muted">
              <Calendar className="mr-1 h-4 w-4" />
              Applied {new Date(application.appliedAt).toLocaleDateString()}
            </div>

            <div className="flex items-center text-fixly-text-muted">
              <Clock className="mr-1 h-4 w-4" />
              {application.timeEstimate
                ? `${application.timeEstimate.value} ${application.timeEstimate.unit}`
                : 'Not specified'}
            </div>
          </div>

          {/* Cover letter */}
          {application.coverLetter && (
            <div className="mb-4 rounded-lg bg-fixly-bg p-3">
              <h4 className="mb-2 font-medium text-fixly-text">Cover Letter:</h4>
              <p className="text-sm text-fixly-text-muted">{application.coverLetter}</p>
            </div>
          )}

          {/* Hirer info */}
          <div className="flex items-center border-t border-fixly-border pt-4">
            <Image
              src={application.job.createdBy.photoURL || '/default-avatar.png'}
              alt={application.job.createdBy.name}
              width={32}
              height={32}
              className="mr-3 h-8 w-8 rounded-full object-cover"
              unoptimized
            />
            <div>
              <p className="text-sm font-medium text-fixly-text">
                {application.job.createdBy.name}
              </p>
              <div className="flex items-center">
                <Star className="mr-1 h-3 w-3 text-yellow-500" />
                <span className="text-xs text-fixly-text-muted">
                  {application.job.createdBy.rating.average != null
                    ? application.job.createdBy.rating.average.toFixed(1)
                    : 'New'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex space-x-2">
        <button
          onClick={() => router.push(`/dashboard/jobs/${application.job._id}`)}
          className="btn-secondary flex items-center"
        >
          <Eye className="mr-1 h-4 w-4" />
          View Job
        </button>

        {application.status === 'accepted' && (
          <button
            onClick={() => router.push(`/dashboard/jobs/${application.job._id}/messages`)}
            className="btn-primary flex items-center"
          >
            <MessageSquare className="mr-1 h-4 w-4" />
            Message Hirer
          </button>
        )}

        {application.status === 'pending' && (
          <button
            onClick={() => onWithdraw(application.job._id)}
            className="btn-ghost flex items-center text-red-600 hover:bg-red-50"
          >
            <X className="mr-1 h-4 w-4" />
            Withdraw
          </button>
        )}
      </div>
    </motion.div>
  );
}
