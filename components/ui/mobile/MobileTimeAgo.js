'use client';

import { useState, useEffect } from 'react';

export function MobileTimeAgo({ date, className = '' }) {
  const [timeAgo, setTimeAgo] = useState('');

  useEffect(() => {
    const updateTimeAgo = () => {
      const now = new Date();
      const diffInSeconds = Math.floor((now - new Date(date)) / 1000);

      if (diffInSeconds < 60) {
        setTimeAgo('now');
      } else if (diffInSeconds < 3600) {
        setTimeAgo(`${Math.floor(diffInSeconds / 60)}m`);
      } else if (diffInSeconds < 86400) {
        setTimeAgo(`${Math.floor(diffInSeconds / 3600)}h`);
      } else if (diffInSeconds < 604800) {
        setTimeAgo(`${Math.floor(diffInSeconds / 86400)}d`);
      } else {
        setTimeAgo(new Date(date).toLocaleDateString());
      }
    };

    updateTimeAgo();
    const interval = setInterval(updateTimeAgo, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [date]);

  return (
    <span className={`text-xs text-fixly-text-muted ${className}`}>
      {timeAgo}
    </span>
  );
}