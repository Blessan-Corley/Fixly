'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  Star,
  AlertCircle,
  CheckCircle,
  X
} from 'lucide-react';

const AnimatedCalendar = ({
  selectedDate,
  onDateSelect,
  minDate,
  maxDate,
  isPro = false,
  requiresPro24Hours = true,
  className = '',
  isOpen,
  onClose
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState('09:00');
  const [showTimeSelector, setShowTimeSelector] = useState(false);

  // Initialize currentMonth when selectedDate changes
  useEffect(() => {
    if (selectedDate) {
      setCurrentMonth(new Date(selectedDate));
      // Extract time from selectedDate if it's a datetime
      const date = new Date(selectedDate);
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      setSelectedTime(`${hours}:${minutes}`);
    }
  }, [selectedDate]);

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const minimumDate = minDate ? new Date(minDate) : tomorrow;
  const maximumDate = maxDate ? new Date(maxDate) : new Date(today.getFullYear() + 1, 11, 31);

  // Get 24 hours from now
  const twentyFourHoursFromNow = new Date();
  twentyFourHoursFromNow.setHours(twentyFourHoursFromNow.getHours() + 24);

  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const isDateDisabled = (date) => {
    if (date < minimumDate || date > maximumDate) return true;

    // Check if within 24 hours and requires pro
    if (requiresPro24Hours && !isPro) {
      return date < twentyFourHoursFromNow;
    }

    return false;
  };

  const isDateInPast = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const isWithin24Hours = (date) => {
    return date < twentyFourHoursFromNow && date >= today;
  };

  const navigateMonth = (direction) => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev);
      newMonth.setMonth(prev.getMonth() + direction);
      return newMonth;
    });
  };

  const handleDateClick = (date) => {
    if (isDateDisabled(date)) return;

    setShowTimeSelector(true);

    // Combine date with selected time
    const [hours, minutes] = selectedTime.split(':');
    const combinedDateTime = new Date(date);
    combinedDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    onDateSelect(combinedDateTime);
  };

  const handleTimeChange = (time) => {
    setSelectedTime(time);

    if (selectedDate) {
      const [hours, minutes] = time.split(':');
      const newDateTime = new Date(selectedDate);
      newDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      onDateSelect(newDateTime);
    }
  };

  const confirmSelection = () => {
    if (selectedDate) {
      onClose && onClose();
    }
  };

  const renderCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentMonth);
    const firstDay = getFirstDayOfMonth(currentMonth);
    const days = [];

    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(
        <div key={`empty-${i}`} className="h-12 w-full" />
      );
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
      const isSelected = selectedDate &&
        date.toDateString() === new Date(selectedDate).toDateString();
      const isDisabled = isDateDisabled(date);
      const isPast = isDateInPast(date);
      const isWithin24 = isWithin24Hours(date);
      const isToday = date.toDateString() === today.toDateString();

      days.push(
        <motion.button
          key={day}
          whileHover={!isDisabled ? { scale: 1.05 } : {}}
          whileTap={!isDisabled ? { scale: 0.95 } : {}}
          onClick={() => handleDateClick(date)}
          disabled={isDisabled}
          className={`
            h-12 w-full rounded-lg text-sm font-medium transition-all duration-200 relative
            ${isSelected
              ? 'bg-fixly-accent text-white shadow-lg'
              : isToday
              ? 'bg-fixly-primary/10 text-fixly-primary border-2 border-fixly-primary'
              : isDisabled
              ? 'text-gray-300 cursor-not-allowed bg-gray-50'
              : isPast
              ? 'text-gray-400 hover:bg-gray-50'
              : 'text-fixly-text hover:bg-fixly-accent/10 hover:text-fixly-accent'
            }
            ${isWithin24 && requiresPro24Hours && !isPro ? 'border border-amber-300 bg-amber-50' : ''}
          `}
        >
          {day}

          {/* Pro indicator for 24-hour dates */}
          {isWithin24 && requiresPro24Hours && !isPro && (
            <div className="absolute -top-1 -right-1">
              <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
            </div>
          )}

          {/* Today indicator */}
          {isToday && !isSelected && (
            <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2">
              <div className="w-1 h-1 bg-fixly-primary rounded-full" />
            </div>
          )}
        </motion.button>
      );
    }

    return days;
  };

  const timeSlots = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      timeSlots.push(time);
    }
  }

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className={`bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden ${className}`}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-fixly-primary to-fixly-accent p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">
                  {mode === 'scheduled' ? 'Select Schedule Date' : 'Select Deadline'}
                </h3>
                <p className="text-white/80 text-sm">
                  {mode === 'scheduled'
                    ? 'Choose when you want this job to be started'
                    : 'Choose when you need this completed'
                  }
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Calendar Navigation */}
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigateMonth(-1)}
              className="p-2 hover:bg-fixly-accent/10 rounded-lg transition-colors text-fixly-text"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <h4 className="text-lg font-semibold text-fixly-text">
              {currentMonth.toLocaleDateString('en-US', {
                month: 'long',
                year: 'numeric'
              })}
            </h4>

            <button
              onClick={() => navigateMonth(1)}
              className="p-2 hover:bg-fixly-accent/10 rounded-lg transition-colors text-fixly-text"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="p-6">
          {/* Days of week header */}
          <div className="grid grid-cols-7 gap-1 mb-4">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
              <div key={day} className="h-8 flex items-center justify-center text-sm font-medium text-gray-500">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div className="grid grid-cols-7 gap-1">
            {renderCalendarDays()}
          </div>
        </div>

        {/* Pro Feature Notice */}
        {requiresPro24Hours && !isPro && (
          <div className="mx-6 mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start space-x-3">
              <Star className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h5 className="font-medium text-amber-900">Need it within 24 hours?</h5>
                <p className="text-sm text-amber-700 mt-1">
                  Upgrade to Pro for priority scheduling and same-day job posting.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Time Selector */}
        <AnimatePresence>
          {showTimeSelector && selectedDate && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-gray-100 overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <Clock className="h-5 w-5 text-fixly-accent" />
                  <h5 className="font-medium text-fixly-text">Select Time</h5>
                </div>

                <div className="grid grid-cols-4 gap-2 max-h-32 overflow-y-auto">
                  {timeSlots.map(time => (
                    <button
                      key={time}
                      onClick={() => handleTimeChange(time)}
                      className={`
                        px-3 py-2 rounded-lg text-sm font-medium transition-colors
                        ${selectedTime === time
                          ? 'bg-fixly-accent text-white'
                          : 'text-fixly-text hover:bg-fixly-accent/10'
                        }
                      `}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {selectedDate ? (
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>
                    {new Date(selectedDate).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })} at {selectedTime}
                  </span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4 text-gray-400" />
                  <span>Select a date to continue</span>
                </div>
              )}
            </div>

            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="btn-ghost text-sm"
              >
                Cancel
              </button>
              <button
                onClick={confirmSelection}
                disabled={!selectedDate}
                className="btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default AnimatedCalendar;