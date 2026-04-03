'use client';

import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

import type { SkillCategory } from './types';

type SkillsViewProps = {
  selectedCategory: SkillCategory;
  selectedSkills: string[];
  onSkillToggle: (skill: string) => void;
};

export default function SkillsView({
  selectedCategory,
  selectedSkills,
  onSkillToggle,
}: SkillsViewProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-4"
    >
      <div className="grid auto-rows-max grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
        {selectedCategory.skills.map((skill, index) => {
          const isSelected = selectedSkills.includes(skill);
          return (
            <button
              key={index}
              onClick={() => onSkillToggle(skill)}
              className={`group rounded-xl p-3 text-left transition-all duration-200 ${
                isSelected
                  ? 'scale-[0.98] border-2 border-fixly-primary-light bg-fixly-primary-bg text-fixly-primary shadow-sm dark:border-fixly-primary dark:bg-fixly-primary/20 dark:text-fixly-primary'
                  : 'border border-fixly-border bg-fixly-bg-secondary text-fixly-text hover:scale-[1.02] hover:border-fixly-primary-light hover:bg-fixly-card hover:shadow-md dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:hover:border-fixly-primary dark:hover:bg-gray-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`font-medium ${isSelected ? 'text-fixly-primary' : 'text-fixly-text group-hover:text-fixly-primary dark:text-white'}`}
                >
                  {skill}
                </span>
                {isSelected ? (
                  <div className="flex items-center space-x-2">
                    <div className="rounded-full bg-fixly-primary p-1 text-white">
                      <Check className="h-3 w-3" />
                    </div>
                  </div>
                ) : (
                  <div className="h-5 w-5 rounded-full border border-fixly-border transition-colors group-hover:border-fixly-primary dark:border-gray-600"></div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}
