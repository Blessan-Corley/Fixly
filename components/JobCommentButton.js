'use client';

import { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import InstagramComments from './InstagramComments';

export default function JobCommentButton({ 
  jobId, 
  commentCount = 0, 
  className = "",
  showText = true 
}) {
  const [showComments, setShowComments] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowComments(true)}
        className={`flex items-center space-x-2 text-fixly-text-muted hover:text-fixly-accent transition-colors ${className}`}
      >
        <MessageCircle className="h-5 w-5" />
        {showText && (
          <span className="text-sm">
            {commentCount === 0 ? 'Comment' : `${commentCount} ${commentCount === 1 ? 'Comment' : 'Comments'}`}
          </span>
        )}
      </button>

      <InstagramComments 
        jobId={jobId}
        isOpen={showComments}
        onClose={() => setShowComments(false)}
        initialCommentCount={commentCount}
      />
    </>
  );
}