'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  MapPin,
  Star,
  Filter,
  User,
  Briefcase,
  CheckCircle,
  Phone,
  Mail,
  Eye,
  Heart,
  MessageCircle,
  Shield,
  Clock,
  Award,
  Loader,
  X,
  Send,
  Calendar,
  ThumbsUp
} from 'lucide-react';
import { useApp, RoleGuard } from '../../providers';
import { toast } from 'sonner';

export default function FindFixersPage() {
  return (
    <RoleGuard roles={['hirer']} fallback={
      <div className="p-6 lg:p-8">
        <div className="max-w-md mx-auto text-center">
          <div className="card">
            <User className="h-16 w-16 text-fixly-accent mx-auto mb-4" />
            <h2 className="text-xl font-bold text-fixly-text mb-2">
              Hirer Access Required
            </h2>
            <p className="text-fixly-text-muted mb-4">
              Only hirers can access the find fixers feature.
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
      <FindFixersContent />
    </RoleGuard>
  );
}

function FindFixersContent() {
  const { user } = useApp();
  
  const [fixers, setFixers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    hasMore: false
  });

  const [filters, setFilters] = useState({
    search: '',
    location: '',
    skills: [],
    minRating: '',
    maxDistance: '',
    availability: '',
    priceRange: '',
    sortBy: 'rating'
  });

  const [showFilters, setShowFilters] = useState(false);
  const [selectedFixer, setSelectedFixer] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);

  // AbortController refs
  const fetchAbortRef = useRef(null);
  const messageAbortRef = useRef(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (fetchAbortRef.current) fetchAbortRef.current.abort();
      if (messageAbortRef.current) messageAbortRef.current.abort();
    };
  }, []);

  const skillOptions = [
    'Plumbing', 'Electrical', 'Carpentry', 'Painting', 'Cleaning',
    'AC Repair', 'Appliance Repair', 'Gardening', 'Moving', 'Handyman',
    'Pest Control', 'Home Security', 'Interior Design', 'Masonry'
  ];

  useEffect(() => {
    fetchFixers(true);
  }, [filters.sortBy, filters.minRating, filters.availability]);

  const fetchFixers = async (reset = false) => {
    try {
      if (reset) {
        setLoading(true);
        setPagination(prev => ({ ...prev, page: 1 }));
      } else {
        setSearching(true);
      }

      // Cancel previous request
      if (fetchAbortRef.current) {
        fetchAbortRef.current.abort();
      }
      const abortController = new AbortController();
      fetchAbortRef.current = abortController;

      const params = new URLSearchParams({
        page: reset ? '1' : pagination.page.toString(),
        limit: '12',
        role: 'fixer',
        isPro: 'true', // Always filter for Pro fixers only
        ...Object.fromEntries(
          Object.entries(filters).filter(([key, value]) =>
            key !== 'isPro' && value !== '' && (Array.isArray(value) ? value.length > 0 : true)
          )
        )
      });

      if (filters.skills.length > 0) {
        params.set('skills', filters.skills.join(','));
      }

      const response = await fetch(`/api/user/profile/search?${params}`, {
        signal: abortController.signal
      });

      if (abortController.signal.aborted) {
        return;
      }

      // Handle empty responses
      const text = await response.text();
      let data;
      try {
        data = text ? JSON.parse(text) : {};
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        throw new Error('Invalid response from server');
      }

      if (response.ok) {
        if (reset) {
          setFixers(data.users || []);
        } else {
          setFixers(prev => [...prev, ...(data.users || [])]);
        }
        setPagination(data.pagination || { page: 1, totalPages: 1, hasMore: false });
      } else {
        toast.error(data.message || 'Failed to fetch fixers');
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        return;
      }
      console.error('Error fetching fixers:', error);
      toast.error('Failed to fetch fixers');
    } finally {
      setLoading(false);
      setSearching(false);
    }
  };

  const handleSearch = () => {
    fetchFixers(true);
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleSkillToggle = (skill) => {
    setFilters(prev => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter(s => s !== skill)
        : [...prev.skills, skill]
    }));
  };

  const handleContactFixer = (fixer) => {
    setSelectedFixer(fixer);
    setShowMessageModal(true);
  };

  const handleViewProfile = (fixer) => {
    setSelectedFixer(fixer);
    setShowProfileModal(true);
  };

  const getRatingStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(<Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />);
    }
    
    if (hasHalfStar) {
      stars.push(<Star key="half" className="h-4 w-4 fill-yellow-400/50 text-yellow-400" />);
    }
    
    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<Star key={`empty-${i}`} className="h-4 w-4 text-gray-300" />);
    }

    return stars;
  };

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-2xl font-bold text-fixly-text">
            Find Pro Fixers
          </h1>
          <span className="flex items-center text-sm bg-fixly-accent/20 text-fixly-primary px-3 py-1 rounded-full">
            <Award className="h-4 w-4 mr-1" />
            Pro Only
          </span>
        </div>
        <p className="text-fixly-text-light">
          Exclusively verified professional fixers with active Pro subscriptions
        </p>
      </div>

      {/* Search and Filters */}
      <div className="card mb-8">
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-fixly-text-muted" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                placeholder="Search fixers by name, skills, or location..."
                className="input-field pl-10"
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={handleSearch}
              disabled={searching}
              className="btn-primary flex items-center"
            >
              {searching ? (
                <Loader className="animate-spin h-4 w-4 mr-2" />
              ) : (
                <Search className="h-4 w-4 mr-2" />
              )}
              Search
            </button>
            
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="btn-secondary flex items-center"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </button>
          </div>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-fixly-border pt-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-fixly-text mb-2">Location</label>
                <input
                  type="text"
                  value={filters.location}
                  onChange={(e) => handleFilterChange('location', e.target.value)}
                  placeholder="City, State"
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-fixly-text mb-2">Min Rating</label>
                <select
                  value={filters.minRating}
                  onChange={(e) => handleFilterChange('minRating', e.target.value)}
                  className="select-field"
                >
                  <option value="">Any Rating</option>
                  <option value="4">4+ Stars</option>
                  <option value="4.5">4.5+ Stars</option>
                  <option value="4.8">4.8+ Stars</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-fixly-text mb-2">Availability</label>
                <select
                  value={filters.availability}
                  onChange={(e) => handleFilterChange('availability', e.target.value)}
                  className="select-field"
                >
                  <option value="">Any Time</option>
                  <option value="available">Available Now</option>
                  <option value="this_week">This Week</option>
                  <option value="flexible">Flexible</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-fixly-text mb-2">Sort By</label>
                <select
                  value={filters.sortBy}
                  onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                  className="select-field"
                >
                  <option value="rating">Highest Rated</option>
                  <option value="reviews">Most Reviews</option>
                  <option value="recent">Recently Active</option>
                  <option value="distance">Nearest</option>
                </select>
              </div>
            </div>

            {/* Skills Filter */}
            <div>
              <label className="block text-sm font-medium text-fixly-text mb-2">Skills</label>
              <div className="flex flex-wrap gap-2">
                {skillOptions.map((skill) => (
                  <button
                    key={skill}
                    onClick={() => handleSkillToggle(skill)}
                    className={`px-3 py-1 rounded-full text-sm transition-colors ${
                      filters.skills.includes(skill)
                        ? 'bg-fixly-accent text-white'
                        : 'bg-fixly-bg border border-fixly-border text-fixly-text hover:border-fixly-accent'
                    }`}
                  >
                    {skill}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader className="animate-spin h-8 w-8 text-fixly-accent" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {fixers.map((fixer) => (
              <motion.div
                key={fixer._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="card hover:shadow-fixly-lg transition-all duration-300 hover:-translate-y-1 border border-fixly-border hover:border-fixly-accent"
              >
                {/* Fixer Header */}
                <div className="flex items-start mb-4">
                  <img
                    src={fixer.profilePhoto || '/default-avatar.png'}
                    alt={fixer.name}
                    className="h-16 w-16 rounded-full object-cover mr-4"
                  />
                  <div className="flex-1">
                    <h3 className="font-semibold text-fixly-text mb-1">{fixer.name}</h3>
                    <div className="flex items-center mb-1">
                      {getRatingStars(fixer.rating?.average || 0)}
                      <span className="text-sm text-fixly-text-muted ml-2">
                        ({fixer.rating?.count || 0} reviews)
                      </span>
                    </div>
                    <div className="flex items-center text-sm text-fixly-text-muted">
                      <MapPin className="h-3 w-3 mr-1" />
                      {fixer.location?.city ? `${fixer.location.city}, ${fixer.location.state || 'India'}` : 'Location not specified'}
                    </div>
                  </div>
                </div>

                {/* Skills */}
                <div className="mb-4">
                  <div className="flex flex-wrap gap-1">
                    {(fixer.skills || []).slice(0, 3).map((skill, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-fixly-accent/10 text-fixly-accent text-xs rounded-full"
                      >
                        {skill}
                      </span>
                    ))}
                    {(fixer.skills || []).length > 3 && (
                      <span className="px-2 py-1 bg-fixly-bg text-fixly-text-muted text-xs rounded-full">
                        +{fixer.skills.length - 3} more
                      </span>
                    )}
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 mb-4 p-3 bg-fixly-bg rounded-lg">
                  <div className="text-center">
                    <div className="font-semibold text-fixly-text">{fixer.jobsCompleted || 0}</div>
                    <div className="text-xs text-fixly-text-muted">Jobs Done</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-fixly-text">
                      {fixer.responseTime || 'N/A'}
                    </div>
                    <div className="text-xs text-fixly-text-muted">Response Time</div>
                  </div>
                </div>

                {/* Badges */}
                <div className="flex items-center gap-2 mb-4">
                  {fixer.isVerified && (
                    <span className="flex items-center text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Verified
                    </span>
                  )}
                  <span className="flex items-center text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                    <Clock className="h-3 w-3 mr-1" />
                    Available
                  </span>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleViewProfile(fixer)}
                    className="btn-secondary flex-1 flex items-center justify-center"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Profile
                  </button>
                  <button
                    onClick={() => handleContactFixer(fixer)}
                    className="btn-primary flex-1 flex items-center justify-center"
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Contact
                  </button>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Load More */}
          {pagination.hasMore && (
            <div className="text-center">
              <button
                onClick={() => fetchFixers(false)}
                disabled={searching}
                className="btn-secondary"
              >
                {searching ? (
                  <Loader className="animate-spin h-4 w-4 mr-2" />
                ) : null}
                Load More Fixers
              </button>
            </div>
          )}

          {/* No Results */}
          {!loading && fixers.length === 0 && (
            <div className="text-center py-12">
              <User className="h-16 w-16 text-fixly-text-muted mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-fixly-text mb-2">No Fixers Found</h3>
              <p className="text-fixly-text-muted mb-4">
                Try adjusting your search criteria or filters to find more fixers.
              </p>
              <button
                onClick={() => {
                  setFilters({
                    search: '',
                    location: '',
                    skills: [],
                    minRating: '',
                    maxDistance: '',
                    availability: '',
                    priceRange: '',
                    sortBy: 'rating'
                  });
                  fetchFixers(true);
                }}
                className="btn-primary"
              >
                Clear Filters
              </button>
            </div>
          )}
        </>
      )}

      {/* Profile Modal */}
      {showProfileModal && selectedFixer && (
        <ProfileModal
          fixer={selectedFixer}
          onClose={() => {
            setShowProfileModal(false);
            setSelectedFixer(null);
          }}
          onContact={() => {
            setShowProfileModal(false);
            setShowMessageModal(true);
          }}
        />
      )}

      {/* Message Modal */}
      {showMessageModal && selectedFixer && (
        <MessageModal
          fixer={selectedFixer}
          onClose={() => {
            setShowMessageModal(false);
            setSelectedFixer(null);
          }}
        />
      )}
    </div>
  );
}

// Profile Modal Component
function ProfileModal({ fixer, onClose, onContact }) {
  const getRatingStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(<Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />);
    }

    if (hasHalfStar) {
      stars.push(<Star key="half" className="h-4 w-4 fill-yellow-400/50 text-yellow-400" />);
    }

    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<Star key={`empty-${i}`} className="h-4 w-4 text-gray-300" />);
    }

    return stars;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-fixly-card rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="p-6 border-b border-fixly-border">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4">
              <img
                src={fixer.profilePhoto || '/default-avatar.png'}
                alt={fixer.name}
                className="h-20 w-20 rounded-full object-cover"
              />
              <div>
                <h2 className="text-2xl font-bold text-fixly-text mb-1">{fixer.name}</h2>
                <div className="flex items-center mb-2">
                  {getRatingStars(fixer.rating?.average || 0)}
                  <span className="text-sm text-fixly-text-muted ml-2">
                    {fixer.rating?.average?.toFixed(1)} ({fixer.rating?.count || 0} reviews)
                  </span>
                </div>
                <div className="flex items-center text-fixly-text-muted">
                  <MapPin className="h-4 w-4 mr-1" />
                  {fixer.location?.city ? `${fixer.location.city}, ${fixer.location.state || 'India'}` : 'Location not specified'}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-fixly-bg rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Badges */}
          <div className="flex items-center gap-2 mb-6">
            {fixer.isVerified && (
              <span className="flex items-center text-sm bg-green-100 text-green-800 px-3 py-1 rounded-full">
                <CheckCircle className="h-4 w-4 mr-1" />
                Verified Professional
              </span>
            )}
            <span className="flex items-center text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
              <Clock className="h-4 w-4 mr-1" />
              Available
            </span>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-fixly-bg rounded-lg">
              <div className="text-2xl font-bold text-fixly-text">{fixer.jobsCompleted || 0}</div>
              <div className="text-sm text-fixly-text-muted">Jobs Completed</div>
            </div>
            <div className="text-center p-4 bg-fixly-bg rounded-lg">
              <div className="text-2xl font-bold text-fixly-text">{fixer.rating?.count || 0}</div>
              <div className="text-sm text-fixly-text-muted">Reviews</div>
            </div>
            <div className="text-center p-4 bg-fixly-bg rounded-lg">
              <div className="text-2xl font-bold text-fixly-text">{fixer.responseTime || '< 1hr'}</div>
              <div className="text-sm text-fixly-text-muted">Response Time</div>
            </div>
          </div>

          {/* Skills */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-fixly-text mb-3">Skills & Expertise</h3>
            <div className="flex flex-wrap gap-2">
              {(fixer.skills || []).map((skill, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-fixly-accent/10 text-fixly-accent text-sm rounded-full"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>

          {/* Bio */}
          {fixer.bio && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-fixly-text mb-3">About</h3>
              <p className="text-fixly-text-muted leading-relaxed">{fixer.bio}</p>
            </div>
          )}

          {/* Recent Reviews */}
          {fixer.recentReviews && fixer.recentReviews.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-fixly-text mb-3">Recent Reviews</h3>
              <div className="space-y-3">
                {fixer.recentReviews.slice(0, 3).map((review, index) => (
                  <div key={index} className="p-3 bg-fixly-bg rounded-lg">
                    <div className="flex items-center mb-2">
                      {getRatingStars(review.rating)}
                      <span className="text-sm text-fixly-text-muted ml-2">
                        {new Date(review.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-fixly-text">{review.comment}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Contact Button */}
          <button
            onClick={onContact}
            className="w-full btn-primary flex items-center justify-center"
          >
            <MessageCircle className="h-5 w-5 mr-2" />
            Contact {fixer.name}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// Message Modal Component
function MessageModal({ fixer, onClose }) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const sendAbortRef = useRef(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sendAbortRef.current) sendAbortRef.current.abort();
    };
  }, []);

  const handleSendMessage = async () => {
    if (!message.trim()) {
      toast.error('Please enter a message');
      return;
    }

    setSending(true);
    try {
      // Cancel previous request
      if (sendAbortRef.current) {
        sendAbortRef.current.abort();
      }
      const abortController = new AbortController();
      sendAbortRef.current = abortController;

      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipientId: fixer._id,
          message: message.trim(),
          type: 'initial_contact'
        }),
        signal: abortController.signal
      });

      if (abortController.signal.aborted) {
        return;
      }

      const data = await response.json();

      if (response.ok) {
        toast.success('Message sent successfully!');
        onClose();
      } else {
        toast.error(data.message || 'Failed to send message');
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        return;
      }
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-fixly-card rounded-xl max-w-md w-full"
      >
        {/* Header */}
        <div className="p-6 border-b border-fixly-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img
                src={fixer.profilePhoto || '/default-avatar.png'}
                alt={fixer.name}
                className="h-12 w-12 rounded-full object-cover"
              />
              <div>
                <h2 className="text-lg font-semibold text-fixly-text">Contact {fixer.name}</h2>
                <p className="text-sm text-fixly-text-muted">Send a message to start the conversation</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-fixly-bg rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-fixly-text mb-2">
              Your Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Hi, I'm interested in your services for my project. Could you please provide more details about your availability and pricing?"
              className="textarea-field h-32 resize-none"
              maxLength={500}
            />
            <div className="text-right text-xs text-fixly-text-muted mt-1">
              {message.length}/500
            </div>
          </div>

          <div className="bg-fixly-bg rounded-lg p-3 mb-4">
            <p className="text-sm text-fixly-text-muted">
              💡 <strong>Tip:</strong> Be specific about your project requirements, timeline, and location to get a better response.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="btn-ghost flex-1"
            >
              Cancel
            </button>
            <button
              onClick={handleSendMessage}
              disabled={sending || !message.trim()}
              className="btn-primary flex-1 flex items-center justify-center"
            >
              {sending ? (
                <Loader className="animate-spin h-4 w-4 mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Send Message
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}