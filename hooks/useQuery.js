// hooks/useQuery.js - Custom React Query hooks for Fixly platform
'use client';

import { useQuery, useMutation, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { queryKeys, optimisticUpdates, prefetchHelpers } from '../lib/reactQuery';
import { analytics, EventTypes } from '../lib/analytics-client';

// Generic API fetcher with error handling
const fetcher = async (url, options = {}) => {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Network error' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
};

// Jobs Hooks
export const useJobs = (filters = {}, options = {}) => {
  const { data: session } = useSession();
  
  return useQuery({
    queryKey: queryKeys.jobs.list(filters),
    queryFn: () => {
      const params = new URLSearchParams(filters);
      return fetcher(`/api/jobs?${params}`);
    },
    enabled: true,
    staleTime: 1000 * 60 * 2, // 2 minutes for job listings
    ...options,
    onSuccess: (data) => {
      // Track search analytics
      analytics.trackEvent(EventTypes.SEARCH_PERFORMED, {
        filters,
        resultCount: data?.jobs?.length || 0,
        userId: session?.user?.id
      });
      options.onSuccess?.(data);
    }
  });
};

export const useInfiniteJobs = (filters = {}, options = {}) => {
  const { data: session } = useSession();
  
  return useInfiniteQuery({
    queryKey: queryKeys.jobs.list(filters),
    queryFn: ({ pageParam = 1 }) => {
      const params = new URLSearchParams({
        ...filters,
        page: pageParam.toString(),
        limit: '10'
      });
      return fetcher(`/api/jobs?${params}`);
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      return lastPage.hasMore ? lastPage.currentPage + 1 : undefined;
    },
    ...options
  });
};

export const useJob = (jobId, options = {}) => {
  const { data: session } = useSession();
  
  return useQuery({
    queryKey: queryKeys.jobs.detail(jobId),
    queryFn: () => fetcher(`/api/jobs/${jobId}`),
    enabled: !!jobId,
    staleTime: 1000 * 60 * 5, // 5 minutes for job details
    ...options,
    onSuccess: (data) => {
      // Track job view
      analytics.trackEvent(EventTypes.JOB_VIEWED, {
        jobId,
        userId: session?.user?.id,
        jobTitle: data?.title,
        jobCategory: data?.category
      });
      
      // Prefetch related jobs
      prefetchHelpers.prefetchRelatedJobs(data);
      
      options.onSuccess?.(data);
    }
  });
};

export const useCreateJob = (options = {}) => {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  
  return useMutation({
    mutationFn: (jobData) => fetcher('/api/jobs', {
      method: 'POST',
      body: JSON.stringify(jobData)
    }),
    onSuccess: (data) => {
      // Invalidate jobs list
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.lists() });
      
      // Track job creation
      analytics.trackEvent(EventTypes.JOB_POSTED, {
        jobId: data._id,
        userId: session?.user?.id,
        jobTitle: data.title,
        budget: data.budget.amount
      });
      
      toast.success('Job posted successfully!');
      options.onSuccess?.(data);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create job');
      options.onError?.(error);
    }
  });
};

export const useApplyToJob = (options = {}) => {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  
  return useMutation({
    mutationFn: ({ jobId, applicationData }) => 
      fetcher(`/api/jobs/${jobId}/apply`, {
        method: 'POST',
        body: JSON.stringify(applicationData)
      }),
    onMutate: async ({ jobId, applicationData }) => {
      // Optimistic update
      const optimisticApplication = {
        _id: `temp_${Date.now()}`,
        fixer: session?.user,
        message: applicationData.message,
        bidAmount: applicationData.bidAmount,
        createdAt: new Date().toISOString(),
        status: 'pending'
      };
      
      optimisticUpdates.applyToJob(jobId, optimisticApplication);
      
      return { jobId, optimisticApplication };
    },
    onSuccess: (data, variables) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.detail(variables.jobId) });
      
      // Track application
      analytics.trackEvent(EventTypes.JOB_APPLIED, {
        jobId: variables.jobId,
        userId: session?.user?.id,
        bidAmount: variables.applicationData.bidAmount
      });
      
      toast.success('Application submitted successfully!');
      options.onSuccess?.(data, variables);
    },
    onError: (error, variables, context) => {
      // Revert optimistic update
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.detail(variables.jobId) });
      
      toast.error(error.message || 'Failed to submit application');
      options.onError?.(error, variables, context);
    }
  });
};

