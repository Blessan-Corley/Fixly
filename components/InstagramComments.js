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
  const [replyingToUser, setReplyingToUser] = useState('');
  const [expandedComments, setExpandedComments] = useState(new Set());
  const [showDropdown, setShowDropdown] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Fetch comments
  const fetchComments = useCallback(async () => {
    if (!jobId) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/jobs/${jobId}/comments`);
      const data = await response.json();
      
      if (response.ok) {
        setComments(data.comments || []);
        setLastUpdated(new Date());
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

  // Real-time updates via polling (Instagram-like speed)
  useEffect(() => {
    if (!isOpen || !jobId) return;

    const pollComments = async () => {
      try {
        const response = await fetch(`/api/jobs/${jobId}/comments`);
        if (!response.ok) return;
        
        const data = await response.json();
        const newComments = data.comments || [];
        
        // Check for any changes in comments, likes, or replies
        const hasChanges = newComments.length !== comments.length || 
          newComments.some((comment, index) => {
            const existingComment = comments[index];
            if (!existingComment || comment._id !== existingComment._id) return true;
            
            // Check likes
            if (comment.likes?.length !== existingComment.likes?.length) return true;
            
            // Check replies
            if (comment.replies?.length !== existingComment.replies?.length) return true;
            
            // Check reply likes
            if (comment.replies?.some((reply, replyIndex) => {
              const existingReply = existingComment.replies?.[replyIndex];
              return !existingReply || 
                     reply._id !== existingReply._id ||
                     reply.likes?.length !== existingReply.likes?.length;
            })) return true;
            
            return false;
          });

        if (hasChanges) {
          setIsUpdating(true);
          console.log('📱 Comments updated in real-time');
          setComments(newComments);
          
          // Show update indicator briefly
          setTimeout(() => setIsUpdating(false), 1000);
          
          // Show notification for new comments (not from current user)
          if (newComments.length > comments.length) {
            const latestComment = newComments[newComments.length - 1];
            if (latestComment.author?._id !== user?._id) {
              toast.success(`${latestComment.author?.name} commented`, {
                duration: 2000,
                position: 'bottom-right'
              });
            }
          }
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    };

    // Poll every 2 seconds for instant updates
    const pollInterval = setInterval(pollComments, 2000);
    return () => clearInterval(pollInterval);
  }, [isOpen, jobId, comments, user]);

  // Post new comment
  const handlePostComment = async () => {
    if (!newComment.trim() || !user) return;

    const commentText = newComment.trim();
    const originalComment = newComment; // Store original in case we need to restore
    setNewComment(''); // Clear immediately for better UX
    
    try {
      const response = await fetch(`/api/jobs/${jobId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: commentText
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Add new comment to state immediately
        setComments(prev => [...prev, data.comment]);
        toast.success('Comment posted successfully!', { 
          duration: 2000,
          style: { 
            background: 'green',
            color: 'white'
          }
        });
      } else {
        setNewComment(originalComment); // Restore original text on error
        toast.error(data.message || 'Failed to post comment');
      }
    } catch (error) {
      setNewComment(originalComment); // Restore original text on error
      toast.error('Network error. Please try again.');
    }
  };

  // Post reply
  const handlePostReply = async (commentId) => {
    if (!replyText.trim() || !user) return;

    const replyContent = replyText.trim();
    const originalReply = replyText; // Store original
    const originalReplyingTo = replyingTo;
    setReplyText('');
    setReplyingTo(null);
    
    try {
      const response = await fetch(`/api/jobs/${jobId}/comments`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          commentId,
          message: replyContent
        }),
      });

      const data = await response.json();
      console.log('💬 Reply response:', { status: response.status, data });

      if (response.ok) {
        // Update the specific comment with the new reply
        setComments(prev => prev.map(comment => {
          if (comment._id === commentId) {
            return {
              ...comment,
              replies: data.comment.replies
            };
          }
          return comment;
        }));
        toast.success('Reply posted successfully!', { 
          duration: 2000,
          style: { 
            background: 'green',
            color: 'white'
          }
        });
      } else {
        setReplyText(originalReply);
        setReplyingTo(originalReplyingTo);
        toast.error(data.message || 'Failed to post reply');
      }
    } catch (error) {
      setReplyText(originalReply);
      setReplyingTo(originalReplyingTo);
      toast.error('Network error. Please try again.');
    }
  };

  // Toggle like on comment
  const handleLikeComment = async (commentId, replyId = null) => {
    if (!user) return;

    try {
      console.log('❤️ Toggling like...');
      const response = await fetch(`/api/jobs/${jobId}/comments/${commentId}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(replyId ? { replyId } : {}),
      });

      const data = await response.json();
      console.log('❤️ Like response:', { status: response.status, data });

      if (response.ok) {
        // Update the like count in the UI
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
                        likes: data.liked 
                          ? [...(reply.likes || []), { user: user._id, likedAt: new Date() }]
                          : reply.likes.filter(like => like.user !== user._id)
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
                  likes: data.liked 
                    ? [...(comment.likes || []), { user: user._id, likedAt: new Date() }]
                    : comment.likes.filter(like => like.user !== user._id)
                };
              }
            }
            return comment;
          })
        );
        console.log('✅ Like toggled successfully');
      } else {
        console.error('❌ Like failed:', data);
        toast.error(data.message || 'Failed to like comment');
      }
    } catch (error) {
      console.error('❌ Like error:', error);
      toast.error('Network error. Please try again.');
    }
  };

  // Delete comment or reply
  const handleDelete = async (commentId, replyId = null) => {
    if (!user) return;

    const confirmMessage = replyId ? 'Delete this reply?' : 'Delete this comment?';
    if (!confirm(confirmMessage)) return;

    setShowDropdown(null);
    
    // Optimistic update
    let previousComments = [...comments];
    
    if (replyId) {
      // Remove reply optimistically
      setComments(prev => prev.map(comment => {
        if (comment._id === commentId) {
          return {
            ...comment,
            replies: comment.replies.filter(reply => reply._id !== replyId)
          };
        }
        return comment;
      }));
    } else {
      // Remove comment optimistically
      setComments(prev => prev.filter(comment => comment._id !== commentId));
    }

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
        toast.success(replyId ? 'Reply deleted' : 'Comment deleted');
      } else {
        // Restore previous state on error
        setComments(previousComments);
        toast.error(data.message || 'Failed to delete');
      }
    } catch (error) {
      console.error('Error deleting:', error);
      // Restore previous state on error
      setComments(previousComments);
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
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-2 sm:p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-fixly-card rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] sm:max-h-[85vh] flex flex-col overflow-hidden border border-fixly-border/20"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-fixly-border">
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