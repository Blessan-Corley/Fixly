'use client';

import { useState, useEffect, useMemo } from 'react';
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
  maxSkills = 10,
  minSkills = 1,
  required = true,
  className = ""
}) {
  const [currentView, setCurrentView] = useState('categories');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  // Search functionality
  useEffect(() => {
    if (searchQuery.length > 0) {
      const allSkills = skillCategories.flatMap(cat => cat.skills);
      const results = allSkills.filter(skill =>
        skill.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
    setCurrentView('skills');
  };

  const handleSkillToggle = (skill) => {
    if (selectedSkills.includes(skill)) {
      // Remove skill
      const updatedSkills = selectedSkills.filter(s => s !== skill);
      onSkillsChange(updatedSkills);
      toast.success(`Removed "${skill}"`);
    } else {
      // Add skill
      if (selectedSkills.length >= maxSkills) {
        toast.error(`Maximum ${maxSkills} skills allowed`);
        return;
      }
      const updatedSkills = [...selectedSkills, skill];
      onSkillsChange(updatedSkills);
      toast.success(`Added "${skill}"`);
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

  const handleSearchFocus = () => {
    setCurrentView('search');
  };

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
            <p className="text-sm text-gray-500">
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
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search for skills..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={handleSearchFocus}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Selected Skills Preview */}
      {selectedSkills.length > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="px-6 pb-4 border-b border-gray-100"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-700 flex items-center">
              <Check className="h-4 w-4 mr-2 text-purple-500" />
              Selected Skills ({selectedSkills.length})
            </h3>
            <div className="text-xs text-gray-500">
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
                className="inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-purple-500 to-purple-600 text-white text-sm rounded-full hover:from-purple-600 hover:to-purple-700 transition-all duration-200 shadow-sm hover:shadow-md group"
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
              className="text-xs text-amber-600 mt-2 flex items-center"
            >
              <Sparkles className="h-3 w-3 mr-1" />
              You've reached the maximum of {maxSkills} skills
            </motion.p>
          )}
        </motion.div>
      )}

      {/* Content */}
      <div className="px-6 pb-6 overflow-y-auto max-h-96">
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
                  <h4 className="flex items-center text-sm font-medium text-gray-700 mb-3">
                    <Sparkles className="h-4 w-4 mr-2 text-purple-500" />
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
                            ? 'bg-purple-500 text-white'
                            : 'bg-gray-100 text-gray-700 border hover:border-purple-500 hover:text-purple-600'
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
                    className="w-full p-4 bg-gray-50 hover:bg-white border border-gray-200 hover:border-purple-300 rounded-xl transition-all duration-200 group hover:shadow-lg"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className={`w-12 h-12 ${iconData.color} rounded-xl flex items-center justify-center mr-4 group-hover:scale-105 transition-transform`}>
                          <IconComponent className="h-6 w-6" />
                        </div>
                        <div className="text-left">
                          <h3 className="font-medium text-gray-900 group-hover:text-purple-700">{category.category}</h3>
                          <p className="text-sm text-gray-500">
                            {category.skills.length} skills available
                            {categorySkillCount > 0 && (
                              <span className="ml-2 text-purple-600 font-medium">
                                • {categorySkillCount} selected
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center">
                        {categorySkillCount > 0 && (
                          <div className="bg-purple-500 text-white text-xs px-2 py-1 rounded-full mr-2 shadow-sm">
                            {categorySkillCount}
                          </div>
                        )}
                        <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-purple-500 transition-colors" />
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {selectedCategory.skills.map((skill, index) => {
                  const isSelected = selectedSkills.includes(skill);
                  return (
                    <button
                      key={index}
                      onClick={() => handleSkillToggle(skill)}
                      className={`p-3 rounded-xl text-left transition-all duration-200 group ${
                        isSelected
                          ? 'bg-purple-100 border-2 border-purple-300 text-purple-900 shadow-sm scale-[0.98]'
                          : 'bg-gray-50 hover:bg-white border border-gray-200 hover:border-purple-300 text-gray-900 hover:shadow-md hover:scale-[1.02]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`font-medium ${isSelected ? 'text-purple-900' : 'text-gray-700 group-hover:text-purple-700'}`}>
                          {skill}
                        </span>
                        {isSelected ? (
                          <div className="flex items-center space-x-2">
                            <div className="bg-purple-500 text-white rounded-full p-1">
                              <Check className="h-3 w-3" />
                            </div>
                          </div>
                        ) : (
                          <div className="w-5 h-5 border border-gray-300 rounded-full group-hover:border-purple-400 transition-colors"></div>
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
                          ? 'bg-purple-100 border-2 border-purple-300 text-purple-900 shadow-sm'
                          : 'bg-gray-50 hover:bg-white border border-gray-200 hover:border-purple-300 text-gray-900 hover:shadow-md'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 ${iconData.color} rounded-lg flex items-center justify-center`}>
                            <IconComponent className="h-4 w-4" />
                          </div>
                          <div>
                            <span className={`font-medium ${isSelected ? 'text-purple-900' : 'text-gray-700 group-hover:text-purple-700'}`}>
                              {skill}
                            </span>
                            <p className="text-xs text-gray-500">{category?.category}</p>
                          </div>
                        </div>
                        {isSelected ? (
                          <div className="bg-purple-500 text-white rounded-full p-1">
                            <Check className="h-3 w-3" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 border border-gray-300 rounded-full group-hover:border-purple-400 transition-colors"></div>
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
      {isModal && (
        <div className="p-6 pt-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {selectedSkills.length > 0 ? (
                <span>{selectedSkills.length} skill{selectedSkills.length !== 1 ? 's' : ''} selected</span>
              ) : (
                <span>Select at least {minSkills} skill{minSkills !== 1 ? 's' : ''} to continue</span>
              )}
            </div>
            <button
              onClick={onClose}
              disabled={required && selectedSkills.length < minSkills}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                required && selectedSkills.length < minSkills
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-purple-600 text-white hover:bg-purple-700'
              }`}
            >
              Done
            </button>
          </div>
        </div>
      )}
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