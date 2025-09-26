'use client';

import { useState, useEffect, useRef } from 'react';
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
  Target
} from 'lucide-react';
import { redisUtils } from '../../lib/redis';
// Real-time search updates handled by main search hook

export default function AdvancedSearch({ 
  onSearch, 
  onFilterChange, 
  className = '',
  showLocationDetection = true 
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const searchTimeoutRef = useRef(null);

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

  // Skills options (this could be fetched from API)
  const skillOptions = [
    'Plumbing', 'Electrical', 'Carpentry', 'Painting', 'Cleaning',
    'Gardening', 'Moving', 'Assembly', 'Repair', 'Installation',
    'Maintenance', 'Renovation', 'Flooring', 'Roofing', 'HVAC'
  ];

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      handleSearch();
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, filters]);

  // Get user's current location
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

      // Try to get city name from coordinates
      try {
        const response = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${coordinates.latitude}&longitude=${coordinates.longitude}&localityLanguage=en`
        );
        const data = await response.json();
        
        if (data.city) {
          setFilters(prev => ({
            ...prev,
            location: {
              ...prev.location,
              city: data.city
            }
          }));
        }
      } catch (error) {
        console.error('Failed to get city name:', error);
      }
    } catch (error) {
      console.error('Error getting location:', error);
      alert('Unable to get your location. Please enter your city manually.');
    } finally {
      setLocationLoading(false);
    }
  };

  // Handle search
  const handleSearch = async () => {
    const searchParams = {
      query: searchQuery.trim(),
      filters,
      timestamp: Date.now()
    };

    // Cache recent searches
    try {
      await redisUtils.set(`recent_search_${Date.now()}`, searchParams, 3600); // 1 hour
    } catch (error) {
      console.error('Failed to cache search:', error);
    }

    onSearch?.(searchParams);
  };

  // Update filter
  const updateFilter = (category, key, value) => {
    setFilters(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }));
    onFilterChange?.(filters);
  };

  // Reset filters
  const resetFilters = () => {
    setFilters({
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
    });
  };

  // Toggle skill selection
  const toggleSkill = (skill) => {
    setFilters(prev => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter(s => s !== skill)
        : [...prev.skills, skill]
    }));
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Main Search Bar */}
      <div className="relative">
        <div className="flex items-center space-x-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-fixly-text-muted dark:text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for services, skills, or keywords..."
              className="w-full pl-10 pr-4 py-3 bg-fixly-card dark:bg-gray-800 border border-fixly-border dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-fixly-accent text-fixly-text dark:text-gray-100 placeholder:text-fixly-text-muted dark:placeholder:text-gray-400"
            />
          </div>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-3 rounded-xl border transition-colors ${
              showFilters
                ? 'bg-fixly-accent text-white border-fixly-accent'
                : 'bg-fixly-card dark:bg-gray-800 text-fixly-text dark:text-gray-200 border-fixly-border dark:border-gray-600 hover:bg-fixly-accent/10'
            }`}
          >
            <SlidersHorizontal className="h-5 w-5" />
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

      {/* Advanced Filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-fixly-card dark:bg-gray-800 border border-fixly-border dark:border-gray-700 rounded-xl p-6 space-y-6"
          >
            {/* Filter Header */}
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-fixly-text dark:text-gray-100">
                Search Filters
              </h3>
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
              {/* Location Filter */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-fixly-text dark:text-gray-200">
                  <MapPin className="inline h-4 w-4 mr-1" />
                  Location
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

                {(filters.location.type === 'nearby' || userLocation) && (
                  <div className="space-y-2">
                    <label className="text-xs text-fixly-text-muted dark:text-gray-400">
                      Radius: {filters.location.radius} km
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="100"
                      value={filters.location.radius}
                      onChange={(e) => updateFilter('location', 'radius', parseInt(e.target.value))}
                      className="w-full accent-fixly-accent"
                    />
                  </div>
                )}
              </div>

              {/* Budget Filter */}
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
                  <option value="all">All Budget Types</option>
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

              {/* Urgency Filter */}
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
                  <option value="all">All Urgency Levels</option>
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              {/* Deadline Filter */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-fixly-text dark:text-gray-200">
                  <Calendar className="inline h-4 w-4 mr-1" />
                  Deadline
                </label>
                
                <select
                  value={filters.deadline}
                  onChange={(e) => setFilters(prev => ({ ...prev, deadline: e.target.value }))}
                  className="w-full px-3 py-2 bg-fixly-bg dark:bg-gray-700 border border-fixly-border dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-fixly-accent text-fixly-text dark:text-gray-100"
                >
                  <option value="all">Any Deadline</option>
                  <option value="today">Today</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
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
                      className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                        filters.rating === rating
                          ? 'bg-fixly-accent text-white'
                          : 'bg-fixly-bg dark:bg-gray-700 text-fixly-text dark:text-gray-200 hover:bg-fixly-accent/10'
                      }`}
                    >
                      {rating === 0 ? 'Any' : `${rating}+`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sort By */}
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
                  <option value="newest">Newest First</option>
                  <option value="budget_high">Highest Budget</option>
                  <option value="budget_low">Lowest Budget</option>
                  <option value="deadline">Urgent Deadline</option>
                </select>
              </div>
            </div>

            {/* Skills Filter */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-fixly-text dark:text-gray-200">
                Required Skills
              </label>
              
              <div className="flex flex-wrap gap-2">
                {skillOptions.map((skill) => (
                  <button
                    key={skill}
                    onClick={() => toggleSkill(skill)}
                    className={`px-3 py-1 rounded-full text-sm transition-colors ${
                      filters.skills.includes(skill)
                        ? 'bg-fixly-accent text-white'
                        : 'bg-fixly-bg dark:bg-gray-700 text-fixly-text dark:text-gray-200 border border-fixly-border dark:border-gray-600 hover:bg-fixly-accent/10'
                    }`}
                  >
                    {skill}
                  </button>
                ))}
              </div>
            </div>

            {/* Additional Options */}
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
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}