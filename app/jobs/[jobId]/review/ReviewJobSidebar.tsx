'use client';

import { Calendar, DollarSign, MapPin, Star, User } from 'lucide-react';
import Image from 'next/image';

import type { JobParticipant, JobReviewDetails } from './review.types';

type ReviewJobSidebarProps = {
  job: JobReviewDetails;
  reviewee: JobParticipant;
  completedDateLabel: string;
};

export default function ReviewJobSidebar({
  job,
  reviewee,
  completedDateLabel,
}: ReviewJobSidebarProps) {
  return (
    <div className="card sticky top-8">
      <h3 className="mb-4 text-lg font-semibold text-fixly-text">Job Summary</h3>

      <div className="space-y-4">
        <div>
          <h4 className="font-medium text-fixly-text">{job.title}</h4>
          <p className="text-sm capitalize text-fixly-text-light">{job.category}</p>
        </div>

        <div className="flex items-center text-sm text-fixly-text-light">
          <MapPin className="mr-2 h-4 w-4" />
          {job.location.address}
        </div>

        <div className="flex items-center text-sm text-fixly-text-light">
          <DollarSign className="mr-2 h-4 w-4" />
          {job.budget.amount > 0
            ? `Rs ${job.budget.amount.toLocaleString()}`
            : 'Negotiable'}
        </div>

        <div className="flex items-center text-sm text-fixly-text-light">
          <Calendar className="mr-2 h-4 w-4" />
          Completed {completedDateLabel}
        </div>

        <div className="border-t border-fixly-border pt-4">
          <div className="flex items-center space-x-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-fixly-accent-light">
              {reviewee.photoURL ? (
                <Image
                  src={reviewee.photoURL}
                  alt={reviewee.name}
                  width={48}
                  height={48}
                  unoptimized
                  className="h-12 w-12 rounded-full object-cover"
                />
              ) : (
                <User className="h-6 w-6 text-fixly-accent" />
              )}
            </div>
            <div>
              <h4 className="font-medium text-fixly-text">{reviewee.name}</h4>
              <p className="text-sm text-fixly-text-light">@{reviewee.username}</p>
              {reviewee.rating && reviewee.rating.average > 0 && (
                <div className="mt-1 flex items-center">
                  <Star className="mr-1 h-4 w-4 fill-current text-yellow-500" />
                  <span className="text-sm text-fixly-text-light">
                    {reviewee.rating.average} ({reviewee.rating.count} reviews)
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
