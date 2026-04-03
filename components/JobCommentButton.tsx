'use client';

import { MessageCircle } from 'lucide-react';
import { useState } from 'react';

import JobCommentsPanel from './jobs/comments/JobCommentsPanel';

interface JobCommentButtonProps {
  jobId: string;
  commentCount?: number;
  className?: string;
  showText?: boolean;
}

export default function JobCommentButton({
  jobId,
  commentCount = 0,
  className = '',
  showText = true,
}: JobCommentButtonProps) {
  const [showComments, setShowComments] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowComments(true)}
        className={`flex items-center space-x-2 text-fixly-text-muted transition-colors hover:text-fixly-accent ${className}`}
      >
        <MessageCircle className="h-5 w-5" />
        {showText && (
          <span className="text-sm">
            {commentCount === 0
              ? 'Comment'
              : `${commentCount} ${commentCount === 1 ? 'Comment' : 'Comments'}`}
          </span>
        )}
      </button>

      <JobCommentsPanel
        jobId={jobId}
        isOpen={showComments}
        onClose={() => setShowComments(false)}
        initialCommentCount={commentCount}
      />
    </>
  );
}
