'use client';

import { Calendar, Clock } from 'lucide-react';

type Props = {
  createdAt: string | Date | undefined;
  deadline: string | Date | undefined;
  scheduledDate?: string | Date | null;
  timeRemaining: string;
  formatDateValue: (
    value?: string | Date,
    locale?: string,
    options?: Intl.DateTimeFormatOptions
  ) => string;
};

export function JobTimelineSection({
  createdAt,
  deadline,
  scheduledDate,
  timeRemaining,
  formatDateValue,
}: Props): React.JSX.Element {
  const timeRemainingColor =
    timeRemaining === 'Expired'
      ? 'text-red-600'
      : timeRemaining.includes('h')
        ? 'text-orange-600'
        : 'text-green-600';

  return (
    <div>
      <h3 className="mb-4 text-lg font-semibold text-fixly-text">Timeline</h3>
      <div className="space-y-3 rounded-lg bg-fixly-bg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Calendar className="mr-3 h-4 w-4 text-fixly-accent" />
            <span className="text-fixly-text-muted">Posted</span>
          </div>
          <span className="font-medium text-fixly-text">
            {formatDateValue(createdAt, 'en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Clock className="mr-3 h-4 w-4 text-red-500" />
            <span className="text-fixly-text-muted">Deadline</span>
          </div>
          <span className="font-medium text-fixly-text">
            {formatDateValue(deadline, 'en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>

        {scheduledDate && (
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Calendar className="mr-3 h-4 w-4 text-blue-500" />
              <span className="text-fixly-text-muted">Scheduled</span>
            </div>
            <span className="font-medium text-fixly-text">
              {formatDateValue(scheduledDate, 'en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </span>
          </div>
        )}

        <div className="border-t border-fixly-border pt-2">
          <div className="flex items-center justify-between">
            <span className="text-fixly-text-muted">Time remaining</span>
            <span className={`font-semibold ${timeRemainingColor}`}>{timeRemaining}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
