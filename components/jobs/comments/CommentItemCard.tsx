'use client';

import { Clock, Heart, MoreHorizontal, Pencil, Send, Trash2 } from 'lucide-react';
import Image from 'next/image';
import type { KeyboardEvent } from 'react';

import { CommentReactions } from './CommentReactions';
import CommentReplyItem from './CommentReplyItem';
import { formatTimeAgo, renderMentionText } from './commentUtils';
import type { CommentItemCardProps } from './types';

export default function CommentItemCard({
  comment,
  currentUserId,
  isAdmin,
  showDropdown,
  editState,
  expandedComments,
  replyingTo,
  replyText,
  replyingToUser,
  userPhotoURL,
  onSetShowDropdown,
  onStartEditing,
  onOpenDeleteModal,
  onSaveEdit,
  onCancelEditing,
  onSetEditState,
  onLikeComment,
  onToggleReplyTo,
  onSetReplyText,
  onReplyInputKeyDown,
  onPostReply,
  onReact,
  onToggleExpanded,
}: CommentItemCardProps): JSX.Element {
  const isCommentEditing = editState.commentId === comment._id && !editState.replyId;
  const isLiked = comment.likes?.some((l) => l.user === currentUserId) ?? false;
  const visibleReplies = expandedComments.has(comment._id)
    ? (comment.replies?.length ?? 0)
    : Math.min(2, comment.replies?.length ?? 0);

  return (
    <div className="flex space-x-3">
      <Image
        src={comment.author?.photoURL ?? '/default-avatar.png'}
        alt={`${comment.author?.name ?? 'User'} profile photo`}
        width={32}
        height={32}
        unoptimized
        className="h-8 w-8 flex-shrink-0 rounded-full object-cover"
      />
      <div className="min-w-0 flex-1">
        <div className="rounded-2xl bg-fixly-bg px-3 py-2 dark:bg-gray-700">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-fixly-text">
              {comment.author?.name ?? 'Unknown User'}
            </span>
            {(currentUserId === comment.author?._id || isAdmin) && (
              <div className="relative">
                <button
                  onClick={() =>
                    onSetShowDropdown(showDropdown === comment._id ? null : comment._id)
                  }
                  className="rounded-full p-1 transition-colors hover:bg-fixly-accent/10"
                >
                  <MoreHorizontal className="h-4 w-4 text-fixly-text-muted" />
                </button>
                {showDropdown === comment._id && (
                  <div className="absolute right-0 top-full z-10 mt-1 rounded-lg border border-fixly-border bg-fixly-card py-1 shadow-lg">
                    <button
                      onClick={() => onStartEditing(comment._id, comment.message)}
                      className="flex w-full items-center space-x-2 px-3 py-1 text-left text-fixly-text hover:bg-fixly-bg"
                    >
                      <Pencil className="h-4 w-4" />
                      <span className="text-sm">Edit</span>
                    </button>
                    <button
                      onClick={() => onOpenDeleteModal(comment._id)}
                      className="flex w-full items-center space-x-2 px-3 py-1 text-left text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="text-sm">Delete</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {isCommentEditing ? (
            <div className="mt-2 space-y-2">
              <input
                type="text"
                value={editState.value}
                onChange={(e) => onSetEditState((prev) => ({ ...prev, value: e.target.value }))}
                className="w-full rounded-full border border-fixly-border bg-fixly-card px-3 py-2 text-sm text-fixly-text focus:outline-none focus:ring-2 focus:ring-fixly-accent"
                onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void onSaveEdit();
                  }
                }}
                autoFocus
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={() => void onSaveEdit()}
                  disabled={!editState.value.trim() || editState.loading}
                  className="rounded-full bg-fixly-accent px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
                >
                  Save
                </button>
                <button
                  onClick={onCancelEditing}
                  className="rounded-full px-3 py-1 text-xs text-fixly-text-muted hover:bg-fixly-bg"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className="mt-1 text-fixly-text">
                {renderMentionText(comment.message ?? '')}
              </p>
              {comment.edited?.isEdited && (
                <p className="mt-1 text-[11px] text-fixly-text-muted">Edited</p>
              )}
            </>
          )}
        </div>

        <div className="mt-1 flex items-center space-x-4 text-xs text-fixly-text-muted">
          <span className="flex items-center">
            <Clock className="mr-1 h-3 w-3" />
            {formatTimeAgo(comment.createdAt)}
          </span>
          <button
            onClick={() => void onLikeComment(comment._id)}
            className={`flex transform items-center space-x-1 transition-all duration-200 hover:scale-110 hover:text-red-500 ${isLiked ? 'font-medium text-red-500' : ''}`}
          >
            <Heart
              className={`h-3 w-3 transition-all duration-200 ${isLiked ? 'scale-110 fill-current' : ''}`}
            />
            <span>{comment.likes?.length ?? 0}</span>
          </button>
          <button
            onClick={() => onToggleReplyTo(comment._id)}
            className="transition-colors hover:text-fixly-accent"
          >
            Reply
          </button>
        </div>

        <CommentReactions
          id={comment._id}
          reactions={comment.reactions}
          currentUserId={currentUserId}
          onReact={(type) => void onReact(comment._id, type)}
        />

        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-2 space-y-2">
            {comment.replies.slice(0, visibleReplies).map((reply) => (
              <CommentReplyItem
                key={reply._id}
                reply={reply}
                currentUserId={currentUserId}
                isAdmin={isAdmin}
                showDropdown={showDropdown}
                editState={editState}
                onDropdownToggle={onSetShowDropdown}
                onStartEditing={(message, replyId) =>
                  onStartEditing(comment._id, message, replyId)
                }
                onOpenDeleteModal={(replyId) => onOpenDeleteModal(comment._id, replyId)}
                onSaveEdit={onSaveEdit}
                onCancelEditing={onCancelEditing}
                onSetEditState={onSetEditState}
                onLike={(replyId) => void onLikeComment(comment._id, replyId)}
                onReplyTo={(authorName) => onToggleReplyTo(comment._id, authorName)}
                onReact={(type, replyId) => void onReact(comment._id, type, replyId)}
              />
            ))}

            {comment.replies.length > 2 && (
              <button
                onClick={() => onToggleExpanded(comment._id)}
                className="ml-9 text-xs text-fixly-text-muted transition-colors hover:text-fixly-accent"
              >
                {expandedComments.has(comment._id)
                  ? 'Show less'
                  : `View ${comment.replies.length - 2} more ${
                      comment.replies.length - 2 === 1 ? 'reply' : 'replies'
                    }`}
              </button>
            )}
          </div>
        )}

        {replyingTo === comment._id && (
          <div className="mt-2 space-y-1">
            {replyingToUser && (
              <div className="ml-8 text-xs text-fixly-text-muted">
                Replying to @{replyingToUser}
              </div>
            )}
            <div className="flex space-x-2">
              <Image
                src={userPhotoURL ?? '/default-avatar.png'}
                alt="Your profile photo"
                width={24}
                height={24}
                unoptimized
                className="h-6 w-6 flex-shrink-0 rounded-full object-cover"
              />
              <div className="flex flex-1 space-x-2">
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => onSetReplyText(e.target.value)}
                  placeholder={replyingToUser ? `Reply to @${replyingToUser}...` : 'Write a reply...'}
                  className="flex-1 rounded-full border border-fixly-border bg-fixly-bg px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-fixly-accent"
                  onKeyDown={(e) => onReplyInputKeyDown(e, comment._id)}
                  autoFocus
                />
                <button
                  onClick={() => void onPostReply(comment._id)}
                  disabled={!replyText.trim()}
                  className="rounded-full p-1 text-fixly-accent transition-colors hover:bg-fixly-accent/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
