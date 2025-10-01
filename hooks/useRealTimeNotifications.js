/**
 * Real-time Notifications Hook
 * Replaces old SSE polling with Ably real-time notifications
 */

import { useEffect, useState, useRef } from 'react';
import { useAbly, useAblyChannel } from '@/contexts/AblyContext';
import { notificationService } from '@/lib/services/notificationService';

export function useRealTimeNotifications() {
  const { notifications, clearNotification, clearAllNotifications, currentUser } = useAbly();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Mark notification as read
  const markAsRead = async (notificationId) => {
    if (!currentUser?.id) return false;

    try {
      setError(null);
      const result = await notificationService.markAsRead(notificationId, currentUser.id);

      if (result.success) {
        clearNotification(notificationId);
        return true;
      } else {
        setError(result.error);
        return false;
      }
    } catch (err) {
      setError(err.message);
      return false;
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    if (!currentUser?.id) return false;

    try {
      setIsLoading(true);
      setError(null);

      const result = await notificationService.markAllAsRead(currentUser.id);

      if (result.success) {
        clearAllNotifications();
        return true;
      } else {
        setError(result.error);
        return false;
      }
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Get unread count
  const unreadCount = notifications.filter(n => !n.read).length;

  // Get notifications by type
  const getNotificationsByType = (type) => {
    return notifications.filter(n => n.type === type);
  };

  // Get recent notifications (last 24 hours)
  const getRecentNotifications = () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return notifications.filter(n => new Date(n.timestamp) > yesterday);
  };

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    clearNotification,
    clearAllNotifications,
    getNotificationsByType,
    getRecentNotifications
  };
}

export function useJobNotifications(jobId) {
  const { subscribeToChannel, currentUser } = useAbly();
  const [jobUpdates, setJobUpdates] = useState([]);
  const [comments, setComments] = useState([]);
  const [applications, setApplications] = useState([]);

  // Only subscribe if jobId is valid
  const validJobId = jobId && jobId !== 'null' && jobId !== 'undefined' ? jobId : null;

  // Subscribe to job updates
  useAblyChannel(
    validJobId ? `job:${validJobId}:updates` : null,
    'job_status_changed',
    (message) => {
      setJobUpdates(prev => [message.data, ...prev.slice(0, 9)]);
    },
    [validJobId]
  );

  // Subscribe to job comments
  useAblyChannel(
    validJobId ? `job:${validJobId}:comments` : null,
    'comment_posted',
    (message) => {
      setComments(prev => [message.data, ...prev.slice(0, 49)]);
    },
    [validJobId]
  );

  // Subscribe to job applications (if user is job poster)
  useAblyChannel(
    validJobId ? `job:${validJobId}:applications` : null,
    'application_submitted',
    (message) => {
      setApplications(prev => [message.data, ...prev.slice(0, 19)]);
    },
    [validJobId]
  );

  return {
    jobUpdates,
    comments,
    applications,
    hasUpdates: jobUpdates.length > 0,
    hasNewComments: comments.length > 0,
    hasNewApplications: applications.length > 0
  };
}

export function useTypingIndicator(channelName) {
  const { publishMessage, subscribeToChannel, currentUser } = useAbly();
  const [typingUsers, setTypingUsers] = useState([]);
  const typingTimeoutRef = useRef(null);

  // Subscribe to typing events
  useEffect(() => {
    if (!channelName) return;

    const unsubscribe = subscribeToChannel(
      channelName,
      'user_typing',
      (message) => {
        const { userId, userName } = message.data;

        if (userId !== currentUser?.id) {
          setTypingUsers(prev => {
            const filtered = prev.filter(u => u.id !== userId);
            return [...filtered, { id: userId, name: userName, timestamp: Date.now() }];
          });

          // Remove typing indicator after 3 seconds
          setTimeout(() => {
            setTypingUsers(prev => prev.filter(u => u.id !== userId));
          }, 3000);
        }
      }
    );

    return unsubscribe;
  }, [channelName, subscribeToChannel, currentUser?.id]);

  // Broadcast typing indicator
  const broadcastTyping = () => {
    if (!channelName || !currentUser) return;

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Broadcast typing
    publishMessage(channelName, 'user_typing', {
      userId: currentUser.id,
      userName: currentUser.name
    });

    // Set timeout to stop broadcasting
    typingTimeoutRef.current = setTimeout(() => {
      publishMessage(channelName, 'user_stopped_typing', {
        userId: currentUser.id
      });
    }, 1000);
  };

  return {
    typingUsers,
    broadcastTyping
  };
}

export function usePresence(channelName, userData = {}) {
  const { enterPresence, leavePresence, getPresenceMembers, currentUser } = useAbly();
  const [members, setMembers] = useState([]);
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    if (!channelName || !currentUser) return;

    const handlePresence = async () => {
      try {
        // Enter presence
        await enterPresence(channelName, {
          status: 'online',
          lastSeen: new Date().toISOString(),
          ...userData
        });

        setIsOnline(true);

        // Get initial members
        const initialMembers = await getPresenceMembers(channelName);
        setMembers(initialMembers);

      } catch (error) {
        console.error('Failed to enter presence:', error);
      }
    };

    handlePresence();

    return () => {
      leavePresence(channelName);
      setIsOnline(false);
    };
  }, [channelName, currentUser, enterPresence, leavePresence, getPresenceMembers]);

  return {
    members,
    isOnline,
    onlineCount: members.length
  };
}

