'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, Check, Sparkles } from 'lucide-react';

import {
  skillCategories as rawSkillCategories,
} from '../../data/cities';

import CategoriesView from './CategoriesView';
import SearchInput from './SearchInput';
import SearchView from './SearchView';
import SkillsView from './SkillsView';
import type { SkillCategory, SkillSelectorProps } from './types';
import { useSkillSelector } from './useSkillSelector';

const skillCategories = rawSkillCategories as SkillCategory[];

export default function SkillSelector({
  isModal = false,
  isOpen = true,
  onClose,
  selectedSkills = [],
  onSkillsChange = () => {},
  maxSkills = 30,
  minSkills = 3,
  required = true,
  className = '',
}: SkillSelectorProps): React.JSX.Element | null {
  const {
    currentView,
    selectedCategory,
    searchQuery,
    searchResults,
    skillSuggestions,
    searchInputRef,
    handleCategorySelect,
    handleSkillToggle,
    handleBack,
    handleSearchChange,
  } = useSkillSelector(selectedSkills, onSkillsChange, minSkills, maxSkills);

  const content = (
    <div
      className={`rounded-2xl bg-white dark:bg-gray-900 ${!isModal ? 'border border-gray-200 dark:border-gray-700' : ''}`}
    >
      <div className="flex items-center justify-between border-b border-gray-200 p-6 dark:border-gray-700">
        <div className="flex items-center">
          {(currentView === 'skills' || currentView === 'search') && (
            <button
              onClick={handleBack}
              className="mr-3 rounded-lg p-1 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            </button>
          )}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
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
            className="rounded-lg p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="h-5 w-5 text-gray-400 dark:text-gray-500" />
          </button>
        )}
      </div>

      <div className="p-6 pb-4">
        <SearchInput
          ref={searchInputRef}
          value={searchQuery}
          onChange={handleSearchChange}
          placeholder="Search for skills..."
        />
      </div>

      {selectedSkills.length > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="border-b border-gray-100 px-6 pb-4 dark:border-gray-700"
        >
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300">
              <Check className="mr-2 h-4 w-4 text-fixly-primary" />
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
                className="group inline-flex items-center rounded-full bg-gradient-to-r from-fixly-primary to-fixly-primary-light px-3 py-1.5 text-sm text-white shadow-sm transition-all duration-200 hover:from-fixly-primary-hover hover:to-fixly-primary hover:shadow-md"
              >
                <span className="font-medium">{skill}</span>
                <X className="ml-2 h-3 w-3 transition-transform group-hover:scale-110" />
              </motion.button>
            ))}
          </div>
          {selectedSkills.length >= maxSkills && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-2 flex items-center text-xs text-amber-600 dark:text-amber-400"
            >
              <Sparkles className="mr-1 h-3 w-3" />
              You&apos;ve reached the maximum of {maxSkills} skills
            </motion.p>
          )}
        </motion.div>
      )}

      <div className="max-h-96 min-h-[300px] overflow-y-auto px-6 pb-6">
        <AnimatePresence mode="wait">
          {currentView === 'categories' && (
            <CategoriesView
              key="categories"
              skillCategories={skillCategories}
              selectedSkills={selectedSkills}
              skillSuggestions={skillSuggestions}
              searchResults={searchResults}
              searchQuery={searchQuery}
              onSkillToggle={handleSkillToggle}
              onCategorySelect={handleCategorySelect}
            />
          )}

          {currentView === 'skills' && selectedCategory && (
            <SkillsView
              key="skills"
              selectedCategory={selectedCategory}
              selectedSkills={selectedSkills}
              onSkillToggle={handleSkillToggle}
            />
          )}

          {currentView === 'search' && (
            <SearchView
              key="search"
              skillCategories={skillCategories}
              selectedSkills={selectedSkills}
              searchResults={searchResults}
              searchQuery={searchQuery}
              onSkillToggle={handleSkillToggle}
            />
          )}
        </AnimatePresence>
      </div>

      <div className="border-t border-gray-200 bg-gray-50 p-6 pt-4 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {(currentView === 'skills' || currentView === 'search') && (
              <button
                onClick={handleBack}
                className="flex items-center px-3 py-2 text-sm text-fixly-text-muted transition-colors hover:text-fixly-primary dark:text-gray-400 dark:hover:text-fixly-primary"
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Back
              </button>
            )}
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {selectedSkills.length > 0 ? (
                <span>
                  {selectedSkills.length} of {maxSkills} skills selected
                  {selectedSkills.length < minSkills && (
                    <span className="ml-2 text-amber-600 dark:text-amber-400">
                      (need {minSkills - selectedSkills.length} more)
                    </span>
                  )}
                </span>
              ) : (
                <span>
                  Select {minSkills}–{maxSkills} skills
                </span>
              )}
            </div>
          </div>
          {isModal && (
            <button
              onClick={onClose}
              disabled={required && selectedSkills.length < minSkills}
              className={`btn-primary ${
                required && selectedSkills.length < minSkills ? 'cursor-not-allowed opacity-50' : ''
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
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        />
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="relative max-h-[80vh] w-full max-w-2xl overflow-hidden shadow-2xl"
        >
          {content}
        </motion.div>
      </div>
    );
  }

  return <div className={className}>{content}</div>;
}
