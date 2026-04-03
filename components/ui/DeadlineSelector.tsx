'use client';

import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  Shield,
  Star,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import AnimatedCalendar from './AnimatedCalendar';
import type { DeadlineSelectorProps, QuickOptionId } from './deadlineSelector/deadlineSelector.types';
import {
  formatDeadline,
  getMinDate,
  getQuickOptions,
  toValidDate,
} from './deadlineSelector/deadlineSelector.utils';
import { QuickOptionButton, resolveSelectedOption } from './deadlineSelector/QuickOptionButton';

export default function DeadlineSelector({
  selectedDeadline,
  onDeadlineSelect,
  userPlan = 'free',
  required = false,
  className = '',
  error = '',
  mode = 'deadline',
  customTitle = '',
  customDescription = '',
}: DeadlineSelectorProps): React.JSX.Element {
  const [showCalendar, setShowCalendar] = useState<boolean>(false);
  const [selectedOption, setSelectedOption] = useState<QuickOptionId>('');

  const isPro = userPlan !== 'free';
  const quickOptions = useMemo(() => getQuickOptions(mode), [mode]);
  const selectedDateObject = toValidDate(selectedDeadline);

  useEffect(() => {
    setSelectedOption(resolveSelectedOption(toValidDate(selectedDeadline), mode));
  }, [selectedDeadline, mode]);

  const handleQuickSelect = (option: (typeof quickOptions)[number]): void => {
    if (option.requiresPro && !isPro) return;
    const deadline = new Date();
    deadline.setHours(deadline.getHours() + option.hours);
    setSelectedOption(option.id);
    onDeadlineSelect(deadline);
  };

  const handleCustomSelect = (): void => {
    setSelectedOption('custom');
    setShowCalendar(true);
  };

  const handleCalendarSelect = (date: Date): void => {
    onDeadlineSelect(date);
    setShowCalendar(false);
    setSelectedOption('custom');
  };

  return (
    <>
      <div className={`space-y-4 ${className}`}>
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-fixly-text">
            {customTitle || (mode === 'scheduled' ? 'Scheduled Date' : 'Project Deadline')}{' '}
            {required && <span className="text-red-500">*</span>}
          </label>
          {!isPro && (
            <div className="flex items-center space-x-1 text-xs text-amber-600">
              <Star className="h-3 w-3" />
              <span>Upgrade for priority deadlines</span>
            </div>
          )}
        </div>

        {customDescription && <p className="text-sm text-fixly-text-muted">{customDescription}</p>}

        {selectedDateObject && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-lg border border-green-200 bg-green-50 p-4"
          >
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium text-green-900">
                  Deadline Set: {formatDeadline(selectedDateObject)}
                </p>
                <p className="text-sm text-green-700">
                  {selectedDateObject.toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        <div className="space-y-3">
          <h4 className="text-sm font-medium text-fixly-text">
            {mode === 'scheduled' ? 'Quick Schedule Options' : 'Quick Options'}
          </h4>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {quickOptions.map((option) => (
              <QuickOptionButton
                key={option.id}
                option={option}
                isSelected={selectedOption === option.id}
                isDisabled={option.requiresPro && !isPro}
                onSelect={handleQuickSelect}
              />
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="text-sm font-medium text-fixly-text">Custom Date & Time</h4>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleCustomSelect}
            className={`
              w-full rounded-lg border-2 p-4 text-left transition-all duration-200
              ${
                selectedOption === 'custom'
                  ? 'border-fixly-accent bg-fixly-accent/5'
                  : 'border-gray-200 bg-white hover:border-fixly-accent/50'
              }
            `}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div
                  className={`rounded-lg p-2 ${selectedOption === 'custom' ? 'bg-fixly-accent text-white' : 'bg-fixly-primary/10 text-fixly-primary'}`}
                >
                  <Calendar className="h-4 w-4" />
                </div>
                <div>
                  <h5
                    className={`font-medium ${selectedOption === 'custom' ? 'text-fixly-accent' : 'text-fixly-text'}`}
                  >
                    Choose Custom Date & Time
                  </h5>
                  <p className="text-sm text-fixly-text-muted">
                    Pick a specific date and time for completion
                  </p>
                </div>
              </div>
              {selectedOption === 'custom' && (
                <CheckCircle className="h-5 w-5 text-fixly-accent" />
              )}
            </div>
          </motion.button>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-lg border border-red-200 bg-red-50 p-4"
          >
            <div className="flex items-center space-x-3">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </motion.div>
        )}

        {!isPro && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-start space-x-3">
              <Shield className="mt-0.5 h-5 w-5 text-blue-600" />
              <div>
                <h5 className="font-medium text-blue-900">Free Plan Limitation</h5>
                <p className="mt-1 text-sm text-blue-700">
                  Free users can schedule jobs with a minimum 24-hour advance notice. Upgrade to Pro
                  for same-day and priority scheduling.
                </p>
                <button className="mt-2 text-sm font-medium text-blue-600 underline hover:text-blue-800">
                  Learn More About Pro
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showCalendar && (
          <AnimatedCalendar
            selectedDate={selectedDeadline}
            onDateSelect={handleCalendarSelect}
            minDate={getMinDate(isPro)}
            isPro={isPro}
            requiresPro24Hours={true}
            isOpen={showCalendar}
            onClose={() => setShowCalendar(false)}
            mode={mode}
          />
        )}
      </AnimatePresence>
    </>
  );
}