// User Hooks
export const useUser = (userId, options = {}) => {
  return useQuery({
    queryKey: queryKeys.users.detail(userId),
    queryFn: () => fetcher(`/api/users/${userId}`),
    enabled: !!userId,
    staleTime: 1000 * 60 * 10, // 10 minutes for user data
    ...options
  });
};

export const useUserProfile = (userId, options = {}) => {
  return useQuery({
    queryKey: queryKeys.users.profile(userId),
    queryFn: () => fetcher(`/api/users/${userId}/profile`),
    enabled: !!userId,
    staleTime: 1000 * 60 * 15, // 15 minutes for profile data
    ...options
  });
};

export const useUpdateProfile = (options = {}) => {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  
  return useMutation({
    mutationFn: (profileData) => fetcher(`/api/users/${session?.user?.id}/profile`, {
      method: 'PUT',
      body: JSON.stringify(profileData)
    }),
    onMutate: async (profileData) => {
      // Optimistic update
      const userId = session?.user?.id;
      if (userId) {
        optimisticUpdates.updateProfile(userId, profileData);
      }
      return { userId, profileData };
    },
    onSuccess: (data, variables, context) => {
      // Invalidate user queries
      queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(context.userId) });
      
      // Track profile update
      analytics.trackEvent(EventTypes.USER_PROFILE_UPDATE, {
        userId: context.userId,
        updatedFields: Object.keys(variables)
      });
      
      toast.success('Profile updated successfully!');
      options.onSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      // Revert optimistic update
      if (context?.userId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.users.profile(context.userId) });
      }
      
      toast.error(error.message || 'Failed to update profile');
      options.onError?.(error, variables, context);
    }
  });
};

// Search Hooks
export const useSearch = (query, filters = {}, options = {}) => {
  const { data: session } = useSession();
  
  return useQuery({
    queryKey: queryKeys.search.results(query, filters),
    queryFn: () => {
      const params = new URLSearchParams({
        q: query,
        ...filters
      });
      return fetcher(`/api/search?${params}`);
    },
    enabled: !!query && query.length >= 2,
    staleTime: 1000 * 60 * 3, // 3 minutes for search results
    ...options,
    onSuccess: (data) => {
      // Track search
      analytics.trackEvent(EventTypes.SEARCH_PERFORMED, {
        query,
        filters,
        resultCount: data?.results?.length || 0,
        userId: session?.user?.id
      });
      
      options.onSuccess?.(data);
    }
  });
};

export const useSearchSuggestions = (query, options = {}) => {
  return useQuery({
    queryKey: queryKeys.search.suggestions(query),
    queryFn: () => fetcher(`/api/search/suggestions?q=${encodeURIComponent(query)}`),
    enabled: !!query && query.length >= 2,
    staleTime: 1000 * 60 * 10, // 10 minutes for suggestions
    ...options
  });
};

// Admin Hooks
export const useAdminDashboard = (range = '7d', options = {}) => {
  const { data: session } = useSession();
  
  return useQuery({
    queryKey: queryKeys.admin.dashboard(range),
    queryFn: () => fetcher(`/api/admin/dashboard?range=${range}`),
    enabled: !!session?.user?.isAdmin,
    staleTime: 1000 * 60 * 5, // 5 minutes for dashboard data
    refetchInterval: 1000 * 60 * 2, // Auto-refresh every 2 minutes
    ...options
  });
};

export const useAdminUsers = (filters = {}, options = {}) => {
  const { data: session } = useSession();
  
  return useQuery({
    queryKey: queryKeys.admin.users(filters),
    queryFn: () => {
      const params = new URLSearchParams(filters);
      return fetcher(`/api/admin/users?${params}`);
    },
    enabled: !!session?.user?.isAdmin,
    staleTime: 1000 * 60 * 3, // 3 minutes for admin user data
    ...options
  });
};

