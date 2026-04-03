'use client';

import { Clock, Heart, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import Image from 'next/image';
import type { KeyboardEvent } from 'react';

import { CommentReactions } from './CommentReactions';
import { formatTimeAgo, renderMentionText } from './commentUtils';
import type { CommentReplyItemProps } from './types';

export default function CommentReplyItem({
  reply,
  currentUserId,
  isAdmin,
  showDropdown,
  editState,
  onDropdownToggle,
  onStartEditing,
  onOpenDeleteModal,
  onSaveEdit,
  onCancelEditing,
  onSetEditState,
  onLike,
  onReplyTo,
  onReact,
}: CommentReplyItemProps): JSX.Element {
  const isEditing = editState.replyId === reply._id;
  const isLiked = reply.likes?.some((l) => l.user === currentUserId) ?? false;

  return (
    <div className="flex space-x-3">
      <Image
        src={reply.author?.photoURL ?? '/default-avatar.png'}
        alt={`${reply.author?.name ?? 'User'} profile photo`}
        width={24}
        height={24}
        unoptimized
        className="h-6 w-6 flex-shrink-0 rounded-full object-cover"
      />
      <div className="min-w-0 flex-1">
        <div className="rounded-2xl bg-fixly-accent/5 px-3 py-2 dark:bg-gray-700">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-fixly-text">
              {reply.author?.name ?? 'Unknown User'}
            </span>
            {(currentUserId === reply.author?._id || isAdmin) && (
              <div className="relative">
                <button
                  onClick={() => onDropdownToggle(showDropdown === reply._id ? null : reply._id)}
                  className="rounded-full p-1 transition-colors hover:bg-fixly-accent/10"
                >
                  <MoreHorizontal className="h-3 w-3 text-fixly-text-muted" />
                </button>
                {showDropdown === reply._id && (
                  <div className="absolute right-0 top-full z-10 mt-1 rounded-lg border border-fixly-border bg-fixly-card py-1 shadow-lg">
                    <button
                      onClick={() => onStartEditing(reply.message, reply._id)}
                      className="flex w-full items-center space-x-2 px-3 py-1 text-left text-fixly-text hover:bg-fixly-bg"
                    >
                      <Pencil className="h-3 w-3" />
                      <span className="text-xs">Edit</span>
                    </button>
                    <button
                      onClick={() => onOpenDeleteModal(reply._id)}
                      className="flex w-full items-center space-x-2 px-3 py-1 text-left text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span className="text-xs">Delete</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {isEditing ? (
            <div className="mt-2 space-y-2">
              <input
                type="text"
                value={editState.value}
                onChange={(e) => onSetEditState((prev) => ({ ...prev, value: e.target.value }))}
                className="w-full rounded-full border border-fixly-border bg-fixly-card px-3 py-2 text-xs text-fixly-text focus:outline-none focus:ring-2 focus:ring-fixly-accent"
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
                  className="rounded-full bg-fixly-accent px-3 py-1 text-[11px] font-medium text-white disabled:opacity-50"
                >
                  Save
                </button>
                <button
                  onClick={onCancelEditing}
                  className="rounded-full px-3 py-1 text-[11px] text-fixly-text-muted hover:bg-fixly-bg"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className="mt-1 text-sm text-fixly-text">
                {renderMentionText(reply.message ?? '')}
              </p>
              {reply.edited?.isEdited && (
                <p className="mt-1 text-[11px] text-fixly-text-muted">Edited</p>
              )}
            </>
          )}
        </div>

        <div className="mt-1 flex items-center space-x-4 text-xs text-fixly-text-muted">
          <span className="flex items-center">
            <Clock className="mr-1 h-3 w-3" />
            {formatTimeAgo(reply.createdAt)}
          </span>
          <button
            onClick={() => onLike(reply._id)}
            className={`flex transform items-center space-x-1 transition-all duration-200 hover:scale-110 hover:text-red-500 ${isLiked ? 'font-medium text-red-500' : ''}`}
          >
            <Heart
              className={`h-3 w-3 transition-all duration-200 ${isLiked ? 'scale-110 fill-current' : ''}`}
            />
            <span>{reply.likes?.length ?? 0}</span>
          </button>
          <button
            onClick={() => onReplyTo(reply.author?.username ?? reply.author?.name ?? '')}
            className="text-xs transition-colors hover:text-fixly-accent"
          >
            Reply
          </button>
        </div>

        <CommentReactions
          id={reply._id}
          reactions={reply.reactions}
          currentUserId={currentUserId}
          onReact={(type) => onReact(type, reply._id)}
          size="xs"
        />
      </div>
    </div>
  );
}
