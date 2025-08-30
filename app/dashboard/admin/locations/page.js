'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, MapPin, Users, Clock, TrendingUp, Filter, Download, RotateCcw,
  Map, BarChart3, Settings, AlertCircle, CheckCircle, User, Mail, Calendar,
  Shield, Eye, EyeOff, Navigation, Zap, Target, Lock, Unlock, Globe,
  Phone, UserCheck, Activity, History, MapIcon, Crosshair, X
} from 'lucide-react';
import { toast } from 'sonner';

export default function AdminLocationsPage() {
  const [activeTab, setActiveTab] = useState('search');
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [locationStats, setLocationStats] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [searchFilters, setSearchFilters] = useState({
    email: '',
    username: '',
    name: '',
    city: '',
    state: '',
    role: '',
    locationAge: '', // in hours
    sharingConsent: '',
    sortBy: 'lastUpdated',
    sortOrder: 'desc',
    includeInactive: false
  });

  // Advanced search with secure admin API
  const handleSecureSearch = async () => {
    const hasFilters = Object.values(searchFilters).some(value => 
      value !== '' && value !== false && value !== 'lastUpdated' && value !== 'desc'
    );
    
    if (!hasFilters) {
      toast.error('Please enter at least one search criteria');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/admin/locations/secure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          searchType: 'comprehensive',
          filters: {
            email: searchFilters.email || undefined,
            username: searchFilters.username || undefined,
            name: searchFilters.name || undefined,
            city: searchFilters.city || undefined,
            state: searchFilters.state || undefined,
            role: searchFilters.role || undefined,
            locationAge: searchFilters.locationAge ? parseInt(searchFilters.locationAge) : undefined,
            sharingConsent: searchFilters.sharingConsent ? searchFilters.sharingConsent === 'true' : undefined
          },
          sortBy: searchFilters.sortBy,
          sortOrder: searchFilters.sortOrder,
          limit: 100,
          includeInactive: searchFilters.includeInactive
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        setSearchResults(data.results || []);
        toast.success(`🔍 Found ${data.count || 0} users with precise locations`);
      } else {
        if (response.status === 403) {
          toast.error('🚫 Admin access required for location data');
        } else {
          toast.error(data.error || 'Search failed');
        }
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Secure search error:', error);
      toast.error('Failed to search locations');
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  // Load detailed user information
  const loadUserDetails = async (userId) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/locations/secure?userId=${userId}&history=true&precise=true`);
      const data = await response.json();
      
      if (response.ok) {
        setSelectedUser(data);
        setShowUserDetails(true);
        toast.success(`Loaded precise location data for ${data.user?.name}`);
      } else {
        toast.error(data.error || 'Failed to load user details');
      }
    } catch (error) {
      console.error('User details error:', error);
      toast.error('Failed to load user details');
    } finally {
      setLoading(false);
    }
  };

  // Load location statistics
  const loadStats = async (includeDetails = false) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/location/stats?details=${includeDetails}&groupBy=role`);
      const data = await response.json();
      
      if (response.ok) {
        setLocationStats(data);
      } else {
        toast.error(data.error || 'Failed to load statistics');
      }
    } catch (error) {
      console.error('Stats error:', error);
      toast.error('Failed to load location statistics');
    } finally {
      setLoading(false);
    }
  };

  // Format precise coordinates
  const formatPreciseCoordinates = (lat, lng) => {
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  };

  // Calculate distance between two points
  const calculateDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in meters
  };

  // Format time ago
  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return 'Never';
    const diff = Date.now() - new Date(timestamp).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor(diff / (1000 * 60));
    
    if (days > 0) return `${days}d ${hours % 24}h ago`;
    if (hours > 0) return `${hours}h ${minutes % 60}m ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  // Get location age color based on recency
  const getLocationAgeColor = (locationAge) => {
    if (!locationAge) return 'text-gray-500';
    const hours = locationAge / (1000 * 60 * 60);
    if (hours < 1) return 'text-green-600 font-semibold'; // Very recent
    if (hours < 6) return 'text-green-500'; // Recent
    if (hours < 24) return 'text-yellow-600'; // Today
    if (hours < 168) return 'text-orange-600'; // This week
    return 'text-red-600'; // Old
  };

  // Get accuracy indicator
  const getAccuracyIndicator = (accuracy) => {
    if (!accuracy) return { color: 'gray', text: 'Unknown' };
    if (accuracy <= 10) return { color: 'green', text: 'Excellent (~1-10m)' };
    if (accuracy <= 50) return { color: 'blue', text: 'Good (~10-50m)' };
    if (accuracy <= 100) return { color: 'yellow', text: 'Fair (~50-100m)' };
    return { color: 'red', text: 'Poor (>100m)' };
  };

  // Clear all filters
  const clearAllFilters = () => {
    setSearchFilters({
      email: '',
      username: '',
      name: '',
      city: '',
      state: '',
      role: '',
      locationAge: '',
      sharingConsent: '',
      sortBy: 'lastUpdated',
      sortOrder: 'desc',
      includeInactive: false
    });
    setSearchResults([]);
  };

  useEffect(() => {
    loadStats(false);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Secure Header */}
        <div className="mb-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2 flex items-center">
                <Shield className="mr-3 h-8 w-8" />
                Secure Location Management
              </h1>
              <p className="opacity-90">Admin-only access to precise user location data with 1-meter accuracy</p>
            </div>
            <div className="text-right">
              <div className="flex items-center justify-end mb-2">
                <Target className="h-5 w-5 mr-2" />
                <span className="font-semibold">1m Precision</span>
              </div>
              <div className="flex items-center justify-end text-sm opacity-75">
                <Lock className="h-4 w-4 mr-1" />
                Admin Only
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="flex space-x-8">
            {[
              { id: 'search', label: 'Secure Search', icon: Search, badge: 'ADMIN' },
              { id: 'stats', label: 'Statistics', icon: BarChart3 },
              { id: 'tracking', label: 'Live Tracking', icon: Activity },
              { id: 'management', label: 'Data Management', icon: Settings }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-3 py-2 border-b-2 font-medium text-sm transition-colors relative ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-4 w-4 mr-2" />
                {tab.label}
                {tab.badge && (
                  <span className="ml-2 px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full font-semibold">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Secure Search Tab */}
        {activeTab === 'search' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Advanced Search Form */}
            <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Crosshair className="mr-2 h-5 w-5 text-blue-600" />
                  Precise Location Search (1m Accuracy)
                </h2>
                <div className="flex items-center text-sm text-gray-500">
                  <Shield className="h-4 w-4 mr-1" />
                  Secure Admin Access
                </div>
              </div>
              
              {/* Filter Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {/* User Identification */}
                <div className="space-y-3">
                  <h3 className="font-medium text-gray-700 text-sm flex items-center">
                    <User className="h-4 w-4 mr-1" />
                    User Identification
                  </h3>
                  
                  <input
                    type="email"
                    placeholder="Email address"
                    value={searchFilters.email}
                    onChange={(e) => setSearchFilters(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                  
                  <input
                    type="text"
                    placeholder="Username"
                    value={searchFilters.username}
                    onChange={(e) => setSearchFilters(prev => ({ ...prev, username: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                  
                  <input
                    type="text"
                    placeholder="Full name"
                    value={searchFilters.name}
                    onChange={(e) => setSearchFilters(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>

                {/* Location Filters */}
                <div className="space-y-3">
                  <h3 className="font-medium text-gray-700 text-sm flex items-center">
                    <MapPin className="h-4 w-4 mr-1" />
                    Location Filters
                  </h3>
                  
                  <input
                    type="text"
                    placeholder="City"
                    value={searchFilters.city}
                    onChange={(e) => setSearchFilters(prev => ({ ...prev, city: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                  
                  <input
                    type="text"
                    placeholder="State"
                    value={searchFilters.state}
                    onChange={(e) => setSearchFilters(prev => ({ ...prev, state: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                  
                  <select
                    value={searchFilters.role}
                    onChange={(e) => setSearchFilters(prev => ({ ...prev, role: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  >
                    <option value="">All Roles</option>
                    <option value="fixer">Fixer</option>
                    <option value="hirer">Hirer</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                {/* Time & Privacy Filters */}
                <div className="space-y-3">
                  <h3 className="font-medium text-gray-700 text-sm flex items-center">
                    <Clock className="h-4 w-4 mr-1" />
                    Time & Privacy
                  </h3>
                  
                  <select
                    value={searchFilters.locationAge}
                    onChange={(e) => setSearchFilters(prev => ({ ...prev, locationAge: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  >
                    <option value="">Any Update Time</option>
                    <option value="1">Last 1 hour</option>
                    <option value="6">Last 6 hours</option>
                    <option value="24">Last 24 hours</option>
                    <option value="168">Last week</option>
                  </select>
                  
                  <select
                    value={searchFilters.sharingConsent}
                    onChange={(e) => setSearchFilters(prev => ({ ...prev, sharingConsent: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  >
                    <option value="">Any Sharing Status</option>
                    <option value="true">Location Shared</option>
                    <option value="false">Location Private</option>
                  </select>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="includeInactive"
                      checked={searchFilters.includeInactive}
                      onChange={(e) => setSearchFilters(prev => ({ ...prev, includeInactive: e.target.checked }))}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="includeInactive" className="ml-2 text-sm text-gray-600">
                      Include inactive users
                    </label>
                  </div>
                </div>

                {/* Sorting Options */}
                <div className="space-y-3">
                  <h3 className="font-medium text-gray-700 text-sm flex items-center">
                    <TrendingUp className="h-4 w-4 mr-1" />
                    Sorting
                  </h3>
                  
                  <select
                    value={searchFilters.sortBy}
                    onChange={(e) => setSearchFilters(prev => ({ ...prev, sortBy: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  >
                    <option value="lastUpdated">Last Updated</option>
                    <option value="name">Name</option>
                    <option value="role">Role</option>
                    <option value="city">City</option>
                  </select>
                  
                  <select
                    value={searchFilters.sortOrder}
                    onChange={(e) => setSearchFilters(prev => ({ ...prev, sortOrder: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  >
                    <option value="desc">Newest First</option>
                    <option value="asc">Oldest First</option>
                  </select>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button
                    onClick={handleSecureSearch}
                    disabled={loading}
                    className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors font-medium"
                  >
                    {loading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    ) : (
                      <Search className="h-4 w-4 mr-2" />
                    )}
                    Search Precise Locations
                  </button>
                  
                  <button
                    onClick={clearAllFilters}
                    className="flex items-center px-4 py-3 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    Clear Filters
                  </button>
                </div>
                
                <div className="text-sm text-gray-500 flex items-center">
                  <Target className="h-4 w-4 mr-1 text-green-600" />
                  1-meter precision tracking
                </div>
              </div>
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="bg-white rounded-lg shadow-lg border border-gray-200">
                <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <Users className="mr-2 h-5 w-5" />
                    Secure Search Results ({searchResults.length})
                    <span className="ml-3 px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full font-medium">
                      1m Precision
                    </span>
                  </h3>
                </div>
                
                <div className="divide-y divide-gray-200">
                  {searchResults.map((result, index) => {
                    const accuracy = getAccuracyIndicator(result.currentLocation.accuracy);
                    
                    return (
                      <div key={index} className="p-6 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            {/* User Header */}
                            <div className="flex items-center gap-3 mb-3">
                              <div className="h-12 w-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                                {result.userIdentifier.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <h4 className="font-bold text-gray-900">{result.userIdentifier.name}</h4>
                                <p className="text-sm text-gray-600 flex items-center">
                                  <Mail className="h-3 w-3 mr-1" />
                                  {result.userIdentifier.email}
                                </p>
                                <p className="text-xs text-gray-500">@{result.userIdentifier.username}</p>
                              </div>
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                result.userIdentifier.role === 'fixer' ? 'bg-green-100 text-green-800' :
                                result.userIdentifier.role === 'hirer' ? 'bg-blue-100 text-blue-800' :
                                'bg-purple-100 text-purple-800'
                              }`}>
                                {result.userIdentifier.role}
                              </span>
                            </div>
                            
                            {/* Precise Location Info */}
                            <div className="bg-gray-50 rounded-lg p-4 mb-3">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <div className="flex items-center text-sm font-medium text-gray-700 mb-1">
                                    <MapPin className="h-4 w-4 mr-1 text-red-500" />
                                    Precise Location
                                  </div>
                                  <p className="text-sm text-gray-900 font-mono bg-white px-2 py-1 rounded border">
                                    {formatPreciseCoordinates(result.currentLocation.lat, result.currentLocation.lng)}
                                  </p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    {result.currentLocation.address.city || 'Unknown'}, {result.currentLocation.address.state || 'Unknown'}
                                  </p>
                                </div>
                                
                                <div>
                                  <div className="flex items-center text-sm font-medium text-gray-700 mb-1">
                                    <Target className={`h-4 w-4 mr-1 text-${accuracy.color}-500`} />
                                    Accuracy
                                  </div>
                                  <p className={`text-sm font-medium text-${accuracy.color}-600`}>
                                    {accuracy.text}
                                  </p>
                                  {result.currentLocation.accuracy && (
                                    <p className="text-xs text-gray-500 mt-1">
                                      GPS: ±{result.currentLocation.accuracy}m
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            {/* Status and Metadata */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                              <div className="flex items-center text-gray-600">
                                <Clock className="h-4 w-4 mr-1" />
                                <span className={getLocationAgeColor(result.locationMetadata.locationAge)}>
                                  {formatTimeAgo(result.locationMetadata.lastUpdated)}
                                </span>
                              </div>
                              
                              <div className="flex items-center text-gray-600">
                                {result.preferences.locationSharingConsent ? (
                                  <Unlock className="h-4 w-4 mr-1 text-green-500" />
                                ) : (
                                  <Lock className="h-4 w-4 mr-1 text-red-500" />
                                )}
                                {result.preferences.locationSharingConsent ? 'Location Shared' : 'Location Private'}
                              </div>
                              
                              <div className="flex items-center text-gray-600">
                                <Activity className="h-4 w-4 mr-1" />
                                {result.locationMetadata.updateCount} location updates
                              </div>
                            </div>
                            
                            {/* Recent Activity */}
                            {result.recentActivity && (
                              <div className="mt-3 text-xs text-gray-500 flex items-center">
                                <History className="h-3 w-3 mr-1" />
                                Recent locations: {result.recentActivity.recentLocationCount}
                                {result.recentActivity.lastSignificantMove && (
                                  <span className="ml-3">
                                    Last move: {formatTimeAgo(result.recentActivity.lastSignificantMove)}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          
                          {/* Action Buttons */}
                          <div className="ml-6 flex flex-col gap-2">
                            <button
                              onClick={() => loadUserDetails(result.userId)}
                              className="px-4 py-2 text-sm text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors flex items-center"
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View Details
                            </button>
                            
                            <button
                              onClick={() => {
                                const coords = `${result.currentLocation.lat},${result.currentLocation.lng}`;
                                window.open(`https://maps.google.com/?q=${coords}`, '_blank');
                              }}
                              className="px-4 py-2 text-sm text-green-600 border border-green-300 rounded-lg hover:bg-green-50 transition-colors flex items-center"
                            >
                              <MapIcon className="h-4 w-4 mr-1" />
                              View Map
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* User Details Modal */}
        <AnimatePresence>
          {showUserDetails && selectedUser && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
              onClick={() => setShowUserDetails(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-gray-900 flex items-center">
                      <Shield className="mr-2 h-6 w-6 text-blue-600" />
                      Precise Location Details - {selectedUser.user?.name}
                    </h3>
                    <button
                      onClick={() => setShowUserDetails(false)}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <X className="h-6 w-6" />
                    </button>
                  </div>
                </div>
                
                <div className="p-6">
                  {selectedUser.hasLocation ? (
                    <div className="space-y-6">
                      {/* User Information */}
                      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6">
                        <h4 className="font-semibold text-gray-900 mb-4">User Information</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-600">Full Name</p>
                            <p className="font-medium">{selectedUser.user.name}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Email</p>
                            <p className="font-medium">{selectedUser.user.email}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Username</p>
                            <p className="font-medium">@{selectedUser.user.username}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Role</p>
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              selectedUser.user.role === 'fixer' ? 'bg-green-100 text-green-800' :
                              selectedUser.user.role === 'hirer' ? 'bg-blue-100 text-blue-800' :
                              'bg-purple-100 text-purple-800'
                            }`}>
                              {selectedUser.user.role}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Precise Location Data */}
                      <div className="bg-gray-50 rounded-lg p-6">
                        <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                          <Target className="mr-2 h-5 w-5 text-green-600" />
                          Precise Location (1m Accuracy)
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <p className="text-sm text-gray-600 mb-2">Exact Coordinates</p>
                            <p className="font-mono text-lg bg-white px-4 py-2 rounded border">
                              {formatPreciseCoordinates(selectedUser.currentLocation.lat, selectedUser.currentLocation.lng)}
                            </p>
                            <div className="mt-2 text-xs text-gray-500">
                              Precision: 1-meter accuracy
                            </div>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 mb-2">Location Details</p>
                            <div className="space-y-1">
                              <p><strong>City:</strong> {selectedUser.currentLocation.address.city || 'Unknown'}</p>
                              <p><strong>State:</strong> {selectedUser.currentLocation.address.state || 'Unknown'}</p>
                              <p><strong>Address:</strong> {selectedUser.currentLocation.address.formatted || 'Not available'}</p>
                              {selectedUser.currentLocation.address.pincode && (
                                <p><strong>Pincode:</strong> {selectedUser.currentLocation.address.pincode}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Location Metadata */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white border border-gray-200 rounded-lg p-6">
                          <h4 className="font-semibold text-gray-900 mb-4">Location Status</h4>
                          <div className="space-y-3">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Last Updated</span>
                              <span className={`font-medium ${getLocationAgeColor(selectedUser.locationMetadata.locationAge)}`}>
                                {formatTimeAgo(selectedUser.locationMetadata.lastUpdated)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">GPS Accuracy</span>
                              <span className="font-medium">
                                ±{selectedUser.currentLocation.accuracy || 'Unknown'}m
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Update Count</span>
                              <span className="font-medium">{selectedUser.locationMetadata.updateCount}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Recent Location</span>
                              {selectedUser.locationMetadata.isRecent ? (
                                <span className="text-green-600 font-medium">✓ Recent</span>
                              ) : (
                                <span className="text-orange-600 font-medium">⚠ Stale</span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="bg-white border border-gray-200 rounded-lg p-6">
                          <h4 className="font-semibold text-gray-900 mb-4">Privacy Settings</h4>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-gray-600">Location Sharing</span>
                              {selectedUser.preferences.locationSharingConsent ? (
                                <span className="flex items-center text-green-600 font-medium">
                                  <Unlock className="h-4 w-4 mr-1" />
                                  Enabled
                                </span>
                              ) : (
                                <span className="flex items-center text-red-600 font-medium">
                                  <Lock className="h-4 w-4 mr-1" />
                                  Disabled
                                </span>
                              )}
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-gray-600">Auto Location</span>
                              {selectedUser.preferences.autoLocationEnabled ? (
                                <span className="text-green-600 font-medium">✓ On</span>
                              ) : (
                                <span className="text-gray-600 font-medium">✗ Off</span>
                              )}
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Travel Distance</span>
                              <span className="font-medium">{selectedUser.preferences.maxTravelDistance}km</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-gray-600">History Tracking</span>
                              {selectedUser.preferences.trackLocationHistory ? (
                                <span className="text-green-600 font-medium">✓ On</span>
                              ) : (
                                <span className="text-gray-600 font-medium">✗ Off</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Location History */}
                      {selectedUser.locationHistory && selectedUser.locationHistory.length > 0 && (
                        <div className="bg-white border border-gray-200 rounded-lg p-6">
                          <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                            <History className="mr-2 h-5 w-5" />
                            Location History ({selectedUser.locationHistory.length} entries)
                          </h4>
                          <div className="space-y-2 max-h-64 overflow-y-auto">
                            {selectedUser.locationHistory.slice(0, 10).map((entry, index) => (
                              <div key={index} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded text-sm">
                                <div>
                                  <span className="font-mono">
                                    {formatPreciseCoordinates(entry.lat, entry.lng)}
                                  </span>
                                  {entry.city && (
                                    <span className="ml-2 text-gray-600">
                                      {entry.city}, {entry.state}
                                    </span>
                                  )}
                                </div>
                                <div className="text-gray-500 text-xs">
                                  {formatTimeAgo(entry.timestamp)}
                                  {entry.isSignificantMove && (
                                    <span className="ml-2 text-blue-600">🚶</span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Recent Locations */}
                      {selectedUser.recentLocations && selectedUser.recentLocations.length > 0 && (
                        <div className="bg-white border border-gray-200 rounded-lg p-6">
                          <h4 className="font-semibold text-gray-900 mb-4">Recent Locations</h4>
                          <div className="grid grid-cols-1 gap-3">
                            {selectedUser.recentLocations.map((location, index) => (
                              <div key={index} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded text-sm">
                                <div>
                                  <span className="font-mono">
                                    {formatPreciseCoordinates(location.lat, location.lng)}
                                  </span>
                                  <span className="ml-2 text-gray-600">
                                    {location.city}, {location.state}
                                  </span>
                                </div>
                                <div className="text-gray-500 text-xs">
                                  Used {location.usageCount} times
                                  <span className="ml-2">{formatTimeAgo(location.timestamp)}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Action Buttons */}
                      <div className="flex gap-4">
                        <button
                          onClick={() => {
                            const coords = `${selectedUser.currentLocation.lat},${selectedUser.currentLocation.lng}`;
                            window.open(`https://maps.google.com/?q=${coords}`, '_blank');
                          }}
                          className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center"
                        >
                          <MapIcon className="h-4 w-4 mr-2" />
                          View on Google Maps
                        </button>
                        
                        <button
                          onClick={() => {
                            const data = `User: ${selectedUser.user.name}\nEmail: ${selectedUser.user.email}\nLocation: ${formatPreciseCoordinates(selectedUser.currentLocation.lat, selectedUser.currentLocation.lng)}\nCity: ${selectedUser.currentLocation.address.city || 'Unknown'}\nLast Updated: ${formatTimeAgo(selectedUser.locationMetadata.lastUpdated)}`;
                            navigator.clipboard.writeText(data);
                            toast.success('Location data copied to clipboard');
                          }}
                          className="px-6 py-3 text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors flex items-center"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Copy Data
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <MapPin className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Location Data</h3>
                      <p className="text-gray-600">This user hasn't shared their precise location yet.</p>
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Statistics Tab (simplified version) */}
        {activeTab === 'stats' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {locationStats && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center">
                    <Users className="h-8 w-8 text-blue-600" />
                    <div className="ml-4">
                      <p className="text-2xl font-bold text-gray-900">{locationStats.overview.totalUsersWithLocation}</p>
                      <p className="text-gray-600">Users with 1m Precision</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center">
                    <Clock className="h-8 w-8 text-green-600" />
                    <div className="ml-4">
                      <p className="text-2xl font-bold text-gray-900">{locationStats.overview.recentUpdates24h}</p>
                      <p className="text-gray-600">Recent Updates (24h)</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center">
                    <Shield className="h-8 w-8 text-purple-600" />
                    <div className="ml-4">
                      <p className="text-2xl font-bold text-gray-900">{locationStats.overview.locationSharingRate}%</p>
                      <p className="text-gray-600">Sharing Rate</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center">
                    <Target className="h-8 w-8 text-green-600" />
                    <div className="ml-4">
                      <p className="text-2xl font-bold text-gray-900">1m</p>
                      <p className="text-gray-600">Location Precision</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <button
              onClick={() => loadStats(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Load Detailed Statistics
            </button>
          </motion.div>
        )}

        {/* Placeholder tabs */}
        {activeTab === 'tracking' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <Activity className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Live Location Tracking</h3>
            <p className="text-gray-600">Real-time location monitoring will be implemented here</p>
          </div>
        )}

        {activeTab === 'management' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <Settings className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Location Data Management</h3>
            <p className="text-gray-600">Bulk operations and data maintenance tools will be implemented here</p>
          </div>
        )}
      </div>
    </div>
  );
}