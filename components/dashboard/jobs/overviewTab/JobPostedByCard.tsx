'use client';

import { Shield, Star } from 'lucide-react';
import Image from 'next/image';

type PostedBy = {
  name?: string;
  photoURL?: string | null;
  location?: { city?: string; state?: string } | null;
  isVerified?: boolean;
  rating?: { average?: number; count?: number } | null;
};

type Props = {
  createdBy: PostedBy;
};

export function JobPostedByCard({ createdBy }: Props): React.JSX.Element {
  return (
    <div className="card">
      <h3 className="mb-4 font-semibold text-fixly-text">Posted By</h3>
      <div className="mb-3 flex items-center">
        <Image
          src={createdBy.photoURL ?? '/default-avatar.png'}
          alt={`${createdBy.name ?? 'User'} profile photo`}
          width={48}
          height={48}
          unoptimized
          className="mr-3 h-12 w-12 rounded-full object-cover"
        />
        <div>
          <p className="font-medium text-fixly-text">{createdBy.name ?? ''}</p>
          <div className="flex items-center">
            <Star className="mr-1 h-4 w-4 text-yellow-500" />
            <span className="text-sm text-fixly-text-muted">
              {createdBy.rating?.average?.toFixed(1) ?? 'New'}
              {createdBy.rating?.count !== undefined && ` (${createdBy.rating.count} reviews)`}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-2 text-sm text-fixly-text-muted">
        {createdBy.location?.city && createdBy.location?.state && (
          <p>
            {createdBy.location.city}, {createdBy.location.state}
          </p>
        )}
        {createdBy.isVerified && (
          <div className="flex items-center text-green-600">
            <Shield className="mr-1 h-4 w-4" />
            Verified
          </div>
        )}
      </div>
    </div>
  );
}
