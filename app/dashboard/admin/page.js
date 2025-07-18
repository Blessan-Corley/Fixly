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
  Loader
} from 'lucide-react';
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
  
  // Stats data
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Users data
  const [users, setUsers] = useState([]);
  const [recentJobs, setRecentJobs] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Filters
  const [userFilter, setUserFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch admin stats
      const statsResponse = await fetch('/api/dashboard/stats?role=admin');
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      }

      // Fetch recent users
      const usersResponse = await fetch('/api/admin/users?limit=10');
      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        setUsers(usersData.users || []);
      }

      // Fetch recent jobs
      const jobsResponse = await fetch('/api/admin/jobs?limit=10');
      if (jobsResponse.ok) {
        const jobsData = await jobsResponse.json();
        setRecentJobs(jobsData.jobs || []);
      }

    } catch (error) {
      console.error('Error fetching admin data:', error);
      toast.error('Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleUserAction = async (userId, action) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/${action}`, {
        method: 'POST'
      });

      if (response.ok) {
        toast.success(`User ${action} successfully`);
        fetchDashboardData(); // Refresh data
      } else {
        toast.error(`Failed to ${action} user`);
      }
    } catch (error) {
      console.error(`Error ${action} user:`, error);
      toast.error(`Failed to ${action} user`);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      active: 'bg-green-100 text-green-800',
      banned: 'bg-red-100 text-red-800',
      pending: 'bg-yellow-100 text-yellow-800'
    };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.active}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getRoleBadge = (role) => {
    const styles = {
      hirer: 'bg-blue-100 text-blue-800',
      fixer: 'bg-purple-100 text-purple-800',
      admin: 'bg-gray-100 text-gray-800'
    };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[role]}`}>
        {role.charAt(0).toUpperCase() + role.slice(1)}
      </span>
    );
  };

  if (loading && !stats) {
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
        <h1 className="text-2xl font-bold text-fixly-text mb-2">
          Admin Dashboard
        </h1>
        <p className="text-fixly-text-light">
          Monitor and manage the Fixly platform
        </p>
      </div>

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
                  {stats.users?.total || 0}
                </div>
                <div className="text-sm text-fixly-text-muted">Total Users</div>
                <div className="text-xs text-green-600">
                  +{stats.users?.newThisMonth || 0} this month
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
                  {stats.jobs?.total || 0}
                </div>
                <div className="text-sm text-fixly-text-muted">Total Jobs</div>
                <div className="text-xs text-green-600">
                  {stats.jobs?.completionRate || 0}% completion rate
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
                  {stats.users?.active || 0}
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
                  ₹{(stats.revenue?.total || 0).toLocaleString()}
                </div>
                <div className="text-sm text-fixly-text-muted">Platform Revenue</div>
                <div className="text-xs text-purple-600">
                  ₹{(stats.revenue?.monthly || 0).toLocaleString()} this month
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Tabs */}
      <div className="card p-0 mb-8">
        <div className="border-b border-fixly-border">
          <nav className="flex">
            {[
              { id: 'overview', label: 'Overview', icon: Activity },
              { id: 'users', label: 'Users', icon: Users },
              { id: 'jobs', label: 'Jobs', icon: Briefcase },
              { id: 'reports', label: 'Reports', icon: TrendingUp }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-6 py-4 text-sm font-medium border-b-2 ${
                  activeTab === tab.id
                    ? 'border-fixly-accent text-fixly-accent'
                    : 'border-transparent text-fixly-text-muted hover:text-fixly-text'
                }`}
              >
                <tab.icon className="h-4 w-4 mr-2" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Users */}
                <div>
                  <h3 className="font-semibold text-fixly-text mb-4">Recent Users</h3>
                  <div className="space-y-3">
                    {users.slice(0, 5).map((user, index) => (
                      <div key={user._id} className="flex items-center justify-between p-3 bg-fixly-bg rounded-lg">
                        <div className="flex items-center">
                          <img
                            src={user.photoURL || '/default-avatar.png'}
                            alt={user.name}
                            className="h-8 w-8 rounded-full object-cover mr-3"
                          />
                          <div>
                            <div className="font-medium text-fixly-text">{user.name}</div>
                            <div className="text-sm text-fixly-text-muted">{user.email}</div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {getRoleBadge(user.role)}
                          {getStatusBadge(user.banned ? 'banned' : 'active')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent Jobs */}
                <div>
                  <h3 className="font-semibold text-fixly-text mb-4">Recent Jobs</h3>
                  <div className="space-y-3">
                    {recentJobs.slice(0, 5).map((job, index) => (
                      <div key={job._id} className="p-3 bg-fixly-bg rounded-lg">
                        <div className="font-medium text-fixly-text mb-1">{job.title}</div>
                        <div className="text-sm text-fixly-text-muted mb-2">
                          {job.location?.city} • ₹{job.budget?.amount?.toLocaleString() || 'Negotiable'}
                        </div>
                        <div className="flex items-center justify-between">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            job.status === 'open' ? 'bg-green-100 text-green-800' :
                            job.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                            job.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {job.status.replace('_', ' ').toUpperCase()}
                          </span>
                          <span className="text-xs text-fixly-text-muted">
                            {job.applicationCount || 0} applications
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            <div className="space-y-6">
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-fixly-text-muted" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search users..."
                      className="input-field pl-10"
                    />
                  </div>
                </div>
                <select
                  value={userFilter}
                  onChange={(e) => setUserFilter(e.target.value)}
                  className="select-field w-full sm:w-48"
                >
                  <option value="all">All Users</option>
                  <option value="hirer">Hirers</option>
                  <option value="fixer">Fixers</option>
                  <option value="admin">Admins</option>
                  <option value="banned">Banned</option>
                </select>
              </div>

              {/* Users Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-fixly-border">
                      <th className="text-left py-3 px-4 font-medium text-fixly-text">User</th>
                      <th className="text-left py-3 px-4 font-medium text-fixly-text">Role</th>
                      <th className="text-left py-3 px-4 font-medium text-fixly-text">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-fixly-text">Joined</th>
                      <th className="text-left py-3 px-4 font-medium text-fixly-text">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user._id} className="border-b border-fixly-border hover:bg-fixly-bg">
                        <td className="py-3 px-4">
                          <div className="flex items-center">
                            <img
                              src={user.photoURL || '/default-avatar.png'}
                              alt={user.name}
                              className="h-8 w-8 rounded-full object-cover mr-3"
                            />
                            <div>
                              <div className="font-medium text-fixly-text">{user.name}</div>
                              <div className="text-sm text-fixly-text-muted">{user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {getRoleBadge(user.role)}
                        </td>
                        <td className="py-3 px-4">
                          {getStatusBadge(user.banned ? 'banned' : 'active')}
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
                                onClick={() => handleUserAction(user._id, 'ban')}
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
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
          {activeTab === 'reports' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="card">
                  <h4 className="font-medium text-fixly-text mb-3">User Growth</h4>
                  <div className="text-2xl font-bold text-fixly-text mb-1">
                    +{stats?.users?.newThisMonth || 0}
                  </div>
                  <div className="text-sm text-fixly-text-muted">New users this month</div>
                </div>

                <div className="card">
                  <h4 className="font-medium text-fixly-text mb-3">Job Success Rate</h4>
                  <div className="text-2xl font-bold text-fixly-text mb-1">
                    {stats?.jobs?.completionRate || 0}%
                  </div>
                  <div className="text-sm text-fixly-text-muted">Jobs completed successfully</div>
                </div>

                <div className="card">
                  <h4 className="font-medium text-fixly-text mb-3">Average Job Value</h4>
                  <div className="text-2xl font-bold text-fixly-text mb-1">
                    ₹{stats?.revenue?.avgJobBudget || 0}
                  </div>
                  <div className="text-sm text-fixly-text-muted">Average job budget</div>
                </div>
              </div>

              <div className="text-center py-8">
                <TrendingUp className="h-12 w-12 text-fixly-text-muted mx-auto mb-3" />
                <p className="text-fixly-text-muted">
                  Detailed analytics and reports coming soon...
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}