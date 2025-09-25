'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Filter,
  MapPin,
  DollarSign,
  Calendar,
  Star,
  Clock,
  X,
  SlidersHorizontal,
  Navigation,
  Target,
  TrendingUp,
  Activity,
  Users,
  Zap
} from 'lucide-react';
import { useAbly, useAblyChannel } from '../../contexts/AblyContext';
import { RealTimeCounter } from '../ui/RealTimeCounter';
import { cache } from '../../lib/cache';

export default function EnhancedAdvancedSearch({
  onSearch,
  onFilterChange,
  className = '',
  showLocationDetection = true,
  showRealTimeStats = true
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [jobStats, setJobStats] = useState({
    total: 0,
    urgent: 0,
    nearby: 0,
    trending: []
  });
  const searchTimeoutRef = useRef(null);
  const { publishMessage, subscribeToChannel } = useAbly();

  // Search filters state
  const [filters, setFilters] = useState({
    location: {
      type: 'all', // 'all', 'nearby', 'city', 'custom'
      radius: 25, // km
      city: '',
      coordinates: null
    },
    budget: {
      min: 0,
      max: 100000,
      type: 'all' // 'all', 'fixed', 'hourly', 'negotiable'
    },
    urgency: 'all', // 'all', 'urgent', 'high', 'medium', 'low'
    deadline: 'all', // 'all', 'today', 'week', 'month', 'custom'
    rating: 0, // minimum rating
    skills: [],
    jobType: 'all', // 'all', 'one-time', 'recurring'
    materialsIncluded: 'all', // 'all', 'included', 'not-included'
    verified: false, // only verified hirers
    sortBy: 'relevance' // 'relevance', 'newest', 'budget_high', 'budget_low', 'deadline'
  });

  // Skills options with real-time trending data
  const [skillOptions, setSkillOptions] = useState([
    'Plumbing', 'Electrical', 'Carpentry', 'Painting', 'Cleaning',
    'Gardening', 'Moving', 'Assembly', 'Repair', 'Installation',
    'Maintenance', 'Renovation', 'Flooring', 'Roofing', 'HVAC'
  ]);

  // Subscribe to real-time search trends and job updates
  useAblyChannel(
    'search:trends',
    'trend_updated',
    (message) => {
      const { trendingSkills, jobCounts } = message.data;
      setJobStats(prev => ({
        ...prev,
        trending: trendingSkills || prev.trending,
        ...jobCounts
      }));
    },
    []
  );

  // Subscribe to live job statistics
  useAblyChannel(
    'jobs:stats',
    'stats_updated',
    (message) => {
      setJobStats(prev => ({
        ...prev,
        ...message.data
      }));
    },
    []
  );

  // Fetch initial job statistics
  useEffect(() => {
    const fetchJobStats = async () => {
      try {
        const response = await fetch('/api/jobs/stats');
        if (response.ok) {
          const stats = await response.json();
          setJobStats(stats);
        }
      } catch (error) {
        console.error('Failed to fetch job stats:', error);
      }
    };

    fetchJobStats();
  }, []);

  // Real-time search suggestions
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (searchQuery.length < 2) {
        setSearchSuggestions([]);
        return;
      }

      try {
        const response = await fetch(`/api/search/suggestions?q=${encodeURIComponent(searchQuery)}`);
        if (response.ok) {
          const suggestions = await response.json();
          setSearchSuggestions(suggestions.slice(0, 5));
        }
      } catch (error) {
        console.error('Failed to fetch suggestions:', error);
      }
    };

    const debounceTimer = setTimeout(fetchSuggestions, 200);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  // Debounced search with real-time updates
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      handleSearch();
      // Broadcast search activity for analytics
      if (searchQuery.trim()) {
        publishMessage('search:activity', 'search_performed', {
          query: searchQuery.trim(),
          filters: filters,
          timestamp: new Date().toISOString()
        });
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, filters]);

  // Get user's current location with enhanced accuracy
  const getUserLocation = async () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by this browser.');
      return;
    }

    setLocationLoading(true);

    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        });
      });

      const coordinates = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      };

      setUserLocation(coordinates);

      // Update filters with user location
      setFilters(prev => ({
        ...prev,
        location: {
          ...prev.location,
          type: 'nearby',
          coordinates
        }
      }));

      // Enhanced location detection with Google Maps API
      try {
        const response = await fetch(`/api/location/reverse-geocode`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(coordinates)
        });

        if (response.ok) {
          const locationData = await response.json();
          setFilters(prev => ({
            ...prev,
            location: {
              ...prev.location,
              city: locationData.city || locationData.locality,
              area: locationData.area
            }
          }));
        }
      } catch (error) {
        console.error('Failed to get detailed location:', error);
      }
    } catch (error) {
      console.error('Error getting location:', error);
      alert('Unable to get your location. Please enter your city manually.');
    } finally {
      setLocationLoading(false);
    }
  };

  // Enhanced search handler with analytics
  const handleSearch = async () => {
    const searchParams = {
      query: searchQuery.trim(),
      filters,
      timestamp: Date.now(),
      userLocation
    };

    // Cache recent searches with enhanced data
    try {
      await cache.set(`recent_search_${Date.now()}`, {
        ...searchParams,
        resultCount: jobStats.total
      }, 3600);
    } catch (error) {
      console.error('Failed to cache search:', error);
    }

    onSearch?.(searchParams);
  };

  // Update filter with real-time broadcast
  const updateFilter = (category, key, value) => {
    const newFilters = {
      ...filters,
      [category]: {
        ...filters[category],
        [key]: value
      }
    };

    setFilters(newFilters);
    onFilterChange?.(newFilters);

    // Broadcast filter changes for analytics
    publishMessage('search:filters', 'filter_changed', {
      category,
      key,
      value,
      timestamp: new Date().toISOString()
    });
  };

  // Reset filters with animation
  const resetFilters = () => {
    const defaultFilters = {
      location: {
        type: 'all',
        radius: 25,
        city: '',
        coordinates: null
      },
      budget: {
        min: 0,
        max: 100000,
        type: 'all'
      },
      urgency: 'all',
      deadline: 'all',
      rating: 0,
      skills: [],
      jobType: 'all',
      materialsIncluded: 'all',
      verified: false,
      sortBy: 'relevance'
    };

    setFilters(defaultFilters);
    publishMessage('search:filters', 'filters_reset', {
      timestamp: new Date().toISOString()
    });
  };

  // Toggle skill selection with trending indication
  const toggleSkill = (skill) => {
    setFilters(prev => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter(s => s !== skill)
        : [...prev.skills, skill]
    }));
  };

  // Handle suggestion selection
  const selectSuggestion = (suggestion) => {
    setSearchQuery(suggestion);
    setShowSuggestions(false);
  };

  // Memoized trending skills with counts
  const trendingSkills = useMemo(() => {
    return skillOptions.map(skill => ({
      name: skill,
      isTrending: jobStats.trending.some(t => t.skill === skill),
      count: jobStats.trending.find(t => t.skill === skill)?.count || 0
    }));
  }, [skillOptions, jobStats.trending]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Real-time Job Statistics */}
      {showRealTimeStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <RealTimeCounter
            label="Total Jobs"
            value={jobStats.total}
            icon={<Target className="h-5 w-5" />}
            trend="up"
            color="primary"
          />
          <RealTimeCounter
            label="Urgent Jobs"
            value={jobStats.urgent}
            icon={<Zap className="h-5 w-5" />}
            trend="up"
            color="warning"
          />
          <RealTimeCounter
            label="Nearby"
            value={jobStats.nearby}
            icon={<MapPin className="h-5 w-5" />}
            trend="neutral"
            color="success"
          />
          <RealTimeCounter
            label="Active Users"
            value={jobStats.activeUsers || 0}
            icon={<Users className="h-5 w-5" />}
            trend="up"
            color="info"
          />
        </div>
      )}

      {/* Main Search Bar with Real-time Suggestions */}
      <div className="relative">
        <div className="flex items-center space-x-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-fixly-text-muted dark:text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              placeholder="Search for services, skills, or keywords..."
              className="w-full pl-10 pr-4 py-3 bg-fixly-card dark:bg-gray-800 border border-fixly-border dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-fixly-accent text-fixly-text dark:text-gray-100 placeholder:text-fixly-text-muted dark:placeholder:text-gray-400"
            />

            {/* Real-time Search Suggestions */}
            <AnimatePresence>
              {showSuggestions && searchSuggestions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-full left-0 right-0 mt-1 bg-fixly-card dark:bg-gray-800 border border-fixly-border dark:border-gray-600 rounded-lg shadow-lg z-50"
                >
                  {searchSuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => selectSuggestion(suggestion)}
                      className="w-full px-4 py-2 text-left hover:bg-fixly-accent/10 transition-colors first:rounded-t-lg last:rounded-b-lg text-fixly-text dark:text-gray-200"
                    >
                      <div className="flex items-center justify-between">
                        <span>{suggestion}</span>
                        <TrendingUp className="h-3 w-3 text-fixly-accent" />
                      </div>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-3 rounded-xl border transition-colors relative ${
              showFilters
                ? 'bg-fixly-accent text-white border-fixly-accent'
                : 'bg-fixly-card dark:bg-gray-800 text-fixly-text dark:text-gray-200 border-fixly-border dark:border-gray-600 hover:bg-fixly-accent/10'
            }`}
          >
            <SlidersHorizontal className="h-5 w-5" />
            {Object.values(filters).some(filter =>
              typeof filter === 'object' ?
                Object.values(filter).some(val => val !== '' && val !== 0 && val !== 'all' && val !== null && (!Array.isArray(val) || val.length > 0)) :
                filter !== 'all' && filter !== 0 && filter !== false && filter !== 'relevance'
            ) && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-fixly-accent rounded-full animate-pulse" />
            )}
          </button>

          {showLocationDetection && (
            <button
              onClick={getUserLocation}
              disabled={locationLoading}
              className="p-3 bg-fixly-card dark:bg-gray-800 text-fixly-text dark:text-gray-200 border border-fixly-border dark:border-gray-600 rounded-xl hover:bg-fixly-accent/10 transition-colors disabled:opacity-50"
              title="Use my location"
            >
              {locationLoading ? (
                <div className="animate-spin h-5 w-5 border-2 border-current border-t-transparent rounded-full" />
              ) : (
                <Navigation className="h-5 w-5" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Enhanced Advanced Filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-fixly-card dark:bg-gray-800 border border-fixly-border dark:border-gray-700 rounded-xl p-6 space-y-6"
          >
            {/* Filter Header with Live Activity */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <h3 className="text-lg font-semibold text-fixly-text dark:text-gray-100">
                  Search Filters
                </h3>
                <div className="flex items-center space-x-1 text-sm text-fixly-text-muted dark:text-gray-400">
                  <Activity className="h-3 w-3 animate-pulse text-green-500" />
                  <span>Live results</span>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={resetFilters}
                  className="text-sm text-fixly-text-muted dark:text-gray-400 hover:text-fixly-accent transition-colors"
                >
                  Reset All
                </button>
                <button
                  onClick={() => setShowFilters(false)}
                  className="p-1 hover:bg-fixly-accent/10 rounded-lg transition-colors"
                >
                  <X className="h-4 w-4 text-fixly-text-muted dark:text-gray-400" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Enhanced Location Filter */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-fixly-text dark:text-gray-200">
                  <MapPin className="inline h-4 w-4 mr-1" />
                  Location
                  {userLocation && (
                    <span className="ml-2 text-xs text-green-500">GPS detected</span>
                  )}
                </label>

                <select
                  value={filters.location.type}
                  onChange={(e) => updateFilter('location', 'type', e.target.value)}
                  className="w-full px-3 py-2 bg-fixly-bg dark:bg-gray-700 border border-fixly-border dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-fixly-accent text-fixly-text dark:text-gray-100"
                >
                  <option value="all">All Locations</option>
                  <option value="nearby">Nearby (GPS)</option>
                  <option value="city">Specific City</option>
                </select>

                {filters.location.type === 'city' && (
                  <input
                    type="text"
                    value={filters.location.city}
                    onChange={(e) => updateFilter('location', 'city', e.target.value)}
                    placeholder="Enter city name"
                    className="w-full px-3 py-2 bg-fixly-bg dark:bg-gray-700 border border-fixly-border dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-fixly-accent text-fixly-text dark:text-gray-100"
                  />
                )}

                {filters.location.type === 'nearby' && (
                  <div className="space-y-2">
                    <label className="text-xs text-fixly-text-muted dark:text-gray-400">
                      Radius: {filters.location.radius} km
                    </label>
                    <input
                      type="range"
                      min="5"
                      max="100"
                      value={filters.location.radius}
                      onChange={(e) => updateFilter('location', 'radius', parseInt(e.target.value))}
                      className="w-full accent-fixly-accent"
                    />
                  </div>
                )}
              </div>

              {/* Enhanced Budget Filter */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-fixly-text dark:text-gray-200">
                  <DollarSign className="inline h-4 w-4 mr-1" />
                  Budget Range
                </label>

                <select
                  value={filters.budget.type}
                  onChange={(e) => updateFilter('budget', 'type', e.target.value)}
                  className="w-full px-3 py-2 bg-fixly-bg dark:bg-gray-700 border border-fixly-border dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-fixly-accent text-fixly-text dark:text-gray-100"
                >
                  <option value="all">Any Budget</option>
                  <option value="fixed">Fixed Price</option>
                  <option value="hourly">Hourly Rate</option>
                  <option value="negotiable">Negotiable</option>
                </select>

                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    value={filters.budget.min}
                    onChange={(e) => updateFilter('budget', 'min', parseInt(e.target.value) || 0)}
                    placeholder="Min ₹"
                    className="px-3 py-2 bg-fixly-bg dark:bg-gray-700 border border-fixly-border dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-fixly-accent text-fixly-text dark:text-gray-100"
                  />
                  <input
                    type="number"
                    value={filters.budget.max}
                    onChange={(e) => updateFilter('budget', 'max', parseInt(e.target.value) || 100000)}
                    placeholder="Max ₹"
                    className="px-3 py-2 bg-fixly-bg dark:bg-gray-700 border border-fixly-border dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-fixly-accent text-fixly-text dark:text-gray-100"
                  />
                </div>
              </div>

              {/* Enhanced Urgency Filter */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-fixly-text dark:text-gray-200">
                  <Clock className="inline h-4 w-4 mr-1" />
                  Urgency Level
                </label>

                <select
                  value={filters.urgency}
                  onChange={(e) => setFilters(prev => ({ ...prev, urgency: e.target.value }))}
                  className="w-full px-3 py-2 bg-fixly-bg dark:bg-gray-700 border border-fixly-border dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-fixly-accent text-fixly-text dark:text-gray-100"
                >
                  <option value="all">Any Urgency</option>
                  <option value="urgent">🔴 Urgent (ASAP)</option>
                  <option value="high">🟡 High (Today)</option>
                  <option value="medium">🟢 Medium (This Week)</option>
                  <option value="low">⚪ Low (Flexible)</option>
                </select>
              </div>

              {/* Rating Filter */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-fixly-text dark:text-gray-200">
                  <Star className="inline h-4 w-4 mr-1" />
                  Minimum Rating
                </label>

                <div className="flex items-center space-x-2">
                  {[0, 1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      onClick={() => setFilters(prev => ({ ...prev, rating }))}
                      className={`px-3 py-1 rounded-lg text-sm transition-all ${
                        filters.rating === rating
                          ? 'bg-fixly-accent text-white shadow-lg transform scale-105'
                          : 'bg-fixly-bg dark:bg-gray-700 text-fixly-text dark:text-gray-200 hover:bg-fixly-accent/10'
                      }`}
                    >
                      {rating === 0 ? 'Any' : `${rating}+`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sort By with Real-time Updates */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-fixly-text dark:text-gray-200">
                  Sort By
                </label>

                <select
                  value={filters.sortBy}
                  onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
                  className="w-full px-3 py-2 bg-fixly-bg dark:bg-gray-700 border border-fixly-border dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-fixly-accent text-fixly-text dark:text-gray-100"
                >
                  <option value="relevance">Most Relevant</option>
                  <option value="newest">🆕 Newest First</option>
                  <option value="budget_high">💰 Highest Budget</option>
                  <option value="budget_low">💵 Lowest Budget</option>
                  <option value="deadline">⚡ Urgent Deadline</option>
                  <option value="rating">⭐ Best Rated</option>
                </select>
              </div>
            </div>

            {/* Enhanced Skills Filter with Trending */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-fixly-text dark:text-gray-200">
                  Required Skills
                </label>
                <div className="text-xs text-fixly-text-muted dark:text-gray-400 flex items-center">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  Real-time trending
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {trendingSkills.map((skill) => (
                  <button
                    key={skill.name}
                    onClick={() => toggleSkill(skill.name)}
                    className={`px-3 py-1 rounded-full text-sm transition-all relative ${
                      filters.skills.includes(skill.name)
                        ? 'bg-fixly-accent text-white shadow-lg transform scale-105'
                        : 'bg-fixly-bg dark:bg-gray-700 text-fixly-text dark:text-gray-200 border border-fixly-border dark:border-gray-600 hover:bg-fixly-accent/10'
                    }`}
                  >
                    {skill.name}
                    {skill.isTrending && (
                      <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    )}
                    {skill.count > 0 && (
                      <span className="ml-1 text-xs opacity-75">({skill.count})</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Enhanced Additional Options */}
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={filters.materialsIncluded === 'included'}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    materialsIncluded: e.target.checked ? 'included' : 'all'
                  }))}
                  className="rounded border-fixly-border dark:border-gray-600 text-fixly-accent focus:ring-fixly-accent"
                />
                <span className="text-sm text-fixly-text dark:text-gray-200">Materials Included</span>
              </label>

              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={filters.verified}
                  onChange={(e) => setFilters(prev => ({ ...prev, verified: e.target.checked }))}
                  className="rounded border-fixly-border dark:border-gray-600 text-fixly-accent focus:ring-fixly-accent"
                />
                <span className="text-sm text-fixly-text dark:text-gray-200">Verified Hirers Only</span>
              </label>

              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={filters.jobType === 'recurring'}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    jobType: e.target.checked ? 'recurring' : 'all'
                  }))}
                  className="rounded border-fixly-border dark:border-gray-600 text-fixly-accent focus:ring-fixly-accent"
                />
                <span className="text-sm text-fixly-text dark:text-gray-200">Recurring Jobs</span>
              </label>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}