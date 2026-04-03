import type { LucideProps } from 'lucide-react';
import type { ChangeEvent, ComponentType } from 'react';

export type SkillCategory = {
  category: string;
  skills: string[];
};

export type CurrentView = 'categories' | 'skills' | 'search';

export type SkillSelectorProps = {
  isModal?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
  selectedSkills?: string[];
  onSkillsChange?: (skills: string[]) => void;
  maxSkills?: number;
  minSkills?: number;
  required?: boolean;
  className?: string;
};

export type SearchInputProps = {
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
};

export type CategoryIconData = {
  icon: ComponentType<LucideProps>;
  color: string;
  bgColor: string;
};

export type CategoryButtonProps = {
  category: SkillCategory;
  categorySkillCount: number;
  iconData: CategoryIconData;
  onClick: (category: SkillCategory) => void;
};
