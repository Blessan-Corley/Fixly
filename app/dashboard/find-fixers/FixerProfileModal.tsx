'use client';

import { motion } from 'framer-motion';
import { CheckCircle, Clock, MapPin, MessageCircle, X } from 'lucide-react';
import Image from 'next/image';

import type { ProfileModalProps } from './find-fixers.types';
import { renderRatingStars } from './find-fixers.utils';

export default function FixerProfileModal({ fixer, onClose, onContact }: ProfileModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-fixly-card"
      >
        {/* Header */}
        <div className="border-b border-fixly-border p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4">
              <Image
                src={fixer.profilePhoto || '/default-avatar.png'}
                alt={`${fixer.name} profile photo`}
                width={80}
                height={80}
                unoptimized
                className="h-20 w-20 rounded-full object-cover"
              />
              <div>
                <h2 className="mb-1 text-2xl font-bold text-fixly-text">{fixer.name}</h2>
                <div className="mb-2 flex items-center">
                  {renderRatingStars(fixer.rating.average)}
                  <span className="ml-2 text-sm text-fixly-text-muted">
                    {fixer.rating.average.toFixed(1)} ({fixer.rating.count} reviews)
                  </span>
                </div>
                <div className="flex items-center text-fixly-text-muted">
                  <MapPin className="mr-1 h-4 w-4" />
                  {fixer.location?.city
                    ? `${fixer.location.city}, ${fixer.location.state || 'India'}`
                    : 'Location not specified'}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-2 transition-colors hover:bg-fixly-bg"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Badges */}
          <div className="mb-6 flex items-center gap-2">
            {fixer.isVerified && (
              <span className="flex items-center rounded-full bg-green-100 px-3 py-1 text-sm text-green-800">
                <CheckCircle className="mr-1 h-4 w-4" />
                Verified Professional
              </span>
            )}
            <span className="flex items-center rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-800">
              <Clock className="mr-1 h-4 w-4" />
              Available
            </span>
          </div>

          {/* Stats */}
          <div className="mb-6 grid grid-cols-3 gap-4">
            <div className="rounded-lg bg-fixly-bg p-4 text-center">
              <div className="text-2xl font-bold text-fixly-text">{fixer.jobsCompleted || 0}</div>
              <div className="text-sm text-fixly-text-muted">Jobs Completed</div>
            </div>
            <div className="rounded-lg bg-fixly-bg p-4 text-center">
              <div className="text-2xl font-bold text-fixly-text">{fixer.rating.count}</div>
              <div className="text-sm text-fixly-text-muted">Reviews</div>
            </div>
            <div className="rounded-lg bg-fixly-bg p-4 text-center">
              <div className="text-2xl font-bold text-fixly-text">
                {fixer.responseTime || '< 1hr'}
              </div>
              <div className="text-sm text-fixly-text-muted">Response Time</div>
            </div>
          </div>

          {/* Skills */}
          <div className="mb-6">
            <h3 className="mb-3 text-lg font-semibold text-fixly-text">Skills &amp; Expertise</h3>
            <div className="flex flex-wrap gap-2">
              {(fixer.skills || []).map((skill, index) => (
                <span
                  key={index}
                  className="rounded-full bg-fixly-accent/10 px-3 py-1 text-sm text-fixly-accent"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>

          {/* Bio */}
          {fixer.bio && (
            <div className="mb-6">
              <h3 className="mb-3 text-lg font-semibold text-fixly-text">About</h3>
              <p className="leading-relaxed text-fixly-text-muted">{fixer.bio}</p>
            </div>
          )}

          {/* Recent Reviews */}
          {fixer.recentReviews && fixer.recentReviews.length > 0 && (
            <div className="mb-6">
              <h3 className="mb-3 text-lg font-semibold text-fixly-text">Recent Reviews</h3>
              <div className="space-y-3">
                {fixer.recentReviews.slice(0, 3).map((review, index) => (
                  <div key={`${review.createdAt}-${index}`} className="rounded-lg bg-fixly-bg p-3">
                    <div className="mb-2 flex items-center">
                      {renderRatingStars(review.rating)}
                      <span className="ml-2 text-sm text-fixly-text-muted">
                        {new Date(review.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-fixly-text">{review.comment}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Contact Button */}
          <button
            onClick={onContact}
            className="btn-primary flex w-full items-center justify-center"
          >
            <MessageCircle className="mr-2 h-5 w-5" />
            Contact {fixer.name}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
