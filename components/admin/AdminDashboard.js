'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Briefcase,
  TrendingUp,
  AlertTriangle,
  DollarSign,
  Activity,
  Clock,
  MapPin,
  Filter,
  Download,
  RefreshCw,
  Eye,
  UserCheck,
  XCircle,
  CheckCircle,
  Star,
  MessageSquare,
  Calendar,
  BarChart3,
  PieChart,
  LineChart
} from 'lucide-react';
import { useRealtime } from '../../hooks/useRealtime';
import { cache } from '../../lib/cache';
import { LoadingSpinner, LoadingSkeleton } from '../ui/LoadingStates';
import { OptimizedImage } from '../ui/OptimizedImage';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [dateRange, setDateRange] = useState('7d');
  const [loading, setLoading] = useState(true);
  const [realTimeData, setRealTimeData] = useState({});
  const [dashboardData, setDashboardData] = useState({
    overview: {},
    users: {},
    jobs: {},
    transactions: {},
    analytics: {}
  });

  const { connected } = useRealtime('admin');

  // Real-time data updates (simplified)
  useEffect(() => {
    if (connected) {
      // Poll for admin dashboard updates every 30 seconds
      const interval = setInterval(fetchDashboardData, 30000);
      return () => clearInterval(interval);
    }
  }, [connected]);

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/dashboard?range=${dateRange}`, {
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        const data = await response.json();
        setDashboardData(data);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [dateRange]);

  // Memoized calculations for performance
  const metrics = useMemo(() => {
    const base = dashboardData.overview;
    const realTime = realTimeData;

    return {
      totalUsers: (base.totalUsers || 0) + (realTime.newUsers || 0),
      activeUsers: (base.activeUsers || 0) + (realTime.onlineUsers || 0),
      totalJobs: (base.totalJobs || 0) + (realTime.newJobs || 0),
      completedJobs: base.completedJobs || 0,
      totalRevenue: base.totalRevenue || 0,
      pendingPayouts: base.pendingPayouts || 0,
      averageRating: base.averageRating || 0,
      responseTime: base.averageResponseTime || 0
    };
  }, [dashboardData.overview, realTimeData]);

  const MetricCard = ({ title, value, change, icon: Icon, color = 'blue', loading = false }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-fixly-card dark:bg-gray-800 rounded-xl p-6 border border-fixly-border dark:border-gray-700"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-fixly-text-muted dark:text-gray-400">{title}</p>
          {loading ? (
            <LoadingSkeleton className="h-8 w-24 mt-2" />
          ) : (
            <p className="text-2xl font-bold text-fixly-text dark:text-gray-100">{value}</p>
          )}
          {change && !loading && (
            <p className={`text-sm mt-1 ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {change >= 0 ? '+' : ''}{change}% from last period
            </p>
          )}
        </div>
        <div className={`p-3 rounded-lg bg-${color}-100 dark:bg-${color}-900/20`}>
          <Icon className={`h-6 w-6 text-${color}-600 dark:text-${color}-400`} />
        </div>
      </div>
    </motion.div>
  );

  const QuickStats = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <MetricCard
        title="Total Users"
        value={metrics.totalUsers.toLocaleString()}
        change={12.5}
        icon={Users}
        color="blue"
        loading={loading}
      />
      <MetricCard
        title="Active Jobs"
        value={metrics.totalJobs.toLocaleString()}
        change={8.2}
        icon={Briefcase}
        color="green"
        loading={loading}
      />
      <MetricCard
        title="Revenue"
        value={`₹${metrics.totalRevenue.toLocaleString()}`}
        change={15.3}
        icon={DollarSign}
        color="purple"
        loading={loading}
      />
      <MetricCard
        title="Avg Rating"
        value={metrics.averageRating.toFixed(1)}
        change={2.1}
        icon={Star}
        color="yellow"
        loading={loading}
      />
    </div>
  );

  const RealTimeActivity = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-fixly-card dark:bg-gray-800 rounded-xl p-6 border border-fixly-border dark:border-gray-700"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-fixly-text dark:text-gray-100">
          Real-time Activity
        </h3>
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm text-fixly-text-muted dark:text-gray-400">
            {connected ? 'Live' : 'Disconnected'}
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {realTimeData.latestActivity?.map((activity, index) => (
          <motion.div
            key={activity.id || index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center space-x-3 p-3 bg-fixly-bg dark:bg-gray-700 rounded-lg"
          >
            <div className="w-8 h-8 bg-fixly-accent rounded-full flex items-center justify-center">
              <Activity className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-fixly-text dark:text-gray-100">
                {activity.message}
              </p>
              <p className="text-xs text-fixly-text-muted dark:text-gray-400">
                {new Date(activity.timestamp).toLocaleTimeString()}
              </p>
            </div>
          </motion.div>
        )) || (
          <div className="text-center py-8">
            <Activity className="h-12 w-12 text-fixly-text-muted dark:text-gray-400 mx-auto mb-2" />
            <p className="text-fixly-text-muted dark:text-gray-400">No recent activity</p>
          </div>
        )}
      </div>
    </motion.div>
  );

  const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [userFilters, setUserFilters] = useState({
      status: 'all',
      verification: 'all',
      dateRange: '30d'
    });

    useEffect(() => {
      fetchUsers();
    }, [userFilters]);

    const fetchUsers = async () => {
      try {
        const params = new URLSearchParams(userFilters);
        const response = await fetch(`/api/admin/users?${params}`);
        if (response.ok) {
          const data = await response.json();
          setUsers(data.users || []);
        }
      } catch (error) {
        console.error('Failed to fetch users:', error);
      }
    };

    const handleUserAction = async (userId, action) => {
      try {
        const response = await fetch(`/api/admin/users/${userId}/${action}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (response.ok) {
          fetchUsers(); // Refresh the list
        }
      } catch (error) {
        console.error(`Failed to ${action} user:`, error);
      }
    };

    return (
      <div className="space-y-6">
        {/* User Filters */}
        <div className="bg-fixly-card dark:bg-gray-800 rounded-xl p-4 border border-fixly-border dark:border-gray-700">
          <div className="flex flex-wrap gap-4">
            <select
              value={userFilters.status}
              onChange={(e) => setUserFilters(prev => ({ ...prev, status: e.target.value }))}
              className="px-3 py-2 bg-fixly-bg dark:bg-gray-700 border border-fixly-border dark:border-gray-600 rounded-lg text-fixly-text dark:text-gray-100"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>
            
            <select
              value={userFilters.verification}
              onChange={(e) => setUserFilters(prev => ({ ...prev, verification: e.target.value }))}
              className="px-3 py-2 bg-fixly-bg dark:bg-gray-700 border border-fixly-border dark:border-gray-600 rounded-lg text-fixly-text dark:text-gray-100"
            >
              <option value="all">All Verification</option>
              <option value="verified">Verified</option>
              <option value="unverified">Unverified</option>
            </select>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-fixly-card dark:bg-gray-800 rounded-xl border border-fixly-border dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-fixly-bg dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-fixly-text-muted dark:text-gray-400 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-fixly-text-muted dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-fixly-text-muted dark:text-gray-400 uppercase tracking-wider">
                    Jobs
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-fixly-text-muted dark:text-gray-400 uppercase tracking-wider">
                    Rating
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-fixly-text-muted dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-fixly-border dark:divide-gray-700">
                {users.map((user) => (
                  <tr key={user._id} className="hover:bg-fixly-bg dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <OptimizedImage
                          src={user.profilePicture || '/default-avatar.png'}
                          alt={user.firstName}
                          width={40}
                          height={40}
                          className="rounded-full"
                        />
                        <div className="ml-4">
                          <div className="text-sm font-medium text-fixly-text dark:text-gray-100">
                            {user.firstName} {user.lastName}
                          </div>
                          <div className="text-sm text-fixly-text-muted dark:text-gray-400">
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        user.isVerified 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                      }`}>
                        {user.isVerified ? 'Verified' : 'Unverified'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-fixly-text dark:text-gray-100">
                      {user.jobsPosted || 0} / {user.jobsCompleted || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Star className="h-4 w-4 text-yellow-400 mr-1" />
                        <span className="text-sm text-fixly-text dark:text-gray-100">
                          {user.averageRating?.toFixed(1) || 'N/A'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleUserAction(user._id, 'verify')}
                          className="text-green-600 hover:text-green-900 dark:hover:text-green-400"
                          title="Verify User"
                        >
                          <UserCheck className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleUserAction(user._id, 'suspend')}
                          className="text-red-600 hover:text-red-900 dark:hover:text-red-400"
                          title="Suspend User"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => window.open(`/admin/users/${user._id}`, '_blank')}
                          className="text-blue-600 hover:text-blue-900 dark:hover:text-blue-400"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const JobManagement = () => {
    const [jobs, setJobs] = useState([]);
    const [jobFilters, setJobFilters] = useState({
      status: 'all',
      urgency: 'all',
      dateRange: '30d'
    });

    useEffect(() => {
      fetchJobs();
    }, [jobFilters]);

    const fetchJobs = async () => {
      try {
        const params = new URLSearchParams(jobFilters);
        const response = await fetch(`/api/admin/jobs?${params}`);
        if (response.ok) {
          const data = await response.json();
          setJobs(data.jobs || []);
        }
      } catch (error) {
        console.error('Failed to fetch jobs:', error);
      }
    };

    return (
      <div className="space-y-6">
        {/* Job Filters */}
        <div className="bg-fixly-card dark:bg-gray-800 rounded-xl p-4 border border-fixly-border dark:border-gray-700">
          <div className="flex flex-wrap gap-4">
            <select
              value={jobFilters.status}
              onChange={(e) => setJobFilters(prev => ({ ...prev, status: e.target.value }))}
              className="px-3 py-2 bg-fixly-bg dark:bg-gray-700 border border-fixly-border dark:border-gray-600 rounded-lg text-fixly-text dark:text-gray-100"
            >
              <option value="all">All Status</option>
              <option value="open">Open</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            
            <select
              value={jobFilters.urgency}
              onChange={(e) => setJobFilters(prev => ({ ...prev, urgency: e.target.value }))}
              className="px-3 py-2 bg-fixly-bg dark:bg-gray-700 border border-fixly-border dark:border-gray-600 rounded-lg text-fixly-text dark:text-gray-100"
            >
              <option value="all">All Urgency</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>

        {/* Jobs Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {jobs.map((job) => (
            <motion.div
              key={job._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-fixly-card dark:bg-gray-800 rounded-xl p-6 border border-fixly-border dark:border-gray-700"
            >
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-lg font-semibold text-fixly-text dark:text-gray-100 truncate">
                  {job.title}
                </h3>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  job.status === 'open' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                  job.status === 'in-progress' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' :
                  job.status === 'completed' ? 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400' :
                  'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                }`}>
                  {job.status}
                </span>
              </div>

              <p className="text-sm text-fixly-text-muted dark:text-gray-400 mb-4 line-clamp-2">
                {job.description}
              </p>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-fixly-text-muted dark:text-gray-400">Budget:</span>
                  <p className="font-medium text-fixly-text dark:text-gray-100">₹{job.budget.amount}</p>
                </div>
                <div>
                  <span className="text-fixly-text-muted dark:text-gray-400">Applications:</span>
                  <p className="font-medium text-fixly-text dark:text-gray-100">{job.applications?.length || 0}</p>
                </div>
                <div>
                  <span className="text-fixly-text-muted dark:text-gray-400">Posted:</span>
                  <p className="font-medium text-fixly-text dark:text-gray-100">
                    {new Date(job.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <span className="text-fixly-text-muted dark:text-gray-400">Urgency:</span>
                  <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                    job.urgency === 'urgent' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' :
                    job.urgency === 'high' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400' :
                    job.urgency === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                    'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                  }`}>
                    {job.urgency}
                  </span>
                </div>
              </div>

              <div className="flex justify-end mt-4 space-x-2">
                <button
                  onClick={() => window.open(`/admin/jobs/${job._id}`, '_blank')}
                  className="px-3 py-1 text-sm bg-fixly-accent text-white rounded-lg hover:bg-fixly-accent-dark transition-colors"
                >
                  View Details
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    );
  };

  const AnalyticsDashboard = () => (
    <div className="space-y-6">
      {/* Chart Components would go here */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-fixly-card dark:bg-gray-800 rounded-xl p-6 border border-fixly-border dark:border-gray-700">
          <h3 className="text-lg font-semibold text-fixly-text dark:text-gray-100 mb-4">
            User Growth
          </h3>
          <div className="h-64 flex items-center justify-center">
            <LineChart className="h-16 w-16 text-fixly-text-muted dark:text-gray-400" />
            <p className="ml-4 text-fixly-text-muted dark:text-gray-400">Chart Integration Placeholder</p>
          </div>
        </div>

        <div className="bg-fixly-card dark:bg-gray-800 rounded-xl p-6 border border-fixly-border dark:border-gray-700">
          <h3 className="text-lg font-semibold text-fixly-text dark:text-gray-100 mb-4">
            Revenue Distribution
          </h3>
          <div className="h-64 flex items-center justify-center">
            <PieChart className="h-16 w-16 text-fixly-text-muted dark:text-gray-400" />
            <p className="ml-4 text-fixly-text-muted dark:text-gray-400">Chart Integration Placeholder</p>
          </div>
        </div>
      </div>
    </div>
  );

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'jobs', label: 'Jobs', icon: Briefcase },
    { id: 'analytics', label: 'Analytics', icon: TrendingUp }
  ];

  return (
    <div className="min-h-screen bg-fixly-bg dark:bg-gray-900 p-4 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-fixly-text dark:text-gray-100">
              Admin Dashboard
            </h1>
            <p className="text-fixly-text-muted dark:text-gray-400 mt-1">
              Monitor and manage your platform
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-3 py-2 bg-fixly-card dark:bg-gray-800 border border-fixly-border dark:border-gray-700 rounded-lg text-fixly-text dark:text-gray-100"
            >
              <option value="1d">Last 24 hours</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </select>
            
            <button
              onClick={fetchDashboardData}
              className="p-2 bg-fixly-accent text-white rounded-lg hover:bg-fixly-accent-dark transition-colors"
              title="Refresh Data"
            >
              <RefreshCw className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 mb-8 bg-fixly-card dark:bg-gray-800 p-1 rounded-xl border border-fixly-border dark:border-gray-700">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                activeTab === tab.id
                  ? 'bg-fixly-accent text-white'
                  : 'text-fixly-text dark:text-gray-200 hover:bg-fixly-accent/10'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'overview' && (
              <div className="space-y-8">
                <QuickStats />
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2">
                    <AnalyticsDashboard />
                  </div>
                  <div>
                    <RealTimeActivity />
                  </div>
                </div>
              </div>
            )}
            
            {activeTab === 'users' && <UserManagement />}
            {activeTab === 'jobs' && <JobManagement />}
            {activeTab === 'analytics' && <AnalyticsDashboard />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}