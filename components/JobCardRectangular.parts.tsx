'use client';

import {
  Calendar,
  CheckCircle,
  Clock,
  DollarSign,
  Eye,
  MapPin,
  MessageSquare,
  Send,
} from 'lucide-react';

import { formatDistance as formatDistanceLabel } from '../utils/locationUtils';

import type { JobBudget } from './JobCardRectangular.types';

// ─── JobCardMetaRow ───────────────────────────────────────────────────────────

export type JobCardMetaRowProps = {
  timeAgo: string;
  viewCount: number;
  distance: number | null;
  showDistance: boolean;
  userLocation: { lat: number; lng: number } | null;
  locationCity: string | undefined;
};

export function JobCardMetaRow({
  timeAgo,
  viewCount,
  distance,
  showDistance,
  userLocation,
  locationCity,
}: JobCardMetaRowProps): React.JSX.Element {
  return (
    <div className="mb-2 flex items-center gap-4 text-sm text-fixly-text-muted">
      <div className="flex items-center gap-1">
        <Clock className="h-4 w-4" />
        <span className="font-medium text-fixly-accent">{timeAgo}</span>
      </div>
      <div className="flex items-center gap-1">
        <Eye className="h-4 w-4" />
        <span className="font-medium text-green-600">{viewCount} views</span>
      </div>

      {distance !== null && showDistance && (
        <div className="flex items-center gap-1 text-fixly-accent">
          <MapPin className="h-4 w-4" />
          <span className="rounded-full bg-fixly-accent/10 px-2 py-1 text-xs font-semibold text-fixly-accent">
            {formatDistanceLabel(distance)} away
          </span>
        </div>
      )}

      {distance === null && showDistance && userLocation && (
        <div className="flex items-center gap-1 text-fixly-text-muted">
          <MapPin className="h-4 w-4" />
          <span className="text-xs">Near {locationCity ?? 'your area'}</span>
        </div>
      )}
    </div>
  );
}

// ─── JobCardSkillTags ─────────────────────────────────────────────────────────

export type JobCardSkillTagsProps = {
  skills: string[];
  userSkills: string[] | undefined;
};

export function JobCardSkillTags({ skills, userSkills }: JobCardSkillTagsProps): React.JSX.Element {
  return (
    <div className="mb-3 flex flex-wrap gap-1">
      {skills.slice(0, 4).map((skill, index) => (
        <span
          key={`${skill}-${index}`}
          className={`rounded-full px-2 py-1 text-xs transition-all ${
            userSkills?.some((userSkill) => userSkill.toLowerCase() === skill.toLowerCase())
              ? 'bg-fixly-accent text-white'
              : 'border border-slate-200 bg-slate-100 text-slate-700 hover:border-fixly-accent hover:bg-transparent hover:text-fixly-accent dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-fixly-accent dark:hover:bg-transparent dark:hover:text-fixly-accent'
          }`}
        >
          {skill}
        </span>
      ))}
      {skills.length > 4 && (
        <span className="px-2 py-1 text-xs text-fixly-text-muted">+{skills.length - 4} more</span>
      )}
    </div>
  );
}

// ─── JobCardActions ───────────────────────────────────────────────────────────

export type JobCardActionsProps = {
  budget: JobBudget | undefined;
  deadline: string | Date | undefined;
  commentCount: number;
  hasApplied: boolean;
  isApplying: boolean;
  onViewDetails: () => Promise<void>;
  onOpenComments: () => void;
  onApply: () => Promise<void>;
};

export function JobCardActions({
  budget,
  deadline,
  commentCount,
  hasApplied,
  isApplying,
  onViewDetails,
  onOpenComments,
  onApply,
}: JobCardActionsProps): React.JSX.Element {
  const getBudgetDisplay = (): string => {
    if (!budget) return 'Not specified';
    if (budget.type === 'negotiable') return 'Negotiable';
    if (budget.type === 'hourly') return `Rs ${budget.amount ?? 0}/hr`;
    return `Rs ${(budget.amount ?? 0).toLocaleString()}`;
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1 font-semibold text-fixly-accent">
          <DollarSign className="h-4 w-4" />
          <span>{getBudgetDisplay()}</span>
        </div>
        <div className="flex items-center gap-1 text-sm text-fixly-text-muted">
          <Calendar className="h-4 w-4" />
          <span className="font-medium">
            Deadline:{' '}
            {deadline
              ? new Date(deadline).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })
              : 'N/A'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onViewDetails}
          className="tap-target flex items-center gap-1 rounded-lg bg-fixly-bg px-3 py-2 text-sm text-fixly-text transition-colors hover:bg-fixly-border dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
          title="View Details"
        >
          <Eye className="h-4 w-4" />
          <span className="hidden sm:inline">Details</span>
        </button>

        <button
          onClick={onOpenComments}
          className="tap-target relative flex items-center gap-1 rounded-lg bg-fixly-bg px-3 py-2 text-sm text-fixly-text transition-colors hover:bg-fixly-border dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
          title="Comments"
        >
          <MessageSquare className="h-4 w-4" />
          <span className="hidden sm:inline">Comments</span>
          {commentCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-fixly-accent text-xs text-white sm:static sm:ml-1">
              {commentCount > 99 ? '99+' : commentCount}
            </span>
          )}
        </button>

        <button
          onClick={onApply}
          disabled={isApplying || hasApplied}
          className={`tap-target flex items-center gap-1 rounded-lg px-3 py-2 text-sm transition-colors ${
            hasApplied
              ? 'cursor-not-allowed border border-green-200 bg-green-100 text-green-700 dark:border-green-700 dark:bg-green-900 dark:text-green-300'
              : isApplying
                ? 'cursor-not-allowed bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                : 'bg-fixly-accent text-white shadow-sm hover:bg-fixly-accent-dark hover:shadow-md'
          }`}
          title={hasApplied ? 'Already Applied' : 'Apply Now'}
        >
          {hasApplied ? <CheckCircle className="h-4 w-4" /> : <Send className="h-4 w-4" />}
          <span className="hidden sm:inline">
            {hasApplied ? 'Applied' : isApplying ? 'Applying...' : 'Apply'}
          </span>
        </button>
      </div>
    </div>
  );
}
