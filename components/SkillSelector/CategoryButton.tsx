'use client';

import { ChevronRight } from 'lucide-react';
import { memo } from 'react';

import type { CategoryButtonProps } from './types';

const CategoryButton = memo(
  ({ category, categorySkillCount, iconData, onClick }: CategoryButtonProps) => {
    const IconComponent = iconData.icon;

    return (
      <button
        onClick={() => onClick(category)}
        className="group w-full rounded-xl border border-fixly-border bg-fixly-bg-secondary p-4 transition-all duration-200 hover:border-fixly-primary-light hover:bg-fixly-card hover:shadow-lg dark:border-gray-600 dark:bg-gray-800 dark:hover:border-fixly-primary dark:hover:bg-gray-700"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div
              className={`h-12 w-12 ${iconData.color} mr-4 flex items-center justify-center rounded-xl transition-transform group-hover:scale-105`}
            >
              <IconComponent className="h-6 w-6" />
            </div>
            <div className="text-left">
              <h3 className="font-medium text-fixly-text group-hover:text-fixly-primary dark:text-white dark:group-hover:text-fixly-primary">
                {category.category}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {category.skills.length} skills available
                {categorySkillCount > 0 && (
                  <span className="ml-2 font-medium text-fixly-primary dark:text-fixly-primary">
                    • {categorySkillCount} selected
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center">
            {categorySkillCount > 0 && (
              <div className="mr-2 rounded-full bg-fixly-primary px-2 py-1 text-xs text-white shadow-sm">
                {categorySkillCount}
              </div>
            )}
            <ChevronRight className="h-5 w-5 text-fixly-text-muted transition-colors group-hover:text-fixly-primary dark:text-gray-500" />
          </div>
        </div>
      </button>
    );
  }
);

CategoryButton.displayName = 'CategoryButton';

export default CategoryButton;
