'use client';

import { motion } from 'framer-motion';
import { CheckCircle, Clock, Eye, MapPin, MessageCircle } from 'lucide-react';
import Image from 'next/image';

import type { FixerProfile } from './find-fixers.types';
import { renderRatingStars } from './find-fixers.utils';

type FixerCardProps = {
  fixer: FixerProfile;
  onViewProfile: (fixer: FixerProfile) => void;
  onContact: (fixer: FixerProfile) => void;
};

export default function FixerCard({ fixer, onViewProfile, onContact }: FixerCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card border border-fixly-border transition-all duration-300 hover:-translate-y-1 hover:border-fixly-accent hover:shadow-fixly-lg"
    >
      {/* Fixer Header */}
      <div className="mb-4 flex items-start">
        <Image
          src={fixer.profilePhoto || '/default-avatar.png'}
          alt={`${fixer.name} profile photo`}
          width={64}
          height={64}
          unoptimized
          className="mr-4 h-16 w-16 rounded-full object-cover"
        />
        <div className="flex-1">
          <h3 className="mb-1 font-semibold text-fixly-text">{fixer.name}</h3>
          <div className="mb-1 flex items-center">
            {renderRatingStars(fixer.rating.average)}
            <span className="ml-2 text-sm text-fixly-text-muted">
              ({fixer.rating.count} reviews)
            </span>
          </div>
          <div className="flex items-center text-sm text-fixly-text-muted">
            <MapPin className="mr-1 h-3 w-3" />
            {fixer.location?.city
              ? `${fixer.location.city}, ${fixer.location.state || 'India'}`
              : 'Location not specified'}
          </div>
        </div>
      </div>

      {/* Skills */}
      <div className="mb-4">
        <div className="flex flex-wrap gap-1">
          {(fixer.skills || []).slice(0, 3).map((skill, index) => (
            <span
              key={index}
              className="rounded-full bg-fixly-accent/10 px-2 py-1 text-xs text-fixly-accent"
            >
              {skill}
            </span>
          ))}
          {(fixer.skills || []).length > 3 && (
            <span className="rounded-full bg-fixly-bg px-2 py-1 text-xs text-fixly-text-muted">
              +{fixer.skills.length - 3} more
            </span>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="mb-4 grid grid-cols-2 gap-4 rounded-lg bg-fixly-bg p-3">
        <div className="text-center">
          <div className="font-semibold text-fixly-text">{fixer.jobsCompleted || 0}</div>
          <div className="text-xs text-fixly-text-muted">Jobs Done</div>
        </div>
        <div className="text-center">
          <div className="font-semibold text-fixly-text">{fixer.responseTime || 'N/A'}</div>
          <div className="text-xs text-fixly-text-muted">Response Time</div>
        </div>
      </div>

      {/* Badges */}
      <div className="mb-4 flex items-center gap-2">
        {fixer.isVerified && (
          <span className="flex items-center rounded-full bg-green-100 px-2 py-1 text-xs text-green-800">
            <CheckCircle className="mr-1 h-3 w-3" />
            Verified
          </span>
        )}
        <span className="flex items-center rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-800">
          <Clock className="mr-1 h-3 w-3" />
          Available
        </span>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => onViewProfile(fixer)}
          className="btn-secondary flex flex-1 items-center justify-center"
        >
          <Eye className="mr-2 h-4 w-4" />
          View Profile
        </button>
        <button
          onClick={() => onContact(fixer)}
          className="btn-primary flex flex-1 items-center justify-center"
        >
          <MessageCircle className="mr-2 h-4 w-4" />
          Contact
        </button>
      </div>
    </motion.div>
  );
}
