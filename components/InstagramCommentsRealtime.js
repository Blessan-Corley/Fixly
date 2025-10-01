'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart,
  MessageCircle,
  Send,
  MoreHorizontal,
  Trash2,
  Clock,
  ArrowLeft
} from 'lucide-react';
import { useApp } from '../app/providers';
import { toast } from 'sonner';
import { toastMessages } from '../utils/toast';
import ConfirmModal from './ui/ConfirmModal';
import { useJobComments } from '../hooks/useRealTimeNotifications';

export default function InstagramCommentsRealtime({ 
  jobId, 
  isOpen, 
  onClose, 
  initialCommentCount = 0 
}) {
  const { user } = useApp();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [replyingToUser, setReplyingToUser] = useState('');
  const [expandedComments, setExpandedComments] = useState(new Set());
  const [showDropdown, setShowDropdown] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Real-time comments using Ably
  const {
    comments: realTimeComments,
    isLoading: realTimeLoading,
    postComment,
    likeComment
  } = useJobComments(isOpen ? jobId : null);

  // Update comments when real-time data changes with smooth animations
  useEffect(() => {
    console.log('📝 Real-time comments updated:', realTimeComments?.length || 0, 'comments');
    if (realTimeComments && Array.isArray(realTimeComments)) {
      setComments(prevComments => {
        const newComments = realTimeComments;

        // Check if there are new comments to animate in
        if (newComments.length > prevComments.length) {
          console.log('✨ New comments detected, scrolling to bottom');
          // Smooth scroll to new content if user is near bottom
          setTimeout(() => {
            const container = document.querySelector('.comments-container');
            if (container) {
              const { scrollTop, scrollHeight, clientHeight } = container;
              const isNearBottom = scrollTop + clientHeight >= scrollHeight - 100;

              if (isNearBottom) {
                container.scrollTo({
                  top: scrollHeight,
                  behavior: 'smooth'
                });
              }
            }
          }, 100);
        }

        return newComments;
      });
    }
  }, [realTimeComments]);

  // Delete confirmation modal
  const [deleteModal, setDeleteModal] = useState({ 
    isOpen: false, 
    commentId: null, 
    replyId: null,
    loading: false 
  });

  // Real-time comments are handled by the useRealtime hook
  // No additional connection logic needed here

  // Post new comment with optimistic updates
  const handlePostComment = async () => {
    if (!newComment.trim() || !user) return;

    const commentText = newComment.trim();
    const originalComment = newComment;
    setNewComment('');
    
    try {
      const response = await fetch(`/api/jobs/${jobId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: commentText })
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Comment posted! 💬', {
          description: 'Your comment is now visible to everyone'
        });
        
        // Real-time hook will handle the update automatically
        console.log('✅ Comment posted successfully');
      } else {
        setNewComment(originalComment);
        toast.error('Comment failed to post', {
          description: data.message || 'Please try again'
        });
      }
    } catch (error) {
      setNewComment(originalComment);
      toastMessages.error.network();
    }
  };

  // Post reply
  const handlePostReply = async (commentId) => {
    if (!replyText.trim() || !user) return;

    const replyContent = replyText.trim();
    const originalReply = replyText;
    const originalReplyingTo = replyingTo;
    setReplyText('');
    setReplyingTo(null);
    
    try {
      const response = await fetch(`/api/jobs/${jobId}/comments`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentId, message: replyContent })
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Reply posted! 💬', {
          description: 'Your reply has been added'
        });
        
        // Real-time hook will handle the update automatically
        console.log('✅ Reply posted successfully');
      } else {
        setReplyText(originalReply);
        setReplyingTo(originalReplyingTo);
        toast.error('Reply failed to post', {
          description: data.message || 'Please try again'
        });
      }
    } catch (error) {
      console.error('❌ Reply post error:', error);
      setReplyText(originalReply);
      setReplyingTo(originalReplyingTo);
      toastMessages.error.network();
    }
  };

  // Toggle like with optimistic updates
  const handleLikeComment = async (commentId, replyId = null) => {
    if (!user) return;

    try {
      const response = await fetch(`/api/jobs/${jobId}/comments/${commentId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(replyId ? { replyId } : {})
      });

      const data = await response.json();

      if (response.ok) {
        // Real-time hook will handle the update automatically
        console.log('✅ Like toggled successfully');
      } else {
        toast.error('Like failed', {
          description: data.message || 'Please try again'
        });
      }
    } catch (error) {
      console.error('❌ Like error:', error);
      toastMessages.error.network();
    }
  };

  // Open delete confirmation modal
  const openDeleteModal = (commentId, replyId = null) => {
    setDeleteModal({ 
      isOpen: true, 
      commentId, 
      replyId, 
      loading: false 
    });
    setShowDropdown(null);
  };

  // Close delete modal
  const closeDeleteModal = () => {
    setDeleteModal({ 
      isOpen: false, 
      commentId: null, 
      replyId: null, 
      loading: false 
    });
  };

  // Delete comment or reply
  const handleDelete = async () => {
    if (!user) return;

    setDeleteModal(prev => ({ ...prev, loading: true }));
    
    try {
      const response = await fetch(`/api/jobs/${jobId}/comments`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          commentId: deleteModal.commentId, 
          replyId: deleteModal.replyId 
        })
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(deleteModal.replyId ? 'Reply deleted' : 'Comment deleted', {
          description: 'The content has been removed'
        });
        closeDeleteModal();
        
        // Real-time hook will handle the update automatically
        console.log('✅ Comment/reply deleted successfully');
      } else {
        toast.error('Delete failed', {
          description: data.message || 'Please try again'
        });
      }
    } catch (error) {
      console.error('Error deleting:', error);
      toast.error('Delete failed', {
        description: 'Network error occurred'
      });
    } finally {
      setDeleteModal(prev => ({ ...prev, loading: false }));
    }
  };

  const formatTimeAgo = (date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now - new Date(date)) / 1000);
    
    if (diffInSeconds < 60) return `${diffInSeconds}s`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;
    return `${Math.floor(diffInSeconds / 604800)}w`;
  };

  const toggleExpanded = (commentId) => {
    setExpandedComments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(commentId)) {
        newSet.delete(commentId);
      } else {
        newSet.add(commentId);
      }
      return newSet;
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-2 sm:p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-fixly-card dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] sm:max-h-[85vh] flex flex-col overflow-hidden border border-fixly-border/20 dark:border-gray-700"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-fixly-border dark:border-gray-700">
          <button
            onClick={onClose}
            className="p-1 hover:bg-fixly-accent/10 rounded-full transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-fixly-text" />
          </button>
          <h2 className="font-semibold text-fixly-text">
            Comments {comments.length > 0 && (
              <span className="text-fixly-text-muted">({comments.length})</span>
            )}
          </h2>
          <div className="w-7 h-7 flex items-center justify-center">
            {isUpdating && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-fixly-accent"></div>
            )}
          </div>
        </div>

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto comments-container">
          {loading || realTimeLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-fixly-accent"></div>
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8 text-fixly-text-muted">
              <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No comments yet</p>
              <p className="text-sm">Be the first to comment!</p>
            </div>
          ) : (
            <div className="p-4 space-y-4">
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
                    {/* Main Comment - Same structure as before but with real-time updates */}
                    <div className="flex space-x-3">
                      <img
                        src={comment.author?.photoURL || '/default-avatar.png'}
                        alt={comment.author?.name}
                        className="h-8 w-8 rounded-full object-cover flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="bg-fixly-bg dark:bg-gray-700 rounded-2xl px-3 py-2">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-sm text-fixly-text">
                              {comment.author?.name || 'Unknown User'}
                            </span>
                            {(user?._id === comment.author?._id || user?.role === 'admin') && (
                              <div className="relative">
                                <button
                                  onClick={() => setShowDropdown(showDropdown === comment._id ? null : comment._id)}
                                  className="p-1 hover:bg-fixly-accent/10 rounded-full transition-colors"
                                >
                                  <MoreHorizontal className="h-4 w-4 text-fixly-text-muted" />
                                </button>
                                {showDropdown === comment._id && (
                                  <div className="absolute right-0 top-full mt-1 bg-fixly-card border border-fixly-border rounded-lg shadow-lg py-1 z-10">
                                    <button
                                      onClick={() => openDeleteModal(comment._id)}
                                      className="flex items-center space-x-2 px-3 py-1 text-red-600 hover:bg-red-50 w-full text-left"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                      <span className="text-sm">Delete</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          <p className="text-fixly-text mt-1">
                            {comment.message.split(' ').map((word, index) => (
                              <span key={index}>
                                {word.startsWith('@') ? (
                                  <span className="text-fixly-accent font-medium">{word}</span>
                                ) : (
                                  word
                                )}
                                {index < comment.message.split(' ').length - 1 && ' '}
                              </span>
                            ))}
                          </p>
                        </div>
                        
                        {/* Comment Actions */}
                        <div className="flex items-center space-x-4 mt-1 text-xs text-fixly-text-muted">
                          <span className="flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            {formatTimeAgo(comment.createdAt)}
                          </span>
                          <button
                            onClick={() => handleLikeComment(comment._id)}
                            className={`flex items-center space-x-1 hover:text-red-500 transition-all duration-200 transform hover:scale-110 ${
                              comment.likes?.some(like => like.user === user?._id) 
                                ? 'text-red-500 font-medium' 
                                : ''
                            }`}
                          >
                            <Heart 
                              className={`h-3 w-3 transition-all duration-200 ${
                                comment.likes?.some(like => like.user === user?._id) 
                                  ? 'fill-current scale-110' 
                                  : ''
                              }`} 
                            />
                            <span>{comment.likes?.length || 0}</span>
                          </button>
                          <button
                            onClick={() => {
                              if (replyingTo === comment._id) {
                                setReplyingTo(null);
                                setReplyingToUser('');
                                setReplyText('');
                              } else {
                                setReplyingTo(comment._id);
                                setReplyingToUser('');
                                setReplyText('');
                              }
                            }}
                            className="hover:text-fixly-accent transition-colors"
                          >
                            Reply
                          </button>
                        </div>

                        {/* Replies (continued from existing structure) */}
                        {comment.replies && comment.replies.length > 0 && (
                          <div className="mt-2 space-y-2">
                            {comment.replies.slice(0, expandedComments.has(comment._id) ? comment.replies.length : 2).map((reply) => (
                              <div key={reply._id} className="flex space-x-3">
                                <img
                                  src={reply.author?.photoURL || '/default-avatar.png'}
                                  alt={reply.author?.name}
                                  className="h-6 w-6 rounded-full object-cover flex-shrink-0"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="bg-fixly-accent/5 dark:bg-gray-700 rounded-2xl px-3 py-2">
                                    <div className="flex items-center justify-between">
                                      <span className="font-semibold text-xs text-fixly-text">
                                        {reply.author?.name || 'Unknown User'}
                                      </span>
                                      {(user?._id === reply.author?._id || user?.role === 'admin') && (
                                        <div className="relative">
                                          <button
                                            onClick={() => setShowDropdown(showDropdown === reply._id ? null : reply._id)}
                                            className="p-1 hover:bg-fixly-accent/10 rounded-full transition-colors"
                                          >
                                            <MoreHorizontal className="h-3 w-3 text-fixly-text-muted" />
                                          </button>
                                          {showDropdown === reply._id && (
                                            <div className="absolute right-0 top-full mt-1 bg-fixly-card border border-fixly-border rounded-lg shadow-lg py-1 z-10">
                                              <button
                                                onClick={() => openDeleteModal(comment._id, reply._id)}
                                                className="flex items-center space-x-2 px-3 py-1 text-red-600 hover:bg-red-50 w-full text-left"
                                              >
                                                <Trash2 className="h-3 w-3" />
                                                <span className="text-xs">Delete</span>
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                    <p className="text-fixly-text text-sm mt-1">
                                      {reply.message.split(' ').map((word, index) => (
                                        <span key={index}>
                                          {word.startsWith('@') ? (
                                            <span className="text-fixly-accent font-medium">{word}</span>
                                          ) : (
                                            word
                                          )}
                                          {index < reply.message.split(' ').length - 1 && ' '}
                                        </span>
                                      ))}
                                    </p>
                                  </div>
                                  
                                  {/* Reply Actions */}
                                  <div className="flex items-center space-x-4 mt-1 text-xs text-fixly-text-muted">
                                    <span className="flex items-center">
                                      <Clock className="h-3 w-3 mr-1" />
                                      {formatTimeAgo(reply.createdAt)}
                                    </span>
                                    <button
                                      onClick={() => handleLikeComment(comment._id, reply._id)}
                                      className={`flex items-center space-x-1 hover:text-red-500 transition-all duration-200 transform hover:scale-110 ${
                                        reply.likes?.some(like => like.user === user?._id) 
                                          ? 'text-red-500 font-medium' 
                                          : ''
                                      }`}
                                    >
                                      <Heart 
                                        className={`h-3 w-3 transition-all duration-200 ${
                                          reply.likes?.some(like => like.user === user?._id) 
                                            ? 'fill-current scale-110' 
                                            : ''
                                        }`} 
                                      />
                                      <span>{reply.likes?.length || 0}</span>
                                    </button>
                                    <button
                                      onClick={() => {
                                        if (replyingTo === comment._id && replyingToUser === reply.author?.name) {
                                          setReplyingTo(null);
                                          setReplyingToUser('');
                                          setReplyText('');
                                        } else {
                                          setReplyingTo(comment._id);
                                          setReplyingToUser(reply.author?.name || '');
                                          setReplyText(`@${reply.author?.name} `);
                                        }
                                      }}
                                      className="hover:text-fixly-accent transition-colors text-xs"
                                    >
                                      Reply
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                            
                            {comment.replies.length > 2 && (
                              <button
                                onClick={() => toggleExpanded(comment._id)}
                                className="text-xs text-fixly-text-muted hover:text-fixly-accent transition-colors ml-9"
                              >
                                {expandedComments.has(comment._id) 
                                  ? 'Show less' 
                                  : `View ${comment.replies.length - 2} more ${comment.replies.length - 2 === 1 ? 'reply' : 'replies'}`
                                }
                              </button>
                            )}
                          </div>
                        )}

                        {/* Reply Input */}
                        {replyingTo === comment._id && (
                          <div className="mt-2 space-y-1">
                            {replyingToUser && (
                              <div className="text-xs text-fixly-text-muted ml-8">
                                Replying to @{replyingToUser}
                              </div>
                            )}
                            <div className="flex space-x-2">
                              <img
                                src={user?.photoURL || '/default-avatar.png'}
                                alt="You"
                                className="h-6 w-6 rounded-full object-cover flex-shrink-0"
                              />
                              <div className="flex-1 flex space-x-2">
                                <input
                                  type="text"
                                  value={replyText}
                                  onChange={(e) => setReplyText(e.target.value)}
                                  placeholder={replyingToUser ? `Reply to @${replyingToUser}...` : "Write a reply..."}
                                  className="flex-1 text-sm bg-fixly-bg border border-fixly-border rounded-full px-3 py-1 focus:outline-none focus:ring-2 focus:ring-fixly-accent"
                                  onKeyPress={(e) => e.key === 'Enter' && handlePostReply(comment._id)}
                                  autoFocus
                                />
                                <button
                                  onClick={() => handlePostReply(comment._id)}
                                  disabled={!replyText.trim()}
                                  className="p-1 text-fixly-accent hover:bg-fixly-accent/10 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  <Send className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* New Comment Input */}
        {user && (
          <div className="border-t border-fixly-border dark:border-gray-700 p-4">
            <div className="flex space-x-3">
              <img
                src={user.photoURL || '/default-avatar.png'}
                alt="You"
                className="h-8 w-8 rounded-full object-cover flex-shrink-0"
              />
              <div className="flex-1 flex space-x-2">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  className="flex-1 bg-fixly-bg dark:bg-gray-700 border border-fixly-border dark:border-gray-600 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-fixly-accent text-fixly-text dark:text-gray-100"
                  onKeyPress={(e) => e.key === 'Enter' && handlePostComment()}
                />
                <button
                  onClick={handlePostComment}
                  disabled={!newComment.trim()}
                  className="p-2 text-fixly-accent hover:bg-fixly-accent/10 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="h-5 w-5" />
                </button>
              </div>
            </div>
            
          </div>
        )}

        {/* Delete Confirmation Modal */}
        <ConfirmModal
          isOpen={deleteModal.isOpen}
          onClose={closeDeleteModal}
          onConfirm={handleDelete}
          title={deleteModal.replyId ? "Delete Reply" : "Delete Comment"}
          description={deleteModal.replyId 
            ? "Are you sure you want to delete this reply? This action cannot be undone."
            : "Are you sure you want to delete this comment and all its replies? This action cannot be undone."
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