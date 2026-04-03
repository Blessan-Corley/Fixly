'use client';

import { ArrowLeft } from 'lucide-react';

type CommentsPanelHeaderProps = {
  commentCount: number;
  initialCommentCount: number;
  onClose: () => void;
};

export default function CommentsPanelHeader({
  commentCount,
  initialCommentCount,
  onClose,
}: CommentsPanelHeaderProps): JSX.Element {
  return (
    <div className="flex items-center justify-between border-b border-fixly-border p-4 dark:border-gray-700">
      <button
        onClick={onClose}
        className="rounded-full p-1 transition-colors hover:bg-fixly-accent/10"
      >
        <ArrowLeft className="h-5 w-5 text-fixly-text" />
      </button>
      <h2 className="font-semibold text-fixly-text">
        Comments{' '}
        {commentCount > 0 && (
          <span className="text-fixly-text-muted">
            ({Math.max(commentCount, initialCommentCount)})
          </span>
        )}
      </h2>
      <div className="h-7 w-7" />
    </div>
  );
}
