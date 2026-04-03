'use client';

import { motion } from 'framer-motion';
import {
  AlertCircle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Star,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { CalendarDayGrid } from './CalendarDayGrid';
import { type DateInput, type CalendarMode, formatTimePart, toValidDate } from './calendarHelpers';
import { CalendarTimeSelector } from './CalendarTimeSelector';

interface AnimatedCalendarProps {
  selectedDate?: DateInput;
  onDateSelect: (date: Date) => void;
  minDate?: DateInput;
  maxDate?: DateInput;
  isPro?: boolean;
  requiresPro24Hours?: boolean;
  className?: string;
  isOpen: boolean;
  onClose?: () => void;
  mode?: CalendarMode;
}

export default function AnimatedCalendar({
  selectedDate,
  onDateSelect,
  minDate,
  maxDate,
  isPro = false,
  requiresPro24Hours = true,
  className = '',
  isOpen,
  onClose,
  mode = 'deadline',
}: AnimatedCalendarProps): React.JSX.Element | null {
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string>('09:00');
  const [showTimeSelector, setShowTimeSelector] = useState<boolean>(false);

  const selectedDateObject = useMemo(() => toValidDate(selectedDate), [selectedDate]);

  useEffect(() => {
    if (!selectedDateObject) return;
    setCurrentMonth(new Date(selectedDateObject));
    setSelectedTime(
      `${formatTimePart(selectedDateObject.getHours())}:${formatTimePart(selectedDateObject.getMinutes())}`
    );
  }, [selectedDateObject]);

  const today = useMemo(() => new Date(), []);
  const tomorrow = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() + 1);
    return d;
  }, [today]);
  const minimumDate = useMemo(() => toValidDate(minDate) ?? tomorrow, [minDate, tomorrow]);
  const maximumDate = useMemo(
    () => toValidDate(maxDate) ?? new Date(today.getFullYear() + 1, 11, 31),
    [maxDate, today]
  );
  const twentyFourHoursFromNow = useMemo(() => {
    const d = new Date();
    d.setHours(d.getHours() + 24);
    return d;
  }, []);

  const navigateMonth = (direction: -1 | 1): void => {
    setCurrentMonth((prev) => {
      const next = new Date(prev);
      next.setMonth(prev.getMonth() + direction);
      return next;
    });
  };

  const handleDayClick = (date: Date): void => {
    setShowTimeSelector(true);
    const [h, m] = selectedTime.split(':');
    const dt = new Date(date);
    dt.setHours(parseInt(h, 10), parseInt(m, 10), 0, 0);
    onDateSelect(dt);
  };

  const handleTimeChange = (time: string): void => {
    setSelectedTime(time);
    if (!selectedDateObject) return;
    const [h, m] = time.split(':');
    const dt = new Date(selectedDateObject);
    dt.setHours(parseInt(h, 10), parseInt(m, 10), 0, 0);
    onDateSelect(dt);
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className={`w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl ${className}`}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-fixly-primary to-fixly-accent p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">
                  {mode === 'scheduled' ? 'Select Schedule Date' : 'Select Deadline'}
                </h3>
                <p className="text-sm text-white/80">
                  {mode === 'scheduled'
                    ? 'Choose when you want this job to be started'
                    : 'Choose when you need this completed'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Month navigation */}
        <div className="border-b border-gray-100 px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigateMonth(-1)}
              className="rounded-lg p-2 text-fixly-text transition-colors hover:bg-fixly-accent/10"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <h4 className="text-lg font-semibold text-fixly-text">
              {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h4>
            <button
              onClick={() => navigateMonth(1)}
              className="rounded-lg p-2 text-fixly-text transition-colors hover:bg-fixly-accent/10"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Day grid */}
        <div className="p-6">
          <CalendarDayGrid
            currentMonth={currentMonth}
            selectedDate={selectedDateObject}
            today={today}
            minimumDate={minimumDate}
            maximumDate={maximumDate}
            twentyFourHoursFromNow={twentyFourHoursFromNow}
            isPro={isPro}
            requiresPro24Hours={requiresPro24Hours}
            onDayClick={handleDayClick}
          />
        </div>

        {/* Pro upgrade notice */}
        {requiresPro24Hours && !isPro ? (
          <div className="mx-6 mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start space-x-3">
              <Star className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-500" />
              <div className="flex-1">
                <h5 className="font-medium text-amber-900">Need it within 24 hours?</h5>
                <p className="mt-1 text-sm text-amber-700">
                  Upgrade to Pro for priority scheduling and same-day job posting.
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {/* Time selector */}
        <CalendarTimeSelector
          show={showTimeSelector}
          hasDate={Boolean(selectedDateObject)}
          selectedTime={selectedTime}
          onTimeChange={handleTimeChange}
        />

        {/* Footer */}
        <div className="border-t border-gray-100 bg-gray-50 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {selectedDateObject ? (
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>
                    {selectedDateObject.toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}{' '}
                    at {selectedTime}
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
              <button onClick={onClose} className="btn-ghost text-sm">
                Cancel
              </button>
              <button
                onClick={onClose}
                disabled={!selectedDateObject}
                className="btn-primary text-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
