/**
 * Frontend utility functions for credit and subscription management
 * Replicates server-side User model methods for client-side use
 */

/**
 * Check if a fixer can apply to jobs based on their plan and credits
 * @param {Object} user - User object from frontend API
 * @returns {boolean} - Whether the user can apply to jobs
 */
export function canApplyToJob(user) {
  if (!user || user.role !== 'fixer') return false;
  if (user.banned) return false;
  
  // Pro users have unlimited applications
  if (user.plan && user.plan.type === 'pro' && user.plan.status === 'active') {
    return true;
  }
  
  // Free users get 3 applications
  const creditsUsed = user.plan ? (user.plan.creditsUsed || 0) : 0;
  return creditsUsed < 3;
}

/**
 * Get remaining applications for a fixer
 * @param {Object} user - User object from frontend API
 * @returns {number|string} - Number of remaining applications or 'unlimited'
 */
export function getRemainingApplications(user) {
  if (!user || user.role !== 'fixer') return 0;
  if (user.banned) return 0;
  
  // Pro users have unlimited applications
  if (user.plan && user.plan.type === 'pro' && user.plan.status === 'active') {
    return 'unlimited';
  }
  
  // Free users get 3 applications
  const creditsUsed = user.plan ? (user.plan.creditsUsed || 0) : 0;
  return Math.max(0, 3 - creditsUsed);
}

/**
 * Check if a hirer can post jobs based on their plan and timing
 * @param {Object} user - User object from frontend API
 * @returns {boolean} - Whether the user can post jobs
 */
export function canPostJob(user) {
  if (!user || user.role !== 'hirer') return false;
  if (user.banned) return false;
  
  // Pro users can post unlimited jobs
  if (user.plan?.type === 'pro' && user.plan?.status === 'active') {
    return true;
  }
  
  // Free users have 4-hour gap between posts
  if (!user.lastJobPostedAt) return true;
  const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);
  const lastPosted = new Date(user.lastJobPostedAt);
  return lastPosted < fourHoursAgo;
}

/**
 * Get time remaining until next job can be posted
 * @param {Object} user - User object from frontend API
 * @returns {Date|null} - Next allowed post time or null if can post now
 */
export function getNextJobPostTime(user) {
  if (!user || user.role !== 'hirer') return null;
  if (user.banned) return null;
  
  if (user.plan?.type === 'pro' && user.plan?.status === 'active') {
    return null; // No restrictions for pro users
  }
  
  if (!user.lastJobPostedAt) return null; // Can post immediately
  
  const nextAllowedTime = new Date(new Date(user.lastJobPostedAt).getTime() + 4 * 60 * 60 * 1000);
  const now = new Date();
  
  if (now >= nextAllowedTime) return null; // Can post now
  
  return nextAllowedTime;
}

/**
 * Get user's plan status for display
 * @param {Object} user - User object from frontend API
 * @returns {Object} - Plan information
 */
export function getPlanStatus(user) {
  if (!user || !user.plan) {
    return {
      type: 'free',
      status: 'active',
      isActive: true,
      isPro: false
    };
  }
  
  const isActive = user.plan.status === 'active';
  const isPro = user.plan.type === 'pro' && isActive;
  
  return {
    type: user.plan.type || 'free',
    status: user.plan.status || 'active',
    isActive,
    isPro,
    creditsUsed: user.plan.creditsUsed || 0,
    startDate: user.plan.startDate,
    endDate: user.plan.endDate
  };
}

/**
 * Format time remaining until next action
 * @param {Date} nextTime - Next allowed time
 * @returns {string} - Formatted time string
 */
export function formatTimeRemaining(nextTime) {
  if (!nextTime) return '';
  
  const now = new Date();
  const diff = nextTime.getTime() - now.getTime();
  
  if (diff <= 0) return 'Now';
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}