'use client';

import { useState, useEffect } from 'react';

type DateInput = Date | string | number;

export interface MobileTimeAgoProps {
  date: DateInput;
  className?: string;
}

function toValidDate(value: DateInput): Date | null {
  const parsed = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function MobileTimeAgo({ date, className = '' }: MobileTimeAgoProps) {
  const [timeAgo, setTimeAgo] = useState<string>('');

  useEffect(() => {
    const updateTimeAgo = (): void => {
      const parsedDate = toValidDate(date);
      if (!parsedDate) {
        setTimeAgo('');
        return;
      }

      const now = new Date();
      const diffInSeconds = Math.floor((now.getTime() - parsedDate.getTime()) / 1000);

      if (diffInSeconds < 60) {
        setTimeAgo('now');
      } else if (diffInSeconds < 3600) {
        setTimeAgo(`${Math.floor(diffInSeconds / 60)}m`);
      } else if (diffInSeconds < 86400) {
        setTimeAgo(`${Math.floor(diffInSeconds / 3600)}h`);
      } else if (diffInSeconds < 604800) {
        setTimeAgo(`${Math.floor(diffInSeconds / 86400)}d`);
      } else {
        setTimeAgo(parsedDate.toLocaleDateString());
      }
    };

    updateTimeAgo();
    const interval = setInterval(updateTimeAgo, 60000);
    return () => clearInterval(interval);
  }, [date]);

  return <span className={`text-xs text-fixly-text-muted ${className}`}>{timeAgo}</span>;
}
