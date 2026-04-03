'use client';

import { motion } from 'framer-motion';
import { Check, Search, Sparkles } from 'lucide-react';

import CategoryButton from './CategoryButton';
import { categoryIcons } from './categoryIcons';
import type { SkillCategory } from './types';

type CategoriesViewProps = {
  skillCategories: SkillCategory[];
  selectedSkills: string[];
  skillSuggestions: string[];
  searchResults: string[];
  searchQuery: string;
  onSkillToggle: (skill: string) => void;
  onCategorySelect: (category: SkillCategory) => void;
};

export default function CategoriesView({
  skillCategories,
  selectedSkills,
  skillSuggestions,
  searchResults,
  searchQuery,
  onSkillToggle,
  onCategorySelect,
}: CategoriesViewProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-3"
    >
      {/* Smart Suggestions */}
      {skillSuggestions.length > 0 && (
        <div className="mb-6">
          <h4 className="mb-3 flex items-center text-sm font-medium text-gray-700 dark:text-gray-300">
            <Sparkles className="mr-2 h-4 w-4 text-fixly-primary" />
            Recommended for you
          </h4>
          <div className="flex flex-wrap gap-2">
            {skillSuggestions.map((skill, index) => (
              <button
                key={index}
                onClick={() => onSkillToggle(skill)}
                disabled={selectedSkills.includes(skill)}
                className={`rounded-lg px-3 py-2 text-sm transition-all ${
                  selectedSkills.includes(skill)
                    ? 'bg-fixly-primary text-white'
                    : 'border border-fixly-border bg-fixly-card text-fixly-text hover:border-fixly-primary hover:text-fixly-primary dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:text-fixly-primary'
                }`}
              >
                {skill}
                {selectedSkills.includes(skill) && (
                  <Check className="ml-1 inline h-3 w-3" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Inline Search Results */}
      {searchResults.length > 0 && searchQuery.length >= 1 && (
        <div className="mb-6">
          <h4 className="mb-3 flex items-center text-sm font-medium text-gray-700 dark:text-gray-300">
            <Search className="mr-2 h-4 w-4 text-fixly-primary" />
            Search Results ({searchResults.length})
          </h4>
          <div className="space-y-2">
            {searchResults.map((skill, index) => {
              const isSelected = selectedSkills.includes(skill);
              const category = skillCategories.find((cat) => cat.skills.includes(skill));
              const iconData =
                (category ? categoryIcons[category.category] : undefined) ||
                categoryIcons['Digital Services'];
              const IconComponent = iconData.icon;

              return (
                <button
                  key={`search-${index}`}
                  onClick={() => onSkillToggle(skill)}
                  className={`flex w-full items-center rounded-lg border-2 p-3 text-left transition-all ${
                    isSelected
                      ? 'border-fixly-primary bg-fixly-primary/10 text-fixly-primary'
                      : 'border-fixly-border hover:border-fixly-primary hover:bg-fixly-primary/5 dark:border-gray-600'
                  }`}
                >
                  <div
                    className={`h-8 w-8 rounded-lg ${iconData.color} mr-3 flex items-center justify-center`}
                  >
                    <IconComponent className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <span className="font-medium text-fixly-text dark:text-gray-200">{skill}</span>
                    <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                      in {category?.category}
                    </span>
                  </div>
                  {isSelected && <Check className="h-4 w-4 text-fixly-primary" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Category List */}
      {(searchQuery.length < 1 || searchResults.length === 0) &&
        skillCategories.map((category) => {
          const categorySkillCount = category.skills.filter((skill) =>
            selectedSkills.includes(skill)
          ).length;
          const iconData = categoryIcons[category.category] || categoryIcons['Digital Services'];

          return (
            <CategoryButton
              key={`${category.category}-${categorySkillCount}`}
              category={category}
              categorySkillCount={categorySkillCount}
              iconData={iconData}
              onClick={onCategorySelect}
            />
          );
        })}
    </motion.div>
  );
}
