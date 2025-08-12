'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  MapPin,
  Clock,
  DollarSign,
  Eye,
  MessageSquare,
  Send,
  Star,
  Calendar,
  User,
  Briefcase
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import InstagramCommentsRealtime from './InstagramCommentsRealtime';

export default function JobCardRectangular({ job, user, onApply, isApplying = false }) {
  const router = useRouter();
  const [showComments, setShowComments] = useState(false);
  const [viewCount, setViewCount] = useState(job.viewCount || 0);

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

  const formatTimeAgo = (date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now - new Date(date)) / 1000);
    
    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return `${Math.floor(diffInSeconds / 604800)}w ago`;
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
        className={`bg-fixly-card border border-fixly-border rounded-xl p-4 hover:shadow-md transition-all duration-200 ${
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
                <span className={`text-xs px-2 py-1 rounded-full font-semibold ${deadlineInfo.color} ${deadlineInfo.bgColor}`}>
                  ⏰ {deadlineInfo.text}
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-4 text-sm text-fixly-text-muted mb-2">
              <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                <span>{job.location.city}, {job.location.state}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>{formatTimeAgo(job.createdAt)}</span>
              </div>
              <div className="flex items-center gap-1">
                <Eye className="h-4 w-4" />
                <span>{viewCount} views</span>
              </div>
            </div>
          </div>

          {/* Urgency Badge */}
          <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getUrgencyColor(job.urgency)}`}>
            {job.urgency || 'normal'}
          </span>
        </div>

        {/* Description */}
        <p className="text-fixly-text-light text-sm mb-3 line-clamp-2">
          {job.description}
        </p>

        {/* Skills */}
        <div className="flex flex-wrap gap-1 mb-3">
          {job.skillsRequired.slice(0, 4).map((skill, index) => (
            <span
              key={index}
              className={`text-xs px-2 py-1 rounded-full ${
                user?.skills?.some(s => s.toLowerCase() === skill.toLowerCase())
                  ? 'bg-fixly-accent text-white'
                  : 'bg-fixly-bg text-fixly-text-muted'
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
              className="flex items-center gap-1 px-3 py-2 text-sm bg-fixly-bg hover:bg-fixly-border text-fixly-text rounded-lg transition-colors"
              title="View Details"
            >
              <Eye className="h-4 w-4" />
              <span className="hidden sm:inline">Details</span>
            </button>

            <button
              onClick={() => setShowComments(true)}
              className="flex items-center gap-1 px-3 py-2 text-sm bg-fixly-bg hover:bg-fixly-border text-fixly-text rounded-lg transition-colors"
              title="Comments"
            >
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Comments</span>
              {job.commentCount > 0 && (
                <span className="bg-fixly-accent text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {job.commentCount > 99 ? '99+' : job.commentCount}
                </span>
              )}
            </button>

            <button
              onClick={handleApply}
              disabled={isApplying || job.hasApplied}
              className={`flex items-center gap-1 px-3 py-2 text-sm rounded-lg transition-colors ${
                job.hasApplied
                  ? 'bg-green-100 text-green-700 cursor-not-allowed'
                  : isApplying
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : 'bg-fixly-accent hover:bg-fixly-accent-dark text-white'
              }`}
              title={job.hasApplied ? 'Already Applied' : 'Apply Now'}
            >
              <Send className="h-4 w-4" />
              <span className="hidden sm:inline">
                {job.hasApplied ? 'Applied' : isApplying ? 'Applying...' : 'Apply'}
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