'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Star,
  Send,
  X,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  CheckCircle,
  AlertCircle,
  Heart
} from 'lucide-react';
import { toast } from 'sonner';

export default function ReviewForm({
  job,
  isOpen,
  onClose,
  onSubmit,
  userRole, // 'hirer' or 'fixer'
  isLoading = false
}) {
  const [formData, setFormData] = useState({
    rating: 0,
    title: '',
    comment: '',
    categories: {
      communication: 0,
      quality: 0,
      timeliness: 0,
      professionalism: 0,
      clarity: 0,
      responsiveness: 0,
      paymentTimeliness: 0
    },
    pros: [],
    cons: [],
    wouldRecommend: true,
    wouldHireAgain: true,
    tags: []
  });

  const [hoveredRating, setHoveredRating] = useState(0);
  const [hoveredCategory, setHoveredCategory] = useState({ category: '', rating: 0 });
  const [currentStep, setCurrentStep] = useState(1);
  const [newPro, setNewPro] = useState('');
  const [newCon, setNewCon] = useState('');

  // Define categories based on user role
  const categories = userRole === 'hirer' ? [
    { key: 'communication', label: 'Communication', description: 'How well did they communicate?' },
    { key: 'quality', label: 'Work Quality', description: 'Quality of work delivered' },
    { key: 'timeliness', label: 'Timeliness', description: 'Did they complete work on time?' },
    { key: 'professionalism', label: 'Professionalism', description: 'How professional were they?' }
  ] : [
    { key: 'clarity', label: 'Job Clarity', description: 'How clear were the job requirements?' },
    { key: 'responsiveness', label: 'Responsiveness', description: 'How responsive were they?' },
    { key: 'paymentTimeliness', label: 'Payment', description: 'Were payments made on time?' },
    { key: 'professionalism', label: 'Professionalism', description: 'How professional were they?' }
  ];

  const tags = userRole === 'hirer' ? [
    'excellent_work', 'on_time', 'great_communication', 'professional',
    'exceeded_expectations', 'fair_price', 'clean_work', 'polite',
    'experienced', 'reliable', 'creative', 'efficient'
  ] : [
    'clear_requirements', 'responsive', 'fair_payment', 'professional',
    'easy_to_work_with', 'prompt_payment', 'understanding', 'flexible',
    'good_communication', 'reasonable_expectations'
  ];

  const handleRatingClick = (rating) => {
    setFormData(prev => ({ ...prev, rating }));
  };

  const handleCategoryRating = (category, rating) => {
    setFormData(prev => ({
      ...prev,
      categories: {
        ...prev.categories,
        [category]: rating
      }
    }));
  };

  const handleTagToggle = (tag) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }));
  };

  const addPro = () => {
    if (newPro.trim() && formData.pros.length < 5) {
      setFormData(prev => ({
        ...prev,
        pros: [...prev.pros, newPro.trim()]
      }));
      setNewPro('');
    }
  };

  const addCon = () => {
    if (newCon.trim() && formData.cons.length < 5) {
      setFormData(prev => ({
        ...prev,
        cons: [...prev.cons, newCon.trim()]
      }));
      setNewCon('');
    }
  };

  const removePro = (index) => {
    setFormData(prev => ({
      ...prev,
      pros: prev.pros.filter((_, i) => i !== index)
    }));
  };

  const removeCon = (index) => {
    setFormData(prev => ({
      ...prev,
      cons: prev.cons.filter((_, i) => i !== index)
    }));
  };

  const isFormValid = () => {
    return formData.rating > 0 &&
           formData.comment.trim().length >= 10 &&
           formData.title.trim().length >= 5;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isFormValid()) {
      toast.error('Please fill in all required fields');
      return;
    }

    const reviewData = {
      ...formData,
      jobId: job.id
    };

    try {
      await onSubmit(reviewData);
      onClose();
      toast.success('Review submitted successfully!');
    } catch (error) {
      toast.error('Failed to submit review');
    }
  };

  const renderStars = (rating, onHover, onClick, size = 'w-8 h-8') => {
    return (
      <div className="flex space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            className={`${size} transition-colors duration-200`}
            onMouseEnter={() => onHover && onHover(star)}
            onMouseLeave={() => onHover && onHover(0)}
            onClick={() => onClick && onClick(star)}
          >
            <Star
              className={`w-full h-full ${
                star <= rating
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-gray-300 hover:text-yellow-400'
              }`}
            />
          </button>
        ))}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-fixly-primary to-fixly-secondary text-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Rate Your Experience</h2>
                <p className="opacity-90 mt-1">
                  {userRole === 'hirer'
                    ? `How was working with the fixer for "${job.title}"?`
                    : `How was working with the client for "${job.title}"?`
                  }
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-120px)]">
            {/* Overall Rating */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Overall Rating *
              </label>
              <div className="flex items-center space-x-4">
                {renderStars(
                  hoveredRating || formData.rating,
                  setHoveredRating,
                  handleRatingClick,
                  'w-10 h-10'
                )}
                <span className="text-lg font-semibold text-gray-700">
                  {hoveredRating || formData.rating}/5
                </span>
              </div>
            </div>

            {/* Review Title */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Review Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Summarize your experience in a few words"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fixly-primary focus:border-transparent"
                maxLength={100}
                required
              />
              <div className="text-xs text-gray-500 text-right">
                {formData.title.length}/100
              </div>
            </div>

            {/* Detailed Categories */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800">Detailed Ratings</h3>
              <div className="grid gap-4">
                {categories.map((category) => (
                  <div key={category.key} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-700">
                        {category.label}
                      </label>
                      <span className="text-sm text-gray-500">
                        {formData.categories[category.key]}/5
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">{category.description}</p>
                    {renderStars(
                      hoveredCategory.category === category.key ? hoveredCategory.rating : formData.categories[category.key],
                      (rating) => setHoveredCategory({ category: category.key, rating }),
                      (rating) => handleCategoryRating(category.key, rating),
                      'w-6 h-6'
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Written Review */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Written Review *
              </label>
              <textarea
                value={formData.comment}
                onChange={(e) => setFormData(prev => ({ ...prev, comment: e.target.value }))}
                placeholder="Share details about your experience..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fixly-primary focus:border-transparent resize-none"
                rows={4}
                maxLength={1000}
                required
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>Minimum 10 characters</span>
                <span>{formData.comment.length}/1000</span>
              </div>
            </div>

            {/* Pros and Cons */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Pros */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  What went well?
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newPro}
                    onChange={(e) => setNewPro(e.target.value)}
                    placeholder="Add a positive point"
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    maxLength={200}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addPro())}
                  />
                  <button
                    type="button"
                    onClick={addPro}
                    disabled={!newPro.trim() || formData.pros.length >= 5}
                    className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ThumbsUp className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-2">
                  {formData.pros.map((pro, index) => (
                    <div key={index} className="flex items-center justify-between bg-green-50 px-3 py-2 rounded-lg">
                      <span className="text-sm text-green-800">{pro}</span>
                      <button
                        type="button"
                        onClick={() => removePro(index)}
                        className="text-green-600 hover:text-green-800"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cons */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  What could be improved?
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newCon}
                    onChange={(e) => setNewCon(e.target.value)}
                    placeholder="Add an improvement point"
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    maxLength={200}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCon())}
                  />
                  <button
                    type="button"
                    onClick={addCon}
                    disabled={!newCon.trim() || formData.cons.length >= 5}
                    className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ThumbsDown className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-2">
                  {formData.cons.map((con, index) => (
                    <div key={index} className="flex items-center justify-between bg-red-50 px-3 py-2 rounded-lg">
                      <span className="text-sm text-red-800">{con}</span>
                      <button
                        type="button"
                        onClick={() => removeCon(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Tags */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Quick Tags (Optional)
              </label>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleTagToggle(tag)}
                    className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                      formData.tags.includes(tag)
                        ? 'bg-fixly-accent/20 border-fixly-accent/50 text-fixly-primary'
                        : 'bg-gray-100 border-gray-300 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {tag.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Recommendation */}
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <input
                  type="checkbox"
                  id="wouldRecommend"
                  checked={formData.wouldRecommend}
                  onChange={(e) => setFormData(prev => ({ ...prev, wouldRecommend: e.target.checked }))}
                  className="w-4 h-4 text-fixly-primary border-gray-300 rounded focus:ring-fixly-primary"
                />
                <label htmlFor="wouldRecommend" className="text-sm font-medium text-gray-700">
                  I would recommend this {userRole === 'hirer' ? 'fixer' : 'client'} to others
                </label>
              </div>

              {userRole === 'hirer' && (
                <div className="flex items-center space-x-4">
                  <input
                    type="checkbox"
                    id="wouldHireAgain"
                    checked={formData.wouldHireAgain}
                    onChange={(e) => setFormData(prev => ({ ...prev, wouldHireAgain: e.target.checked }))}
                    className="w-4 h-4 text-fixly-primary border-gray-300 rounded focus:ring-fixly-primary"
                  />
                  <label htmlFor="wouldHireAgain" className="text-sm font-medium text-gray-700">
                    I would hire this fixer again
                  </label>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-4 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!isFormValid() || isLoading}
                className="px-6 py-3 bg-gradient-to-r from-fixly-primary to-fixly-secondary text-white rounded-lg hover:from-fixly-primary-dark hover:to-fixly-secondary-dark disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition-all"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
                <span>{isLoading ? 'Submitting...' : 'Submit Review'}</span>
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}