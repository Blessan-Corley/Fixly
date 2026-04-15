'use client';

import { AnimatePresence, motion } from 'framer-motion';
import {
  Briefcase,
  Calendar,
  CheckCircle,
  Clock,
  DollarSign,
  ExternalLink,
  MapPin,
  Send,
  Shield,
  Star,
  Users,
  X,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

import type { BrowseJob } from './browse-jobs.types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBudget(budget: BrowseJob['budget']): string {
  if (!budget) return 'Not specified';
  if (budget.type === 'negotiable') return 'Negotiable';
  if (budget.type === 'hourly') return `Rs ${budget.amount?.toLocaleString() ?? 0}/hr`;
  return `Rs ${(budget.amount ?? 0).toLocaleString()}`;
}

function formatDeadline(deadline: string | undefined): string {
  if (!deadline) return 'Not set';
  const date = new Date(deadline);
  if (Number.isNaN(date.getTime())) return 'Not set';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatTimeAgo(createdAt: string | undefined): string {
  if (!createdAt) return '';
  const diff = Date.now() - new Date(createdAt).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function urgencyLabel(urgency: string | undefined): { label: string; color: string } {
  switch (urgency) {
    case 'asap':
      return { label: 'ASAP', color: 'bg-red-100 text-red-700 border-red-200' };
    case 'scheduled':
      return { label: 'Scheduled', color: 'bg-blue-100 text-blue-700 border-blue-200' };
    default:
      return { label: 'Flexible', color: 'bg-green-100 text-green-700 border-green-200' };
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

type HirerCardProps = {
  hirer: BrowseJob['hirer'];
};

function HirerCard({ hirer }: HirerCardProps): JSX.Element | null {
  if (!hirer) return null;
  const avatarSrc = hirer.photoURL ?? hirer.picture;
  const initial = (hirer.name ?? 'H').charAt(0).toUpperCase();

  return (
    <div className="rounded-xl border border-fixly-border bg-fixly-bg p-4">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-fixly-text-muted">
        Posted by
      </h3>
      <div className="flex items-center gap-3">
        {avatarSrc ? (
          <img
            src={avatarSrc}
            alt={hirer.name ?? 'Hirer'}
            className="h-12 w-12 rounded-full object-cover ring-2 ring-fixly-accent/20"
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-fixly-accent/20 text-lg font-bold text-fixly-accent">
            {initial}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-fixly-text">{hirer.name ?? 'Unknown'}</span>
            {hirer.isVerified && (
              <span aria-label="Verified">
                <Shield className="h-4 w-4 flex-shrink-0 text-fixly-accent" />
              </span>
            )}
          </div>
          {hirer.rating !== undefined && (
            <div className="flex items-center gap-1 text-sm text-fixly-text-muted">
              <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
              <span>{hirer.rating.toFixed(1)}</span>
            </div>
          )}
          {hirer.location?.city && (
            <div className="flex items-center gap-1 text-xs text-fixly-text-muted">
              <MapPin className="h-3 w-3" />
              <span>{hirer.location.city}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

type SkillTagsProps = {
  skills: string[];
  userSkills?: string[];
};

function SkillTags({ skills, userSkills = [] }: SkillTagsProps): JSX.Element {
  const normalizedUserSkills = userSkills.map((s) => s.toLowerCase());
  return (
    <div className="flex flex-wrap gap-2">
      {skills.map((skill, i) => {
        const matched = normalizedUserSkills.includes(skill.toLowerCase());
        return (
          <span
            key={`${skill}-${i}`}
            className={`rounded-full border px-3 py-1 text-sm font-medium transition-colors ${
              matched
                ? 'border-fixly-accent bg-fixly-accent text-white'
                : 'border-fixly-border bg-fixly-bg text-fixly-text-light hover:border-fixly-accent hover:text-fixly-accent'
            }`}
          >
            {skill}
          </span>
        );
      })}
    </div>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

export interface JobDetailModalProps {
  job: BrowseJob | null;
  userSkills?: string[];
  isApplying?: boolean;
  onClose: () => void;
  onApply: (jobId: string) => Promise<void>;
}

export default function JobDetailModal({
  job,
  userSkills = [],
  isApplying = false,
  onClose,
  onApply,
}: JobDetailModalProps): JSX.Element {
  const router = useRouter();
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // ESC to close
  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Lock body scroll while open
  useEffect(() => {
    if (job) {
      document.body.style.overflow = 'hidden';
      closeButtonRef.current?.focus();
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [job]);

  const urgency = urgencyLabel(job?.urgency);

  const handleApply = async (): Promise<void> => {
    if (job?._id) await onApply(job._id);
  };

  const handleViewFull = (): void => {
    if (job?._id) router.push(`/dashboard/jobs/${job._id}`);
  };

  return (
    <AnimatePresence>
      {job && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Panel */}
          <motion.div
            key="panel"
            role="dialog"
            aria-modal="true"
            aria-label={job.title ?? 'Job details'}
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 340, damping: 30 }}
            className="fixed inset-x-4 bottom-0 top-16 z-50 mx-auto flex max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-fixly-card shadow-2xl sm:inset-x-auto sm:inset-y-8 sm:rounded-2xl md:left-1/2 md:-translate-x-1/2"
          >
            {/* Header */}
            <div className="flex flex-shrink-0 items-start justify-between border-b border-fixly-border p-5">
              <div className="min-w-0 flex-1 pr-3">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${urgency.color}`}>
                    {urgency.label}
                  </span>
                  {job.budget?.materialsIncluded && (
                    <span className="rounded-full border border-green-200 bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">
                      Materials Included
                    </span>
                  )}
                  {job.type && job.type !== 'one-time' && (
                    <span className="rounded-full border border-purple-200 bg-purple-100 px-2.5 py-0.5 text-xs font-semibold text-purple-700 capitalize">
                      {job.type}
                    </span>
                  )}
                </div>
                <h2 className="text-xl font-bold text-fixly-text">{job.title ?? 'Untitled Job'}</h2>
                <div className="mt-1 flex items-center gap-3 text-xs text-fixly-text-muted">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {formatTimeAgo(job.createdAt)}
                  </span>
                  {job.location?.city && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {job.location.city}
                      {job.location.state ? `, ${job.location.state}` : ''}
                    </span>
                  )}
                </div>
              </div>
              <button
                ref={closeButtonRef}
                onClick={onClose}
                className="ml-2 flex-shrink-0 rounded-lg p-2 text-fixly-text-muted transition-colors hover:bg-fixly-border hover:text-fixly-text"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Stats row */}
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col items-center rounded-xl bg-fixly-bg p-3 text-center">
                  <DollarSign className="mb-1 h-5 w-5 text-fixly-accent" />
                  <span className="text-sm font-bold text-fixly-text">{formatBudget(job.budget)}</span>
                  <span className="text-xs text-fixly-text-muted">Budget</span>
                </div>
                <div className="flex flex-col items-center rounded-xl bg-fixly-bg p-3 text-center">
                  <Calendar className="mb-1 h-5 w-5 text-fixly-accent" />
                  <span className="text-sm font-bold text-fixly-text">{formatDeadline(job.deadline)}</span>
                  <span className="text-xs text-fixly-text-muted">Deadline</span>
                </div>
                <div className="flex flex-col items-center rounded-xl bg-fixly-bg p-3 text-center">
                  <Users className="mb-1 h-5 w-5 text-fixly-accent" />
                  <span className="text-sm font-bold text-fixly-text">{job.applicationCount ?? 0}</span>
                  <span className="text-xs text-fixly-text-muted">Applicants</span>
                </div>
              </div>

              {/* Description */}
              <div>
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-fixly-text-muted">
                  Description
                </h3>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-fixly-text-light">
                  {job.description ?? 'No description provided.'}
                </p>
              </div>

              {/* Skills */}
              {(job.skillsRequired?.length ?? 0) > 0 && (
                <div>
                  <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-fixly-text-muted">
                    Skills Required
                    {userSkills.length > 0 && (
                      <span className="ml-2 text-xs normal-case font-normal text-fixly-accent">
                        (highlighted = your match)
                      </span>
                    )}
                  </h3>
                  <SkillTags skills={job.skillsRequired ?? []} userSkills={userSkills} />
                </div>
              )}

              {/* Hirer info */}
              <HirerCard hirer={job.hirer} />

              {/* Location detail */}
              {(job.location?.city || job.location?.state) && (
                <div className="flex items-center gap-3 rounded-xl border border-fixly-border bg-fixly-bg p-4">
                  <Briefcase className="h-5 w-5 flex-shrink-0 text-fixly-accent" />
                  <div>
                    <p className="text-sm font-semibold text-fixly-text">Location</p>
                    <p className="text-sm text-fixly-text-muted">
                      {[job.location?.city, job.location?.state].filter(Boolean).join(', ')}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer actions */}
            <div className="flex-shrink-0 border-t border-fixly-border bg-fixly-card p-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleViewFull}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-fixly-border bg-fixly-bg px-4 py-3 text-sm font-medium text-fixly-text transition-colors hover:bg-fixly-border"
                >
                  <ExternalLink className="h-4 w-4" />
                  Full Details
                </button>

                <button
                  onClick={handleApply}
                  disabled={isApplying || job.hasApplied}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold transition-all ${
                    job.hasApplied
                      ? 'cursor-not-allowed border border-green-200 bg-green-100 text-green-700'
                      : isApplying
                        ? 'cursor-not-allowed bg-fixly-accent/60 text-white'
                        : 'bg-fixly-accent text-white shadow-sm hover:bg-fixly-accent-dark hover:shadow-md active:scale-95'
                  }`}
                >
                  {job.hasApplied ? (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      Applied
                    </>
                  ) : isApplying ? (
                    <>
                      <Send className="h-4 w-4 animate-pulse" />
                      Applying...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Apply Now
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
