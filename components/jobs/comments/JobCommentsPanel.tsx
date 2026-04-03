'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { MessageCircle } from 'lucide-react';
import { useEffect, useState, type KeyboardEvent } from 'react';

import { useApp } from '../../../app/providers';
import { useJobComments } from '../../../hooks/realtime/useJobComments';
import ConfirmModal from '../../ui/ConfirmModal';

import CommentInputBar from './CommentInputBar';
import CommentItemCard from './CommentItemCard';
import CommentsPanelHeader from './CommentsPanelHeader';
import { getCurrentUserId } from './commentUtils';
import type { CommentItem, JobCommentsPanelProps, UseAppShape } from './types';
import { useCommentHandlers } from './useCommentHandlers';
import { useCommentMentions } from './useCommentMentions';

export default function JobCommentsPanel({
  jobId,
  isOpen,
  onClose,
  initialCommentCount = 0,
}: JobCommentsPanelProps): JSX.Element | null {
  const { user } = useApp() as UseAppShape;
  const currentUserId = getCurrentUserId(user);
  const isAdmin = user?.role === 'admin';

  const [comments, setComments] = useState<CommentItem[]>([]);
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());

  const realTimeResult = useJobComments(isOpen ? jobId : null);
  const realTimeComments = realTimeResult.comments as unknown as CommentItem[];
  const realTimeLoading = realTimeResult.isLoading;
  const { postComment, postReply, likeComment, reactToComment, editComment, deleteComment } =
    realTimeResult;

  const { extractMentions } = useCommentMentions(comments, currentUserId);

  const {
    newComment,
    setNewComment,
    replyingTo,
    replyText,
    setReplyText,
    replyingToUser,
    showDropdown,
    setShowDropdown,
    editState,
    setEditState,
    deleteModal,
    handlePostComment,
    handlePostReply,
    handleLikeComment,
    handleReact,
    startEditing,
    cancelEditing,
    handleSaveEdit,
    openDeleteModal,
    closeDeleteModal,
    handleDelete,
    toggleReplyTo,
  } = useCommentHandlers({
    currentUserId,
    extractMentions,
    postComment,
    postReply,
    likeComment,
    reactToComment,
    editComment,
    deleteComment,
  });

  useEffect(() => {
    if (!Array.isArray(realTimeComments)) return;
    setComments(realTimeComments);

    const container = document.querySelector('.comments-container');
    if (!container) return;

    setTimeout(() => {
      const el = container as HTMLElement;
      const isNearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 100;
      if (isNearBottom) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }, 100);
  }, [realTimeComments]);

  const toggleExpanded = (commentId: string): void => {
    setExpandedComments((prev) => {
      const next = new Set(prev);
      if (next.has(commentId)) next.delete(commentId);
      else next.add(commentId);
      return next;
    });
  };

  const onReplyInputKeyDown = (e: KeyboardEvent<HTMLInputElement>, commentId: string): void => {
    if (e.key === 'Enter') {
      e.preventDefault();
      void handlePostReply(commentId);
    }
  };

  const onCommentInputKeyDown = (e: KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') {
      e.preventDefault();
      void handlePostComment();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-fixly-border/20 bg-fixly-card shadow-2xl dark:border-gray-700 dark:bg-gray-800 sm:max-h-[85vh]"
      >
        <CommentsPanelHeader
          commentCount={comments.length}
          initialCommentCount={initialCommentCount}
          onClose={onClose}
        />

        <div className="comments-container flex-1 overflow-y-auto">
          {realTimeLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-fixly-accent" />
            </div>
          ) : comments.length === 0 ? (
            <div className="py-8 text-center text-fixly-text-muted">
              <MessageCircle className="mx-auto mb-4 h-12 w-12 opacity-50" />
              <p>No comments yet</p>
              <p className="text-sm">Be the first to comment.</p>
            </div>
          ) : (
            <div className="space-y-4 p-4">
              <AnimatePresence>
                {comments.map((comment) => (
                  <motion.div
                    key={comment._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-2"
                  >
                    <CommentItemCard
                      comment={comment}
                      currentUserId={currentUserId}
                      isAdmin={isAdmin}
                      showDropdown={showDropdown}
                      editState={editState}
                      expandedComments={expandedComments}
                      replyingTo={replyingTo}
                      replyText={replyText}
                      replyingToUser={replyingToUser}
                      userPhotoURL={user?.photoURL}
                      onSetShowDropdown={setShowDropdown}
                      onStartEditing={startEditing}
                      onOpenDeleteModal={openDeleteModal}
                      onSaveEdit={handleSaveEdit}
                      onCancelEditing={cancelEditing}
                      onSetEditState={setEditState}
                      onLikeComment={handleLikeComment}
                      onToggleReplyTo={toggleReplyTo}
                      onSetReplyText={setReplyText}
                      onReplyInputKeyDown={onReplyInputKeyDown}
                      onPostReply={handlePostReply}
                      onReact={handleReact}
                      onToggleExpanded={toggleExpanded}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {currentUserId && (
          <CommentInputBar
            userPhotoURL={user?.photoURL}
            newComment={newComment}
            onChange={setNewComment}
            onKeyDown={onCommentInputKeyDown}
            onPost={handlePostComment}
          />
        )}

        <ConfirmModal
          isOpen={deleteModal.isOpen}
          onClose={closeDeleteModal}
          onConfirm={() => void handleDelete()}
          title={deleteModal.replyId ? 'Delete Reply' : 'Delete Comment'}
          description={
            deleteModal.replyId
              ? 'Are you sure you want to delete this reply? This action cannot be undone.'
              : 'Are you sure you want to delete this comment and all its replies? This action cannot be undone.'
          }
          confirmText="Delete"
          cancelText="Cancel"
          type="danger"
          loading={deleteModal.loading}
        />
      </motion.div>
    </div>
  );
}
