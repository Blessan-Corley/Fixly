'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Clock,
  Star,
  AlertCircle,
  CheckCircle,
  Zap,
  Shield,
  CalendarDays
} from 'lucide-react';
import AnimatedCalendar from './AnimatedCalendar';

const DeadlineSelector = ({
  selectedDeadline,
  onDeadlineSelect,
  userPlan = 'free', // 'free', 'pro', 'premium'
  required = false,
  className = '',
  error = '',
  mode = 'deadline', // 'deadline' or 'scheduled'
  customTitle = '',
  customDescription = ''
}) => {
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedOption, setSelectedOption] = useState('');

  const isPro = userPlan !== 'free';

  // Quick deadline options - adjust based on mode
  const getQuickOptions = () => {
    if (mode === 'scheduled') {
      return [
        {
          id: 'today',
          label: 'Today',
          description: 'Schedule for today',
          hours: 4,
          icon: Clock,
          requiresPro: true,
          color: 'text-red-500',
          bgColor: 'bg-red-50 border-red-200',
          badge: 'Pro Only'
        },
        {
          id: 'tomorrow',
          label: 'Tomorrow',
          description: 'Schedule for tomorrow',
          hours: 48,
          icon: CalendarDays,
          requiresPro: false,
          color: 'text-blue-500',
          bgColor: 'bg-blue-50 border-blue-200'
        },
        {
          id: 'next_week',
          label: 'Next Week',
          description: 'Schedule for next week',
          hours: 168,
          icon: Calendar,
          requiresPro: false,
          color: 'text-green-500',
          bgColor: 'bg-green-50 border-green-200'
        },
        {
          id: 'next_month',
          label: 'Next Month',
          description: 'Schedule for next month',
          hours: 720,
          icon: Calendar,
          requiresPro: false,
          color: 'text-purple-500',
          bgColor: 'bg-purple-50 border-purple-200'
        }
      ];
    }

    // Default deadline options
    return [
      {
        id: 'asap',
        label: 'ASAP (Within 4 hours)',
        description: 'Highest priority, immediate attention',
        hours: 4,
        icon: Zap,
        requiresPro: true,
        color: 'text-red-500',
        bgColor: 'bg-red-50 border-red-200',
        badge: 'Pro Only'
      },
      {
        id: 'today',
        label: 'Today (Within 24 hours)',
        description: 'Same day completion',
        hours: 24,
        icon: Clock,
        requiresPro: true,
        color: 'text-amber-500',
        bgColor: 'bg-amber-50 border-amber-200',
        badge: 'Pro Only'
      },
      {
        id: 'tomorrow',
        label: 'Tomorrow',
        description: 'Next day completion',
        hours: 48,
        icon: CalendarDays,
        requiresPro: false,
        color: 'text-blue-500',
        bgColor: 'bg-blue-50 border-blue-200'
      },
      {
        id: 'week',
        label: 'Within a Week',
        description: 'Flexible timeline, 7 days',
        hours: 168,
        icon: Calendar,
        requiresPro: false,
        color: 'text-green-500',
        bgColor: 'bg-green-50 border-green-200'
      }
    ];
  };

  const quickOptions = getQuickOptions();

  useEffect(() => {
    if (selectedDeadline) {
      const deadline = new Date(selectedDeadline);
      const now = new Date();
      const hoursFromNow = (deadline - now) / (1000 * 60 * 60);

      // Determine which quick option matches
      if (hoursFromNow <= 4) {
        setSelectedOption('asap');
      } else if (hoursFromNow <= 24) {
        setSelectedOption('today');
      } else if (hoursFromNow <= 48) {
        setSelectedOption('tomorrow');
      } else if (hoursFromNow <= 168) {
        setSelectedOption('week');
      } else {
        setSelectedOption('custom');
      }
    }
  }, [selectedDeadline]);

  const handleQuickSelect = (option) => {
    if (option.requiresPro && !isPro) {
      // Show upgrade prompt instead of selecting
      return;
    }

    const deadline = new Date();
    deadline.setHours(deadline.getHours() + option.hours);

    setSelectedOption(option.id);
    onDeadlineSelect(deadline);
  };

  const handleCustomSelect = () => {
    setSelectedOption('custom');
    setShowCalendar(true);
  };

  const handleCalendarSelect = (date) => {
    onDeadlineSelect(date);
    setShowCalendar(false);
    setSelectedOption('custom');
  };

  const getMinDate = () => {
    const minDate = new Date();
    if (isPro) {
      // Pro users can schedule for today
      return minDate;
    } else {
      // Free users must wait 24 hours
      minDate.setHours(minDate.getHours() + 24);
      return minDate;
    }
  };

  const formatDeadline = (date) => {
    if (!date) return '';

    const deadline = new Date(date);
    const now = new Date();
    const diffHours = (deadline - now) / (1000 * 60 * 60);
    const diffDays = Math.ceil(diffHours / 24);

    if (diffHours < 4) {
      return 'ASAP (Within 4 hours)';
    } else if (diffHours < 24) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Tomorrow';
    } else if (diffDays <= 7) {
      return `In ${diffDays} days`;
    } else {
      return deadline.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  return (
    <>
      <div className={`space-y-4 ${className}`}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-fixly-text">
            {customTitle || (mode === 'scheduled' ? 'Scheduled Date' : 'Project Deadline')} {required && <span className="text-red-500">*</span>}
          </label>
          {!isPro && (
            <div className="flex items-center space-x-1 text-xs text-amber-600">
              <Star className="h-3 w-3" />
              <span>Upgrade for priority deadlines</span>
            </div>
          )}
        </div>

        {/* Current Selection Display */}
        {selectedDeadline && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-green-50 border border-green-200 rounded-lg p-4"
          >
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium text-green-900">
                  Deadline Set: {formatDeadline(selectedDeadline)}
                </p>
                <p className="text-sm text-green-700">
                  {new Date(selectedDeadline).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Quick Options */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-fixly-text">
            {mode === 'scheduled' ? 'Quick Schedule Options' : 'Quick Options'}
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {quickOptions.map((option) => {
              const isSelected = selectedOption === option.id;
              const isDisabled = option.requiresPro && !isPro;

              return (
                <motion.button
                  key={option.id}
                  whileHover={!isDisabled ? { scale: 1.02 } : {}}
                  whileTap={!isDisabled ? { scale: 0.98 } : {}}
                  onClick={() => handleQuickSelect(option)}
                  disabled={isDisabled}
                  className={`
                    relative p-4 rounded-lg border-2 text-left transition-all duration-200
                    ${isSelected
                      ? `border-fixly-accent bg-fixly-accent/5`
                      : isDisabled
                      ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-75'
                      : `${option.bgColor} hover:border-fixly-accent/50 cursor-pointer`
                    }
                  `}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className={`p-2 rounded-lg ${isSelected ? 'bg-fixly-accent text-white' : `bg-white ${option.color}`}`}>
                        <option.icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <h5 className={`font-medium ${isSelected ? 'text-fixly-accent' : 'text-fixly-text'}`}>
                          {option.label}
                        </h5>
                        <p className="text-sm text-fixly-text-muted mt-1">
                          {option.description}
                        </p>
                      </div>
                    </div>

                    {option.requiresPro && !isPro && (
                      <div className="absolute top-2 right-2">
                        <div className="bg-amber-100 text-amber-700 text-xs font-medium px-2 py-1 rounded-full flex items-center space-x-1">
                          <Star className="h-3 w-3" />
                          <span>Pro</span>
                        </div>
                      </div>
                    )}

                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute top-2 right-2"
                      >
                        <CheckCircle className="h-5 w-5 text-fixly-accent" />
                      </motion.div>
                    )}
                  </div>

                  {/* Pro upgrade hint */}
                  {isDisabled && (
                    <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded-lg">
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
            })}
          </div>
        </div>

        {/* Custom Date Selection */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-fixly-text">Custom Date & Time</h4>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleCustomSelect}
            className={`
              w-full p-4 rounded-lg border-2 text-left transition-all duration-200
              ${selectedOption === 'custom'
                ? 'border-fixly-accent bg-fixly-accent/5'
                : 'border-gray-200 hover:border-fixly-accent/50 bg-white'
              }
            `}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${selectedOption === 'custom' ? 'bg-fixly-accent text-white' : 'bg-fixly-primary/10 text-fixly-primary'}`}>
                  <Calendar className="h-4 w-4" />
                </div>
                <div>
                  <h5 className={`font-medium ${selectedOption === 'custom' ? 'text-fixly-accent' : 'text-fixly-text'}`}>
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

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 border border-red-200 rounded-lg p-4"
          >
            <div className="flex items-center space-x-3">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </motion.div>
        )}

        {/* Free User Notice */}
        {!isPro && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h5 className="font-medium text-blue-900">Free Plan Limitation</h5>
                <p className="text-sm text-blue-700 mt-1">
                  Free users can schedule jobs with a minimum 24-hour advance notice.
                  Upgrade to Pro for same-day and priority scheduling.
                </p>
                <button className="text-sm text-blue-600 hover:text-blue-800 font-medium mt-2 underline">
                  Learn More About Pro
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Animated Calendar Modal */}
      <AnimatePresence>
        {showCalendar && (
          <AnimatedCalendar
            selectedDate={selectedDeadline}
            onDateSelect={handleCalendarSelect}
            minDate={getMinDate()}
            isPro={isPro}
            requiresPro24Hours={true}
            isOpen={showCalendar}
            onClose={() => setShowCalendar(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default DeadlineSelector;