export const useAdminJobs = (filters = {}, options = {}) => {
  const { data: session } = useSession();
  
  return useQuery({
    queryKey: queryKeys.admin.jobs(filters),
    queryFn: () => {
      const params = new URLSearchParams(filters);
      return fetcher(`/api/admin/jobs?${params}`);
    },
    enabled: !!session?.user?.isAdmin,
    staleTime: 1000 * 60 * 3, // 3 minutes for admin job data
    ...options
  });
};

// Real-time Hooks
export const useNotifications = (options = {}) => {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  
  return useQuery({
    queryKey: queryKeys.realtime.notifications(userId),
    queryFn: () => fetcher(`/api/notifications`),
    enabled: !!userId,
    staleTime: 1000 * 30, // 30 seconds for notifications
    refetchInterval: 1000 * 60, // Refetch every minute
    ...options
  });
};

export const useMarkNotificationRead = (options = {}) => {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  
  return useMutation({
    mutationFn: (notificationId) => fetcher(`/api/notifications/${notificationId}/read`, {
      method: 'POST'
    }),
    onSuccess: () => {
      // Invalidate notifications
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.realtime.notifications(session?.user?.id) 
      });
      
      // Track notification interaction
      analytics.trackEvent(EventTypes.NOTIFICATION_CLICKED, {
        userId: session?.user?.id
      });
      
      options.onSuccess?.();
    }
  });
};

// Location Hook
export const useLocationSearch = (coordinates, options = {}) => {
  return useQuery({
    queryKey: queryKeys.search.location(coordinates),
    queryFn: () => fetcher(`/api/location/reverse?lat=${coordinates.lat}&lng=${coordinates.lng}`),
    enabled: !!coordinates?.lat && !!coordinates?.lng,
    staleTime: 1000 * 60 * 60, // 1 hour for location data
    ...options
  });
};

// Comments Hook
export const useComments = (jobId, options = {}) => {
  return useQuery({
    queryKey: queryKeys.jobs.comments(jobId),
    queryFn: () => fetcher(`/api/jobs/${jobId}/comments`),
    enabled: !!jobId,
    staleTime: 1000 * 60 * 2, // 2 minutes for comments
    ...options
  });
};

export const useAddComment = (options = {}) => {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  
  return useMutation({
    mutationFn: ({ jobId, content }) => fetcher(`/api/jobs/${jobId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content })
    }),
    onMutate: async ({ jobId, content }) => {
      // Optimistic update
      const optimisticComment = {
        _id: `temp_${Date.now()}`,
        author: session?.user,
        content,
        createdAt: new Date().toISOString(),
        likes: 0
      };
      
      optimisticUpdates.addComment(jobId, optimisticComment);
      
      return { jobId, optimisticComment };
    },
    onSuccess: (data, variables) => {
      // Invalidate comments
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.comments(variables.jobId) });
      
      // Track comment
      analytics.trackEvent(EventTypes.COMMENT_POSTED, {
        jobId: variables.jobId,
        userId: session?.user?.id
      });
      
      options.onSuccess?.(data, variables);
    },
    onError: (error, variables, context) => {
      // Revert optimistic update
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.comments(variables.jobId) });
      
      toast.error(error.message || 'Failed to post comment');
      options.onError?.(error, variables, context);
    }
  });
};

// Analytics Hook
export const useAnalytics = (timeRange = '7d', eventTypes = [], options = {}) => {
  const { data: session } = useSession();
  
  return useQuery({
    queryKey: queryKeys.admin.analytics(timeRange),
    queryFn: () => {
      const params = new URLSearchParams({
        timeRange,
        eventTypes: eventTypes.join(',')
      });
      return fetcher(`/api/admin/analytics?${params}`);
    },
    enabled: !!session?.user?.isAdmin,
    staleTime: 1000 * 60 * 5, // 5 minutes for analytics
    ...options
  });
};

export default {
  useJobs,
  useInfiniteJobs,
  useJob,
  useCreateJob,
  useApplyToJob,
  useUser,
  useUserProfile,
  useUpdateProfile,
  useSearch,
  useSearchSuggestions,
  useAdminDashboard,
  useAdminUsers,
  useAdminJobs,
  useNotifications,
  useMarkNotificationRead,
  useLocationSearch,
  useComments,
  useAddComment,
  useAnalytics
};