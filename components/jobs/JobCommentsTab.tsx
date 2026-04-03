'use client';

import { AlertCircle, Loader } from 'lucide-react';
import Image from 'next/image';
import { type KeyboardEvent } from 'react';

import {
  hasUserLiked,
  type JobCommentsTabProps,
} from './JobCommentsTab.utils';

export default function JobCommentsTab({
  comments,
  user,
  job,
  newComment,
  replyingTo,
  replyText,
  submittingReply,
  submittingComment,
  onNewCommentChange,
  onReplyingToChange,
  onReplyTextChange,
  onAddComment,
  onAddReply,
  onLikeComment,
  onLikeReply,
  onDeleteComment,
  onDeleteReply,
  onUpgrade,
  canUserComment,
  canApplyToJob,
  getTimeAgo,
}: JobCommentsTabProps): React.JSX.Element {
  const currentUserId = user?._id;
  const canComment = canUserComment(user, job);

  const handleReplyKeyDown = (event: KeyboardEvent<HTMLInputElement>, commentId: string): void => {
    if (event.key === 'Enter') {
      onAddReply(commentId);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        {comments.map((comment) => (
          <div key={comment._id}>
            <div className="flex items-start space-x-3">
              <Image
                src={comment.author?.photoURL ?? '/default-avatar.png'}
                alt={`${comment.author?.name ?? 'User'} profile photo`}
                width={32}
                height={32}
                unoptimized
                className="h-8 w-8 flex-shrink-0 rounded-full object-cover"
              />
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center space-x-2">
                  <p className="text-sm font-semibold text-fixly-text">
                    {comment.author?.name ?? 'Anonymous'}
                  </p>
                  <p className="text-xs text-fixly-text-muted">{getTimeAgo(comment.createdAt)}</p>
                </div>
                <p className="break-words text-sm text-fixly-text">{comment.message}</p>

                <div className="mt-2 flex items-center space-x-4">
                  <button
                    onClick={() => onLikeComment(comment._id)}
                    className={`text-xs transition-colors hover:text-fixly-accent ${
                      hasUserLiked(comment.likes, currentUserId)
                        ? 'font-medium text-fixly-accent'
                        : 'text-fixly-text-muted'
                    }`}
                  >
                    {comment.likes?.length ?? 0} likes
                  </button>
                  {canComment && (
                    <button
                      onClick={() => onReplyingToChange(comment._id)}
                      className="text-xs text-fixly-text-muted transition-colors hover:text-fixly-accent"
                    >
                      Reply
                    </button>
                  )}
                  {comment.author?._id === currentUserId && (
                    <button
                      onClick={() => onDeleteComment(comment._id)}
                      className="text-xs text-red-500 transition-colors hover:text-red-700"
                    >
                      Delete
                    </button>
                  )}
                </div>

                {replyingTo === comment._id && canComment && (
                  <div className="mt-3 flex items-start space-x-2">
                    <Image
                      src={user?.photoURL ?? '/default-avatar.png'}
                      alt="Your profile photo"
                      width={24}
                      height={24}
                      unoptimized
                      className="h-6 w-6 flex-shrink-0 rounded-full object-cover"
                    />
                    <div className="flex-1">
                      <input
                        type="text"
                        value={replyText}
                        onChange={(e) => onReplyTextChange(e.target.value)}
                        placeholder={`Reply to ${comment.author?.name ?? 'Anonymous'}...`}
                        className="w-full border-0 border-b border-fixly-border bg-transparent p-2 text-sm focus:border-fixly-accent focus:outline-none"
                        onKeyDown={(e) => handleReplyKeyDown(e, comment._id)}
                      />
                      <div className="mt-2 flex items-center space-x-2">
                        <button
                          onClick={() => onAddReply(comment._id)}
                          disabled={!replyText.trim() || submittingReply}
                          className="btn-primary px-3 py-1 text-xs"
                        >
                          {submittingReply ? 'Posting...' : 'Post'}
                        </button>
                        <button
                          onClick={() => {
                            onReplyingToChange(null);
                            onReplyTextChange('');
                          }}
                          className="text-xs text-fixly-text-muted hover:text-fixly-text"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {comment.replies && comment.replies.length > 0 && (
                  <div className="mt-3 space-y-3">
                    {comment.replies.map((reply) => (
                      <div key={reply._id} className="flex items-start space-x-2">
                        <Image
                          src={reply.author?.photoURL ?? '/default-avatar.png'}
                          alt={`${reply.author?.name ?? 'User'} profile photo`}
                          width={24}
                          height={24}
                          unoptimized
                          className="h-6 w-6 flex-shrink-0 rounded-full object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex items-center space-x-2">
                            <p className="text-xs font-semibold text-fixly-text">
                              {reply.author?.name ?? 'Anonymous'}
                            </p>
                            <p className="text-xs text-fixly-text-muted">
                              {getTimeAgo(reply.createdAt)}
                            </p>
                          </div>
                          <p className="break-words text-xs text-fixly-text">{reply.message}</p>
                          <div className="mt-1 flex items-center space-x-3">
                            <button
                              onClick={() => onLikeReply(comment._id, reply._id)}
                              className={`text-xs transition-colors hover:text-fixly-accent ${
                                hasUserLiked(reply.likes, currentUserId)
                                  ? 'font-medium text-fixly-accent'
                                  : 'text-fixly-text-muted'
                              }`}
                            >
                              {reply.likes?.length ?? 0} likes
                            </button>
                            {reply.author?._id === currentUserId && (
                              <button
                                onClick={() => onDeleteReply(comment._id, reply._id)}
                                className="text-xs text-red-500 transition-colors hover:text-red-700"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {user && (
        <div className="card">
          <h4 className="mb-2 font-semibold text-fixly-text">Add a Comment</h4>

          {!canComment && (
            <div className="mb-3 rounded-lg border border-orange-200 bg-orange-50 p-3">
              <div className="flex items-center text-sm text-orange-800">
                <AlertCircle className="mr-2 h-4 w-4" />
                <span>
                  {user?.role === 'fixer'
                    ? 'Comments are restricted. Upgrade to Pro or have credits to comment on jobs.'
                    : 'You must be signed in to comment on jobs.'}
                </span>
              </div>
            </div>
          )}

          <textarea
            rows={3}
            className="mb-2 w-full rounded-lg border border-fixly-border p-2"
            value={newComment}
            onChange={(e) => onNewCommentChange(e.target.value)}
            placeholder={
              !canComment
                ? 'Sign in and meet requirements to comment...'
                : 'Type your comment here...'
            }
            disabled={!canComment}
          />
          <button
            onClick={onAddComment}
            className={`rounded-lg px-4 py-2 font-medium transition-colors ${
              !canComment
                ? 'cursor-not-allowed bg-gray-300 text-gray-500'
                : 'bg-fixly-accent text-white hover:bg-fixly-accent-dark'
            }`}
            disabled={!canComment || submittingComment}
          >
            {submittingComment ? (
              <>
                <Loader className="mr-2 inline h-4 w-4 animate-spin" />
                Posting...
              </>
            ) : !canComment ? (
              'Cannot Comment'
            ) : (
              'Post Comment'
            )}
          </button>

          {user?.role === 'fixer' && !canApplyToJob(user) && !job?.hasApplied && (
            <button onClick={onUpgrade} className="btn-secondary ml-2 text-sm">
              Upgrade Now
            </button>
          )}
        </div>
      )}
    </div>
  );
}
