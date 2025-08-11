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

export default function InstagramComments({ 
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
  const [expandedComments, setExpandedComments] = useState(new Set());
  const [showDropdown, setShowDropdown] = useState(null);

  // Fetch comments
  const fetchComments = useCallback(async () => {
    if (!jobId) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/jobs/${jobId}/comments`);
      const data = await response.json();
      
      if (response.ok) {
        setComments(data.comments || []);
      } else {
        toast.error(data.message || 'Failed to load comments');
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
      toast.error('Failed to load comments');
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  // Load comments when opened
  useEffect(() => {
    if (isOpen && jobId) {
      fetchComments();
    }
  }, [isOpen, jobId, fetchComments]);

  // Post new comment
  const handlePostComment = async () => {
    if (!newComment.trim() || !user) return;

    try {
      const response = await fetch(`/api/jobs/${jobId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: newComment.trim()
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setNewComment('');
        fetchComments(); // Refresh comments
        toast.success('Comment posted!');
      } else {
        toast.error(data.message || 'Failed to post comment');
      }
    } catch (error) {
      console.error('Error posting comment:', error);
      toast.error('Failed to post comment');
    }
  };

  // Post reply
  const handlePostReply = async (commentId) => {
    if (!replyText.trim() || !user) return;

    try {
      const response = await fetch(`/api/jobs/${jobId}/comments`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          commentId,
          message: replyText.trim()
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setReplyText('');
        setReplyingTo(null);
        fetchComments(); // Refresh comments
        toast.success('Reply posted!');
      } else {
        toast.error(data.message || 'Failed to post reply');
      }
    } catch (error) {
      console.error('Error posting reply:', error);
      toast.error('Failed to post reply');
    }
  };

  // Toggle like on comment
  const handleLikeComment = async (commentId, replyId = null) => {
    if (!user) return;

    try {
      const response = await fetch(`/api/jobs/${jobId}/comments/${commentId}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(replyId ? { replyId } : {}),
      });

      const data = await response.json();

      if (response.ok) {
        // Update local state optimistically
        setComments(prevComments => 
          prevComments.map(comment => {
            if (comment._id === commentId) {
              if (replyId) {
                // Update reply likes
                return {
                  ...comment,
                  replies: comment.replies.map(reply => {
                    if (reply._id === replyId) {
                      const currentlyLiked = reply.likes?.some(like => like.user === user._id);
                      return {
                        ...reply,
                        likes: currentlyLiked 
                          ? reply.likes.filter(like => like.user !== user._id)
                          : [...(reply.likes || []), { user: user._id, likedAt: new Date() }]
                      };
                    }
                    return reply;
                  })
                };
              } else {
                // Update comment likes
                const currentlyLiked = comment.likes?.some(like => like.user === user._id);
                return {
                  ...comment,
                  likes: currentlyLiked 
                    ? comment.likes.filter(like => like.user !== user._id)
                    : [...(comment.likes || []), { user: user._id, likedAt: new Date() }]
                };
              }
            }
            return comment;
          })
        );
      } else {
        toast.error(data.message || 'Failed to like comment');
      }
    } catch (error) {
      console.error('Error liking comment:', error);
      toast.error('Failed to like comment');
    }
  };

  // Delete comment or reply
  const handleDelete = async (commentId, replyId = null) => {
    if (!user) return;

    const confirmMessage = replyId ? 'Delete this reply?' : 'Delete this comment?';
    if (!confirm(confirmMessage)) return;

    try {
      const response = await fetch(`/api/jobs/${jobId}/comments`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ commentId, replyId }),
      });

      const data = await response.json();

      if (response.ok) {
        fetchComments(); // Refresh comments
        toast.success(replyId ? 'Reply deleted' : 'Comment deleted');
        setShowDropdown(null);
      } else {
        toast.error(data.message || 'Failed to delete');
      }
    } catch (error) {
      console.error('Error deleting:', error);
      toast.error('Failed to delete');
    }
  };

  // Format time ago
  const formatTimeAgo = (date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now - new Date(date)) / 1000);
    
    if (diffInSeconds < 60) return `${diffInSeconds}s`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;
    return `${Math.floor(diffInSeconds / 604800)}w`;
  };

  // Toggle comment expansion
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
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-fixly-card rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-fixly-border">
          <button
            onClick={onClose}
            className="p-1 hover:bg-fixly-accent/10 rounded-full transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-fixly-text" />
          </button>
          <h2 className="font-semibold text-fixly-text">Comments</h2>
          <div className="w-7 h-7"></div> {/* Spacer */}
        </div>

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
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
              {comments.map((comment) => (
                <div key={comment._id} className="space-y-2">
                  {/* Main Comment */}
                  <div className="flex space-x-3">
                    <img
                      src={comment.author?.photoURL || '/default-avatar.png'}
                      alt={comment.author?.name}
                      className="h-8 w-8 rounded-full object-cover flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="bg-fixly-bg rounded-2xl px-3 py-2">
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
                                    onClick={() => handleDelete(comment._id)}
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
                        <p className="text-fixly-text mt-1">{comment.message}</p>
                      </div>
                      
                      {/* Comment Actions */}
                      <div className="flex items-center space-x-4 mt-1 text-xs text-fixly-text-muted">
                        <span className="flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {formatTimeAgo(comment.createdAt)}
                        </span>
                        <button
                          onClick={() => handleLikeComment(comment._id)}
                          className={`flex items-center space-x-1 hover:text-red-500 transition-colors ${
                            comment.likes?.some(like => like.user === user?._id) 
                              ? 'text-red-500 font-medium' 
                              : ''
                          }`}
                        >
                          <Heart 
                            className={`h-3 w-3 ${
                              comment.likes?.some(like => like.user === user?._id) 
                                ? 'fill-current' 
                                : ''
                            }`} 
                          />
                          <span>{comment.likes?.length || 0}</span>
                        </button>
                        <button
                          onClick={() => setReplyingTo(replyingTo === comment._id ? null : comment._id)}
                          className="hover:text-fixly-accent transition-colors"
                        >
                          Reply
                        </button>
                      </div>

                      {/* Replies */}
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
                                <div className="bg-fixly-accent/5 rounded-2xl px-3 py-2">
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
                                              onClick={() => handleDelete(comment._id, reply._id)}
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
                                  <p className="text-fixly-text text-sm mt-1">{reply.message}</p>
                                </div>
                                
                                {/* Reply Actions */}
                                <div className="flex items-center space-x-4 mt-1 text-xs text-fixly-text-muted">
                                  <span className="flex items-center">
                                    <Clock className="h-3 w-3 mr-1" />
                                    {formatTimeAgo(reply.createdAt)}
                                  </span>
                                  <button
                                    onClick={() => handleLikeComment(comment._id, reply._id)}
                                    className={`flex items-center space-x-1 hover:text-red-500 transition-colors ${
                                      reply.likes?.some(like => like.user === user?._id) 
                                        ? 'text-red-500 font-medium' 
                                        : ''
                                    }`}
                                  >
                                    <Heart 
                                      className={`h-3 w-3 ${
                                        reply.likes?.some(like => like.user === user?._id) 
                                          ? 'fill-current' 
                                          : ''
                                      }`} 
                                    />
                                    <span>{reply.likes?.length || 0}</span>
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
                        <div className="mt-2 flex space-x-2">
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
                              placeholder="Write a reply..."
                              className="flex-1 text-sm bg-fixly-bg border border-fixly-border rounded-full px-3 py-1 focus:outline-none focus:ring-2 focus:ring-fixly-accent"
                              onKeyPress={(e) => e.key === 'Enter' && handlePostReply(comment._id)}
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
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* New Comment Input */}
        {user && (
          <div className="border-t border-fixly-border p-4">
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
                  className="flex-1 bg-fixly-bg border border-fixly-border rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-fixly-accent"
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
      </motion.div>
    </div>
  );
}