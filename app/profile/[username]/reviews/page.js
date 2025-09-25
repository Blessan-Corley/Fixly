'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Star,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Filter,
  Search,
  Calendar,
  User,
  CheckCircle,
  Award,
  TrendingUp,
  BarChart3,
  Loader,
  ArrowLeft,
  Eye,
  EyeOff,
  Flag,
  Reply,
  MoreVertical
} from 'lucide-react';
import { toast } from 'sonner';

export default function UserReviewsPage() {
  const { username } = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  
  const [user, setUser] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [ratingStats, setRatingStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filters, setFilters] = useState({
    reviewType: 'all',
    rating: 'all',
    sortBy: 'createdAt',
    search: ''
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    hasMore: false
  });

  useEffect(() => {
    if (username) {
      fetchUserAndReviews();
    }
  }, [username, filters]);

  const fetchUserAndReviews = async (page = 1) => {
    try {
      if (page === 1) setLoading(true);
      else setLoadingMore(true);

      // Fetch user details
      if (page === 1) {
        const userResponse = await fetch(`/api/user/profile/${username}`);
        const userData = await userResponse.json();
        
        if (userData.success) {
          setUser(userData.user);
        } else {
          toast.error('User not found');
          router.push('/');
          return;
        }
      }

      // Build query parameters
      const params = new URLSearchParams({
        userId: user?._id || '',
        page: page.toString(),
        limit: '10',
        sortBy: filters.sortBy,
        sortOrder: 'desc'
      });

      if (filters.reviewType !== 'all') params.append('reviewType', filters.reviewType);
      if (filters.rating !== 'all') params.append('minRating', filters.rating);
      if (filters.search) params.append('search', filters.search);

      const response = await fetch(`/api/reviews?${params}`);
      const data = await response.json();

      if (data.success) {
        if (page === 1) {
          setReviews(data.reviews);
          setRatingStats(data.ratingStats);
        } else {
          setReviews(prev => [...prev, ...data.reviews]);
        }
        setPagination(data.pagination);
      } else {
        toast.error(data.message || 'Failed to fetch reviews');
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
      toast.error('Failed to fetch reviews');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMore = () => {
    if (pagination.hasMore && !loadingMore) {
      fetchUserAndReviews(pagination.currentPage + 1);
    }
  };

  const toggleHelpfulVote = async (reviewId) => {
    if (!session) {
      toast.error('Please login to vote');
      return;
    }

    try {
      const response = await fetch(`/api/reviews/${reviewId}/helpful`, {
        method: 'POST'
      });

      const data = await response.json();

      if (data.success) {
        setReviews(prev =>
          prev.map(review =>
            review._id === reviewId
              ? {
                  ...review,
                  helpfulVotes: {
                    ...review.helpfulVotes,
                    count: data.helpfulCount,
                    users: data.action === 'added'
                      ? [...review.helpfulVotes.users, session.user.id]
                      : review.helpfulVotes.users.filter(id => id !== session.user.id)
                  }
                }
              : review
          )
        );
      } else {
        toast.error(data.message || 'Failed to update vote');
      }
    } catch (error) {
      console.error('Error toggling helpful vote:', error);
      toast.error('Failed to update vote');
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getTagColor = (tag) => {
    const positiveClass = 'bg-green-100 text-green-800 border-green-200';
    const negativeClass = 'bg-red-100 text-red-800 border-red-200';
    
    const positiveTags = [
      'excellent_work', 'on_time', 'great_communication', 'professional',
      'exceeded_expectations', 'fair_price', 'clean_work', 'polite',
      'experienced', 'reliable', 'creative', 'efficient'
    ];
    
    return positiveTags.includes(tag) ? positiveClass : negativeClass;
  };

  const RatingBars = ({ stats }) => {
    if (!stats) return null;

    return (
      <div className="space-y-2">
        {[5, 4, 3, 2, 1].map(rating => {
          const count = stats.distribution[rating] || 0;
          const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0;
          
          return (
            <div key={rating} className="flex items-center space-x-3">
              <div className="flex items-center space-x-1 w-12">
                <span className="text-sm text-fixly-text">{rating}</span>
                <Star className="h-3 w-3 text-yellow-500 fill-current" />
              </div>
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-yellow-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <span className="text-sm text-fixly-text-light w-8">{count}</span>
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader className="h-8 w-8 animate-spin text-fixly-accent" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <User className="h-12 w-12 text-fixly-text-light mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-fixly-text">User not found</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-fixly-bg py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center text-fixly-text-light hover:text-fixly-accent mb-4"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back
          </button>
          
          <div className="flex items-start space-x-6">
            <div className="h-20 w-20 bg-fixly-accent-light rounded-full flex items-center justify-center">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.name}
                  className="h-20 w-20 rounded-full object-cover"
                />
              ) : (
                <User className="h-10 w-10 text-fixly-accent" />
              )}
            </div>
            
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-fixly-text mb-2">
                {user.name}'s Reviews
              </h1>
              <p className="text-fixly-text-light mb-4">
                @{user.username} • {user.role === 'fixer' ? 'Service Provider' : 'Client'}
              </p>
              
              {ratingStats && ratingStats.total > 0 && (
                <div className="flex items-center space-x-4">
                  <div className="flex items-center">
                    <Star className="h-5 w-5 text-yellow-500 fill-current mr-1" />
                    <span className="text-xl font-semibold text-fixly-text">
                      {ratingStats.average}
                    </span>
                    <span className="text-fixly-text-light ml-1">
                      ({ratingStats.total} review{ratingStats.total !== 1 ? 's' : ''})
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar - Rating Statistics */}
          <div className="lg:col-span-1">
            <div className="card sticky top-8">
              <h3 className="text-lg font-semibold text-fixly-text mb-6">Rating Overview</h3>
              
              {ratingStats && ratingStats.total > 0 ? (
                <div className="space-y-6">
                  {/* Overall Rating */}
                  <div className="text-center">
                    <div className="text-4xl font-bold text-fixly-text mb-2">
                      {ratingStats.average}
                    </div>
                    <div className="flex items-center justify-center mb-2">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-5 w-5 ${
                            i < Math.floor(ratingStats.average)
                              ? 'text-yellow-500 fill-current'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-sm text-fixly-text-light">
                      Based on {ratingStats.total} review{ratingStats.total !== 1 ? 's' : ''}
                    </p>
                  </div>

                  {/* Rating Distribution */}
                  <div>
                    <h4 className="text-sm font-medium text-fixly-text mb-3">Rating Distribution</h4>
                    <RatingBars stats={ratingStats} />
                  </div>

                  {/* Detailed Ratings */}
                  {ratingStats.detailed && (
                    <div>
                      <h4 className="text-sm font-medium text-fixly-text mb-3">
                        Detailed Ratings
                      </h4>
                      
                      {ratingStats.detailed.asFixer && (
                        <div className="space-y-2 mb-4">
                          <p className="text-xs text-fixly-text-light font-medium">As Service Provider</p>
                          {Object.entries(ratingStats.detailed.asFixer).map(([key, value]) => {
                            if (key === 'totalReviews' || key === '_id') return null;
                            return (
                              <div key={key} className="flex justify-between text-sm">
                                <span className="text-fixly-text-light capitalize">
                                  {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                                </span>
                                <span className="text-fixly-text font-medium">
                                  {value ? value.toFixed(1) : 'N/A'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {ratingStats.detailed.asClient && (
                        <div className="space-y-2">
                          <p className="text-xs text-fixly-text-light font-medium">As Client</p>
                          {Object.entries(ratingStats.detailed.asClient).map(([key, value]) => {
                            if (key === 'totalReviews' || key === '_id') return null;
                            return (
                              <div key={key} className="flex justify-between text-sm">
                                <span className="text-fixly-text-light capitalize">
                                  {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                                </span>
                                <span className="text-fixly-text font-medium">
                                  {value ? value.toFixed(1) : 'N/A'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Star className="h-12 w-12 text-fixly-text-light mx-auto mb-4" />
                  <p className="text-fixly-text-light">No reviews yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Main Content - Reviews List */}
          <div className="lg:col-span-3">
            {/* Filters */}
            <div className="card mb-8">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-fixly-text-muted" />
                  <input
                    type="text"
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    placeholder="Search reviews..."
                    className="input-field pl-10"
                  />
                </div>
                
                <select
                  value={filters.reviewType}
                  onChange={(e) => setFilters(prev => ({ ...prev, reviewType: e.target.value }))}
                  className="select-field"
                >
                  <option value="all">All Reviews</option>
                  <option value="client_to_fixer">As Service Provider</option>
                  <option value="fixer_to_client">As Client</option>
                </select>

                <select
                  value={filters.rating}
                  onChange={(e) => setFilters(prev => ({ ...prev, rating: e.target.value }))}
                  className="select-field"
                >
                  <option value="all">All Ratings</option>
                  <option value="5">5 Stars</option>
                  <option value="4">4+ Stars</option>
                  <option value="3">3+ Stars</option>
                  <option value="2">2+ Stars</option>
                  <option value="1">1+ Stars</option>
                </select>

                <select
                  value={filters.sortBy}
                  onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
                  className="select-field"
                >
                  <option value="createdAt">Most Recent</option>
                  <option value="rating.overall">Highest Rated</option>
                  <option value="helpfulVotes.count">Most Helpful</option>
                </select>
              </div>
            </div>

            {/* Reviews List */}
            <div className="space-y-6">
              {reviews.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="h-12 w-12 text-fixly-text-light mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-fixly-text mb-2">
                    No reviews found
                  </h3>
                  <p className="text-fixly-text-light">
                    {filters.search || filters.reviewType !== 'all' || filters.rating !== 'all'
                      ? 'Try adjusting your filters'
                      : 'This user hasn\'t received any reviews yet'
                    }
                  </p>
                </div>
              ) : (
                reviews.map((review, index) => (
                  <motion.div
                    key={review._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="card"
                  >
                    {/* Review Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start space-x-4">
                        <div className="h-12 w-12 bg-fixly-accent-light rounded-full flex items-center justify-center">
                          {review.reviewer.photoURL ? (
                            <img
                              src={review.reviewer.photoURL}
                              alt={review.reviewer.name}
                              className="h-12 w-12 rounded-full object-cover"
                            />
                          ) : (
                            <User className="h-6 w-6 text-fixly-accent" />
                          )}
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className="font-semibold text-fixly-text">
                              {review.reviewer.name}
                            </h4>
                            <span className="text-sm text-fixly-text-light">
                              @{review.reviewer.username}
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              review.reviewType === 'client_to_fixer'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-fixly-accent/20 text-fixly-primary'
                            }`}>
                              {review.reviewType === 'client_to_fixer' ? 'Client Review' : 'Service Provider Review'}
                            </span>
                          </div>
                          
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`h-4 w-4 ${
                                    i < Math.floor(review.rating.overall)
                                      ? 'text-yellow-500 fill-current'
                                      : 'text-gray-300'
                                  }`}
                                />
                              ))}
                              <span className="ml-2 text-sm font-medium text-fixly-text">
                                {review.rating.overall}/5
                              </span>
                            </div>
                            
                            <span className="text-sm text-fixly-text-light">
                              {formatDate(review.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Job Info */}
                    {review.job && (
                      <div className="mb-4 p-3 bg-fixly-bg rounded-lg">
                        <p className="text-sm text-fixly-text-light">
                          Job: <span className="text-fixly-text font-medium">{review.job.title}</span>
                        </p>
                      </div>
                    )}

                    {/* Review Content */}
                    <div className="mb-4">
                      <h5 className="font-semibold text-fixly-text mb-2">
                        {review.title}
                      </h5>
                      <p className="text-fixly-text-light leading-relaxed">
                        {review.comment}
                      </p>
                    </div>

                    {/* Pros and Cons */}
                    {(review.pros.length > 0 || review.cons.length > 0) && (
                      <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        {review.pros.length > 0 && (
                          <div>
                            <h6 className="text-sm font-medium text-green-600 mb-2 flex items-center">
                              <ThumbsUp className="h-4 w-4 mr-1" />
                              Pros
                            </h6>
                            <ul className="space-y-1">
                              {review.pros.map((pro, i) => (
                                <li key={i} className="text-sm text-fixly-text-light">
                                  • {pro}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {review.cons.length > 0 && (
                          <div>
                            <h6 className="text-sm font-medium text-red-600 mb-2 flex items-center">
                              <ThumbsDown className="h-4 w-4 mr-1" />
                              Cons
                            </h6>
                            <ul className="space-y-1">
                              {review.cons.map((con, i) => (
                                <li key={i} className="text-sm text-fixly-text-light">
                                  • {con}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Tags */}
                    {review.tags.length > 0 && (
                      <div className="mb-4">
                        <div className="flex flex-wrap gap-2">
                          {review.tags.map(tag => (
                            <span
                              key={tag}
                              className={`px-2 py-1 rounded-full text-xs border ${getTagColor(tag)}`}
                            >
                              {tag.replace(/_/g, ' ')}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Response from reviewee */}
                    {review.response && review.response.comment && (
                      <div className="mb-4 p-4 bg-blue-50 border-l-4 border-blue-400 rounded-lg">
                        <div className="flex items-center mb-2">
                          <Reply className="h-4 w-4 text-blue-600 mr-2" />
                          <span className="text-sm font-medium text-blue-800">
                            Response from {user.name}
                          </span>
                          <span className="text-sm text-blue-600 ml-2">
                            {formatDate(review.response.respondedAt)}
                          </span>
                        </div>
                        <p className="text-sm text-blue-700">
                          {review.response.comment}
                        </p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-4 border-t border-fixly-border">
                      <div className="flex items-center space-x-4">
                        <button
                          onClick={() => toggleHelpfulVote(review._id)}
                          className={`flex items-center space-x-1 text-sm transition-colors ${
                            session && review.helpfulVotes.users.includes(session.user.id)
                              ? 'text-fixly-accent'
                              : 'text-fixly-text-light hover:text-fixly-accent'
                          }`}
                        >
                          <ThumbsUp className="h-4 w-4" />
                          <span>Helpful ({review.helpfulVotes.count})</span>
                        </button>
                        
                        {review.wouldRecommend && (
                          <div className="flex items-center space-x-1 text-sm text-green-600">
                            <CheckCircle className="h-4 w-4" />
                            <span>Recommended</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {session && session.user.id !== review.reviewer._id && (
                          <button className="text-fixly-text-light hover:text-red-500 transition-colors">
                            <Flag className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            {/* Load More */}
            {pagination.hasMore && (
              <div className="text-center mt-8">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="btn-secondary flex items-center mx-auto"
                >
                  {loadingMore ? (
                    <Loader className="h-5 w-5 animate-spin mr-2" />
                  ) : (
                    <TrendingUp className="h-5 w-5 mr-2" />
                  )}
                  {loadingMore ? 'Loading...' : 'Load More Reviews'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}