'use client';

import { motion } from 'framer-motion';
import { CheckCircle, Shield, Star } from 'lucide-react';

import type { QuickOption, QuickOptionId } from './deadlineSelector.types';

type Props = {
  option: QuickOption;
  isSelected: boolean;
  isDisabled: boolean;
  onSelect: (option: QuickOption) => void;
};

export function QuickOptionButton({
  option,
  isSelected,
  isDisabled,
  onSelect,
}: Props): React.JSX.Element {
  const OptionIcon = option.icon;

  return (
    <motion.button
      whileHover={!isDisabled ? { scale: 1.02 } : {}}
      whileTap={!isDisabled ? { scale: 0.98 } : {}}
      onClick={() => onSelect(option)}
      disabled={isDisabled}
      className={`
        relative rounded-lg border-2 p-4 text-left transition-all duration-200
        ${
          isSelected
            ? 'border-fixly-accent bg-fixly-accent/5'
            : isDisabled
              ? 'cursor-not-allowed border-gray-200 bg-gray-50 opacity-75'
              : `${option.bgColor} cursor-pointer hover:border-fixly-accent/50`
        }
      `}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <div
            className={`rounded-lg p-2 ${isSelected ? 'bg-fixly-accent text-white' : `bg-white ${option.color}`}`}
          >
            <OptionIcon className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <h5 className={`font-medium ${isSelected ? 'text-fixly-accent' : 'text-fixly-text'}`}>
              {option.label}
            </h5>
            <p className="mt-1 text-sm text-fixly-text-muted">{option.description}</p>
          </div>
        </div>

        {option.requiresPro && isDisabled && (
          <div className="absolute right-2 top-2">
            <div className="flex items-center space-x-1 rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700">
              <Star className="h-3 w-3" />
              <span>Pro</span>
            </div>
          </div>
        )}

        {isSelected && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute right-2 top-2"
          >
            <CheckCircle className="h-5 w-5 text-fixly-accent" />
          </motion.div>
        )}
      </div>

      {isDisabled && (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-2">
          <div className="flex items-center space-x-2">
            <Shield className="h-4 w-4 text-amber-600" />
            <span className="text-xs text-amber-700">
              Upgrade to Pro to unlock priority deadlines
            </span>
          </div>
        </div>
      )}
    </motion.button>
  );
}

export function resolveSelectedOption(
  deadline: Date | null,
  mode: 'deadline' | 'scheduled'
): QuickOptionId {
  if (!deadline) return '';

  const now = new Date();
  const hoursFromNow = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (mode === 'scheduled') {
    if (hoursFromNow <= 4) return 'today';
    if (hoursFromNow <= 48) return 'tomorrow';
    if (hoursFromNow <= 168) return 'next_week';
    return 'next_month';
  }

  if (hoursFromNow <= 4) return 'asap';
  if (hoursFromNow <= 24) return 'today';
  if (hoursFromNow <= 48) return 'tomorrow';
  if (hoursFromNow <= 168) return 'week';
  return 'custom';
}
