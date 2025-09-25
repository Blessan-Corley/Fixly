'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  User,
  Clock,
  IndianRupee,
  CheckCircle,
  XCircle,
  MessageSquare,
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  Calendar,
  Loader2
} from 'lucide-react';
import { getClientAbly, CHANNELS, EVENTS } from '../../lib/ably';
import { toast } from 'sonner';

const RealTimeJobApplications = ({
  jobId,
  initialApplications = [],
  userRole = 'hirer', // 'hirer' or 'fixer'
  onApplicationUpdate = null,
  showNotifications = true,
  autoScroll = true
}) => {
  const { data: session } = useSession();
  const [applications, setApplications] = useState(initialApplications);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [notifications, setNotifications] = useState([]);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const ablyRef = useRef(null);
  const channelRef = useRef(null);
  const notificationChannelRef = useRef(null);
  const applicationsEndRef = useRef(null);

  // Initialize Ably connection
  useEffect(() => {
    if (!session?.user?.id || !jobId) return;

    const initializeAbly = async () => {
      try {
        ablyRef.current = getClientAbly();

        if (!ablyRef.current) {
          console.error('Failed to initialize Ably client');
          setConnectionStatus('failed');
          return;
        }

        // Update client ID with actual user ID
        ablyRef.current.options.clientId = `user-${session.user.id}`;

        // Set up connection state listeners
        ablyRef.current.connection.on('connected', () => {
          console.log('✅ Ably connected for real-time job applications');
          setConnectionStatus('connected');
        });

        ablyRef.current.connection.on('disconnected', () => {
          console.log('⚠️ Ably disconnected');
          setConnectionStatus('disconnected');
        });

        ablyRef.current.connection.on('failed', (error) => {
          console.error('❌ Ably connection failed:', error);
          setConnectionStatus('failed');
        });

        // Connect
        await ablyRef.current.connection.once('connected');

      } catch (error) {
        console.error('❌ Error initializing Ably:', error);
        setConnectionStatus('failed');
      }
    };

    initializeAbly();

    return () => {
      if (ablyRef.current) {
        ablyRef.current.close();
      }
    };
  }, [session?.user?.id, jobId]);

  // Subscribe to job applications channel
  useEffect(() => {
    if (connectionStatus !== 'connected' || !ablyRef.current || !jobId) return;

    const subscribeToApplications = async () => {
      try {
        // Job applications channel
        const channelName = CHANNELS.jobApplications(jobId);
        channelRef.current = ablyRef.current.channels.get(channelName);

        // Subscribe to application events
        await channelRef.current.subscribe(EVENTS.APPLICATION_SUBMITTED, (message) => {
          console.log('📨 New job application received:', message.data);

          const newApplication = {
            _id: message.data.applicationId,
            fixer: message.data.fixer,
            proposedAmount: message.data.proposedAmount,
            priceVariance: message.data.priceVariance,
            priceVariancePercentage: message.data.priceVariancePercentage,
            timeEstimate: message.data.timeEstimate,
            status: 'pending',
            appliedAt: message.data.timestamp,
            isRealTimeUpdate: true
          };

          setApplications(prev => [...prev, newApplication]);

          // Show notification for hirers
          if (userRole === 'hirer' && showNotifications) {
            const notification = {
              id: Date.now(),
              type: 'application',
              message: `${message.data.fixer.name} applied to your job`,
              fixer: message.data.fixer,
              timestamp: new Date(),
              proposedAmount: message.data.proposedAmount
            };

            setNotifications(prev => [notification, ...prev.slice(0, 4)]); // Keep only 5 notifications

            toast.success(`New Application from ${message.data.fixer.name}`, {
              description: `Proposed amount: ₹${message.data.proposedAmount.toLocaleString()}`,
              action: {
                label: 'View',
                onClick: () => window.location.reload()
              }
            });
          }

          // Call update callback
          if (onApplicationUpdate) {
            onApplicationUpdate(newApplication, 'submitted');
          }

          // Auto scroll to new application
          if (autoScroll && applicationsEndRef.current) {
            setTimeout(() => {
              applicationsEndRef.current.scrollIntoView({ behavior: 'smooth' });
            }, 100);
          }
        });

        await channelRef.current.subscribe(EVENTS.APPLICATION_ACCEPTED, (message) => {
          console.log('✅ Application accepted:', message.data);

          setApplications(prev =>
            prev.map(app =>
              app._id === message.data.applicationId
                ? { ...app, status: 'accepted', acceptedAt: message.data.timestamp }
                : app
            )
          );

          if (showNotifications) {
            toast.success('Application Accepted!', {
              description: 'Your application has been accepted by the hirer.'
            });
          }

          if (onApplicationUpdate) {
            onApplicationUpdate(message.data, 'accepted');
          }
        });

        await channelRef.current.subscribe(EVENTS.APPLICATION_REJECTED, (message) => {
          console.log('❌ Application rejected:', message.data);

          setApplications(prev =>
            prev.map(app =>
              app._id === message.data.applicationId
                ? { ...app, status: 'rejected', rejectedAt: message.data.timestamp }
                : app
            )
          );

          if (userRole === 'fixer' && showNotifications) {
            toast.error('Application Status Update', {
              description: 'Your application status has been updated.'
            });
          }

          if (onApplicationUpdate) {
            onApplicationUpdate(message.data, 'rejected');
          }
        });

        // User notification channel (for hirers)
        if (userRole === 'hirer') {
          const notificationChannelName = CHANNELS.userNotifications(session.user.id);
          notificationChannelRef.current = ablyRef.current.channels.get(notificationChannelName);

          await notificationChannelRef.current.subscribe(EVENTS.NOTIFICATION_SENT, (message) => {
            if (message.data.type === 'job_applied' && message.data.jobId === jobId) {
              console.log('🔔 Job application notification:', message.data);

              const notification = {
                id: Date.now(),
                type: 'notification',
                message: message.data.message,
                timestamp: new Date(message.data.timestamp)
              };

              setNotifications(prev => [notification, ...prev.slice(0, 4)]);
            }
          });
        }

        setIsSubscribed(true);
        console.log(`✅ Subscribed to job applications for job ${jobId}`);

      } catch (error) {
        console.error('❌ Error subscribing to job applications:', error);
      }
    };

    subscribeToApplications();

    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
      }
      if (notificationChannelRef.current) {
        notificationChannelRef.current.unsubscribe();
      }
    };
  }, [connectionStatus, jobId, session?.user?.id, userRole, showNotifications, onApplicationUpdate, autoScroll]);

  // Get status color and icon
  const getStatusDisplay = (status) => {
    switch (status) {
      case 'pending':
        return { color: 'text-yellow-600', bg: 'bg-yellow-50', icon: Clock, text: 'Pending' };
      case 'accepted':
        return { color: 'text-green-600', bg: 'bg-green-50', icon: CheckCircle, text: 'Accepted' };
      case 'rejected':
        return { color: 'text-red-600', bg: 'bg-red-50', icon: XCircle, text: 'Rejected' };
      default:
        return { color: 'text-gray-600', bg: 'bg-gray-50', icon: Clock, text: 'Unknown' };
    }
  };

  // Get price variance display
  const getPriceVarianceDisplay = (variance, percentage) => {
    if (!variance) return null;

    const isHigher = variance > 0;
    const isLower = variance < 0;

    if (Math.abs(percentage) < 1) {
      return { icon: Minus, color: 'text-gray-500', text: 'At budget' };
    }

    return {
      icon: isHigher ? TrendingUp : TrendingDown,
      color: isHigher ? 'text-red-500' : 'text-green-500',
      text: `${isHigher ? '+' : ''}${percentage.toFixed(1)}%`
    };
  };

  // Connection status indicator
  const ConnectionStatus = () => (
    <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
      <div className={`w-2 h-2 rounded-full ${
        connectionStatus === 'connected' ? 'bg-green-500' :
        connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' :
        'bg-red-500'
      }`} />
      <span>
        {connectionStatus === 'connected' ? 'Real-time updates active' :
         connectionStatus === 'connecting' ? 'Connecting...' :
         'Connection failed'}
      </span>
      {isSubscribed && (
        <span className="text-xs text-green-600">• Subscribed</span>
      )}
    </div>
  );

  // Notification panel
  const NotificationPanel = () => (
    showNotifications && notifications.length > 0 && (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200"
      >
        <div className="flex items-center gap-2 mb-3">
          <Bell className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-medium text-blue-800">
            Recent Activity ({notifications.length})
          </span>
        </div>
        <div className="space-y-2">
          {notifications.slice(0, 3).map((notification) => (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-xs text-blue-700 bg-white p-2 rounded border"
            >
              <div className="flex justify-between items-start">
                <span>{notification.message}</span>
                <span className="text-blue-500 ml-2">
                  {notification.timestamp.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
              {notification.proposedAmount && (
                <div className="mt-1 text-blue-600">
                  Amount: ₹{notification.proposedAmount.toLocaleString()}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </motion.div>
    )
  );

  return (
    <div className="space-y-4">
      <ConnectionStatus />
      <NotificationPanel />

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-gray-600" />
            <h3 className="font-semibold text-gray-800">
              Applications ({applications.length})
            </h3>
          </div>
          {connectionStatus === 'connected' && (
            <div className="flex items-center gap-1 text-xs text-green-600">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              Live Updates
            </div>
          )}
        </div>

        <AnimatePresence mode="popLayout">
          {applications.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-8 text-gray-500"
            >
              <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No applications yet</p>
              {userRole === 'hirer' && (
                <p className="text-xs mt-1">
                  You'll see applications appear here in real-time
                </p>
              )}
            </motion.div>
          ) : (
            applications.map((application, index) => {
              const statusDisplay = getStatusDisplay(application.status);
              const StatusIcon = statusDisplay.icon;
              const priceVariance = getPriceVarianceDisplay(
                application.priceVariance,
                application.priceVariancePercentage
              );
              const VarianceIcon = priceVariance?.icon;

              return (
                <motion.div
                  key={application._id || index}
                  initial={application.isRealTimeUpdate ? { opacity: 0, scale: 0.95 } : false}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  className={`p-4 border rounded-lg ${
                    application.isRealTimeUpdate ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-white'
                  } hover:shadow-md transition-shadow`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center text-white font-semibold">
                        {application.fixer?.name?.[0] || 'F'}
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-800">
                          {application.fixer?.name || 'Anonymous Fixer'}
                        </h4>
                        <p className="text-xs text-gray-500">
                          @{application.fixer?.username || 'username'}
                          {application.fixer?.rating && (
                            <span className="ml-2">
                              ⭐ {application.fixer.rating.toFixed(1)}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className={`px-3 py-1 rounded-full text-xs flex items-center gap-1 ${statusDisplay.bg} ${statusDisplay.color}`}>
                      <StatusIcon className="w-3 h-3" />
                      {statusDisplay.text}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div className="flex items-center gap-2">
                      <IndianRupee className="w-4 h-4 text-gray-500" />
                      <span className="font-semibold text-gray-800">
                        ₹{application.proposedAmount?.toLocaleString() || 'N/A'}
                      </span>
                      {priceVariance && (
                        <div className={`flex items-center gap-1 text-xs ${priceVariance.color}`}>
                          <VarianceIcon className="w-3 h-3" />
                          {priceVariance.text}
                        </div>
                      )}
                    </div>

                    {application.timeEstimate && (
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-600">
                          {application.timeEstimate.value} {application.timeEstimate.unit}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Applied {new Date(application.appliedAt || Date.now()).toLocaleDateString()}
                    </div>
                    {application.isRealTimeUpdate && (
                      <span className="text-blue-600 font-medium">
                        New!
                      </span>
                    )}
                  </div>

                  {userRole === 'hirer' && application.status === 'pending' && (
                    <div className="mt-3 flex gap-2">
                      <button className="flex-1 px-3 py-1.5 bg-green-600 text-white text-xs rounded-md hover:bg-green-700 transition-colors">
                        Accept
                      </button>
                      <button className="flex-1 px-3 py-1.5 bg-gray-600 text-white text-xs rounded-md hover:bg-gray-700 transition-colors">
                        Reject
                      </button>
                      <button className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700 transition-colors">
                        <MessageSquare className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </motion.div>
              );
            })
          )}
        </AnimatePresence>

        <div ref={applicationsEndRef} />
      </div>
    </div>
  );
};

export default RealTimeJobApplications;