// app/dashboard/admin/page.js
'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  Briefcase,
  TrendingUp,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Clock,
  Shield,
  Activity,
  Search,
  Filter,
  MoreVertical,
  Ban,
  UserCheck,
  Eye,
  Loader,
  MapPin,
  Target,
  Zap,
  Calendar,
  ChevronDown,
  X,
  FileText,
  AlertTriangle,
  RefreshCw,
  BarChart3,
  PieChart,
  LineChart,
  Globe,
  Lock,
  Unlock,
  MessageSquare,
  Star,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import Link from 'next/link';
import { useApp, RoleGuard } from '../../providers';
import { toast } from 'sonner';

export default function AdminPanelPage() {
  return (
    <RoleGuard roles={['admin']} fallback={
      <div className="p-6 lg:p-8">
        <div className="max-w-md mx-auto text-center">
          <div className="card">
            <Shield className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-fixly-text mb-2">
              Admin Access Required
            </h2>
            <p className="text-fixly-text-muted mb-4">
              You need admin privileges to access this panel.
            </p>
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="btn-primary w-full"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    }>
      <AdminPanelContent />
    </RoleGuard>
  );
}

function AdminPanelContent() {
  const { user } = useApp();
  
  // Dashboard data
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [backgroundRefresh, setBackgroundRefresh] = useState(false);
  
  // Users data with pagination
  const [users, setUsers] = useState([]);
  const [usersMeta, setUsersMeta] = useState({});
  const [recentJobs, setRecentJobs] = useState([]);
  const [jobsMeta, setJobsMeta] = useState({});
  const [activeTab, setActiveTab] = useState('overview');
  
  // Filters and search
  const [userFilters, setUserFilters] = useState({
    search: '',
    role: 'all',
    status: 'all',
    riskLevel: 'all',
    banned: 'all',
    sortBy: 'createdAt',
    sortOrder: 'desc',
    page: 1,
    limit: 20
  });
  const [jobFilters, setJobFilters] = useState({
    search: '',
    status: 'all',
    category: 'all',
    priority: 'all',
    sortBy: 'createdAt',
    sortOrder: 'desc',
    page: 1,
    limit: 20
  });
  
  // Ban modal
  const [banModal, setBanModal] = useState(null);
  const [banForm, setBanForm] = useState({
    type: 'temporary',
    duration: '7',
    durationType: 'days',
    category: 'spam',
    severity: 'medium',
    reason: '',
    allowAppeal: true,
    notifyUser: true
  });

  useEffect(() => {
    fetchDashboardData();
    fetchUsers();
    fetchJobs();
    
    // Set up auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchDashboardData(true); // Background refresh
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);
  
  useEffect(() => {
    fetchUsers();
  }, [userFilters]);
  
  useEffect(() => {
    fetchJobs();
  }, [jobFilters]);

  const fetchDashboardData = async (background = false) => {
    try {
      if (!background) setLoading(true);
      else setBackgroundRefresh(true);
      
      // Fetch comprehensive admin dashboard
      const response = await fetch('/api/admin/dashboard');
      if (response.ok) {
        const data = await response.json();
        setDashboardData(data);
      } else {
        throw new Error('Failed to fetch dashboard data');
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      if (!background) {
        toast.error('Failed to fetch dashboard data');
      }
    } finally {
      setLoading(false);
      setBackgroundRefresh(false);
    }
  };
  
  const fetchUsers = async () => {
    try {
      const params = new URLSearchParams();
      Object.entries(userFilters).forEach(([key, value]) => {
        if (value && value !== 'all') {
          params.append(key, value);
        }
      });
      
      const response = await fetch(`/api/admin/users?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
        setUsersMeta(data.meta || {});
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to fetch users');
    }
  };
  
  const fetchJobs = async () => {
    try {
      const params = new URLSearchParams();
      Object.entries(jobFilters).forEach(([key, value]) => {
        if (value && value !== 'all') {
          params.append(key, value);
        }
      });
      
      const response = await fetch(`/api/admin/jobs?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setRecentJobs(data.jobs || []);
        setJobsMeta(data.meta || {});
      }
    } catch (error) {
      console.error('Error fetching jobs:', error);
      toast.error('Failed to fetch jobs');
    }
  };

  const handleUserAction = async (userId, action, data = {}) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(`User ${action} successfully`);
        fetchDashboardData(true);
        fetchUsers();
      } else {
        const error = await response.json();
        toast.error(error.message || `Failed to ${action} user`);
      }
    } catch (error) {
      console.error(`Error ${action} user:`, error);
      toast.error(`Failed to ${action} user`);
    }
  };
  
  const handleBanUser = (user) => {
    setBanModal(user);
    setBanForm({
      type: 'temporary',
      duration: '7',
      durationType: 'days',
      category: 'spam',
      severity: 'medium',
      reason: '',
      allowAppeal: true,
      notifyUser: true
    });
  };
  
  const submitBan = async () => {
    if (!banModal || !banForm.reason.trim()) {
      toast.error('Please provide a ban reason');
      return;
    }
    
    const banData = {
      ...banForm,
      duration: banForm.type === 'permanent' ? null : parseInt(banForm.duration)
    };
    
    await handleUserAction(banModal._id, 'ban', banData);
    setBanModal(null);
  };
  
  const updateUserFilters = (key, value) => {
    setUserFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };
  
  const updateJobFilters = (key, value) => {
    setJobFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  const getStatusBadge = (status) => {
    const styles = {
      active: 'bg-green-100 text-green-800',
      banned: 'bg-red-100 text-red-800',
      suspended: 'bg-orange-100 text-orange-800',
      restricted: 'bg-yellow-100 text-yellow-800',
      under_review: 'bg-blue-100 text-blue-800',
      pending: 'bg-gray-100 text-gray-800'
    };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.active}`}>
        {status.replace('_', ' ').charAt(0).toUpperCase() + status.replace('_', ' ').slice(1)}
      </span>
    );
  };

  const getRoleBadge = (role) => {
    const styles = {
      hirer: 'bg-blue-100 text-blue-800',
      fixer: 'bg-purple-100 text-purple-800',
      admin: 'bg-gray-100 text-gray-800'
    };
    
    const icons = {
      hirer: <Briefcase className="h-3 w-3" />,
      fixer: <Users className="h-3 w-3" />,
      admin: <Shield className="h-3 w-3" />
    };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${styles[role]}`}>
        {icons[role]}
        {role.charAt(0).toUpperCase() + role.slice(1)}
      </span>
    );
  };

  if (loading && !dashboardData) {
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
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-fixly-text mb-2">
              Admin Dashboard
              {backgroundRefresh && (
                <RefreshCw className="inline-block ml-2 h-4 w-4 text-fixly-accent animate-spin" />
              )}
            </h1>
            <p className="text-fixly-text-light">
              Real-time platform monitoring and management
            </p>
            {dashboardData?.lastUpdated && (
              <div className="flex items-center gap-2 mt-1">
                <p className="text-xs text-fixly-text-muted">
                  Last updated: {new Date(dashboardData.lastUpdated).toLocaleTimeString()}
                </p>
                {backgroundRefresh && (
                  <div className="flex items-center gap-1 text-xs text-fixly-accent">
                    <div className="w-2 h-2 bg-fixly-accent rounded-full animate-pulse"></div>
                    Refreshing...
                  </div>
                )}
                <div className="text-xs text-fixly-text-muted">
                  Auto-refresh: {refreshInterval / 1000}s
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchDashboardData()}
              className="bg-fixly-accent/10 text-fixly-accent px-3 py-2 rounded-lg hover:bg-fixly-accent/20 transition-all flex items-center gap-2"
              disabled={loading || backgroundRefresh}
            >
              <RefreshCw className={`h-4 w-4 ${(loading || backgroundRefresh) ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <Link href="/dashboard/admin/locations">
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all cursor-pointer flex items-center gap-2">
                <Shield className="h-4 w-4" />
                <MapPin className="h-4 w-4" />
                <span className="font-medium">Location Management</span>
                <div className="bg-white/20 px-2 py-1 rounded text-xs font-semibold">
                  1m Precision
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      {dashboardData?.overviewMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card"
          >
            <div className="flex items-center">
              <div className="p-3 bg-fixly-accent/10 rounded-lg">
                <Users className="h-6 w-6 text-fixly-accent" />
              </div>
              <div className="ml-4">
                <div className="text-2xl font-bold text-fixly-text">
                  {dashboardData.overviewMetrics.totalUsers?.toLocaleString() || 0}
                </div>
                <div className="text-sm text-fixly-text-muted">Total Users</div>
                <div className={`text-xs flex items-center gap-1 ${
                  dashboardData.overviewMetrics.userGrowthRate >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {dashboardData.overviewMetrics.userGrowthRate >= 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                  {Math.abs(dashboardData.overviewMetrics.userGrowthRate || 0).toFixed(1)}%
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="card"
          >
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-lg">
                <Briefcase className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <div className="text-2xl font-bold text-fixly-text">
                  {dashboardData.overviewMetrics.totalJobs?.toLocaleString() || 0}
                </div>
                <div className="text-sm text-fixly-text-muted">Total Jobs</div>
                <div className="text-xs text-green-600">
                  {dashboardData.overviewMetrics.completionRate || 0}% completion
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="card"
          >
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Activity className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <div className="text-2xl font-bold text-fixly-text">
                  {dashboardData.overviewMetrics.activeUsers?.toLocaleString() || 0}
                </div>
                <div className="text-sm text-fixly-text-muted">Active Users</div>
                <div className="text-xs text-blue-600">Last 30 days</div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="card"
          >
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <div className="text-2xl font-bold text-fixly-text">
                  ₹{(dashboardData.overviewMetrics.totalRevenue || 0).toLocaleString()}
                </div>
                <div className="text-sm text-fixly-text-muted">Total Revenue</div>
                <div className="text-xs text-purple-600">
                  ₹{(dashboardData.overviewMetrics.monthlyRevenue || 0).toLocaleString()} this month
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="card"
          >
            <div className="flex items-center">
              <div className="p-3 bg-orange-100 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <div className="text-2xl font-bold text-fixly-text">
                  {dashboardData.overviewMetrics.flaggedContent || 0}
                </div>
                <div className="text-sm text-fixly-text-muted">Flagged Items</div>
                <div className="text-xs text-orange-600">Need attention</div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="card"
          >
            <div className="flex items-center">
              <div className="p-3 bg-red-100 rounded-lg">
                <Shield className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <div className="text-2xl font-bold text-fixly-text">
                  {dashboardData.overviewMetrics.bannedUsers || 0}
                </div>
                <div className="text-sm text-fixly-text-muted">Banned Users</div>
                <div className="text-xs text-red-600">
                  {dashboardData.overviewMetrics.suspendedUsers || 0} suspended
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Tabs */}
      <div className="card p-0 mb-8">
        <div className="border-b border-fixly-border">
          <nav className="flex overflow-x-auto">
            {[
              { id: 'overview', label: 'Overview', icon: Activity },
              { id: 'users', label: 'Users', icon: Users, count: usersMeta.total },
              { id: 'jobs', label: 'Jobs', icon: Briefcase, count: jobsMeta.total },
              { id: 'analytics', label: 'Analytics', icon: BarChart3 },
              { id: 'security', label: 'Security', icon: Shield },
              { id: 'reports', label: 'Reports', icon: TrendingUp }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-6 py-4 text-sm font-medium border-b-2 whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-fixly-accent text-fixly-accent'
                    : 'border-transparent text-fixly-text-muted hover:text-fixly-text'
                }`}
              >
                <tab.icon className="h-4 w-4 mr-2" />
                {tab.label}
                {tab.count !== undefined && (
                  <span className="ml-2 bg-fixly-accent/10 text-fixly-accent text-xs px-2 py-1 rounded-full">
                    {tab.count.toLocaleString()}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && dashboardData && (
            <div className="space-y-6">
              {/* Growth Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="card">
                  <h4 className="font-medium text-fixly-text mb-3 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    User Growth
                  </h4>
                  <div className="text-2xl font-bold text-fixly-text mb-1">
                    +{dashboardData.userAnalytics?.newUsersToday || 0}
                  </div>
                  <div className="text-sm text-fixly-text-muted">New users today</div>
                  <div className="text-xs text-green-600 mt-1">
                    {dashboardData.userAnalytics?.growthRate || 0}% growth rate
                  </div>
                </div>

                <div className="card">
                  <h4 className="font-medium text-fixly-text mb-3 flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-blue-600" />
                    Job Activity
                  </h4>
                  <div className="text-2xl font-bold text-fixly-text mb-1">
                    {dashboardData.jobAnalytics?.jobsPostedToday || 0}
                  </div>
                  <div className="text-sm text-fixly-text-muted">Jobs posted today</div>
                  <div className="text-xs text-blue-600 mt-1">
                    Avg: ₹{(dashboardData.jobAnalytics?.avgBudget || 0).toLocaleString()}
                  </div>
                </div>

                <div className="card">
                  <h4 className="font-medium text-fixly-text mb-3 flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-purple-600" />
                    Revenue
                  </h4>
                  <div className="text-2xl font-bold text-fixly-text mb-1">
                    ₹{(dashboardData.financialMetrics?.todayRevenue || 0).toLocaleString()}
                  </div>
                  <div className="text-sm text-fixly-text-muted">Today's revenue</div>
                  <div className="text-xs text-purple-600 mt-1">
                    +{dashboardData.financialMetrics?.revenueGrowth || 0}%
                  </div>
                </div>

                <div className="card">
                  <h4 className="font-medium text-fixly-text mb-3 flex items-center gap-2">
                    <Shield className="h-4 w-4 text-red-600" />
                    Security
                  </h4>
                  <div className="text-2xl font-bold text-fixly-text mb-1">
                    {dashboardData.securityMetrics?.suspiciousActivity || 0}
                  </div>
                  <div className="text-sm text-fixly-text-muted">Flagged activities</div>
                  <div className="text-xs text-red-600 mt-1">
                    {dashboardData.securityMetrics?.accountsUnderReview || 0} under review
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Platform Health */}
                <div>
                  <h3 className="font-semibold text-fixly-text mb-4 flex items-center gap-2">
                    <Activity className="h-5 w-5 text-fixly-accent" />
                    Platform Health
                  </h3>
                  <div className="space-y-3">
                    <div className="p-3 bg-fixly-bg rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-fixly-text">User Satisfaction</span>
                        <span className="text-sm font-medium text-fixly-text">
                          {dashboardData.healthMetrics?.userSatisfaction || 0}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full" 
                          style={{ width: `${dashboardData.healthMetrics?.userSatisfaction || 0}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="p-3 bg-fixly-bg rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-fixly-text">System Performance</span>
                        <span className="text-sm font-medium text-fixly-text">
                          {dashboardData.healthMetrics?.systemPerformance || 0}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${dashboardData.healthMetrics?.systemPerformance || 0}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="p-3 bg-fixly-bg rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-fixly-text">Job Success Rate</span>
                        <span className="text-sm font-medium text-fixly-text">
                          {dashboardData.healthMetrics?.jobSuccessRate || 0}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                        <div 
                          className="bg-purple-600 h-2 rounded-full" 
                          style={{ width: `${dashboardData.healthMetrics?.jobSuccessRate || 0}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Flagged Content */}
                <div>
                  <h3 className="font-semibold text-fixly-text mb-4 flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-orange-600" />
                    Flagged Content
                  </h3>
                  <div className="space-y-3">
                    {dashboardData.flaggedContent?.users?.slice(0, 3).map((user, index) => (
                      <div key={user._id} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-fixly-text">{user.name}</div>
                            <div className="text-sm text-red-600">{user.flagReason}</div>
                          </div>
                          <button
                            onClick={() => handleBanUser(user)}
                            className="bg-red-600 text-white px-3 py-1 rounded text-xs hover:bg-red-700"
                          >
                            Review
                          </button>
                        </div>
                      </div>
                    )) || [
                      <div key="no-flags" className="text-center py-8">
                        <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-3" />
                        <p className="text-fixly-text-muted">No flagged content</p>
                      </div>
                    ]}
                    {dashboardData.flaggedContent?.jobs?.slice(0, 2).map((job, index) => (
                      <div key={job._id} className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-fixly-text">{job.title}</div>
                            <div className="text-sm text-yellow-600">{job.flagReason}</div>
                          </div>
                          <button className="bg-yellow-600 text-white px-3 py-1 rounded text-xs hover:bg-yellow-700">
                            Review
                          </button>
                        </div>
                      </div>
                    )) || []}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            <div className="space-y-6">
              {/* Advanced Filters */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-fixly-text-muted" />
                  <input
                    type="text"
                    value={userFilters.search}
                    onChange={(e) => updateUserFilters('search', e.target.value)}
                    placeholder="Search users..."
                    className="input-field pl-10"
                  />
                </div>
                <select
                  value={userFilters.role}
                  onChange={(e) => updateUserFilters('role', e.target.value)}
                  className="select-field"
                >
                  <option value="all">All Roles</option>
                  <option value="hirer">Hirers</option>
                  <option value="fixer">Fixers</option>
                  <option value="admin">Admins</option>
                </select>
                <select
                  value={userFilters.status}
                  onChange={(e) => updateUserFilters('status', e.target.value)}
                  className="select-field"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="restricted">Restricted</option>
                  <option value="under_review">Under Review</option>
                </select>
                <select
                  value={userFilters.riskLevel}
                  onChange={(e) => updateUserFilters('riskLevel', e.target.value)}
                  className="select-field"
                >
                  <option value="all">All Risk Levels</option>
                  <option value="low">Low Risk</option>
                  <option value="medium">Medium Risk</option>
                  <option value="high">High Risk</option>
                  <option value="critical">Critical Risk</option>
                </select>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-sm text-fixly-text-muted">
                    {usersMeta.total?.toLocaleString() || 0} users found
                  </span>
                  {userFilters.search && (
                    <button
                      onClick={() => updateUserFilters('search', '')}
                      className="text-sm text-fixly-accent hover:text-fixly-accent-dark flex items-center gap-1"
                    >
                      <X className="h-3 w-3" /> Clear search
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={userFilters.sortBy}
                    onChange={(e) => updateUserFilters('sortBy', e.target.value)}
                    className="select-field text-sm"
                  >
                    <option value="createdAt">Sort by Date</option>
                    <option value="name">Sort by Name</option>
                    <option value="riskScore">Sort by Risk</option>
                    <option value="lastActive">Sort by Activity</option>
                  </select>
                  <button
                    onClick={() => updateUserFilters('sortOrder', userFilters.sortOrder === 'asc' ? 'desc' : 'asc')}
                    className="p-2 hover:bg-fixly-accent/10 rounded"
                    title={`Sort ${userFilters.sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
                  >
                    {userFilters.sortOrder === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Enhanced Users Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-fixly-border">
                      <th className="text-left py-3 px-4 font-medium text-fixly-text">User</th>
                      <th className="text-left py-3 px-4 font-medium text-fixly-text">Role & Status</th>
                      <th className="text-left py-3 px-4 font-medium text-fixly-text">Risk Level</th>
                      <th className="text-left py-3 px-4 font-medium text-fixly-text">Activity</th>
                      <th className="text-left py-3 px-4 font-medium text-fixly-text">Joined</th>
                      <th className="text-left py-3 px-4 font-medium text-fixly-text">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user._id} className="border-b border-fixly-border hover:bg-fixly-bg">
                        <td className="py-3 px-4">
                          <div className="flex items-center">
                            <div className="relative">
                              <img
                                src={user.profilePhoto || '/default-avatar.png'}
                                alt={user.name}
                                className="h-10 w-10 rounded-full object-cover"
                              />
                              {user.adminMetadata?.riskLevel === 'critical' && (
                                <div className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full flex items-center justify-center">
                                  <AlertTriangle className="h-2 w-2 text-white" />
                                </div>
                              )}
                            </div>
                            <div className="ml-3">
                              <div className="font-medium text-fixly-text flex items-center gap-2">
                                {user.name}
                                {user.verified && <CheckCircle className="h-4 w-4 text-green-600" />}
                              </div>
                              <div className="text-sm text-fixly-text-muted">{user.email}</div>
                              {user.bannedReason && (
                                <div className="text-xs text-red-600 mt-1 flex items-center gap-1">
                                  <Ban className="h-3 w-3" />
                                  {user.bannedReason}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="space-y-1">
                            {getRoleBadge(user.role)}
                            {getStatusBadge(
                              user.banned ? 'banned' : 
                              user.adminMetadata?.accountStatus || 'active'
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${
                              user.adminMetadata?.riskLevel === 'critical' ? 'bg-red-500' :
                              user.adminMetadata?.riskLevel === 'high' ? 'bg-orange-500' :
                              user.adminMetadata?.riskLevel === 'medium' ? 'bg-yellow-500' :
                              'bg-green-500'
                            }`}></div>
                            <span className="text-sm capitalize">
                              {user.adminMetadata?.riskLevel || 'low'}
                            </span>
                            {user.adminMetadata?.riskScore && (
                              <span className="text-xs text-fixly-text-muted">
                                ({user.adminMetadata.riskScore}/100)
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm">
                            {user.lastActive ? (
                              <div>
                                <div className="text-fixly-text">
                                  {new Date(user.lastActive).toLocaleDateString()}
                                </div>
                                <div className="text-xs text-fixly-text-muted">
                                  {Math.floor((Date.now() - new Date(user.lastActive)) / (1000 * 60 * 60 * 24))} days ago
                                </div>
                              </div>
                            ) : (
                              <span className="text-fixly-text-muted">Never</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-fixly-text-muted">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleUserAction(user._id, 'view')}
                              className="p-1 hover:bg-fixly-accent/10 rounded"
                              title="View Details"
                            >
                              <Eye className="h-4 w-4 text-fixly-text-muted" />
                            </button>
                            {!user.banned ? (
                              <button
                                onClick={() => handleBanUser(user)}
                                className="p-1 hover:bg-red-50 rounded"
                                title="Ban User"
                              >
                                <Ban className="h-4 w-4 text-red-600" />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleUserAction(user._id, 'unban')}
                                className="p-1 hover:bg-green-50 rounded"
                                title="Unban User"
                              >
                                <UserCheck className="h-4 w-4 text-green-600" />
                              </button>
                            )}
                            <button
                              onClick={() => handleUserAction(user._id, user.adminMetadata?.accountStatus === 'suspended' ? 'unsuspend' : 'suspend')}
                              className="p-1 hover:bg-yellow-50 rounded"
                              title={user.adminMetadata?.accountStatus === 'suspended' ? 'Unsuspend User' : 'Suspend User'}
                            >
                              {user.adminMetadata?.accountStatus === 'suspended' ? 
                                <Unlock className="h-4 w-4 text-green-600" /> :
                                <Lock className="h-4 w-4 text-yellow-600" />
                              }
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination */}
              {usersMeta.totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <div className="text-sm text-fixly-text-muted">
                    Page {usersMeta.currentPage} of {usersMeta.totalPages}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateUserFilters('page', userFilters.page - 1)}
                      disabled={userFilters.page <= 1}
                      className="px-3 py-1 bg-fixly-accent text-white rounded disabled:bg-gray-300"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => updateUserFilters('page', userFilters.page + 1)}
                      disabled={userFilters.page >= usersMeta.totalPages}
                      className="px-3 py-1 bg-fixly-accent text-white rounded disabled:bg-gray-300"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Jobs Tab */}
          {activeTab === 'jobs' && (
            <div className="space-y-6">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-fixly-border">
                      <th className="text-left py-3 px-4 font-medium text-fixly-text">Job</th>
                      <th className="text-left py-3 px-4 font-medium text-fixly-text">Posted By</th>
                      <th className="text-left py-3 px-4 font-medium text-fixly-text">Budget</th>
                      <th className="text-left py-3 px-4 font-medium text-fixly-text">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-fixly-text">Applications</th>
                      <th className="text-left py-3 px-4 font-medium text-fixly-text">Posted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentJobs.map((job) => (
                      <tr key={job._id} className="border-b border-fixly-border hover:bg-fixly-bg">
                        <td className="py-3 px-4">
                          <div>
                            <div className="font-medium text-fixly-text">{job.title}</div>
                            <div className="text-sm text-fixly-text-muted">
                              {job.location?.city}, {job.location?.state}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm text-fixly-text">{job.createdBy?.name}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm text-fixly-text">
                            {job.budget?.type === 'negotiable' 
                              ? 'Negotiable' 
                              : `₹${job.budget?.amount?.toLocaleString()}`
                            }
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            job.status === 'open' ? 'bg-green-100 text-green-800' :
                            job.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                            job.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {job.status.replace('_', ' ').toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-fixly-text">
                          {job.applicationCount || 0}
                        </td>
                        <td className="py-3 px-4 text-sm text-fixly-text-muted">
                          {new Date(job.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Reports Tab */}
          {activeTab === 'reports' && dashboardData && (
            <div className="space-y-6">
              {/* Report Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="card">
                  <h4 className="font-medium text-fixly-text mb-3 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    Platform Growth
                  </h4>
                  <div className="text-2xl font-bold text-fixly-text mb-1">
                    +{dashboardData.userAnalytics?.growthRate || 0}%
                  </div>
                  <div className="text-sm text-fixly-text-muted">Monthly growth rate</div>
                </div>

                <div className="card">
                  <h4 className="font-medium text-fixly-text mb-3 flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    Success Rate
                  </h4>
                  <div className="text-2xl font-bold text-fixly-text mb-1">
                    {dashboardData.jobAnalytics?.completionRate || 0}%
                  </div>
                  <div className="text-sm text-fixly-text-muted">Job completion rate</div>
                </div>

                <div className="card">
                  <h4 className="font-medium text-fixly-text mb-3 flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-purple-600" />
                    Avg Transaction
                  </h4>
                  <div className="text-2xl font-bold text-fixly-text mb-1">
                    ₹{(dashboardData.jobAnalytics?.avgBudget || 0).toLocaleString()}
                  </div>
                  <div className="text-sm text-fixly-text-muted">Average job value</div>
                </div>

                <div className="card">
                  <h4 className="font-medium text-fixly-text mb-3 flex items-center gap-2">
                    <Activity className="h-5 w-5 text-blue-600" />
                    User Engagement
                  </h4>
                  <div className="text-2xl font-bold text-fixly-text mb-1">
                    {dashboardData.userAnalytics?.retentionRate || 0}%
                  </div>
                  <div className="text-sm text-fixly-text-muted">User retention rate</div>
                </div>
              </div>
              
              {/* Detailed Reports */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="card">
                  <h4 className="font-medium text-fixly-text mb-4 flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-fixly-accent" />
                    Performance Summary
                  </h4>
                  <div className="space-y-4">
                    <div className="p-3 bg-green-50 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-green-800">Revenue Growth</span>
                        <span className="text-sm font-bold text-green-800">
                          +{dashboardData.financialMetrics?.revenueGrowth || 0}%
                        </span>
                      </div>
                      <div className="w-full bg-green-200 rounded-full h-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full" 
                          style={{ width: `${Math.max(0, dashboardData.financialMetrics?.revenueGrowth || 0)}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-blue-800">User Satisfaction</span>
                        <span className="text-sm font-bold text-blue-800">
                          {dashboardData.healthMetrics?.userSatisfaction || 0}%
                        </span>
                      </div>
                      <div className="w-full bg-blue-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${dashboardData.healthMetrics?.userSatisfaction || 0}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    <div className="p-3 bg-purple-50 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-purple-800">Platform Health</span>
                        <span className="text-sm font-bold text-purple-800">
                          {dashboardData.healthMetrics?.systemPerformance || 0}%
                        </span>
                      </div>
                      <div className="w-full bg-purple-200 rounded-full h-2">
                        <div 
                          className="bg-purple-600 h-2 rounded-full" 
                          style={{ width: `${dashboardData.healthMetrics?.systemPerformance || 0}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="card">
                  <h4 className="font-medium text-fixly-text mb-4 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-fixly-accent" />
                    Quick Actions
                  </h4>
                  <div className="space-y-3">
                    <button 
                      onClick={() => fetchDashboardData()}
                      className="w-full p-3 bg-fixly-accent/10 text-fixly-accent rounded-lg hover:bg-fixly-accent/20 transition-colors flex items-center gap-2"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Refresh All Data
                    </button>
                    <button className="w-full p-3 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Export User Report
                    </button>
                    <button className="w-full p-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      Generate Analytics
                    </button>
                    <button className="w-full p-3 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Security Audit
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Ban User Modal */}
      {banModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-fixly-text">Ban User</h3>
              <button
                onClick={() => setBanModal(null)}
                className="text-fixly-text-muted hover:text-fixly-text"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="mb-4">
              <div className="flex items-center mb-2">
                <img
                  src={banModal.profilePhoto || '/default-avatar.png'}
                  alt={banModal.name}
                  className="h-8 w-8 rounded-full object-cover mr-3"
                />
                <div>
                  <div className="font-medium text-fixly-text">{banModal.name}</div>
                  <div className="text-sm text-fixly-text-muted">{banModal.email}</div>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-fixly-text mb-2">Ban Type</label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="banType"
                      value="temporary"
                      checked={banForm.type === 'temporary'}
                      onChange={(e) => setBanForm({...banForm, type: e.target.value})}
                      className="mr-2"
                    />
                    Temporary
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="banType"
                      value="permanent"
                      checked={banForm.type === 'permanent'}
                      onChange={(e) => setBanForm({...banForm, type: e.target.value})}
                      className="mr-2"
                    />
                    Permanent
                  </label>
                </div>
              </div>
              
              {banForm.type === 'temporary' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-fixly-text mb-2">Duration</label>
                    <input
                      type="number"
                      value={banForm.duration}
                      onChange={(e) => setBanForm({...banForm, duration: e.target.value})}
                      className="input-field"
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-fixly-text mb-2">Unit</label>
                    <select
                      value={banForm.durationType}
                      onChange={(e) => setBanForm({...banForm, durationType: e.target.value})}
                      className="select-field"
                    >
                      <option value="hours">Hours</option>
                      <option value="days">Days</option>
                      <option value="weeks">Weeks</option>
                      <option value="months">Months</option>
                    </select>
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-fixly-text mb-2">Category</label>
                  <select
                    value={banForm.category}
                    onChange={(e) => setBanForm({...banForm, category: e.target.value})}
                    className="select-field"
                  >
                    <option value="spam">Spam</option>
                    <option value="abuse">Abuse</option>
                    <option value="fraud">Fraud</option>
                    <option value="harassment">Harassment</option>
                    <option value="fake_profile">Fake Profile</option>
                    <option value="inappropriate_content">Inappropriate Content</option>
                    <option value="payment_issues">Payment Issues</option>
                    <option value="terms_violation">Terms Violation</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-fixly-text mb-2">Severity</label>
                  <select
                    value={banForm.severity}
                    onChange={(e) => setBanForm({...banForm, severity: e.target.value})}
                    className="select-field"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-fixly-text mb-2">Ban Reason *</label>
                <textarea
                  value={banForm.reason}
                  onChange={(e) => setBanForm({...banForm, reason: e.target.value})}
                  className="input-field resize-none"
                  rows={3}
                  placeholder="Provide a detailed reason for the ban that will be shown to the user..."
                  required
                />
              </div>
              
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={banForm.allowAppeal}
                    onChange={(e) => setBanForm({...banForm, allowAppeal: e.target.checked})}
                    className="mr-2"
                  />
                  Allow user to appeal this ban
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={banForm.notifyUser}
                    onChange={(e) => setBanForm({...banForm, notifyUser: e.target.checked})}
                    className="mr-2"
                  />
                  Send notification to user
                </label>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setBanModal(null)}
                className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-fixly-text hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={submitBan}
                className="flex-1 py-2 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700"
                disabled={!banForm.reason.trim()}
              >
                Ban User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}