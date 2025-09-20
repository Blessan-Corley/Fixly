'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ChevronRight,
  ChevronLeft,
  Check,
  Search,
  Sparkles,
  Plus,
  Zap,
  Wrench,
  Hammer,
  Settings,
  Smartphone,
  Sparkle,
  Car,
  Leaf,
  Truck,
  Scissors,
  Heart,
  Camera,
  Briefcase,
  Users,
  Home
} from 'lucide-react';
import { toast } from 'sonner';
import { skillCategories, getSkillSuggestions } from '../../data/cities';

// Category icon mapping for better visual representation
const categoryIcons = {
  'Electrical Services': { icon: Zap, color: 'bg-yellow-100 text-yellow-700', bgColor: 'bg-yellow-500' },
  'Plumbing Services': { icon: Wrench, color: 'bg-blue-100 text-blue-700', bgColor: 'bg-blue-500' },
  'Construction & Renovation': { icon: Hammer, color: 'bg-orange-100 text-orange-700', bgColor: 'bg-orange-500' },
  'Installation Services': { icon: Settings, color: 'bg-gray-100 text-gray-700', bgColor: 'bg-gray-500' },
  'Device Repair': { icon: Smartphone, color: 'bg-indigo-100 text-indigo-700', bgColor: 'bg-indigo-500' },
  'Cleaning Services': { icon: Sparkle, color: 'bg-teal-100 text-teal-700', bgColor: 'bg-teal-500' },
  'Automotive Services': { icon: Car, color: 'bg-red-100 text-red-700', bgColor: 'bg-red-500' },
  'Gardening Services': { icon: Leaf, color: 'bg-green-100 text-green-700', bgColor: 'bg-green-500' },
  'Moving Services': { icon: Truck, color: 'bg-purple-100 text-purple-700', bgColor: 'bg-purple-500' },
  'Beauty & Wellness': { icon: Scissors, color: 'bg-pink-100 text-pink-700', bgColor: 'bg-pink-500' },
  'Healthcare Services': { icon: Heart, color: 'bg-rose-100 text-rose-700', bgColor: 'bg-rose-500' },
  'Photography & Events': { icon: Camera, color: 'bg-violet-100 text-violet-700', bgColor: 'bg-violet-500' },
  'Tutoring & Education': { icon: Briefcase, color: 'bg-cyan-100 text-cyan-700', bgColor: 'bg-cyan-500' },
  'Security Services': { icon: Users, color: 'bg-slate-100 text-slate-700', bgColor: 'bg-slate-500' },
  'Digital Services': { icon: Settings, color: 'bg-emerald-100 text-emerald-700', bgColor: 'bg-emerald-500' },
};

/**
 * Unified SkillSelector Component
 * Works both as modal and inline component
 * @param {Object} props - Component props
 * @param {boolean} props.isModal - Whether to render as modal or inline
 * @param {boolean} props.isOpen - Modal open state (only for modal mode)
 * @param {Function} props.onClose - Modal close handler (only for modal mode)
 * @param {Array} props.selectedSkills - Currently selected skills
 * @param {Function} props.onSkillsChange - Callback when skills change
 * @param {number} props.maxSkills - Maximum number of skills allowed
 * @param {number} props.minSkills - Minimum number of skills required
 * @param {boolean} props.required - Whether skills are required
 * @param {string} props.className - Additional CSS classes
 */
