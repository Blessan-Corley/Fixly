// Real-Time Dashboard with Live Updates
'use client';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useResponsive } from '../ui/ResponsiveLayout';

const RealTimeDashboard = ({ userId }) => {
  const { isMobile, isTablet, screenSize } = useResponsive();
  
  // Dashboard state
  const [stats, setStats] = useState({
    totalJobs: 0,
    activeJobs: 0,
    totalApplications: 0,
    pendingApplications: 0,
    acceptedApplications: 0,
    totalEarnings: 0,
    monthlyEarnings: 0,
    completionRate: 0,
    rating: 0,
    responseTime: 0
  });

  const [recentActivities, setRecentActivities] = useState([]);
  const [jobAlerts, setJobAlerts] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState('connected');
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds default

  // SSE connection for real-time updates
  const [eventSource, setEventSource] = useState(null);

  // Initialize dashboard data and SSE connection
  useEffect(() => {
    loadDashboardData();
    setupRealtimeConnection();

    // Online/offline detection
    const handleOnline = () => {
      setIsOnline(true);
      setConnectionStatus('connected');
      setupRealtimeConnection();
    };

    const handleOffline = () => {
      setIsOnline(false);
      setConnectionStatus('offline');
      if (eventSource) {
        eventSource.close();
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (eventSource) {
        eventSource.close();
      }
    };
  }, []);

  // Load dashboard data
  const loadDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      
      const [statsResponse, activitiesResponse, alertsResponse] = await Promise.all([
        fetch('/api/dashboard/stats'),
        fetch('/api/dashboard/recent-activities'),
        fetch('/api/dashboard/job-alerts')
      ]);

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      }

      if (activitiesResponse.ok) {
        const activitiesData = await activitiesResponse.json();
        setRecentActivities(activitiesData.activities || []);
      }

      if (alertsResponse.ok) {
        const alertsData = await alertsResponse.json();
        setJobAlerts(alertsData.alerts || []);
      }

      setLastUpdated(new Date());
      
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Setup real-time SSE connection
  const setupRealtimeConnection = useCallback(() => {
    if (!isOnline || eventSource) return;

    try {
      const source = new EventSource('/api/dashboard/realtime');
      
      source.onopen = () => {
        setConnectionStatus('connected');
        console.log('Dashboard SSE connected');
      };

      source.onerror = (error) => {
        console.error('Dashboard SSE error:', error);
        setConnectionStatus('error');
        
        // Reconnect after delay
        setTimeout(() => {
          if (isOnline) {
            setupRealtimeConnection();
          }
        }, 5000);
      };

      source.onmessage = (event) => {
        handleRealtimeUpdate(JSON.parse(event.data));
      };

      setEventSource(source);
      
    } catch (error) {
      console.error('Error setting up SSE connection:', error);
      setConnectionStatus('error');
    }
  }, [isOnline, eventSource]);

  // Handle real-time updates
  const handleRealtimeUpdate = useCallback((data) => {
    const { type, payload } = data;

    switch (type) {
      case 'stats_update':
        setStats(prev => ({ ...prev, ...payload }));
        break;

      case 'new_activity':
        setRecentActivities(prev => [payload, ...prev.slice(0, 9)]);
        break;

      case 'new_job_alert':
        setJobAlerts(prev => [payload, ...prev.slice(0, 4)]);
        // Show notification for new job match
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('New Job Match!', {
            body: `${payload.title} - ${payload.budget}`,
            icon: '/icons/job-icon.png'
          });
        }
        break;

      case 'application_update':
        setStats(prev => ({
          ...prev,
          totalApplications: payload.totalApplications,
          pendingApplications: payload.pendingApplications,
          acceptedApplications: payload.acceptedApplications
        }));
        
        setRecentActivities(prev => [
          {
            id: Date.now(),
            type: 'application',
            title: `Application ${payload.status}`,
            description: payload.jobTitle,
            timestamp: new Date().toISOString(),
            icon: payload.status === 'accepted' ? '✅' : '📋'
          },
          ...prev.slice(0, 9)
        ]);
        break;

      case 'job_update':
        if (payload.status === 'completed') {
          setStats(prev => ({
            ...prev,
            totalEarnings: prev.totalEarnings + (payload.amount || 0),
            monthlyEarnings: prev.monthlyEarnings + (payload.amount || 0)
          }));
        }
        break;

      case 'notification':
        setNotifications(prev => [payload, ...prev.slice(0, 4)]);
        break;

      default:
        console.log('Unknown realtime update type:', type);
    }

    setLastUpdated(new Date());
  }, []);

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Format time ago
  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diff = now - time;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return time.toLocaleDateString();
  };

  // Get connection status color
  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'text-green-500';
      case 'offline': return 'text-gray-500';
      case 'error': return 'text-red-500';
      default: return 'text-yellow-500';
    }
  };

  // Dashboard layout configuration based on screen size
  const getGridLayout = () => {
    if (isMobile) return 'grid-cols-1';
    if (isTablet) return 'grid-cols-2';
    return 'grid-cols-4';
  };

  // Responsive card sizing
  const getCardSize = () => {
    if (isMobile) return 'p-4';
    if (isTablet) return 'p-5';
    return 'p-6';
  };

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-gray-200 rounded-lg h-32"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-gray-200 rounded-lg h-64 lg:col-span-2"></div>
          <div className="bg-gray-200 rounded-lg h-64"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with connection status */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`font-bold ${isMobile ? 'text-2xl' : 'text-3xl'} text-gray-900`}>
            Dashboard
          </h1>
          <p className="text-gray-600 mt-1">
            Last updated: {formatTimeAgo(lastUpdated)}
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${
            connectionStatus === 'connected' ? 'bg-green-500' : 
            connectionStatus === 'offline' ? 'bg-gray-500' : 'bg-red-500'
          }`}></div>
          <span className={`text-sm font-medium ${getConnectionStatusColor()}`}>
            {connectionStatus === 'connected' ? 'Live' : 
             connectionStatus === 'offline' ? 'Offline' : 'Reconnecting...'}
          </span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className={`grid ${getGridLayout()} gap-6`}>
        {/* Total Jobs */}
        <div className={`bg-white rounded-xl shadow-sm border ${getCardSize()} hover:shadow-md transition-shadow`}>
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2V6" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Jobs</p>
              <div className="flex items-baseline">
                <p className="text-2xl font-semibold text-gray-900">{stats.totalJobs}</p>
                <p className="ml-2 text-sm text-green-600">+{stats.activeJobs} active</p>
              </div>
            </div>
          </div>
        </div>

        {/* Applications */}
        <div className={`bg-white rounded-xl shadow-sm border ${getCardSize()} hover:shadow-md transition-shadow`}>
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Applications</p>
              <div className="flex items-baseline">
                <p className="text-2xl font-semibold text-gray-900">{stats.totalApplications}</p>
                <p className="ml-2 text-sm text-yellow-600">{stats.pendingApplications} pending</p>
              </div>
            </div>
          </div>
        </div>

        {/* Earnings */}
        <div className={`bg-white rounded-xl shadow-sm border ${getCardSize()} hover:shadow-md transition-shadow`}>
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Earnings</p>
              <div className="flex items-baseline">
                <p className="text-2xl font-semibold text-gray-900">
                  {formatCurrency(stats.totalEarnings)}
                </p>
                <p className="ml-2 text-sm text-green-600">
                  +{formatCurrency(stats.monthlyEarnings)} this month
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Rating */}
        <div className={`bg-white rounded-xl shadow-sm border ${getCardSize()} hover:shadow-md transition-shadow`}>
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Rating</p>
              <div className="flex items-baseline">
                <p className="text-2xl font-semibold text-gray-900">{stats.rating.toFixed(1)}</p>
                <div className="ml-2 flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <svg
                      key={i}
                      className={`w-4 h-4 ${i < Math.floor(stats.rating) ? 'text-yellow-400' : 'text-gray-300'}`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activities */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Recent Activities</h2>
          </div>
          
          <div className="divide-y divide-gray-100">
            {recentActivities.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No recent activities
              </div>
            ) : (
              recentActivities.map((activity, index) => (
                <div key={activity.id || index} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start space-x-3">
                    <div className="text-xl">{activity.icon}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                      <p className="text-sm text-gray-600">{activity.description}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatTimeAgo(activity.timestamp)}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Job Alerts */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Job Alerts</h2>
          </div>
          
          <div className="p-4 space-y-4">
            {jobAlerts.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                No job alerts
              </div>
            ) : (
              jobAlerts.map((alert, index) => (
                <div key={alert.id || index} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="text-sm font-medium text-gray-900 line-clamp-2">
                    {alert.title}
                  </h4>
                  <p className="text-sm text-blue-600 mt-1">{alert.budget}</p>
                  <p className="text-xs text-gray-500 mt-2">
                    {formatTimeAgo(alert.timestamp)}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RealTimeDashboard;