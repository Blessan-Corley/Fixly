'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Plus,
  Search,
  Briefcase,
  TrendingUp,
  Clock,
  Star,
  MapPin,
  DollarSign,
  Users,
  CheckCircle,
  AlertCircle,
  Calendar,
  MessageSquare,
  Award,
  Target,
  Activity
} from 'lucide-react';
import { useApp } from '../providers';
import { usePageLoading } from '../../contexts/LoadingContext';
import { GlobalLoading } from '../../components/ui/GlobalLoading';
import { toast } from 'sonner';
import VerificationPrompt from '@/components/dashboard/VerificationPrompt';
import { MobileCard, MobilePullToRefresh, useMobileDevice } from '../../components/ui/MobileOptimized';

export default function DashboardPage() {
  const { user, loading } = useApp();
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [recentJobs, setRecentJobs] = useState([]);
  const [quickActions, setQuickActions] = useState([]);
  const { 
    loading: pageLoading, 
    showRefreshMessage, 
    startLoading, 
    stopLoading 
  } = usePageLoading('dashboard');
  
  // Mobile device detection
  const deviceInfo = useMobileDevice();

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
  try {
    startLoading('Loading dashboard data...');
    
    // ✅ Fetch dashboard stats - API gets role from session/database
    const statsResponse = await fetch('/api/dashboard/stats', {
      method: 'GET',
      credentials: 'include', // Include cookies for session
      headers: {
        'Content-Type': 'application/json',
      }
    });
    if (statsResponse.ok) {
      const statsData = await statsResponse.json();
      setStats(statsData);
    } else {
      const errorText = await statsResponse.text();
      console.error('Stats API error:', statsResponse.status, errorText);
      if (statsResponse.status === 401) {
        toast.error('Please sign in to view dashboard');
      }
    }

    // ✅ Fetch recent jobs - API gets role from session/database  
    const jobsResponse = await fetch('/api/dashboard/recent-jobs', {
      method: 'GET',
      credentials: 'include', // Include cookies for session
      headers: {
        'Content-Type': 'application/json',
      }
    });
    if (jobsResponse.ok) {
      const jobsData = await jobsResponse.json();
      setRecentJobs(jobsData.jobs || []);
    } else {
      const errorText = await jobsResponse.text();
      console.error('Jobs API error:', jobsResponse.status, errorText);
      if (jobsResponse.status === 401) {
        toast.error('Please sign in to view recent jobs');
      }
    }

  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    toast.error('Failed to load dashboard data');
  } finally {
    stopLoading();
  }
};

  useEffect(() => {
    if (user?.role) {
      const actions = getQuickActions(user.role);
      setQuickActions(actions);
    }
  }, [user]);

  const getQuickActions = (role) => {
    switch (role) {
      case 'hirer':
        return [
          {
            title: 'Post New Job',
            description: 'Create a new job posting',
            icon: Plus,
            href: '/dashboard/post-job',
            color: 'bg-fixly-accent',
            urgent: user?.jobsPosted === 0
          },
          {
            title: 'Browse Fixers',
            description: 'Find skilled professionals',
            icon: Search,
            href: '/dashboard/find-fixers',
            color: 'bg-blue-500'
          },
          {
            title: 'My Jobs',
            description: 'Manage your job postings',
            icon: Briefcase,
            href: '/dashboard/jobs',
            color: 'bg-green-500'
          },
          {
            title: 'Messages',
            description: 'Chat with fixers',
            icon: MessageSquare,
            href: '/dashboard/messages',
            color: 'bg-purple-500'
          }
        ];
      
      case 'fixer':
        return [
          {
            title: 'Browse Jobs',
            description: 'Find new work opportunities',
            icon: Search,
            href: '/dashboard/browse-jobs',
            color: 'bg-fixly-accent',
            urgent: user?.plan?.creditsUsed < 3
          },
          {
            title: 'My Applications',
            description: 'Track your job applications',
            icon: Briefcase,
            href: '/dashboard/applications',
            color: 'bg-blue-500'
          },
          {
            title: 'Earnings',
            description: 'View your income',
            icon: DollarSign,
            href: '/dashboard/earnings',
            color: 'bg-green-500'
          },
          {
            title: 'Upgrade Plan',
            description: 'Unlock unlimited jobs',
            icon: TrendingUp,
            href: '/dashboard/subscription',
            color: 'bg-orange-500',
            urgent: user?.plan?.creditsUsed >= 3
          }
        ];
      
      case 'admin':
        return [
          {
            title: 'User Management',
            description: 'Manage platform users',
            icon: Users,
            href: '/dashboard/admin/users',
            color: 'bg-fixly-accent'
          },
          {
            title: 'Job Management',
            description: 'Oversee all jobs',
            icon: Briefcase,
            href: '/dashboard/admin/jobs',
            color: 'bg-blue-500'
          },
          {
            title: 'Analytics',
            description: 'Platform insights',
            icon: TrendingUp,
            href: '/dashboard/admin/analytics',
            color: 'bg-green-500'
          },
          {
            title: 'Reports',
            description: 'System reports',
            icon: Activity,
            href: '/dashboard/admin/reports',
            color: 'bg-purple-500'
          }
        ];
      
      default:
        return [];
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const renderHirerStats = () => (
    <div className={`grid ${deviceInfo.isMobile ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'} gap-6 mb-8`}>
      <DashboardCard hover={!deviceInfo.isMobile}>
        <div className="flex items-center">
          <div className="p-3 bg-fixly-accent/10 rounded-lg">
            <Briefcase className="h-6 w-6 text-fixly-accent" />
          </div>
          <div className="ml-4">
            <div className="text-2xl font-bold text-fixly-text">
              {stats?.totalJobs || 0}
            </div>
            <div className="text-sm text-fixly-text-muted">Total Jobs Posted</div>
          </div>
        </div>
      </DashboardCard>

      <DashboardCard hover={!deviceInfo.isMobile}>
        <div className="flex items-center">
          <div className="p-3 bg-green-100 rounded-lg">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <div className="ml-4">
            <div className="text-2xl font-bold text-fixly-text">
              {stats?.completedJobs || 0}
            </div>
            <div className="text-sm text-fixly-text-muted">Completed Jobs</div>
          </div>
        </div>
      </DashboardCard>

      <DashboardCard hover={!deviceInfo.isMobile}>
        <div className="flex items-center">
          <div className="p-3 bg-orange-100 rounded-lg">
            <Clock className="h-6 w-6 text-orange-600" />
          </div>
          <div className="ml-4">
            <div className="text-2xl font-bold text-fixly-text">
              {stats?.activeJobs || 0}
            </div>
            <div className="text-sm text-fixly-text-muted">Active Jobs</div>
          </div>
        </div>
      </DashboardCard>

      <DashboardCard hover={!deviceInfo.isMobile}>
        <div className="flex items-center">
          <div className="p-3 bg-blue-100 rounded-lg">
            <DollarSign className="h-6 w-6 text-blue-600" />
          </div>
          <div className="ml-4">
            <div className="text-2xl font-bold text-fixly-text">
              ₹{stats?.totalSpent?.toLocaleString() || 0}
            </div>
            <div className="text-sm text-fixly-text-muted">Total Spent</div>
          </div>
        </div>
      </DashboardCard>
    </div>
  );

  const renderFixerStats = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <div className="card card-hover">
        <div className="flex items-center">
          <div className="p-3 bg-fixly-accent/10 rounded-lg">
            <Briefcase className="h-6 w-6 text-fixly-accent" />
          </div>
          <div className="ml-4">
            <div className="text-2xl font-bold text-fixly-text">
              {stats?.totalApplications || 0}
            </div>
            <div className="text-sm text-fixly-text-muted">Applications Sent</div>
          </div>
        </div>
      </div>

      <div className="card card-hover">
        <div className="flex items-center">
          <div className="p-3 bg-green-100 rounded-lg">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <div className="ml-4">
            <div className="text-2xl font-bold text-fixly-text">
              {user?.jobsCompleted || 0}
            </div>
            <div className="text-sm text-fixly-text-muted">Jobs Completed</div>
          </div>
        </div>
      </div>

      <div className="card card-hover">
        <div className="flex items-center">
          <div className="p-3 bg-yellow-100 rounded-lg">
            <Star className="h-6 w-6 text-yellow-600" />
          </div>
          <div className="ml-4">
            <div className="text-2xl font-bold text-fixly-text">
              {user?.rating?.average?.toFixed(1) || '0.0'}
            </div>
            <div className="text-sm text-fixly-text-muted">
              Rating ({user?.rating?.count || 0} reviews)
            </div>
          </div>
        </div>
      </div>

      <div className="card card-hover">
        <div className="flex items-center">
          <div className="p-3 bg-blue-100 rounded-lg">
            <DollarSign className="h-6 w-6 text-blue-600" />
          </div>
          <div className="ml-4">
            <div className="text-2xl font-bold text-fixly-text">
              ₹{user?.totalEarnings?.toLocaleString() || 0}
            </div>
            <div className="text-sm text-fixly-text-muted">Total Earnings</div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAdminStats = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <div className="card card-hover">
        <div className="flex items-center">
          <div className="p-3 bg-fixly-accent/10 rounded-lg">
            <Users className="h-6 w-6 text-fixly-accent" />
          </div>
          <div className="ml-4">
            <div className="text-2xl font-bold text-fixly-text">
              {stats?.totalUsers || 0}
            </div>
            <div className="text-sm text-fixly-text-muted">Total Users</div>
          </div>
        </div>
      </div>

      <div className="card card-hover">
        <div className="flex items-center">
          <div className="p-3 bg-green-100 rounded-lg">
            <Briefcase className="h-6 w-6 text-green-600" />
          </div>
          <div className="ml-4">
            <div className="text-2xl font-bold text-fixly-text">
              {stats?.totalJobs || 0}
            </div>
            <div className="text-sm text-fixly-text-muted">Total Jobs</div>
          </div>
        </div>
      </div>

      <div className="card card-hover">
        <div className="flex items-center">
          <div className="p-3 bg-blue-100 rounded-lg">
            <TrendingUp className="h-6 w-6 text-blue-600" />
          </div>
          <div className="ml-4">
            <div className="text-2xl font-bold text-fixly-text">
              {stats?.activeUsers || 0}
            </div>
            <div className="text-sm text-fixly-text-muted">Active Users</div>
          </div>
        </div>
      </div>

      <div className="card card-hover">
        <div className="flex items-center">
          <div className="p-3 bg-purple-100 rounded-lg">
            <DollarSign className="h-6 w-6 text-purple-600" />
          </div>
          <div className="ml-4">
            <div className="text-2xl font-bold text-fixly-text">
              ₹{stats?.revenue?.toLocaleString() || 0}
            </div>
            <div className="text-sm text-fixly-text-muted">Platform Revenue</div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStats = () => {
    if (pageLoading) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card">
              <div className="animate-pulse">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-fixly-border rounded-lg"></div>
                  <div className="ml-4 flex-1">
                    <div className="h-6 bg-fixly-border rounded mb-2"></div>
                    <div className="h-4 bg-fixly-border rounded w-3/4"></div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    switch (user?.role) {
      case 'hirer':
        return renderHirerStats();
      case 'fixer':
        return renderFixerStats();
      case 'admin':
        return renderAdminStats();
      default:
        return null;
    }
  };

  const getNextSteps = () => {
    switch (user?.role) {
      case 'hirer':
        if (user?.jobsPosted === 0) {
          return {
            title: 'Get Started',
            description: 'Post your first job to find skilled professionals',
            action: 'Post a Job',
            href: '/dashboard/post-job',
            icon: Plus
          };
        }
        return {
          title: 'Keep Growing',
          description: 'Continue finding great fixers for your projects',
          action: 'Browse Fixers',
          href: '/dashboard/find-fixers',
          icon: Search
        };
      
      case 'fixer':
        if (user?.jobsCompleted === 0) {
          return {
            title: 'Start Earning',
            description: 'Apply to jobs and start building your reputation',
            action: 'Browse Jobs',
            href: '/dashboard/browse-jobs',
            icon: Search
          };
        }
        if (user?.plan?.creditsUsed >= 3) {
          return {
            title: 'Upgrade Your Plan',
            description: 'Get unlimited job applications with Pro',
            action: 'Upgrade Now',
            href: '/dashboard/subscription',
            icon: TrendingUp
          };
        }
        return {
          title: 'Keep Working',
          description: 'Continue building your portfolio and earning',
          action: 'Find More Jobs',
          href: '/dashboard/browse-jobs',
          icon: Search
        };
      
      default:
        return null;
    }
  };

  const nextStep = getNextSteps();

  if (loading) {
    return (
      <GlobalLoading 
        loading={true}
        showRefreshMessage={showRefreshMessage}
        message="Loading dashboard..."
        fullScreen={false}
        className="min-h-[60vh]"
      />
    );
  }

  const handleRefresh = async () => {
    await fetchDashboardData();
  };

  const DashboardCard = deviceInfo.isMobile ? MobileCard : ({ children, className, hover, ...props }) => (
    <div className={`card ${hover ? 'card-hover' : ''} ${className || ''}`} {...props}>{children}</div>
  );

  return (
    <MobilePullToRefresh onRefresh={handleRefresh} className="min-h-full">
      <div className={`${deviceInfo.isMobile ? 'mobile-p-4' : 'p-6 lg:p-8'}`}>
        {/* Welcome Header */}
        <div className="mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`${deviceInfo.isMobile ? 'flex flex-col space-y-4' : 'flex items-center justify-between'}`}
          >
            <div>
              <h1 className={`${deviceInfo.isMobile ? 'text-2xl' : 'text-3xl'} font-bold text-fixly-text`}>
                {getGreeting()}, {user?.name?.split(' ')[0]}! 👋
              </h1>
              <p className="text-fixly-text-light mt-1">
                {user?.role === 'hirer' && "Ready to get your projects done?"}
                {user?.role === 'fixer' && "Time to find some great work opportunities!"}
                {user?.role === 'admin' && "Here's what's happening on the platform"}
              </p>
            </div>
            
            {user?.role === 'fixer' && user?.availableNow && (
              <div className="flex items-center text-green-600 bg-green-50 px-3 py-1 rounded-full">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                Available Now
              </div>
            )}
          </motion.div>
        </div>

      {/* Important Notices */}
      {user?.role === 'fixer' && user?.plan?.creditsUsed >= 3 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg"
        >
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-orange-600 mr-3" />
            <div className="flex-1">
              <div className="font-medium text-orange-800">
                Upgrade Required
              </div>
              <div className="text-sm text-orange-700">
                You've used all 3 free job applications. Upgrade to Pro for unlimited access.
              </div>
            </div>
            <button
              onClick={() => router.push('/dashboard/subscription')}
              className="btn-primary ml-4"
            >
              Upgrade Now
            </button>
          </div>
        </motion.div>
      )}

      {/* Verification Prompt */}
      <VerificationPrompt variant="banner" />

      {/* Stats Section */}
      {renderStats()}

      <div className={`grid ${deviceInfo.isMobile ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-3'} gap-8`}>
        {/* Quick Actions */}
        <div className={`${deviceInfo.isMobile ? '' : 'lg:col-span-2'}`}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-fixly-text">Quick Actions</h2>
          </div>
          
          <div className={`grid ${deviceInfo.isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'} gap-4 mb-8`}>
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <motion.button
                  key={action.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => router.push(action.href)}
                  className={`card card-hover text-left p-6 relative overflow-hidden ${
                    action.urgent ? 'ring-2 ring-fixly-accent' : ''
                  }`}
                >
                  <div className="flex items-center">
                    <div className={`p-3 ${action.color} rounded-lg text-white`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="ml-4 flex-1">
                      <div className="font-semibold text-fixly-text">
                        {action.title}
                        {action.urgent && (
                          <span className="ml-2 text-xs bg-red-500 text-white px-2 py-1 rounded-full">
                            Urgent
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-fixly-text-light">
                        {action.description}
                      </div>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>

          {/* Recent Jobs */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-fixly-text">
                {user?.role === 'hirer' ? 'Recent Jobs' : user?.role === 'fixer' ? 'Recent Applications' : 'Recent Activity'}
              </h2>
              <button
                onClick={() => router.push(user?.role === 'hirer' ? '/dashboard/jobs' : '/dashboard/applications')}
                className="text-fixly-accent hover:text-fixly-accent-dark text-sm font-medium"
              >
                View All
              </button>
            </div>
            
            {recentJobs.length === 0 ? (
              <div className="card text-center py-12">
                <Briefcase className="h-12 w-12 text-fixly-text-muted mx-auto mb-4" />
                <div className="text-fixly-text-muted">
                  {user?.role === 'hirer' ? 'No jobs posted yet' : 'No applications sent yet'}
                </div>
                <div className="text-sm text-fixly-text-muted mt-1">
                  {user?.role === 'hirer' ? 'Post your first job to get started' : 'Apply to jobs to get started'}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {recentJobs.slice(0, 3).map((job, index) => (
                  <motion.div
                    key={job._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="card card-hover"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-fixly-text">{job.title}</div>
                        <div className="text-sm text-fixly-text-muted mt-1">
                          {job.description?.substring(0, 100)}...
                        </div>
                        <div className="flex items-center mt-2 text-xs text-fixly-text-muted">
                          <MapPin className="h-3 w-3 mr-1" />
                          {job.location?.city}
                          <Clock className="h-3 w-3 ml-3 mr-1" />
                          {new Date(job.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="ml-4 text-right">
                        <div className="font-semibold text-fixly-text">
                          ₹{job.budget?.amount?.toLocaleString() || 'Negotiable'}
                        </div>
                        <div className={`text-xs px-2 py-1 rounded-full ${
                          job.status === 'open' ? 'bg-green-100 text-green-800' :
                          job.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                          job.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {job.status?.replace('_', ' ').toUpperCase()}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Next Steps */}
          {nextStep && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="card"
            >
              <div className="text-center">
                <div className="p-3 bg-fixly-accent/10 rounded-lg w-fit mx-auto mb-4">
                  <nextStep.icon className="h-8 w-8 text-fixly-accent" />
                </div>
                <h3 className="font-semibold text-fixly-text mb-2">{nextStep.title}</h3>
                <p className="text-sm text-fixly-text-muted mb-4">{nextStep.description}</p>
                <button
                  onClick={() => router.push(nextStep.href)}
                  className="btn-primary w-full"
                >
                  {nextStep.action}
                </button>
              </div>
            </motion.div>
          )}

          {/* Quick Stats for Fixers */}
          {user?.role === 'fixer' && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="card"
            >
              <h3 className="font-semibold text-fixly-text mb-4">Your Progress</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-fixly-text-muted">Free Credits Used</span>
                    <span className="text-fixly-text">{user?.plan?.creditsUsed || 0}/3</span>
                  </div>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill"
                      style={{ width: `${((user?.plan?.creditsUsed || 0) / 3) * 100}%` }}
                    />
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-fixly-text-muted">Profile Completion</span>
                    <span className="text-fixly-text">85%</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: '85%' }} />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Tips */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="card"
          >
            <h3 className="font-semibold text-fixly-text mb-4">
              {user?.role === 'hirer' ? 'Hiring Tips' : 'Success Tips'}
            </h3>
            <div className="space-y-3 text-sm">
              {user?.role === 'hirer' ? (
                <>
                  <div className="flex items-start">
                    <div className="w-2 h-2 bg-fixly-accent rounded-full mt-2 mr-3 flex-shrink-0"></div>
                    <div className="text-fixly-text-muted">
                      Include clear photos and detailed descriptions in your job posts
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="w-2 h-2 bg-fixly-accent rounded-full mt-2 mr-3 flex-shrink-0"></div>
                    <div className="text-fixly-text-muted">
                      Set realistic budgets to attract quality fixers
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="w-2 h-2 bg-fixly-accent rounded-full mt-2 mr-3 flex-shrink-0"></div>
                    <div className="text-fixly-text-muted">
                      Communicate clearly with applicants before hiring
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start">
                    <div className="w-2 h-2 bg-fixly-accent rounded-full mt-2 mr-3 flex-shrink-0"></div>
                    <div className="text-fixly-text-muted">
                      Complete your profile to build trust with hirers
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="w-2 h-2 bg-fixly-accent rounded-full mt-2 mr-3 flex-shrink-0"></div>
                    <div className="text-fixly-text-muted">
                      Apply quickly to new job postings
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="w-2 h-2 bg-fixly-accent rounded-full mt-2 mr-3 flex-shrink-0"></div>
                    <div className="text-fixly-text-muted">
                      Provide competitive quotes with clear timelines
                    </div>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </div>
      </div>
      </div>
    </MobilePullToRefresh>
  );
}