export function useJobComments(jobId) {
  const { publishMessage, subscribeToChannel, currentUser } = useAbly();
  const [comments, setComments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Only subscribe if jobId is valid
  const validJobId = jobId && jobId !== 'null' && jobId !== 'undefined' ? jobId : null;

  // Load initial comments when jobId changes
  useEffect(() => {
    if (!validJobId) {
      console.log('💬 No valid job ID, clearing comments');
      setComments([]);
      return;
    }

    console.log(`💬 Loading comments for job: ${validJobId}`);
    setIsLoading(true);
    fetch(`/api/jobs/${validJobId}/comments`)
      .then(res => res.json())
      .then(data => {
        console.log(`💬 Loaded ${data.comments?.length || 0} comments for job ${validJobId}`);
        if (data.comments) {
          setComments(data.comments);
        }
      })
      .catch(error => {
        console.error('Failed to load comments:', error);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [validJobId]);

  // Subscribe to comments
  useAblyChannel(
    validJobId ? `job:${validJobId}:comments` : null,
    'comment_posted',
    (message) => {
      console.log('🔔 Received comment_posted event:', message.data);
      const comment = message.data.comment;
      if (!comment) {
        console.warn('⚠️ No comment data in message');
        return;
      }

      setComments(prev => {
        // Check if comment already exists to prevent duplicates
        const commentExists = prev.some(c => c._id === comment._id);
        if (commentExists) {
          console.log('💬 Comment already exists, skipping');
          return prev;
        }
        console.log('✨ Adding new comment to list');
        return [comment, ...prev];
      });
    },
    [validJobId]
  );

  // Subscribe to comment likes
  useAblyChannel(
    validJobId ? `job:${validJobId}:comments` : null,
    'comment_liked',
    (message) => {
      setComments(prev => prev.map(comment => {
        if (comment._id === message.data.commentId) {
          return {
            ...comment,
            likes: message.data.likes || comment.likes
          };
        }

        // Also check replies for likes
        if (comment.replies && comment.replies.length > 0) {
          const updatedReplies = comment.replies.map(reply => {
            if (reply._id === message.data.replyId) {
              return {
                ...reply,
                likes: message.data.likes || reply.likes
              };
            }
            return reply;
          });

          if (updatedReplies !== comment.replies) {
            return { ...comment, replies: updatedReplies };
          }
        }

        return comment;
      }));
    },
    [validJobId, currentUser?.id]
  );

  // Subscribe to comment replies
  useAblyChannel(
    validJobId ? `job:${validJobId}:comments` : null,
    'comment_replied',
    (message) => {
      const { commentId, reply } = message.data;
      if (!commentId || !reply) return;

      setComments(prev => prev.map(comment => {
        if (comment._id === commentId) {
          // Check if reply already exists to prevent duplicates
          const replyExists = (comment.replies || []).some(r => r._id === reply._id);
          if (replyExists) return comment;

          return {
            ...comment,
            replies: [...(comment.replies || []), reply]
          };
        }
        return comment;
      }));
    },
    [validJobId]
  );

  // Subscribe to comment deletions
  useAblyChannel(
    validJobId ? `job:${validJobId}:comments` : null,
    'comment_deleted',
    (message) => {
      setComments(prev => {
        if (message.data.replyId) {
          // Deleting a reply
          return prev.map(comment => {
            if (comment._id === message.data.commentId) {
              return {
                ...comment,
                replies: (comment.replies || []).filter(reply => reply._id !== message.data.replyId)
              };
            }
            return comment;
          });
        } else {
          // Deleting a comment
          return prev.filter(comment => comment._id !== message.data.commentId);
        }
      });
    },
    [validJobId]
  );

  // Post comment
  const postComment = async (content) => {
    if (!currentUser || !content.trim()) return false;

    try {
      setIsLoading(true);

      const response = await fetch('/api/comments/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId,
          content: content.trim(),
          authorId: currentUser.id
        })
      });

      if (response.ok) {
        const result = await response.json();
        return result.success;
      }

      return false;
    } catch (error) {
      console.error('Failed to post comment:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Like comment
  const likeComment = async (commentId) => {
    if (!currentUser) return false;

    try {
      const response = await fetch('/api/comments/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commentId,
          userId: currentUser.id
        })
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to like comment:', error);
      return false;
    }
  };

  return {
    comments,
    isLoading,
    postComment,
    likeComment
  };
}

export function useJobViewCount(jobId) {
  const { subscribeToChannel } = useAbly();
  const [viewCount, setViewCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Only subscribe if jobId is valid
  const validJobId = jobId && jobId !== 'null' && jobId !== 'undefined' ? jobId : null;

  // Subscribe to job view updates
  useAblyChannel(
    validJobId ? `job:${validJobId}:updates` : null,
    'job_updated',
    (message) => {
      if (message.data.type === 'view_count') {
        setViewCount(message.data.viewCount || 0);
      }
    },
    [validJobId]
  );

  // Track a view
  const trackView = async () => {
    if (!validJobId) return false;

    try {
      setIsLoading(true);
      const response = await fetch(`/api/jobs/${validJobId}/view`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const data = await response.json();
        setViewCount(data.viewCount || 0);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to track view:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    viewCount,
    isLoading,
    trackView
  };
}