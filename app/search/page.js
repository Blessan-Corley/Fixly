'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { 
  Search,
  MapPin,
  Filter,
  Calendar,
  DollarSign,
  Clock,
  Star,
  Eye,
  Users,
  ChevronDown,
  X,
  Loader,
  AlertCircle,
  SlidersHorizontal,
  Grid,
  List,
  ArrowUpDown
} from 'lucide-react';
import { toast } from 'sonner';
import { searchCities, skillCategories, getAllSkills } from '../../data/cities';

export default function SearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();

  // URL parameters
  const initialQuery = searchParams.get('q') || '';
  const initialLocation = searchParams.get('location') || '';
  const initialSkills = searchParams.get('skills')?.split(',').filter(Boolean) || [];

  // State management
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [selectedLocation, setSelectedLocation] = useState(initialLocation);
  const [selectedSkills, setSelectedSkills] = useState(initialSkills);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    budgetMin: '',
    budgetMax: '',
    budgetType: '',
    urgency: '',
    datePosted: '',
    sortBy: 'relevance'
  });

  // UI states
  const [viewMode, setViewMode] = useState('grid');
  const [totalResults, setTotalResults] = useState(0);

  // Location search
  const [locationQuery, setLocationQuery] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);

  // Skills search
  const [skillQuery, setSkillQuery] = useState('');
  const [skillSuggestions, setSkillSuggestions] = useState([]);
  const [showSkillSuggestions, setShowSkillSuggestions] = useState(false);

  // Search function
  const performSearch = useCallback(async () => {
    setLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const searchParams = new URLSearchParams();
      
      if (searchQuery) searchParams.set('q', searchQuery);
      if (selectedLocation) searchParams.set('location', selectedLocation);
      if (selectedSkills.length > 0) searchParams.set('skills', selectedSkills.join(','));
      if (filters.budgetMin) searchParams.set('budgetMin', filters.budgetMin);
      if (filters.budgetMax) searchParams.set('budgetMax', filters.budgetMax);
      if (filters.budgetType) searchParams.set('budgetType', filters.budgetType);
      if (filters.urgency) searchParams.set('urgency', filters.urgency);
      if (filters.datePosted) searchParams.set('datePosted', filters.datePosted);
      if (filters.sortBy) searchParams.set('sortBy', filters.sortBy);

      // Update URL without page reload
      const newUrl = `/search${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
      window.history.replaceState({}, '', newUrl);

      const response = await fetch(`/api/jobs/browse?${searchParams.toString()}`);
      
      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      setJobs(data.jobs || []);
      setTotalResults(data.total || 0);
    } catch (error) {
      console.error('Search error:', error);
      setError('Failed to search jobs. Please try again.');
      toast.error('Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedLocation, selectedSkills, filters]);

  // Initial search on component mount
  useEffect(() => {
    if (initialQuery || initialLocation || initialSkills.length > 0) {
      performSearch();
    }
  }, []);

  // Location search handler
  const handleLocationSearch = (query) => {
    setLocationQuery(query);
    if (query.length > 0) {
      const cities = searchCities(query);
      setLocationSuggestions(cities);
      setShowLocationSuggestions(true);
    } else {
      setShowLocationSuggestions(false);
    }
  };

  // Skills search handler
  const handleSkillSearch = (query) => {
    setSkillQuery(query);
    if (query.length > 0) {
      const skills = getAllSkills().filter(skill => 
        skill.toLowerCase().includes(query.toLowerCase())
      );
      setSkillSuggestions(skills.slice(0, 10));
      setShowSkillSuggestions(true);
    } else {
      setShowSkillSuggestions(false);
    }
  };

  // Add skill
  const addSkill = (skill) => {
    if (!selectedSkills.includes(skill)) {
      setSelectedSkills([...selectedSkills, skill]);
    }
    setSkillQuery('');
    setShowSkillSuggestions(false);
  };

  // Remove skill
  const removeSkill = (skill) => {
    setSelectedSkills(selectedSkills.filter(s => s !== skill));
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery('');
    setSelectedLocation('');
    setSelectedSkills([]);
    setFilters({
      budgetMin: '',
      budgetMax: '',
      budgetType: '',
      urgency: '',
      datePosted: '',
      sortBy: 'relevance'
    });
  };

  // Format currency
  const formatCurrency = (amount) => {
    if (!amount) return 'Not specified';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Format date
  const formatDate = (date) => {
    const now = new Date();
    const jobDate = new Date(date);
    const diffTime = Math.abs(now - jobDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays - 1} days ago`;
    return jobDate.toLocaleDateString('en-IN');
  };

  // Job card component
  const JobCard = ({ job }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card cursor-pointer hover:shadow-lg transition-shadow"
      onClick={() => router.push(`/jobs/${job._id}`)}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center space-x-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${ 
            job.urgency === 'urgent' ? 'bg-red-100 text-red-600' :
            job.urgency === 'medium' ? 'bg-orange-100 text-orange-600' :
            'bg-green-100 text-green-600'
          }`}>
            {job.urgency}
          </span>
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-600">
            {job.status}
          </span>
        </div>
        <div className="text-sm text-fixly-text-light">
          {formatDate(job.createdAt)}
        </div>
      </div>

      <h3 className="text-lg font-semibold text-fixly-text mb-2 line-clamp-2">
        {job.title}
      </h3>

      <p className="text-fixly-text-light text-sm mb-4 line-clamp-3">
        {job.description}
      </p>

      <div className="flex flex-wrap gap-2 mb-4">
        {job.skillsRequired?.slice(0, 3).map((skill, index) => (
          <span 
            key={index}
            className="px-2 py-1 bg-fixly-accent-light text-fixly-accent text-xs rounded-full"
          >
            {skill}
          </span>
        ))}
        {job.skillsRequired?.length > 3 && (
          <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
            +{job.skillsRequired.length - 3} more
          </span>
        )}
      </div>

      <div className="flex justify-between items-center">
        <div className="flex items-center text-fixly-text-light text-sm space-x-4">
          <div className="flex items-center">
            <MapPin className="h-4 w-4 mr-1" />
            {job.location?.city || 'Remote'}
          </div>
          <div className="flex items-center">
            <Users className="h-4 w-4 mr-1" />
            {job.applications?.length || 0}
          </div>
          <div className="flex items-center">
            <Eye className="h-4 w-4 mr-1" />
            {job.views?.count || 0}
          </div>
        </div>
        <div className="text-lg font-bold text-fixly-accent">
          {job.budget?.type === 'fixed' 
            ? formatCurrency(job.budget.amount)
            : job.budget?.type === 'range' 
            ? `${formatCurrency(job.budget.min)} - ${formatCurrency(job.budget.max)}`
            : 'Negotiable'
          }
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-fixly-bg">
      {/* Search Header */}
      <div className="bg-white border-b border-fixly-border sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* Search Query */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-fixly-text-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search jobs..."
                className="input-field pl-10"
                onKeyPress={(e) => e.key === 'Enter' && performSearch()}
              />
            </div>

            {/* Location */}
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-fixly-text-muted" />
              <input
                type="text"
                value={locationQuery || selectedLocation}
                onChange={(e) => {
                  if (selectedLocation) {
                    setSelectedLocation('');
                  }
                  handleLocationSearch(e.target.value);
                }}
                placeholder="Location"
                className="input-field pl-10"
              />
              {showLocationSuggestions && locationSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-white border border-fixly-border rounded-lg shadow-lg mt-1 max-h-60 overflow-y-auto z-20">
                  {locationSuggestions.map((city, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setSelectedLocation(city);
                        setLocationQuery('');
                        setShowLocationSuggestions(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-fixly-bg"
                    >
                      {city}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Skills */}
            <div className="relative">
              <input
                type="text"
                value={skillQuery}
                onChange={(e) => handleSkillSearch(e.target.value)}
                placeholder="Add skills..."
                className="input-field"
              />
              {showSkillSuggestions && skillSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-white border border-fixly-border rounded-lg shadow-lg mt-1 max-h-60 overflow-y-auto z-20">
                  {skillSuggestions.map((skill, index) => (
                    <button
                      key={index}
                      onClick={() => addSkill(skill)}
                      className="w-full text-left px-4 py-2 hover:bg-fixly-bg"
                    >
                      {skill}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Search Button */}
            <div className="flex space-x-2">
              <button
                onClick={performSearch}
                disabled={loading}
                className="btn-primary flex-1"
              >
                {loading ? (
                  <Loader className="animate-spin h-4 w-4 mr-2" />
                ) : (
                  <Search className="h-4 w-4 mr-2" />
                )}
                Search
              </button>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="btn-ghost px-3"
              >
                <SlidersHorizontal className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Selected Skills */}
          {selectedSkills.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {selectedSkills.map((skill, index) => (
                <span 
                  key={index}
                  className="flex items-center px-3 py-1 bg-fixly-accent-light text-fixly-accent text-sm rounded-full"
                >
                  {skill}
                  <button
                    onClick={() => removeSkill(skill)}
                    className="ml-2 hover:text-red-500"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Advanced Filters */}
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-4 p-4 bg-fixly-bg rounded-lg border border-fixly-border"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <div>
                  <label className="block text-sm font-medium text-fixly-text mb-1">
                    Min Budget (₹)
                  </label>
                  <input
                    type="number"
                    value={filters.budgetMin}
                    onChange={(e) => setFilters(prev => ({ ...prev, budgetMin: e.target.value }))}
                    className="input-field"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-fixly-text mb-1">
                    Max Budget (₹)
                  </label>
                  <input
                    type="number"
                    value={filters.budgetMax}
                    onChange={(e) => setFilters(prev => ({ ...prev, budgetMax: e.target.value }))}
                    className="input-field"
                    placeholder="100000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-fixly-text mb-1">
                    Budget Type
                  </label>
                  <select
                    value={filters.budgetType}
                    onChange={(e) => setFilters(prev => ({ ...prev, budgetType: e.target.value }))}
                    className="input-field"
                  >
                    <option value="">Any</option>
                    <option value="fixed">Fixed</option>
                    <option value="range">Range</option>
                    <option value="negotiable">Negotiable</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-fixly-text mb-1">
                    Urgency
                  </label>
                  <select
                    value={filters.urgency}
                    onChange={(e) => setFilters(prev => ({ ...prev, urgency: e.target.value }))}
                    className="input-field"
                  >
                    <option value="">Any</option>
                    <option value="urgent">Urgent</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-fixly-text mb-1">
                    Date Posted
                  </label>
                  <select
                    value={filters.datePosted}
                    onChange={(e) => setFilters(prev => ({ ...prev, datePosted: e.target.value }))}
                    className="input-field"
                  >
                    <option value="">Any time</option>
                    <option value="today">Today</option>
                    <option value="week">This week</option>
                    <option value="month">This month</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end space-x-2 mt-4">
                <button
                  onClick={clearFilters}
                  className="btn-ghost"
                >
                  Clear All
                </button>
                <button
                  onClick={performSearch}
                  className="btn-primary"
                >
                  Apply Filters
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Results Header */}
        {hasSearched && (
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-fixly-text">
                {totalResults > 0 ? `${totalResults} jobs found` : 'No jobs found'}
              </h1>
              {searchQuery && (
                <p className="text-fixly-text-light">
                  Results for "{searchQuery}"
                  {selectedLocation && ` in ${selectedLocation}`}
                </p>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-fixly-text-light">Sort by:</span>
                <select
                  value={filters.sortBy}
                  onChange={(e) => {
                    setFilters(prev => ({ ...prev, sortBy: e.target.value }));
                    performSearch();
                  }}
                  className="text-sm border border-fixly-border rounded-lg px-3 py-1"
                >
                  <option value="relevance">Relevance</option>
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                  <option value="budget_high">Budget: High to Low</option>
                  <option value="budget_low">Budget: Low to High</option>
                  <option value="applications">Most Applications</option>
                </select>
              </div>
              <div className="flex items-center border border-fixly-border rounded-lg">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 ${viewMode === 'grid' ? 'bg-fixly-accent text-white' : 'text-fixly-text-light'}`}
                >
                  <Grid className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 ${viewMode === 'list' ? 'bg-fixly-accent text-white' : 'text-fixly-text-light'}`}
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <Loader className="h-8 w-8 animate-spin text-fixly-accent mx-auto mb-4" />
            <p className="text-fixly-text-light">Searching for jobs...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-fixly-text mb-2">Search Error</h2>
            <p className="text-fixly-text-light mb-6">{error}</p>
            <button onClick={performSearch} className="btn-primary">
              Try Again
            </button>
          </div>
        )}

        {/* No Results */}
        {hasSearched && !loading && jobs.length === 0 && !error && (
          <div className="text-center py-12">
            <Search className="h-12 w-12 text-fixly-text-light mx-auto mb-4" />
            <h2 className="text-xl font-bold text-fixly-text mb-2">No jobs found</h2>
            <p className="text-fixly-text-light mb-6">
              Try adjusting your search criteria or browse all jobs
            </p>
            <div className="space-x-4">
              <button onClick={clearFilters} className="btn-ghost">
                Clear Filters
              </button>
              <button 
                onClick={() => router.push('/dashboard/browse-jobs')}
                className="btn-primary"
              >
                Browse All Jobs
              </button>
            </div>
          </div>
        )}

        {/* Results Grid/List */}
        {jobs.length > 0 && (
          <div className={`grid gap-6 ${
            viewMode === 'grid' 
              ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' 
              : 'grid-cols-1'
          }`}>
            {jobs.map((job) => (
              <JobCard key={job._id} job={job} />
            ))}
          </div>
        )}

        {/* Welcome Message for First Visit */}
        {!hasSearched && !loading && (
          <div className="text-center py-12">
            <Search className="h-16 w-16 text-fixly-accent mx-auto mb-6" />
            <h1 className="text-3xl font-bold text-fixly-text mb-4">Find Your Next Job</h1>
            <p className="text-fixly-text-light text-lg mb-8 max-w-2xl mx-auto">
              Search through thousands of jobs posted by verified clients. 
              Use the search bar above to find jobs that match your skills and location.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <div className="text-center">
                <div className="p-4 bg-fixly-accent-light rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <Search className="h-8 w-8 text-fixly-accent" />
                </div>
                <h3 className="font-semibold text-fixly-text mb-2">Search & Filter</h3>
                <p className="text-fixly-text-light text-sm">
                  Use advanced filters to find jobs that match your skills and preferences
                </p>
              </div>
              <div className="text-center">
                <div className="p-4 bg-fixly-accent-light rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <Eye className="h-8 w-8 text-fixly-accent" />
                </div>
                <h3 className="font-semibold text-fixly-text mb-2">Browse Details</h3>
                <p className="text-fixly-text-light text-sm">
                  View detailed job descriptions, requirements, and client information
                </p>
              </div>
              <div className="text-center">
                <div className="p-4 bg-fixly-accent-light rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <Users className="h-8 w-8 text-fixly-accent" />
                </div>
                <h3 className="font-semibold text-fixly-text mb-2">Apply Easily</h3>
                <p className="text-fixly-text-light text-sm">
                  Submit your application with a personalized message and proposal
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}