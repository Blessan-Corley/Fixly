'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  ChevronRight, 
  ChevronLeft, 
  Check, 
  Search,
  Sparkles
} from 'lucide-react';
import { skillCategories, getSkillSuggestions } from '../data/cities';

export default function SkillSelectionModal({ 
  isOpen, 
  onClose, 
  selectedSkills = [], 
  onSkillsChange 
}) {
  const [currentView, setCurrentView] = useState('categories'); // categories, skills, search
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
    const updatedSkills = selectedSkills.includes(skill)
      ? selectedSkills.filter(s => s !== skill)
      : [...selectedSkills, skill];
    onSkillsChange(updatedSkills);
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
        className="relative bg-fixly-card border border-fixly-border rounded-2xl shadow-fixly-xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-fixly-border">
          <div className="flex items-center">
            {(currentView === 'skills' || currentView === 'search') && (
              <button
                onClick={handleBack}
                className="mr-3 p-1 hover:bg-fixly-accent/10 rounded-lg transition-colors"
              >
                <ChevronLeft className="h-5 w-5 text-fixly-text" />
              </button>
            )}
            <div>
              <h2 className="text-xl font-semibold text-fixly-text">
                {currentView === 'categories' && 'Select Your Skills'}
                {currentView === 'skills' && selectedCategory?.category}
                {currentView === 'search' && 'Search Skills'}
              </h2>
              <p className="text-sm text-fixly-text-light">
                {currentView === 'categories' && 'Choose categories that match your expertise'}
                {currentView === 'skills' && `Select skills from ${selectedCategory?.category}`}
                {currentView === 'search' && 'Find specific skills quickly'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-fixly-accent/10 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-fixly-text-muted" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-6 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-fixly-text-muted" />
            <input
              type="text"
              placeholder="Search for skills..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={handleSearchFocus}
              className="input-field pl-10 w-full"
            />
          </div>
        </div>

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
                {skillCategories.map((category, index) => {
                  const categorySkillCount = category.skills.filter(skill => 
                    selectedSkills.includes(skill)
                  ).length;
                  
                  return (
                    <button
                      key={index}
                      onClick={() => handleCategorySelect(category)}
                      className="w-full p-4 bg-fixly-bg hover:bg-fixly-accent/5 border border-fixly-border rounded-xl transition-all duration-200 group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-12 h-12 bg-fixly-accent/10 rounded-xl flex items-center justify-center mr-4">
                            <span className="text-2xl">
                              {category.category === 'Electrical Services' && '⚡'}
                              {category.category === 'Plumbing Services' && '🔧'}
                              {category.category === 'Construction & Renovation' && '🏗️'}
                              {category.category === 'Installation Services' && '🔩'}
                              {category.category === 'Device Repair' && '📱'}
                              {category.category === 'Cleaning Services' && '🧽'}
                              {category.category === 'Automotive Services' && '🚗'}
                              {category.category === 'Gardening Services' && '🌱'}
                              {category.category === 'Moving Services' && '📦'}
                              {category.category === 'Beauty & Wellness' && '💅'}
                              {category.category === 'Healthcare Services' && '🏥'}
                              {category.category === 'Photography & Events' && '📸'}
                              {category.category === 'Tutoring & Education' && '📚'}
                              {category.category === 'Security Services' && '🛡️'}
                              {category.category === 'Digital Services' && '💻'}
                            </span>
                          </div>
                          <div className="text-left">
                            <h3 className="font-medium text-fixly-text">{category.category}</h3>
                            <p className="text-sm text-fixly-text-muted">
                              {category.skills.length} skills available
                              {categorySkillCount > 0 && (
                                <span className="ml-2 text-fixly-accent">
                                  • {categorySkillCount} selected
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center">
                          {categorySkillCount > 0 && (
                            <div className="bg-fixly-accent text-fixly-text text-xs px-2 py-1 rounded-full mr-2">
                              {categorySkillCount}
                            </div>
                          )}
                          <ChevronRight className="h-5 w-5 text-fixly-text-muted group-hover:text-fixly-accent transition-colors" />
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
                {/* Smart Suggestions */}
                {selectedSkills.length > 0 && (
                  <div className="mb-6">
                    <h4 className="flex items-center text-sm font-medium text-fixly-text mb-3">
                      <Sparkles className="h-4 w-4 mr-2 text-fixly-accent" />
                      Recommended for you
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {getSkillSuggestions(selectedSkills, 6)
                        .filter(skill => selectedCategory.skills.includes(skill))
                        .map((skill, index) => (
                        <button
                          key={index}
                          onClick={() => handleSkillToggle(skill)}
                          disabled={selectedSkills.includes(skill)}
                          className={`px-3 py-2 rounded-lg text-sm transition-all ${
                            selectedSkills.includes(skill)
                              ? 'bg-fixly-accent text-fixly-text'
                              : 'bg-fixly-accent/10 text-fixly-accent hover:bg-fixly-accent/20'
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

                {/* All Skills in Category */}
                <div className="grid grid-cols-1 gap-2">
                  {selectedCategory.skills.map((skill, index) => {
                    const isSelected = selectedSkills.includes(skill);
                    return (
                      <button
                        key={index}
                        onClick={() => handleSkillToggle(skill)}
                        className={`p-3 rounded-xl text-left transition-all ${
                          isSelected
                            ? 'bg-fixly-accent/10 border border-fixly-accent text-fixly-text'
                            : 'bg-fixly-bg hover:bg-fixly-accent/5 border border-fixly-border hover:border-fixly-accent/50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{skill}</span>
                          {isSelected && (
                            <Check className="h-4 w-4 text-fixly-accent" />
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
                    
                    return (
                      <button
                        key={index}
                        onClick={() => handleSkillToggle(skill)}
                        className={`w-full p-3 rounded-xl text-left transition-all ${
                          isSelected
                            ? 'bg-fixly-accent/10 border border-fixly-accent text-fixly-text'
                            : 'bg-fixly-bg hover:bg-fixly-accent/5 border border-fixly-border hover:border-fixly-accent/50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-medium">{skill}</span>
                            <p className="text-xs text-fixly-text-muted">{category?.category}</p>
                          </div>
                          {isSelected && (
                            <Check className="h-4 w-4 text-fixly-accent" />
                          )}
                        </div>
                      </button>
                    );
                  })
                ) : searchQuery.length > 0 ? (
                  <div className="text-center py-8 text-fixly-text-muted">
                    <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No skills found matching "{searchQuery}"</p>
                  </div>
                ) : (
                  <div className="text-center py-8 text-fixly-text-muted">
                    <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Start typing to search for skills</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="p-6 pt-4 border-t border-fixly-border bg-fixly-bg">
          <div className="flex items-center justify-between">
            <div className="text-sm text-fixly-text-muted">
              {selectedSkills.length > 0 ? (
                <span>{selectedSkills.length} skill{selectedSkills.length !== 1 ? 's' : ''} selected</span>
              ) : (
                <span>Select at least one skill to continue</span>
              )}
            </div>
            <button
              onClick={onClose}
              disabled={selectedSkills.length === 0}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                selectedSkills.length === 0
                  ? 'bg-fixly-border text-fixly-text-muted cursor-not-allowed'
                  : 'bg-fixly-accent text-fixly-text hover:bg-fixly-accent-dark'
              }`}
            >
              Done
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}