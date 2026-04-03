'use client';

import { motion } from 'framer-motion';
import { Check, Search } from 'lucide-react';

import { categoryIcons } from './categoryIcons';
import type { SkillCategory } from './types';

type SearchViewProps = {
  skillCategories: SkillCategory[];
  selectedSkills: string[];
  searchResults: string[];
  searchQuery: string;
  onSkillToggle: (skill: string) => void;
};

export default function SearchView({
  skillCategories,
  selectedSkills,
  searchResults,
  searchQuery,
  onSkillToggle,
}: SearchViewProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-2"
    >
      {searchResults.length > 0 ? (
        searchResults.map((skill, index) => {
          const isSelected = selectedSkills.includes(skill);
          const category = skillCategories.find((cat) => cat.skills.includes(skill));
          const iconData =
            (category ? categoryIcons[category.category] : undefined) ||
            categoryIcons['Digital Services'];
          const IconComponent = iconData.icon;

          return (
            <motion.button
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => onSkillToggle(skill)}
              className={`group w-full rounded-xl p-3 text-left transition-all duration-200 ${
                isSelected
                  ? 'border-2 border-fixly-primary-light bg-fixly-primary-bg text-fixly-primary shadow-sm dark:border-fixly-primary dark:bg-fixly-primary/20'
                  : 'border border-fixly-border bg-fixly-bg-secondary text-fixly-text hover:border-fixly-primary-light hover:bg-fixly-card hover:shadow-md dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:hover:border-fixly-primary dark:hover:bg-gray-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div
                    className={`h-8 w-8 ${iconData.color} flex items-center justify-center rounded-lg`}
                  >
                    <IconComponent className="h-4 w-4" />
                  </div>
                  <div>
                    <span
                      className={`font-medium ${isSelected ? 'text-fixly-primary' : 'text-fixly-text group-hover:text-fixly-primary dark:text-white'}`}
                    >
                      {skill}
                    </span>
                    <p className="text-xs text-fixly-text-muted dark:text-gray-400">
                      {category?.category}
                    </p>
                  </div>
                </div>
                {isSelected ? (
                  <div className="rounded-full bg-fixly-primary p-1 text-white">
                    <Check className="h-3 w-3" />
                  </div>
                ) : (
                  <div className="h-5 w-5 rounded-full border border-fixly-border transition-colors group-hover:border-fixly-primary dark:border-gray-600"></div>
                )}
              </div>
            </motion.button>
          );
        })
      ) : searchQuery.length > 0 ? (
        <div className="py-8 text-center text-gray-500 dark:text-gray-400">
          <Search className="mx-auto mb-4 h-12 w-12 opacity-50" />
          <p>No skills found matching &quot;{searchQuery}&quot;</p>
        </div>
      ) : (
        <div className="py-8 text-center text-gray-500 dark:text-gray-400">
          <Search className="mx-auto mb-4 h-12 w-12 opacity-50" />
          <p>Start typing to search for skills</p>
        </div>
      )}
    </motion.div>
  );
}
