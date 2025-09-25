'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  MapPin,
  Clock,
  DollarSign,
  Eye,
  MessageSquare,
  Send,
  Calendar,
  CheckCircle
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { toastMessages } from '../utils/toast';
import InstagramCommentsRealtime from './InstagramCommentsRealtime';
import { formatDistance } from '../utils/locationUtils';
import { getClientAbly, CHANNELS, EVENTS } from '../lib/ably';

export default function JobCardRectangular({
  job,
  user,
  onApply,
  isApplying = false,
  userLocation = null,
  showDistance = true
}) {
  const router = useRouter();
  const [showComments, setShowComments] = useState(false);
  const [viewCount, setViewCount] = useState(job.viewCount || job.views?.count || 0);
  const [timeAgo, setTimeAgo] = useState('');
  const [distance, setDistance] = useState(null);

  // Check if current user has applied to this job
  const hasApplied = user && job.applications?.some(app =>
    app.fixer === user.id || app.fixer?._id === user.id || app.fixer?.toString() === user.id
  );

  // Real-time view count updates
  useEffect(() => {
    if (!job._id) return;

    let ably = null;
    let channel = null;

    const setupRealtimeViewCount = async () => {
      try {
        ably = getClientAbly();
        if (!ably) return;

        channel = ably.channels.get(CHANNELS.jobUpdates(job._id));

        await channel.subscribe(EVENTS.JOB_UPDATED, (message) => {
          const { type, viewCount: newViewCount } = message.data;

          if (type === 'view_count' && typeof newViewCount === 'number') {
            setViewCount(newViewCount);
          }
        });

        console.log(`👀 Subscribed to view count updates for job ${job._id}`);
      } catch (error) {
        console.error('❌ Real-time view count setup error:', error);
      }
    };

    setupRealtimeViewCount();

    return () => {
      if (channel) {
        channel.unsubscribe();
      }
      if (ably) {
        ably.close();
      }
    };
  }, [job._id]);

  // Real-time time updates
  useEffect(() => {
    const updateTimeAgo = () => {
      if (job.createdAt) {
        const now = new Date();
        const created = new Date(job.createdAt);
        const diffInSeconds = Math.floor((now - created) / 1000);

        if (diffInSeconds < 60) {
          setTimeAgo(`${diffInSeconds}s ago`);
        } else if (diffInSeconds < 3600) {
          setTimeAgo(`${Math.floor(diffInSeconds / 60)}m ago`);
        } else if (diffInSeconds < 86400) {
          setTimeAgo(`${Math.floor(diffInSeconds / 3600)}h ago`);
        } else if (diffInSeconds < 604800) {
          setTimeAgo(`${Math.floor(diffInSeconds / 86400)}d ago`);
        } else {
          setTimeAgo(`${Math.floor(diffInSeconds / 604800)}w ago`);
        }
      }
    };

    // Update immediately
    updateTimeAgo();

    // Update every 30 seconds for real-time freshness
    const interval = setInterval(updateTimeAgo, 30000);

    return () => clearInterval(interval);
  }, [job.createdAt]);

  // Calculate distance if user location is available
  useEffect(() => {
    if (userLocation && job.location?.lat && job.location?.lng && showDistance) {
      const calculateDistance = (lat1, lng1, lat2, lng2) => {
        const R = 6371; // Earth's radius in kilometers
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
          Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
      };

      const dist = calculateDistance(
        userLocation.lat,
        userLocation.lng,
        job.location.lat,
        job.location.lng
      );

      setDistance(dist);
    }
  }, [userLocation, job.location, showDistance]);

  // Handle view count increment only on "View Details" click
  const handleViewDetails = async () => {
    try {
      // Increment view count
      await fetch(`/api/jobs/${job._id}/view`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      setViewCount(prev => prev + 1);
      router.push(`/dashboard/jobs/${job._id}`);
    } catch (error) {
      console.error('Error updating view count:', error);
      // Still navigate even if view count fails
      router.push(`/dashboard/jobs/${job._id}`);
    }
  };

  const handleApply = async () => {
    if (onApply) {
      await onApply(job._id);
    }
  };

  // Sensitive content filtering for job display
  const sanitizeText = (text) => {
    if (!text) return '';

    // Remove phone numbers
    let sanitized = text.replace(/\b\d{10}\b/g, '***CONTACT***');
    sanitized = sanitized.replace(/\+91[-.\s]?\d{10}\b/g, '***CONTACT***');

    // Remove email addresses
    sanitized = sanitized.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/gi, '***EMAIL***');

    // Remove social media mentions
    sanitized = sanitized.replace(/\b(whatsapp|telegram|instagram|facebook|twitter)\b/gi, '***SOCIAL***');

    // Remove URLs
    sanitized = sanitized.replace(/https?:\/\/[^\s]+/gi, '***LINK***');

    return sanitized;
  };

  const formatDistance = (distanceKm) => {
    if (!distanceKm || distanceKm < 0) return null;

    if (distanceKm < 1) {
      return `${Math.round(distanceKm * 1000)}m away`;
    } else if (distanceKm < 10) {
      return `${distanceKm.toFixed(1)} km away`;
    } else {
      return `${Math.round(distanceKm)} km away`;
    }
  };

  const getDeadlineInfo = (deadline) => {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const diffInMs = deadlineDate - now;
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    
    if (diffInMs <= 0) {
      return { text: 'Expired', color: 'text-red-600', bgColor: 'bg-red-100' };
    } else if (diffInHours < 24) {
      return { 
        text: `${diffInHours}h left`, 
        color: 'text-orange-600', 
        bgColor: 'bg-orange-100',
        urgent: true 
      };
    } else if (diffInDays < 7) {
      return { 
        text: `${diffInDays}d left`, 
        color: 'text-yellow-600', 
        bgColor: 'bg-yellow-100' 
      };
    } else {
      return { 
        text: `${diffInDays}d left`, 
        color: 'text-green-600', 
        bgColor: 'bg-green-100' 
      };
    }
  };

  const getUrgencyColor = (urgency) => {
    switch (urgency) {
      case 'urgent': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getBudgetDisplay = () => {
    if (job.budget.type === 'negotiable') return 'Negotiable';
    if (job.budget.type === 'hourly') return `₹${job.budget.amount}/hr`;
    return `₹${job.budget.amount?.toLocaleString()}`;
  };

  const getSkillMatchPercentage = () => {
    if (!user?.skills || !job.skillsRequired) return 0;
    const userSkills = user.skills.map(s => s.toLowerCase());
    const jobSkills = job.skillsRequired.map(s => s.toLowerCase());
    const matches = jobSkills.filter(skill => userSkills.includes(skill)).length;
    return Math.round((matches / jobSkills.length) * 100);
  };

  const skillMatch = getSkillMatchPercentage();
  const deadlineInfo = getDeadlineInfo(job.deadline);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        whileHover={{ y: -2 }}
        className={`bg-fixly-card dark:bg-gray-800 border border-fixly-border dark:border-gray-700 rounded-xl p-4 hover:shadow-md dark:hover:shadow-lg transition-all duration-200 touch-scroll ${
          deadlineInfo.urgent ? 'ring-2 ring-orange-300 shadow-lg' : ''
        }`}
      >
        {/* Header Row */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-fixly-text text-lg truncate">
                {job.title}
              </h3>
              <div className="flex items-center gap-2">
                {skillMatch > 0 && (
                  <span className="bg-fixly-accent text-white text-xs px-2 py-1 rounded-full">
                    {skillMatch}% match
                  </span>
                )}
                {/* Materials indication */}
                <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                  job.budget?.materialsIncluded 
                    ? 'text-green-700 bg-green-100 border border-green-200' 
                    : 'text-orange-700 bg-orange-100 border border-orange-200'
                }`}>
                  🔧 {job.budget?.materialsIncluded ? 'Materials Included' : 'Bring Materials'}
                </span>
                <span className={`text-xs px-2 py-1 rounded-full font-semibold ${deadlineInfo.color} ${deadlineInfo.bgColor}`}>
                  ⏰ {deadlineInfo.text}
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-4 text-sm text-fixly-text-muted mb-2">
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span className="text-fixly-accent font-medium">{timeAgo || formatTimeAgo(job.createdAt)}</span>
              </div>
              <div className="flex items-center gap-1">
                <Eye className="h-4 w-4" />
                <span className="text-green-600 font-medium">{viewCount} views</span>
              </div>
              {/* Real-time distance calculation */}
              {distance !== null && showDistance && (
                <div className="flex items-center gap-1 text-fixly-accent">
                  <MapPin className="h-4 w-4" />
                  <span className="text-xs font-semibold px-2 py-1 bg-fixly-accent/10 text-fixly-accent rounded-full">
                    📍 {formatDistance(distance)}
                  </span>
                </div>
              )}
              {!distance && showDistance && userLocation && (
                <div className="flex items-center gap-1 text-fixly-text-muted">
                  <MapPin className="h-4 w-4" />
                  <span className="text-xs">Near {job.location?.city}</span>
                </div>
              )}
            </div>
          </div>

          {/* Urgency Badge */}
          <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getUrgencyColor(job.urgency)}`}>
            {job.urgency || 'normal'}
          </span>
        </div>

        {/* Description with sensitive content protection */}
        <p className="text-fixly-text-light text-sm mb-3 line-clamp-2">
          {sanitizeText(job.description)}
        </p>

        {/* Skills */}
        <div className="flex flex-wrap gap-1 mb-3">
          {job.skillsRequired.slice(0, 4).map((skill, index) => (
            <span
              key={index}
              className={`text-xs px-2 py-1 rounded-full transition-all ${
                user?.skills?.some(s => s.toLowerCase() === skill.toLowerCase())
                  ? 'bg-fixly-accent text-white'
                  : 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-transparent hover:border-fixly-accent hover:text-fixly-accent dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-transparent dark:hover:border-fixly-accent dark:hover:text-fixly-accent'
              }`}
            >
              {skill}
            </span>
          ))}
          {job.skillsRequired.length > 4 && (
            <span className="text-xs text-fixly-text-muted px-2 py-1">
              +{job.skillsRequired.length - 4} more
            </span>
          )}
        </div>

        {/* Footer Row */}
        <div className="flex items-center justify-between">
          {/* Left: Budget & Deadline */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 text-fixly-accent font-semibold">
              <DollarSign className="h-4 w-4" />
              <span>{getBudgetDisplay()}</span>
            </div>
            <div className="flex items-center gap-1 text-sm text-fixly-text-muted">
              <Calendar className="h-4 w-4" />
              <span className="font-medium">
                Deadline: {new Date(job.deadline).toLocaleDateString('en-IN', { 
                  day: 'numeric', 
                  month: 'short', 
                  year: 'numeric' 
                })}
              </span>
            </div>
          </div>

          {/* Right: Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleViewDetails}
              className="flex items-center gap-1 px-3 py-2 text-sm bg-fixly-bg dark:bg-gray-700 hover:bg-fixly-border dark:hover:bg-gray-600 text-fixly-text dark:text-gray-200 rounded-lg transition-colors tap-target"
              title="View Details"
            >
              <Eye className="h-4 w-4" />
              <span className="hidden sm:inline">Details</span>
            </button>

            <button
              onClick={() => setShowComments(true)}
              className="flex items-center gap-1 px-3 py-2 text-sm bg-fixly-bg dark:bg-gray-700 hover:bg-fixly-border dark:hover:bg-gray-600 text-fixly-text dark:text-gray-200 rounded-lg transition-colors tap-target relative"
              title="Comments"
            >
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Comments</span>
              {job.commentCount > 0 && (
                <span className="bg-fixly-accent text-white text-xs rounded-full h-5 w-5 flex items-center justify-center absolute -top-1 -right-1 sm:static sm:ml-1">
                  {job.commentCount > 99 ? '99+' : job.commentCount}
                </span>
              )}
            </button>

            <button
              onClick={handleApply}
              disabled={isApplying || hasApplied}
              className={`flex items-center gap-1 px-3 py-2 text-sm rounded-lg transition-colors tap-target ${
                hasApplied
                  ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 cursor-not-allowed border border-green-200 dark:border-green-700'
                  : isApplying
                  ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                  : 'bg-fixly-accent hover:bg-fixly-accent-dark text-white shadow-sm hover:shadow-md'
              }`}
              title={hasApplied ? 'Already Applied' : 'Apply Now'}
            >
              {hasApplied ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">
                {hasApplied ? 'Applied ✓' : isApplying ? 'Applying...' : 'Apply'}
              </span>
            </button>
          </div>
        </div>
      </motion.div>

      {/* Instagram Comments Modal */}
      <InstagramCommentsRealtime
        jobId={job._id}
        isOpen={showComments}
        onClose={() => setShowComments(false)}
        initialCommentCount={job.commentCount || 0}
      />
    </>
  );
}