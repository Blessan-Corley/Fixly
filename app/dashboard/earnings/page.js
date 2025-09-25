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

  useEffect(() => {
    fetchEarningsData();
  }, [timeFilter]);

  const fetchEarningsData = async () => {
    try {
      setLoading(true);
      
      // Fetch earnings stats
      const statsResponse = await fetch(`/api/dashboard/stats?role=fixer&period=${timeFilter}`);
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setEarnings({
          total: statsData.totalEarnings || 0,
          thisMonth: statsData.monthlyEarnings || 0,
          lastMonth: statsData.lastMonthEarnings || 0,
          thisWeek: statsData.weeklyEarnings || 0,
          pendingPayments: statsData.pendingPayments || 0,
          completedJobs: statsData.jobsCompleted || 0,
          averageJobValue: statsData.jobsCompleted > 0 ? Math.round(statsData.totalEarnings / statsData.jobsCompleted) : 0,
          topJobCategory: statsData.topJobCategory || 'General',
          growth: {
            monthly: calculateGrowth(statsData.monthlyEarnings, statsData.lastMonthEarnings),
            weekly: statsData.weeklyGrowth || 0
          }
        });
      }

      // Fetch recent completed jobs
      const jobsResponse = await fetch('/api/dashboard/recent-jobs?role=fixer&limit=10&status=completed');
      if (jobsResponse.ok) {
        const jobsData = await jobsResponse.json();
        setRecentJobs(jobsData.jobs || []);
      }

      // Mock earnings history for chart (replace with real API)
      setEarningsHistory(generateMockEarningsHistory());

    } catch (error) {
      console.error('Error fetching earnings data:', error);
      toast.error('Failed to fetch earnings data');
    } finally {
      setLoading(false);
    }
  };

  const calculateGrowth = (current, previous) => {
    if (!previous) return 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  const generateMockEarningsHistory = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    return months.map((month, index) => ({
      month,
      earnings: Math.floor(Math.random() * 15000) + 5000,
      jobs: Math.floor(Math.random() * 10) + 3
    }));
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
            <div className="p-3 bg-fixly-accent/20 rounded-lg">
              <Briefcase className="h-6 w-6 text-fixly-primary" />
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
                  <Award className="h-4 w-4 text-fixly-primary mr-2" />
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
    </div>
  );
}