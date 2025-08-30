'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  DollarSign,
  TrendingUp,
  Calendar,
  Briefcase,
  Download,
  Eye,
  Star,
  Clock,
  Target,
  Award,
  Filter,
  BarChart3,
  Loader,
  ArrowUp,
  ArrowDown,
  Search
} from 'lucide-react';
import { useApp, RoleGuard } from '../../providers';
import { toast } from 'sonner';
import EarningsHeatmap from '../../../components/ui/EarningsHeatmap';
import SilentLoader, { BackgroundActivity } from '../../../components/ui/SilentLoader';

export default function EarningsPage() {
  return (
    <RoleGuard roles={['fixer']} fallback={<div>Access denied</div>}>
      <EarningsContent />
    </RoleGuard>
  );
}

function EarningsContent() {
  const { user } = useApp();
  const router = useRouter();
  
  const [earnings, setEarnings] = useState({
    total: 0,
    thisMonth: 0,
    lastMonth: 0,
    thisWeek: 0,
    pendingPayments: 0,
    completedJobs: 0,
    averageJobValue: 0,
    topJobCategory: '',
    growth: {
      monthly: 0,
      weekly: 0
    }
  });
  
  const [earningsHistory, setEarningsHistory] = useState([]);
  const [recentJobs, setRecentJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState('this_month');
  const [showChart, setShowChart] = useState('earnings');
  const [backgroundActivities, setBackgroundActivities] = useState([]);
  const [completedJobs, setCompletedJobs] = useState([]);
  const [realTimeEarnings, setRealTimeEarnings] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchEarningsData();
    
    // Set up real-time refresh every 2 minutes for earnings data
    const interval = setInterval(() => {
      if (!loading && !refreshing) {
        refreshEarningsData();
      }
    }, 120000); // 2 minutes
    
    return () => clearInterval(interval);
  }, [timeFilter]);
  
  // Background activity helpers
  const addBackgroundActivity = (id, text) => {
    setBackgroundActivities(prev => {
      const existing = prev.find(a => a.id === id);
      if (existing) return prev;
      return [...prev, { id, text, timestamp: Date.now() }];
    });
  };

  const removeBackgroundActivity = (id) => {
    setBackgroundActivities(prev => prev.filter(a => a.id !== id));
  };
  
  // Silent refresh for real-time updates
  const refreshEarningsData = async () => {
    const activityId = 'earnings-refresh';
    addBackgroundActivity(activityId, 'Updating earnings data...');
    
    try {
      await fetchEarningsData(true); // Silent fetch
    } catch (error) {
      console.debug('Background earnings refresh failed:', error);
    } finally {
      removeBackgroundActivity(activityId);
    }
  };

  const fetchEarningsData = async (silent = false) => {
    const activityId = `fetch-earnings-${Date.now()}`;
    
    try {
      if (!silent) {
        setLoading(true);
      } else {
        addBackgroundActivity(activityId, 'Refreshing earnings...');
      }
      
      // Fetch real earnings data from user's completed jobs
      const userJobsResponse = await fetch('/api/fixer/earnings', {
        method: 'GET',
        headers: { 'Cache-Control': 'no-cache' }
      });
      
      if (userJobsResponse.ok) {
        const earningsData = await userJobsResponse.json();
        
        // Calculate real-time earnings from actual completed jobs
        const now = new Date();
        const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const thisWeek = new Date(now.setDate(now.getDate() - now.getDay()));
        
        const completedJobsList = earningsData.jobs.filter(job => 
          job.status === 'completed' && job.progress?.completedAt
        );
        
        setCompletedJobs(completedJobsList);
        
        const totalEarnings = completedJobsList.reduce((sum, job) => sum + (job.earnings || job.budget?.amount || 0), 0);
        
        const thisMonthEarnings = completedJobsList
          .filter(job => new Date(job.progress.completedAt) >= thisMonth)
          .reduce((sum, job) => sum + (job.earnings || job.budget?.amount || 0), 0);
          
        const lastMonthEarnings = completedJobsList
          .filter(job => {
            const completedDate = new Date(job.progress.completedAt);
            return completedDate >= lastMonth && completedDate < thisMonth;
          })
          .reduce((sum, job) => sum + (job.earnings || job.budget?.amount || 0), 0);
          
        const thisWeekEarnings = completedJobsList
          .filter(job => new Date(job.progress.completedAt) >= thisWeek)
          .reduce((sum, job) => sum + (job.earnings || job.budget?.amount || 0), 0);
        
        const pendingJobs = earningsData.jobs.filter(job => 
          ['accepted', 'in_progress'].includes(job.status)
        );
        const pendingEarnings = pendingJobs.reduce((sum, job) => sum + (job.budget?.amount || 0), 0);
        
        // Calculate job categories
        const categoryCount = {};
        completedJobsList.forEach(job => {
          const category = job.skillsRequired?.[0] || 'General';
          categoryCount[category] = (categoryCount[category] || 0) + 1;
        });
        const topCategory = Object.entries(categoryCount)
          .sort(([,a], [,b]) => b - a)[0]?.[0] || 'General';
        
        const realEarningsData = {
          total: totalEarnings,
          thisMonth: thisMonthEarnings,
          lastMonth: lastMonthEarnings,
          thisWeek: thisWeekEarnings,
          pendingPayments: pendingEarnings,
          completedJobs: completedJobsList.length,
          averageJobValue: completedJobsList.length > 0 ? Math.round(totalEarnings / completedJobsList.length) : 0,
          topJobCategory: topCategory,
          growth: {
            monthly: calculateGrowth(thisMonthEarnings, lastMonthEarnings),
            weekly: earningsData.weeklyGrowth || 0
          }
        };
        
        setEarnings(realEarningsData);
        setRealTimeEarnings(realEarningsData);
      }

      // Use completed jobs for recent jobs display
      const recentCompleted = completedJobs
        .sort((a, b) => new Date(b.progress?.completedAt) - new Date(a.progress?.completedAt))
        .slice(0, 10);
      setRecentJobs(recentCompleted);

      // Generate real earnings history from completed jobs
      setEarningsHistory(generateRealEarningsHistory(completedJobs));
      
      if (silent) {
        removeBackgroundActivity(activityId);
        console.debug('Earnings data refreshed silently');
      }

    } catch (error) {
      console.error('Error fetching earnings data:', error);
      if (!silent) {
        toast.error('Failed to fetch earnings data');
      } else {
        removeBackgroundActivity(activityId);
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  const calculateGrowth = (current, previous) => {
    if (!previous) return 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  const generateRealEarningsHistory = (jobsData) => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const monthsData = {};
    
    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth()).padStart(2, '0')}`;
      monthsData[monthKey] = {
        month: monthNames[date.getMonth()],
        earnings: 0,
        jobs: 0
      };
    }
    
    // Aggregate earnings by month from real data
    jobsData.forEach(job => {
      if (!job.progress?.completedAt) return;
      
      const completedDate = new Date(job.progress.completedAt);
      const monthKey = `${completedDate.getFullYear()}-${String(completedDate.getMonth()).padStart(2, '0')}`;
      
      if (monthsData[monthKey]) {
        monthsData[monthKey].earnings += job.earnings || job.budget?.amount || 0;
        monthsData[monthKey].jobs += 1;
      }
    });
    
    return Object.values(monthsData);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const exportEarnings = () => {
    // Check if there are jobs to export
    if (!recentJobs || recentJobs.length === 0) {
      toast.error('No earnings data to export');
      return;
    }

    // Generate CSV export
    const csvData = recentJobs.map(job => ({
      Date: job.progress?.completedAt ? new Date(job.progress.completedAt).toLocaleDateString() : 'N/A',
      Job: job.title || 'Untitled Job',
      Amount: job.budget?.amount || 0,
      Client: job.createdBy?.name || 'Unknown Client',
      Status: job.status || 'Unknown'
    }));
    
    if (csvData.length === 0) {
      toast.error('No valid earnings data to export');
      return;
    }

    const csv = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fixly-earnings-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    
    toast.success('Earnings report exported successfully');
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader className="animate-spin h-8 w-8 text-fixly-accent" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-fixly-text mb-2">
            Earnings Dashboard
          </h1>
          <p className="text-fixly-text-light">
            Track your income and financial progress
          </p>
        </div>
        
        <div className="flex items-center space-x-4 mt-4 lg:mt-0">
          <select
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value)}
            className="select-field"
          >
            <option value="this_week">This Week</option>
            <option value="this_month">This Month</option>
            <option value="last_month">Last Month</option>
            <option value="this_year">This Year</option>
          </select>
          
          <button
            onClick={exportEarnings}
            className="btn-secondary flex items-center"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Real-time Status Indicator */}
      {realTimeEarnings && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4 mb-6"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse mr-3" />
              <span className="text-green-800 font-medium">Live Earnings Data</span>
            </div>
            <span className="text-sm text-green-600">
              Last updated: {new Date().toLocaleTimeString()}
            </span>
          </div>
        </motion.div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="p-3 bg-green-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
            <div className="flex items-center text-sm">
              {earnings.growth.monthly > 0 ? (
                <ArrowUp className="h-4 w-4 text-green-600 mr-1" />
              ) : (
                <ArrowDown className="h-4 w-4 text-red-600 mr-1" />
              )}
              <span className={earnings.growth.monthly > 0 ? 'text-green-600' : 'text-red-600'}>
                {Math.abs(earnings.growth.monthly)}%
              </span>
            </div>
          </div>
          <div className="text-2xl font-bold text-fixly-text">
            {formatCurrency(earnings.thisMonth)}
          </div>
          <div className="text-sm text-fixly-text-muted">This Month</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="p-3 bg-blue-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-fixly-text">
            {formatCurrency(earnings.total)}
          </div>
          <div className="text-sm text-fixly-text-muted">Total Earnings</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Briefcase className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-fixly-text">
            {earnings.completedJobs}
          </div>
          <div className="text-sm text-fixly-text-muted">Jobs Completed</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="p-3 bg-orange-100 rounded-lg">
              <Target className="h-6 w-6 text-orange-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-fixly-text">
            {formatCurrency(earnings.averageJobValue)}
          </div>
          <div className="text-sm text-fixly-text-muted">Avg. Job Value</div>
        </motion.div>
      </div>

      {/* Job Completion Heatmap */}
      <div className="mb-8">
        <EarningsHeatmap jobsData={completedJobs} year={new Date().getFullYear()} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Earnings Chart */}
        <div className="lg:col-span-2">
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-fixly-text">
                Earnings Trend
              </h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowChart('earnings')}
                  className={`btn-ghost text-sm ${showChart === 'earnings' ? 'bg-fixly-accent' : ''}`}
                >
                  Earnings
                </button>
                <button
                  onClick={() => setShowChart('jobs')}
                  className={`btn-ghost text-sm ${showChart === 'jobs' ? 'bg-fixly-accent' : ''}`}
                >
                  Jobs
                </button>
              </div>
            </div>
            
            {/* Simple Chart */}
            <div className="space-y-4">
              {earningsHistory.map((data, index) => (
                <div key={data.month} className="flex items-center">
                  <div className="w-12 text-sm text-fixly-text-muted">
                    {data.month}
                  </div>
                  <div className="flex-1 mx-4">
                    <div className="bg-fixly-border rounded-full h-2">
                      <div
                        className="bg-fixly-accent rounded-full h-2 transition-all duration-500"
                        style={{
                          width: `${showChart === 'earnings' 
                            ? (data.earnings / 20000) * 100 
                            : (data.jobs / 15) * 100}%`
                        }}
                      />
                    </div>
                  </div>
                  <div className="w-20 text-right text-sm font-medium text-fixly-text">
                    {showChart === 'earnings' 
                      ? formatCurrency(data.earnings)
                      : `${data.jobs} jobs`
                    }
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Performance Metrics */}
          <div className="card">
            <h3 className="text-lg font-semibold text-fixly-text mb-4">
              Performance
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Star className="h-4 w-4 text-yellow-500 mr-2" />
                  <span className="text-fixly-text-muted">Rating</span>
                </div>
                <span className="font-medium text-fixly-text">
                  {user?.rating?.average?.toFixed(1) || '0.0'}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Clock className="h-4 w-4 text-blue-500 mr-2" />
                  <span className="text-fixly-text-muted">Response Time</span>
                </div>
                <span className="font-medium text-fixly-text">
                  {'< 2 hours'}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Award className="h-4 w-4 text-purple-500 mr-2" />
                  <span className="text-fixly-text-muted">Success Rate</span>
                </div>
                <span className="font-medium text-fixly-text">
                  {earnings.completedJobs > 0 ? '98%' : '0%'}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card">
            <h3 className="text-lg font-semibold text-fixly-text mb-4">
              Quick Actions
            </h3>
            <div className="space-y-3">
              <button
                onClick={() => router.push('/dashboard/browse-jobs')}
                className="btn-primary w-full justify-start"
              >
                <Search className="h-4 w-4 mr-2" />
                Find More Jobs
              </button>
              
              <button
                onClick={() => router.push('/dashboard/profile')}
                className="btn-secondary w-full justify-start"
              >
                <Eye className="h-4 w-4 mr-2" />
                Update Profile
              </button>
              
              {user?.plan?.type !== 'pro' && (
                <button
                  onClick={() => router.push('/dashboard/subscription')}
                  className="btn-ghost w-full justify-start border border-fixly-accent text-fixly-accent"
                >
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Upgrade to Pro
                </button>
              )}
            </div>
          </div>

          {/* Earnings Goal */}
          <div className="card">
            <h3 className="text-lg font-semibold text-fixly-text mb-4">
              Monthly Goal
            </h3>
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-fixly-text-muted">Progress</span>
                <span className="text-fixly-text">
                  {formatCurrency(earnings.thisMonth)} / {formatCurrency(20000)}
                </span>
              </div>
              <div className="progress-bar">
                <div 
                  className="progress-fill"
                  style={{ width: `${Math.min((earnings.thisMonth / 20000) * 100, 100)}%` }}
                />
              </div>
            </div>
            <p className="text-sm text-fixly-text-muted">
              {earnings.thisMonth >= 20000 
                ? '🎉 Goal achieved! Set a higher target.'
                : `₹${20000 - earnings.thisMonth} to go`
              }
            </p>
          </div>
        </div>
      </div>

      {/* Recent Jobs */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-fixly-text">
            Recent Completed Jobs
          </h2>
          <button
            onClick={() => router.push('/dashboard/applications')}
            className="text-fixly-accent hover:text-fixly-accent-dark"
          >
            View All Applications
          </button>
        </div>

        {recentJobs.length === 0 ? (
          <div className="card text-center py-12">
            <Briefcase className="h-12 w-12 text-fixly-text-muted mx-auto mb-4" />
            <h3 className="text-lg font-medium text-fixly-text mb-2">
              No completed jobs yet
            </h3>
            <p className="text-fixly-text-muted mb-4">
              Start applying to jobs and complete them to see earnings here
            </p>
            <button
              onClick={() => router.push('/dashboard/browse-jobs')}
              className="btn-primary"
            >
              Browse Jobs
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {recentJobs.map((job, index) => (
              <motion.div
                key={job._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="card card-hover"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-fixly-text mb-1">
                      {job.title}
                    </h4>
                    <p className="text-sm text-fixly-text-muted mb-2">
                      {job.createdBy?.name} • {job.location?.city}
                    </p>
                    <div className="flex items-center text-xs text-fixly-text-muted">
                      <Calendar className="h-3 w-3 mr-1" />
                      Completed {new Date(job.progress?.completedAt).toLocaleDateString()}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-lg font-bold text-green-600">
                      {formatCurrency(job.budget?.amount || 0)}
                    </div>
                    {job.completion?.rating && (
                      <div className="flex items-center mt-1">
                        <Star className="h-3 w-3 text-yellow-500 mr-1" />
                        <span className="text-xs text-fixly-text-muted">
                          {job.completion.rating}/5
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
      
      {/* Background Activity Indicators */}
      <BackgroundActivity activities={backgroundActivities} maxVisible={1} />
      
      {/* Silent Loader for Refresh */}
      <SilentLoader 
        isLoading={refreshing} 
        text="Refreshing earnings..." 
        position="bottom-right" 
        type="sync"
      />
    </div>
  );
}