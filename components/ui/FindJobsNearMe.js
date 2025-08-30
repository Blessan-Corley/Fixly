'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, Navigation, Target, Search, Filter, Clock,
  Zap, Loader, CheckCircle, AlertTriangle, RefreshCcw,
  Users, Briefcase, DollarSign, Eye
} from 'lucide-react';
import { toast } from 'sonner';
import { locationManager } from '../../utils/locationManager';

export default function FindJobsNearMe({ 
  user, 
  onLocationEnabled, 
  showJobResults = false,
  className = "" 
}) {
  const [locationState, setLocationState] = useState('disabled'); // disabled, requesting, enabled, error
  const [currentLocation, setCurrentLocation] = useState(null);
  const [nearbyJobs, setNearbyJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchRadius, setSearchRadius] = useState(10); // km
  const [jobFilters, setJobFilters] = useState({
    minBudget: '',
    maxBudget: '',
    jobType: 'all',
    urgency: 'all'
  });

  // Check initial location permission status
  useEffect(() => {
    checkLocationStatus();
  }, []);

  const checkLocationStatus = async () => {
    try {
      const permission = await locationManager.getPermissionStatus();
      const cachedLocation = locationManager.getCachedLocation();
      
      if (permission === 'granted' && cachedLocation) {
        setLocationState('enabled');
        setCurrentLocation(cachedLocation);
        if (showJobResults) {
          loadNearbyJobs(cachedLocation);
        }
      } else if (permission === 'denied') {
        setLocationState('error');
      } else {
        setLocationState('disabled');
      }
    } catch (error) {
      console.error('Location status check failed:', error);
    }
  };

  const handleEnableLocation = async () => {
    setLocationState('requesting');
    setLoading(true);

    try {
      // Request location permission and get current location
      const location = await locationManager.getCurrentLocation({
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes cache
      });

      // Save location to server with precise coordinates
      await locationManager.saveLocationToServer(location, {
        source: 'find_jobs_near_me',
        silent: false,
        backgroundUpdate: false
      });

      setCurrentLocation(location);
      setLocationState('enabled');
      
      // Start location watching for continuous updates
      locationManager.startWatching({
        autoSave: true,
        silent: true,
        enableHighAccuracy: false
      });

      toast.success('📍 Location enabled! Finding jobs near you...', {
        duration: 3000
      });

      // Load nearby jobs
      if (showJobResults) {
        await loadNearbyJobs(location);
      }

      // Notify parent component
      if (onLocationEnabled) {
        onLocationEnabled(location);
      }

    } catch (error) {
      console.error('Location enable error:', error);
      setLocationState('error');
      
      if (error.code === 1) { // PERMISSION_DENIED
        toast.error('Location access denied. Please enable location in your browser settings.');
      } else if (error.code === 2) { // POSITION_UNAVAILABLE
        toast.error('Unable to determine your location. Please check your GPS settings.');
      } else if (error.code === 3) { // TIMEOUT
        toast.error('Location request timed out. Please try again.');
      } else {
        toast.error('Failed to get your location. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadNearbyJobs = async (location) => {
    if (!location) return;
    
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        lat: location.lat.toString(),
        lng: location.lng.toString(),
        radius: searchRadius.toString(),
        ...jobFilters.minBudget && { minBudget: jobFilters.minBudget },
        ...jobFilters.maxBudget && { maxBudget: jobFilters.maxBudget },
        ...jobFilters.jobType !== 'all' && { jobType: jobFilters.jobType },
        ...jobFilters.urgency !== 'all' && { urgency: jobFilters.urgency },
        limit: '20'
      });

      const response = await fetch(`/api/jobs/nearby?${queryParams}`);
      const data = await response.json();

      if (response.ok) {
        setNearbyJobs(data.jobs || []);
        toast.success(`🎯 Found ${data.jobs?.length || 0} jobs near you!`);
      } else {
        toast.error('Failed to load nearby jobs');
        setNearbyJobs([]);
      }
    } catch (error) {
      console.error('Failed to load nearby jobs:', error);
      toast.error('Failed to load nearby jobs');
      setNearbyJobs([]);
    } finally {
      setLoading(false);
    }
  };

  const calculateDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in km
  };

  const formatDistance = (distance) => {
    if (distance < 1) return `${Math.round(distance * 1000)}m away`;
    return `${distance.toFixed(1)}km away`;
  };

  const handleRefreshJobs = () => {
    if (currentLocation) {
      loadNearbyJobs(currentLocation);
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      {/* Location Enable Section */}
      {locationState === 'disabled' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 text-center"
        >
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-6 mb-4">
            <MapPin className="h-12 w-12 text-blue-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Find Jobs Near You</h3>
            <p className="text-gray-600 mb-4">
              Enable location to discover jobs in your area with precise 1-meter accuracy
            </p>
            <button
              onClick={handleEnableLocation}
              disabled={loading}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all font-medium flex items-center mx-auto"
            >
              {loading ? (
                <Loader className="animate-spin h-4 w-4 mr-2" />
              ) : (
                <Navigation className="h-4 w-4 mr-2" />
              )}
              Enable Location & Find Jobs
            </button>
          </div>
          
          <div className="text-xs text-gray-500 space-y-1">
            <div className="flex items-center justify-center">
              <Target className="h-3 w-3 mr-1 text-green-600" />
              <span>1-meter precision location tracking</span>
            </div>
            <div className="flex items-center justify-center">
              <CheckCircle className="h-3 w-3 mr-1 text-blue-600" />
              <span>Your privacy is protected</span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Location Requesting State */}
      {locationState === 'requesting' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-6 text-center"
        >
          <div className="bg-blue-50 rounded-lg p-6">
            <div className="animate-pulse">
              <Navigation className="h-12 w-12 text-blue-600 mx-auto mb-4" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Getting Your Location</h3>
            <p className="text-gray-600 mb-4">Please allow location access when prompted by your browser</p>
            <div className="flex items-center justify-center text-sm text-gray-500">
              <Loader className="animate-spin h-4 w-4 mr-2" />
              Waiting for location permission...
            </div>
          </div>
        </motion.div>
      )}

      {/* Location Error State */}
      {locationState === 'error' && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="p-6 text-center"
        >
          <div className="bg-red-50 rounded-lg p-6">
            <AlertTriangle className="h-12 w-12 text-red-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Location Access Needed</h3>
            <p className="text-gray-600 mb-4">
              We need location access to show you nearby jobs. Please enable location in your browser settings.
            </p>
            <div className="space-y-2">
              <button
                onClick={handleEnableLocation}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center mx-auto"
              >
                <RefreshCcw className="h-4 w-4 mr-2" />
                Try Again
              </button>
              <div className="text-xs text-gray-500">
                Or manually browse all jobs without location filtering
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Location Enabled & Job Results */}
      {locationState === 'enabled' && currentLocation && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6"
        >
          {/* Location Status */}
          <div className="bg-green-50 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="bg-green-100 rounded-full p-2 mr-3">
                  <Target className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <h4 className="font-medium text-green-800">Location Active</h4>
                  <p className="text-sm text-green-600">
                    📍 Precise location enabled (±{currentLocation.accuracy || 'Unknown'}m accuracy)
                  </p>
                </div>
              </div>
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
          </div>

          {showJobResults && (
            <>
              {/* Search Controls */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h4 className="font-medium text-gray-900 mb-4 flex items-center">
                  <Filter className="h-4 w-4 mr-2" />
                  Job Search Filters
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Search Radius</label>
                    <select
                      value={searchRadius}
                      onChange={(e) => setSearchRadius(parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    >
                      <option value={5}>5 km</option>
                      <option value={10}>10 km</option>
                      <option value={25}>25 km</option>
                      <option value={50}>50 km</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Min Budget (₹)</label>
                    <input
                      type="number"
                      value={jobFilters.minBudget}
                      onChange={(e) => setJobFilters(prev => ({ ...prev, minBudget: e.target.value }))}
                      placeholder="Any amount"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Job Type</label>
                    <select
                      value={jobFilters.jobType}
                      onChange={(e) => setJobFilters(prev => ({ ...prev, jobType: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    >
                      <option value="all">All Types</option>
                      <option value="one_time">One Time</option>
                      <option value="recurring">Recurring</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Urgency</label>
                    <select
                      value={jobFilters.urgency}
                      onChange={(e) => setJobFilters(prev => ({ ...prev, urgency: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    >
                      <option value="all">All Levels</option>
                      <option value="urgent">Urgent</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                </div>
                
                <button
                  onClick={handleRefreshJobs}
                  disabled={loading}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                >
                  {loading ? (
                    <Loader className="animate-spin h-4 w-4 mr-2" />
                  ) : (
                    <Search className="h-4 w-4 mr-2" />
                  )}
                  Find Jobs Near Me
                </button>
              </div>

              {/* Job Results */}
              {nearbyJobs.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-gray-900 flex items-center">
                      <Briefcase className="h-4 w-4 mr-2" />
                      Jobs Near You ({nearbyJobs.length})
                    </h4>
                    <button
                      onClick={handleRefreshJobs}
                      disabled={loading}
                      className="text-blue-600 hover:text-blue-700 text-sm flex items-center"
                    >
                      <RefreshCcw className="h-3 w-3 mr-1" />
                      Refresh
                    </button>
                  </div>
                  
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {nearbyJobs.map((job) => {
                      const distance = job.location?.lat && job.location?.lng 
                        ? calculateDistance(currentLocation.lat, currentLocation.lng, job.location.lat, job.location.lng)
                        : null;
                      
                      return (
                        <div key={job._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h5 className="font-medium text-gray-900 mb-1">{job.title}</h5>
                              <p className="text-sm text-gray-600 mb-2 line-clamp-2">{job.description}</p>
                              
                              <div className="flex items-center gap-4 text-sm text-gray-500">
                                <div className="flex items-center">
                                  <MapPin className="h-3 w-3 mr-1 text-red-500" />
                                  {job.location?.city || 'Unknown location'}
                                  {distance && (
                                    <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                                      {formatDistance(distance)}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center">
                                  <DollarSign className="h-3 w-3 mr-1 text-green-500" />
                                  {job.budget?.type === 'negotiable' ? 'Negotiable' : `₹${job.budget?.amount?.toLocaleString()}`}
                                </div>
                                <div className="flex items-center">
                                  <Clock className="h-3 w-3 mr-1 text-orange-500" />
                                  {job.urgency || 'normal'}
                                </div>
                              </div>
                            </div>
                            
                            <button
                              onClick={() => window.location.href = `/dashboard/jobs/${job._id}`}
                              className="ml-4 px-3 py-2 text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors text-sm flex items-center"
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              View
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h4 className="font-medium text-gray-900 mb-2">No Jobs Found</h4>
                  <p className="text-gray-600 text-sm">
                    No jobs found within {searchRadius}km of your location. Try expanding your search radius.
                  </p>
                </div>
              )}
            </>
          )}
        </motion.div>
      )}
    </div>
  );
}