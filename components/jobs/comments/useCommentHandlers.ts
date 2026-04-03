import { useState } from 'react';
import { toast } from 'sonner';

import { toastMessages } from '../../../utils/toast';

import type { DeleteModalState, EditState, MentionPayload } from './types';

interface UseCommentHandlerDeps {
  currentUserId: string;
  extractMentions: (content: string) => MentionPayload[];
  postComment: (content: string, mentions: MentionPayload[]) => Promise<boolean>;
  postReply: (
    commentId: string,
    content: string,
    mentions: MentionPayload[]
  ) => Promise<boolean>;
  likeComment: (commentId: string, replyId?: string) => Promise<boolean>;
  reactToComment: (
    commentId: string,
    type: string,
    replyId?: string
  ) => Promise<boolean>;
  editComment: (
    commentId: string,
    value: string,
    replyId?: string,
    mentions?: MentionPayload[]
  ) => Promise<boolean>;
  deleteComment: (commentId: string, replyId?: string) => Promise<boolean>;
}

export function useCommentHandlers({
  currentUserId,
  extractMentions,
  postComment,
  postReply,
  likeComment,
  reactToComment,
  editComment,
  deleteComment,
}: UseCommentHandlerDeps) {
  const [newComment, setNewComment] = useState<string>('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<string>('');
  const [replyingToUser, setReplyingToUser] = useState<string>('');
  const [showDropdown, setShowDropdown] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState>({
    commentId: null,
    replyId: null,
    value: '',
    loading: false,
  });
  const [deleteModal, setDeleteModal] = useState<DeleteModalState>({
    isOpen: false,
    commentId: null,
    replyId: null,
    loading: false,
  });

  const handlePostComment = async (): Promise<void> => {
    const content = newComment.trim();
    if (!content || !currentUserId) return;

    const prev = newComment;
    setNewComment('');

    try {
      const success = await postComment(content, extractMentions(content));
      if (!success) {
        setNewComment(prev);
        toast.error('Comment failed to post', { description: 'Please try again' });
        return;
      }
      toast.success('Comment posted', { description: 'Your comment is now visible to everyone' });
    } catch (error) {
      console.error('Comment post error:', error);
      setNewComment(prev);
      toastMessages.error.network();
    }
  };

  const handlePostReply = async (commentId: string): Promise<void> => {
    const content = replyText.trim();
    if (!content || !currentUserId) return;

    const prevText = replyText;
    const prevTarget = replyingTo;
    setReplyText('');
    setReplyingTo(null);

    try {
      const success = await postReply(commentId, content, extractMentions(content));
      if (!success) {
        setReplyText(prevText);
        setReplyingTo(prevTarget);
        toast.error('Reply failed to post', { description: 'Please try again' });
        return;
      }
      toast.success('Reply posted', { description: 'Your reply has been added' });
    } catch (error) {
      console.error('Reply post error:', error);
      setReplyText(prevText);
      setReplyingTo(prevTarget);
      toastMessages.error.network();
    }
  };

  const handleLikeComment = async (
    commentId: string,
    replyId: string | null = null
  ): Promise<void> => {
    if (!currentUserId) return;
    try {
      const success = await likeComment(commentId, replyId ?? undefined);
      if (!success) toast.error('Like failed', { description: 'Please try again' });
    } catch (error) {
      console.error('Like error:', error);
      toastMessages.error.network();
    }
  };

  const handleReact = async (
    commentId: string,
    reactionType: string,
    replyId: string | null = null
  ): Promise<void> => {
    if (!currentUserId) return;
    try {
      const success = await reactToComment(commentId, reactionType, replyId ?? undefined);
      if (!success) toast.error('Reaction failed', { description: 'Please try again' });
    } catch (error) {
      console.error('Reaction error:', error);
      toastMessages.error.network();
    }
  };

  const startEditing = (
    commentId: string,
    currentValue: string,
    replyId: string | null = null
  ): void => {
    setEditState({ commentId, replyId, value: currentValue, loading: false });
    setShowDropdown(null);
  };

  const cancelEditing = (): void => {
    setEditState({ commentId: null, replyId: null, value: '', loading: false });
  };

  const handleSaveEdit = async (): Promise<void> => {
    if (!editState.commentId || !editState.value.trim()) return;

    setEditState((prev) => ({ ...prev, loading: true }));
    try {
      const success = await editComment(
        editState.commentId,
        editState.value,
        editState.replyId ?? undefined,
        extractMentions(editState.value)
      );
      if (!success) {
        toast.error('Edit failed', { description: 'Please try again' });
        return;
      }
      toast.success(editState.replyId ? 'Reply updated' : 'Comment updated');
      cancelEditing();
    } catch (error) {
      console.error('Edit error:', error);
      toastMessages.error.network();
    } finally {
      setEditState((prev) => ({ ...prev, loading: false }));
    }
  };

  const openDeleteModal = (commentId: string, replyId: string | null = null): void => {
    setDeleteModal({ isOpen: true, commentId, replyId, loading: false });
    setShowDropdown(null);
  };

  const closeDeleteModal = (): void => {
    setDeleteModal({ isOpen: false, commentId: null, replyId: null, loading: false });
  };

  const handleDelete = async (): Promise<void> => {
    if (!currentUserId || !deleteModal.commentId) return;

    setDeleteModal((prev) => ({ ...prev, loading: true }));
    try {
      const success = await deleteComment(
        deleteModal.commentId,
        deleteModal.replyId ?? undefined
      );
      if (!success) {
        toast.error('Delete failed', { description: 'Please try again' });
        return;
      }
      toast.success(deleteModal.replyId ? 'Reply deleted' : 'Comment deleted', {
        description: 'The content has been removed',
      });
      closeDeleteModal();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Delete failed', { description: 'Network error occurred' });
    } finally {
      setDeleteModal((prev) => ({ ...prev, loading: false }));
    }
  };

  const toggleReplyTo = (commentId: string, username?: string): void => {
    if (replyingTo === commentId && (!username || replyingToUser === username)) {
      setReplyingTo(null);
      setReplyingToUser('');
      setReplyText('');
    } else {
      setReplyingTo(commentId);
      setReplyingToUser(username ?? '');
      setReplyText(username ? `@${username} ` : '');
    }
  };

  return {
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
  };
}