export default function SkillSelector({
  isModal = false,
  isOpen = true,
  onClose,
  selectedSkills = [],
  onSkillsChange,
  maxSkills = 50,
  minSkills = 3,
  required = true,
  className = ""
}) {
  const [currentView, setCurrentView] = useState('categories');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const searchInputRef = useRef(null);
  const debounceTimer = useRef(null);

  // Debounce search query to avoid excessive updates
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 150); // Small delay to avoid excessive updates

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [searchQuery]);

  // Search functionality - runs only on debounced query
  useEffect(() => {
    if (debouncedQuery.length > 0) {
      setIsSearching(true);
      const allSkills = skillCategories.flatMap(cat => cat.skills);
      const results = allSkills.filter(skill =>
        skill.toLowerCase().includes(debouncedQuery.toLowerCase())
      );
      setSearchResults(results);

      // Only switch to search view if user has typed something meaningful
      if (debouncedQuery.length >= 2 && currentView === 'categories') {
        setCurrentView('search');
      }
      setIsSearching(false);
    } else {
      setSearchResults([]);
      setIsSearching(false);
      // Don't automatically switch back to avoid focus loss
    }
  }, [debouncedQuery, currentView]);

  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
    setCurrentView('skills');
  };

  const handleSkillToggle = (skill) => {
    if (selectedSkills.includes(skill)) {
      // Remove skill - check minimum
      if (selectedSkills.length <= minSkills) {
        toast.error(`Minimum ${minSkills} skills required`);
        return;
      }
      const updatedSkills = selectedSkills.filter(s => s !== skill);
      onSkillsChange(updatedSkills);
      // Don't show toast for every removal to reduce spam
    } else {
      // Add skill - check maximum
      if (selectedSkills.length >= maxSkills) {
        toast.error(`Maximum ${maxSkills} skills allowed`);
        return;
      }
      const updatedSkills = [...selectedSkills, skill];
      onSkillsChange(updatedSkills);
      // Don't show toast for every addition to reduce spam
    }
  };

  const handleBack = () => {
    if (currentView === 'skills') {
      setCurrentView('categories');
      setSelectedCategory(null);
    } else if (currentView === 'search') {
      setCurrentView('categories');
      setSearchQuery('');
    }
  };

  // Handle search input changes without losing focus
  const handleSearchChange = useCallback((e) => {
    const value = e.target.value;
    setSearchQuery(value);

    // Maintain focus on the input
    if (searchInputRef.current && document.activeElement !== searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 0);
    }
  }, []);

  const skillSuggestions = useMemo(() => {
    return getSkillSuggestions(selectedSkills, 6);
  }, [selectedSkills]);

  // Content component that can be used both in modal and inline
  const SkillSelectorContent = () => (
    <div className={`bg-white rounded-2xl ${!isModal ? 'border border-gray-200' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <div className="flex items-center">
          {(currentView === 'skills' || currentView === 'search') && (
            <button
              onClick={handleBack}
              className="mr-3 p-1 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="h-5 w-5 text-gray-600" />
            </button>
          )}
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {currentView === 'categories' && 'Select Your Skills'}
              {currentView === 'skills' && selectedCategory?.category}
              {currentView === 'search' && 'Search Skills'}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {currentView === 'categories' && 'Choose categories that match your expertise'}
              {currentView === 'skills' && `Select skills from ${selectedCategory?.category}`}
              {currentView === 'search' && 'Find specific skills quickly'}
            </p>
          </div>
        </div>
        {isModal && (
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="p-6 pb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search for skills..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="input-field pl-10"
            autoComplete="off"
          />
        </div>
      </div>

      {/* Selected Skills Preview */}
      {selectedSkills.length > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="px-6 pb-4 border-b border-gray-100 dark:border-gray-700"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
              <Check className="h-4 w-4 mr-2 text-fixly-primary" />
              Selected Skills ({selectedSkills.length})
            </h3>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {selectedSkills.length}/{maxSkills} selected
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedSkills.map((skill, index) => (
              <motion.button
                key={index}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => handleSkillToggle(skill)}
                className="inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-fixly-primary to-fixly-primary-light text-white text-sm rounded-full hover:from-fixly-primary-hover hover:to-fixly-primary transition-all duration-200 shadow-sm hover:shadow-md group"
              >
                <span className="font-medium">{skill}</span>
                <X className="h-3 w-3 ml-2 group-hover:scale-110 transition-transform" />
              </motion.button>
            ))}
          </div>
          {selectedSkills.length >= maxSkills && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs text-amber-600 dark:text-amber-400 mt-2 flex items-center"
            >
              <Sparkles className="h-3 w-3 mr-1" />
              You've reached the maximum of {maxSkills} skills
            </motion.p>
          )}
        </motion.div>
      )}

      {/* Content */}
      <div className="px-6 pb-6 overflow-y-auto max-h-96 min-h-[300px]">
        <AnimatePresence mode="wait">
          {/* Categories View */}
          {currentView === 'categories' && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-3"
            >
              {/* Smart Suggestions */}
              {skillSuggestions.length > 0 && (
                <div className="mb-6">
                  <h4 className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    <Sparkles className="h-4 w-4 mr-2 text-fixly-primary" />
                    Recommended for you
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {skillSuggestions.map((skill, index) => (
                      <button
                        key={index}
                        onClick={() => handleSkillToggle(skill)}
                        disabled={selectedSkills.includes(skill)}
                        className={`px-3 py-2 rounded-lg text-sm transition-all ${
                          selectedSkills.includes(skill)
                            ? 'bg-fixly-primary text-white'
                            : 'bg-fixly-card dark:bg-gray-800 text-fixly-text dark:text-gray-300 border border-fixly-border dark:border-gray-600 hover:border-fixly-primary hover:text-fixly-primary dark:hover:text-fixly-primary'
                        }`}
                      >
                        {skill}
                        {selectedSkills.includes(skill) && (
                          <Check className="h-3 w-3 ml-1 inline" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {skillCategories.map((category, index) => {
                const categorySkillCount = category.skills.filter(skill =>
                  selectedSkills.includes(skill)
                ).length;

                const iconData = categoryIcons[category.category] || categoryIcons['Digital Services'];
                const IconComponent = iconData.icon;

                return (
                  <button
                    key={index}
                    onClick={() => handleCategorySelect(category)}
                    className="w-full p-4 bg-fixly-bg-secondary dark:bg-gray-800 hover:bg-fixly-card dark:hover:bg-gray-700 border border-fixly-border dark:border-gray-600 hover:border-fixly-primary-light dark:hover:border-fixly-primary rounded-xl transition-all duration-200 group hover:shadow-lg"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className={`w-12 h-12 ${iconData.color} dark:bg-gray-700 rounded-xl flex items-center justify-center mr-4 group-hover:scale-105 transition-transform`}>
                          <IconComponent className="h-6 w-6 dark:text-gray-300" />
                        </div>
                        <div className="text-left">
                          <h3 className="font-medium text-fixly-text dark:text-white group-hover:text-fixly-primary dark:group-hover:text-fixly-primary">{category.category}</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {category.skills.length} skills available
                            {categorySkillCount > 0 && (
                              <span className="ml-2 text-fixly-primary dark:text-fixly-primary font-medium">
                                • {categorySkillCount} selected
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center">
                        {categorySkillCount > 0 && (
                          <div className="bg-fixly-primary text-white text-xs px-2 py-1 rounded-full mr-2 shadow-sm">
                            {categorySkillCount}
                          </div>
                        )}
                        <ChevronRight className="h-5 w-5 text-fixly-text-muted dark:text-gray-500 group-hover:text-fixly-primary transition-colors" />
                      </div>
                    </div>
                  </button>
                );
              })}
            </motion.div>
          )}

          {/* Skills View */}
          {currentView === 'skills' && selectedCategory && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              {/* Category Skills */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 auto-rows-max">
                {selectedCategory.skills.map((skill, index) => {
                  const isSelected = selectedSkills.includes(skill);
                  return (
                    <button
                      key={index}
                      onClick={() => handleSkillToggle(skill)}
                      className={`p-3 rounded-xl text-left transition-all duration-200 group ${
                        isSelected
                          ? 'bg-fixly-primary-bg dark:bg-fixly-primary/20 border-2 border-fixly-primary-light dark:border-fixly-primary text-fixly-primary dark:text-fixly-primary shadow-sm scale-[0.98]'
                          : 'bg-fixly-bg-secondary dark:bg-gray-800 hover:bg-fixly-card dark:hover:bg-gray-700 border border-fixly-border dark:border-gray-600 hover:border-fixly-primary-light dark:hover:border-fixly-primary text-fixly-text dark:text-white hover:shadow-md hover:scale-[1.02]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`font-medium ${isSelected ? 'text-fixly-primary' : 'text-fixly-text group-hover:text-fixly-primary'}`}>
                          {skill}
                        </span>
                        {isSelected ? (
                          <div className="flex items-center space-x-2">
                            <div className="bg-fixly-primary text-white rounded-full p-1">
                              <Check className="h-3 w-3" />
                            </div>
                          </div>
                        ) : (
                          <div className="w-5 h-5 border border-fixly-border rounded-full group-hover:border-fixly-primary transition-colors"></div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Search Results */}
          {currentView === 'search' && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-2"
            >
              {searchResults.length > 0 ? (
                searchResults.map((skill, index) => {
                  const isSelected = selectedSkills.includes(skill);
                  const category = skillCategories.find(cat => cat.skills.includes(skill));
                  const iconData = categoryIcons[category?.category] || categoryIcons['Digital Services'];
                  const IconComponent = iconData.icon;

                  return (
                    <motion.button
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => handleSkillToggle(skill)}
                      className={`w-full p-3 rounded-xl text-left transition-all duration-200 group ${
                        isSelected
                          ? 'bg-fixly-primary-bg border-2 border-fixly-primary-light text-fixly-primary shadow-sm'
                          : 'bg-fixly-bg-secondary hover:bg-fixly-card border border-fixly-border hover:border-fixly-primary-light text-fixly-text hover:shadow-md'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 ${iconData.color} rounded-lg flex items-center justify-center`}>
                            <IconComponent className="h-4 w-4" />
                          </div>
                          <div>
                            <span className={`font-medium ${isSelected ? 'text-fixly-primary' : 'text-fixly-text group-hover:text-fixly-primary'}`}>
                              {skill}
                            </span>
                            <p className="text-xs text-fixly-text-muted">{category?.category}</p>
                          </div>
                        </div>
                        {isSelected ? (
                          <div className="bg-fixly-primary text-white rounded-full p-1">
                            <Check className="h-3 w-3" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 border border-fixly-border rounded-full group-hover:border-fixly-primary transition-colors"></div>
                        )}
                      </div>
                    </motion.button>
                  );
                })
              ) : searchQuery.length > 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No skills found matching "{searchQuery}"</p>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Start typing to search for skills</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="p-6 pt-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Back button for non-category views */}
            {(currentView === 'skills' || currentView === 'search') && (
              <button
                onClick={handleBack}
                className="flex items-center px-3 py-2 text-sm text-fixly-text-muted dark:text-gray-400 hover:text-fixly-primary dark:hover:text-fixly-primary transition-colors"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </button>
            )}

            <div className="text-sm text-gray-600 dark:text-gray-400">
              {selectedSkills.length > 0 ? (
                <span>
                  {selectedSkills.length} of {maxSkills} skills selected
                  {selectedSkills.length < minSkills && (
                    <span className="text-amber-600 dark:text-amber-400 ml-2">
                      (need {minSkills - selectedSkills.length} more)
                    </span>
                  )}
                </span>
              ) : (
                <span>Select {minSkills}-{maxSkills} skills</span>
              )}
            </div>
          </div>

          {isModal && (
            <button
              onClick={onClose}
              disabled={required && selectedSkills.length < minSkills}
              className={`btn-primary ${
                required && selectedSkills.length < minSkills
                  ? 'opacity-50 cursor-not-allowed'
                  : ''
              }`}
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );

  if (isModal) {
    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="relative max-w-2xl w-full max-h-[80vh] overflow-hidden shadow-2xl"
        >
          <SkillSelectorContent />
        </motion.div>
      </div>
    );
  }

  return (
    <div className={className}>
      <SkillSelectorContent />
    </div>
  );
}