'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  X, 
  ChevronRight, 
  ChevronDown,
  Star,
  Check,
  Zap,
  Wrench,
  Home,
  Car,
  Paintbrush,
  Scissors,
  Heart,
  Laptop,
  Camera,
  ShoppingCart,
  Users,
  BookOpen,
  Briefcase,
  Palette,
  Music,
  Globe
} from 'lucide-react';
import { skillCategories, searchSkills, getSkillSuggestions, getEnhancedSkillSuggestions } from '../../data/cities';

// Category icons mapping
const categoryIcons = {
  'Electrical Services': Zap,
  'Plumbing Services': Wrench,
  'Home Maintenance': Home,
  'Automotive Services': Car,
  'Beauty & Wellness': Scissors,
  'Health & Fitness': Heart,
  'Technology Services': Laptop,
  'Photography & Videography': Camera,
  'Business Services': Briefcase,
  'Creative Services': Palette,
  'Entertainment': Music,
  'Digital Marketing': Globe,
  'Education & Training': BookOpen,
  'Event Planning': Users,
  'E-commerce Services': ShoppingCart,
  'Painting & Art': Paintbrush,
};

/**
 * Modern, intelligent skill selection component
 * Features:
 * - Progressive disclosure (categories → skills → expertise)
 * - Smart recommendations
 * - Search functionality
 * - Visual feedback
 * - Mobile-optimized
 */
