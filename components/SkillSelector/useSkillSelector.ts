'use client';

import { useState, useEffect, useMemo, useRef, useCallback, type ChangeEvent, type RefObject } from 'react';
import { toast } from 'sonner';

import {
  skillCategories as rawSkillCategories,
  getSkillSuggestions as rawGetSkillSuggestions,
} from '../../data/cities';

import type { SkillCategory, SkillSelectorProps, CurrentView } from './types';

const skillCategories = rawSkillCategories as SkillCategory[];
const getSkillSuggestions = rawGetSkillSuggestions as (
  selectedSkills?: string[],
  maxSuggestions?: number
) => string[];

export interface UseSkillSelectorResult {
  currentView: CurrentView;
  selectedCategory: SkillCategory | null;
  searchQuery: string;
  debouncedQuery: string;
  searchResults: string[];
  skillSuggestions: string[];
  searchInputRef: RefObject<HTMLInputElement | null>;
  handleCategorySelect: (category: SkillCategory) => void;
  handleSkillToggle: (skill: string) => void;
  handleBack: () => void;
  handleSearchChange: (e: ChangeEvent<HTMLInputElement>) => void;
}

export function useSkillSelector(
  selectedSkills: SkillSelectorProps['selectedSkills'],
  onSkillsChange: SkillSelectorProps['onSkillsChange'],
  minSkills: number,
  maxSkills: number
): UseSkillSelectorResult {
  const [currentView, setCurrentView] = useState<CurrentView>('categories');
  const [selectedCategory, setSelectedCategory] = useState<SkillCategory | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const safeSelectedSkills = selectedSkills ?? [];
  const safeOnSkillsChange = onSkillsChange ?? (() => {});

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [searchQuery]);

  const searchResults = useMemo(() => {
    if (debouncedQuery.length < 1) return [];
    const allSkills = skillCategories.flatMap((cat) => cat.skills);
    const query = debouncedQuery.toLowerCase().trim();
    return allSkills.filter((skill) => skill.toLowerCase().includes(query)).slice(0, 20);
  }, [debouncedQuery]);

  const skillSuggestions = useMemo(
    () => getSkillSuggestions(safeSelectedSkills, 6),
    [safeSelectedSkills]
  );

  const handleCategorySelect = useCallback((category: SkillCategory): void => {
    setSelectedCategory(category);
    setCurrentView('skills');
  }, []);

  const handleSkillToggle = useCallback(
    (skill: string): void => {
      if (safeSelectedSkills.includes(skill)) {
        if (safeSelectedSkills.length <= minSkills) {
          toast.error(`Minimum ${minSkills} skills required`);
          return;
        }
        safeOnSkillsChange(safeSelectedSkills.filter((s) => s !== skill));
      } else {
        if (safeSelectedSkills.length >= maxSkills) {
          toast.error(`Maximum ${maxSkills} skills allowed`);
          return;
        }
        safeOnSkillsChange([...safeSelectedSkills, skill]);
      }
    },
    [safeSelectedSkills, minSkills, maxSkills, safeOnSkillsChange]
  );

  const handleBack = useCallback((): void => {
    if (currentView === 'skills') {
      setCurrentView('categories');
      setSelectedCategory(null);
    } else if (currentView === 'search') {
      setCurrentView('categories');
      setSearchQuery('');
    }
  }, [currentView]);

  const handleSearchChange = useCallback((e: ChangeEvent<HTMLInputElement>): void => {
    setSearchQuery(e.target.value);
  }, []);

  return {
    currentView,
    selectedCategory,
    searchQuery,
    debouncedQuery,
    searchResults,
    skillSuggestions,
    searchInputRef,
    handleCategorySelect,
    handleSkillToggle,
    handleBack,
    handleSearchChange,
  };
}
