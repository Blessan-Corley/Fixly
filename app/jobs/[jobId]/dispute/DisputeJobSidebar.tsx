'use client';

import { Calendar, DollarSign, MapPin, User } from 'lucide-react';
import NextImage from 'next/image';

import type { JobDetails, JobParty } from './dispute.types';
import { formatCurrency } from './dispute.utils';

type DisputeJobSidebarProps = {
  job: JobDetails;
  otherParty: JobParty | null;
};

export default function DisputeJobSidebar({ job, otherParty }: DisputeJobSidebarProps) {
  return (
    <div className="card sticky top-8">
      <h3 className="mb-4 text-lg font-semibold text-fixly-text">Job Details</h3>

      <div className="space-y-4">
        <div>
          <h4 className="font-medium text-fixly-text">{job.title}</h4>
          <p className="text-sm capitalize text-fixly-text-light">{job.category}</p>
        </div>

        <div className="flex items-center text-sm text-fixly-text-light">
          <MapPin className="mr-2 h-4 w-4" />
          {job.locationAddress}
        </div>

        <div className="flex items-center text-sm text-fixly-text-light">
          <DollarSign className="mr-2 h-4 w-4" />
          Rs. {formatCurrency(job.budgetAmount)}
        </div>

        <div className="flex items-center text-sm text-fixly-text-light">
          <Calendar className="mr-2 h-4 w-4" />
          Status: <span className="ml-1 capitalize">{job.status}</span>
        </div>

        <div className="border-fixly-border pt-4">
          <h4 className="mb-3 text-sm font-medium text-fixly-text">Other Party</h4>
          {otherParty ? (
            <div className="flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-fixly-accent-light">
                {otherParty.photoURL ? (
                  <NextImage
                    src={otherParty.photoURL}
                    alt={otherParty.name}
                    width={40}
                    height={40}
                    className="h-10 w-10 rounded-full object-cover"
                    unoptimized
                  />
                ) : (
                  <User className="h-5 w-5 text-fixly-accent" />
                )}
              </div>
              <div>
                <h5 className="font-medium text-fixly-text">{otherParty.name}</h5>
                <p className="text-sm text-fixly-text-light">
                  @{otherParty.username || 'unknown'}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-fixly-text-light">No assigned party found.</p>
          )}
        </div>
      </div>
    </div>
  );
}