export default function SmartSkillPicker({
  selectedSkills = [],
  onSkillsChange,
  maxSkills = 10,
  showExpertise = false,
  placeholder = "What services do you provide?",
  className = ''
}) {
  const [step, setStep] = useState('search'); // 'search', 'categories', 'skills'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [expandedCategories, setExpandedCategories] = useState(new Set());
  const [skillsWithExpertise, setSkillsWithExpertise] = useState(new Map());

  // Search results
  const searchResults = useMemo(() => {
    if (searchQuery.length < 2) return [];
    return searchSkills(searchQuery);
  }, [searchQuery]);

  // Get popular categories (top 6)
  const popularCategories = useMemo(() => {
    return skillCategories.slice(0, 6);
  }, []);

  // Get recommended skills based on current selection
  const recommendedSkills = useMemo(() => {
    if (selectedSkills.length === 0) return [];
    return getEnhancedSkillSuggestions(selectedSkills, 5);
  }, [selectedSkills]);

  // Add skill with optional expertise level
  const addSkill = (skill, expertise = 'intermediate') => {
    if (selectedSkills.includes(skill) || selectedSkills.length >= maxSkills) return;
    
    const newSkills = [...selectedSkills, skill];
    onSkillsChange(newSkills);
    
    if (showExpertise) {
      setSkillsWithExpertise(prev => new Map(prev.set(skill, expertise)));
    }
  };

  // Remove skill
  const removeSkill = (skill) => {
    const newSkills = selectedSkills.filter(s => s !== skill);
    onSkillsChange(newSkills);
    
    if (showExpertise) {
      setSkillsWithExpertise(prev => {
        const newMap = new Map(prev);
        newMap.delete(skill);
        return newMap;
      });
    }
  };

  // Update expertise level
  const updateExpertise = (skill, expertise) => {
    setSkillsWithExpertise(prev => new Map(prev.set(skill, expertise)));
  };

  // Get expertise level color
  const getExpertiseColor = (level) => {
    switch (level) {
      case 'beginner': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300';
      case 'intermediate': return 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300';
      case 'expert': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  return (
    <div className={`skill-picker ${className}`}>
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-fixly-text mb-2">
          Select Your Skills
        </h3>
        <p className="text-sm text-fixly-text-secondary">
          {selectedSkills.length === 0 
            ? "Choose skills that best represent your expertise"
            : `${selectedSkills.length}/${maxSkills} skills selected`
          }
        </p>
      </div>

      {/* Search Bar */}
      <div className="relative mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-fixly-text-secondary" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={placeholder}
            className="input-field pl-10 pr-4"
          />
        </div>
        
        {/* Search Results */}
        {searchQuery.length >= 2 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute top-full left-0 right-0 mt-2 bg-fixly-card border border-fixly-border rounded-xl shadow-fixly-lg z-10 max-h-48 overflow-y-auto"
          >
            {searchResults.length > 0 ? (
              <div className="p-2">
                {searchResults.map((skill, index) => (
                  <button
                    key={skill}
                    onClick={() => addSkill(skill)}
                    disabled={selectedSkills.includes(skill)}
                    className="w-full text-left px-3 py-2 text-sm text-fixly-text hover:bg-fixly-bg-secondary rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {skill}
                    {selectedSkills.includes(skill) && (
                      <Check className="inline-block w-4 h-4 ml-2 text-fixly-primary" />
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-fixly-text-secondary text-sm">
                No skills found for "{searchQuery}"
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* Selected Skills */}
      {selectedSkills.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-fixly-text">Selected Skills</h4>
            <span className="text-xs text-fixly-text-secondary">
              {maxSkills - selectedSkills.length} slots remaining
            </span>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <AnimatePresence>
              {selectedSkills.map((skill) => (
                <motion.div
                  key={skill}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="group"
                >
                  {showExpertise ? (
                    <div className="flex items-center bg-fixly-card border border-fixly-border rounded-lg overflow-hidden">
                      <span className="px-3 py-2 text-sm font-medium text-fixly-text">
                        {skill}
                      </span>
                      
                      {/* Expertise Level Selector */}
                      <select
                        value={skillsWithExpertise.get(skill) || 'intermediate'}
                        onChange={(e) => updateExpertise(skill, e.target.value)}
                        className="px-2 py-2 text-xs font-medium border-l border-fixly-border bg-transparent focus:outline-none"
                      >
                        <option value="beginner">Beginner</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="expert">Expert</option>
                      </select>
                      
                      <button
                        onClick={() => removeSkill(skill)}
                        className="p-2 text-fixly-text-secondary hover:text-red-500 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center bg-fixly-primary-bg text-fixly-primary px-3 py-2 rounded-lg text-sm font-medium group-hover:bg-fixly-primary-soft transition-colors">
                      {skill}
                      <button
                        onClick={() => removeSkill(skill)}
                        className="ml-2 p-0.5 hover:bg-fixly-primary hover:text-white rounded transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Recommendations */}
      {recommendedSkills.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-fixly-text mb-3 flex items-center">
            <Star className="h-4 w-4 text-fixly-primary mr-2" />
            Recommended Skills
          </h4>
          <div className="flex flex-wrap gap-2">
            {recommendedSkills.map((skill) => (
              <button
                key={skill}
                onClick={() => addSkill(skill)}
                disabled={selectedSkills.includes(skill) || selectedSkills.length >= maxSkills}
                className="skill-chip skill-chip-recommended text-sm px-3 py-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {skill}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Category Grid */}
      <div>
        <h4 className="text-sm font-medium text-fixly-text mb-3">Browse by Category</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-4">
          {popularCategories.map((category) => {
            const IconComponent = categoryIcons[category.category] || Briefcase;
            const isExpanded = expandedCategories.has(category.category);
            
            return (
              <motion.div
                key={category.category}
                className="category-card"
              >
                <button
                  onClick={() => {
                    const newExpanded = new Set(expandedCategories);
                    if (isExpanded) {
                      newExpanded.delete(category.category);
                    } else {
                      newExpanded.add(category.category);
                    }
                    setExpandedCategories(newExpanded);
                  }}
                  className="w-full p-4 bg-fixly-card hover:bg-fixly-card-hover border border-fixly-border rounded-xl transition-all duration-200 text-left group hover:shadow-fixly-md hover:border-fixly-primary-light"
                >
                  <div className="flex items-center justify-between mb-2">
                    <IconComponent className="h-5 w-5 text-fixly-primary" />
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-fixly-text-secondary" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-fixly-text-secondary" />
                    )}
                  </div>
                  <h5 className="font-medium text-sm text-fixly-text group-hover:text-fixly-primary">
                    {category.category}
                  </h5>
                  <p className="text-xs text-fixly-text-secondary mt-1">
                    {category.skills.length} skills
                  </p>
                </button>

                {/* Expanded Skills */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-3"
                    >
                      <div className="bg-fixly-bg-muted rounded-lg p-3 space-y-2">
                        <div className="flex flex-wrap gap-1">
                          {category.skills.slice(0, 8).map((skill) => (
                            <button
                              key={skill}
                              onClick={() => addSkill(skill)}
                              disabled={selectedSkills.includes(skill) || selectedSkills.length >= maxSkills}
                              className="text-xs px-2 py-1 bg-fixly-card hover:bg-fixly-primary hover:text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {skill}
                            </button>
                          ))}
                        </div>
                        {category.skills.length > 8 && (
                          <button className="text-xs text-fixly-primary font-medium">
                            +{category.skills.length - 8} more skills
                          </button>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>

        {/* Show More Categories Button */}
        {skillCategories.length > 6 && (
          <button className="w-full p-3 border border-fixly-border border-dashed rounded-xl text-fixly-text-secondary hover:text-fixly-primary hover:border-fixly-primary transition-colors text-sm">
            View All {skillCategories.length - 6} More Categories
          </button>
        )}
      </div>

      {/* Progress Indicator */}
      {selectedSkills.length > 0 && (
        <div className="mt-6 p-4 bg-fixly-primary-bg rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-fixly-primary">
              Profile Strength
            </span>
            <span className="text-sm text-fixly-primary">
              {Math.min(100, (selectedSkills.length / 5) * 100)}%
            </span>
          </div>
          <div className="w-full bg-fixly-bg-muted rounded-full h-2">
            <div 
              className="bg-fixly-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, (selectedSkills.length / 5) * 100)}%` }}
            />
          </div>
          <p className="text-xs text-fixly-text-secondary mt-2">
            {selectedSkills.length < 3 
              ? "Add more skills to improve your profile visibility"
              : selectedSkills.length < 5
              ? "Great! Your profile is looking good"
              : "Excellent! Your profile is comprehensive"
            }
          </p>
        </div>
      )}
    </div>
  );
}

// Simplified version for quick skill selection
export function QuickSkillPicker({ selectedSkills = [], onSkillsChange, maxSkills = 5 }) {
  const [searchQuery, setSearchQuery] = useState('');
  
  const searchResults = useMemo(() => {
    if (searchQuery.length < 2) return [];
    return searchSkills(searchQuery);
  }, [searchQuery]);

  const addSkill = (skill) => {
    if (!selectedSkills.includes(skill) && selectedSkills.length < maxSkills) {
      onSkillsChange([...selectedSkills, skill]);
    }
  };

  const removeSkill = (skill) => {
    onSkillsChange(selectedSkills.filter(s => s !== skill));
  };

  return (
    <div className="space-y-4">
      {/* Quick Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-fixly-text-secondary" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Type a skill..."
          className="input-field pl-10"
        />
        
        {searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-fixly-card border border-fixly-border rounded-lg shadow-fixly z-10 max-h-32 overflow-y-auto">
            {searchResults.map((skill) => (
              <button
                key={skill}
                onClick={() => addSkill(skill)}
                disabled={selectedSkills.includes(skill)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-fixly-bg-secondary disabled:opacity-50"
              >
                {skill}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selected Skills */}
      {selectedSkills.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedSkills.map((skill) => (
            <div
              key={skill}
              className="flex items-center bg-fixly-primary-bg text-fixly-primary px-2 py-1 rounded text-sm"
            >
              {skill}
              <button
                onClick={() => removeSkill(skill)}
                className="ml-1 p-0.5 hover:bg-fixly-primary hover:text-white rounded"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}