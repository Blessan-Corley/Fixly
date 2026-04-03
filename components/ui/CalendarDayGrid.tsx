'use client';

import { motion } from 'framer-motion';
import { Star } from 'lucide-react';

import { WEEKDAY_LABELS } from './calendarHelpers';

type CalendarDayGridProps = {
  currentMonth: Date;
  selectedDate: Date | null;
  today: Date;
  minimumDate: Date;
  maximumDate: Date;
  twentyFourHoursFromNow: Date;
  isPro: boolean;
  requiresPro24Hours: boolean;
  onDayClick: (date: Date) => void;
};

function getDaysInMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

function getFirstDayOfMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
}

export function CalendarDayGrid({
  currentMonth,
  selectedDate,
  today,
  minimumDate,
  maximumDate,
  twentyFourHoursFromNow,
  isPro,
  requiresPro24Hours,
  onDayClick,
}: CalendarDayGridProps): React.JSX.Element {
  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDay = getFirstDayOfMonth(currentMonth);

  const isDisabled = (date: Date): boolean => {
    if (date < minimumDate || date > maximumDate) return true;
    if (requiresPro24Hours && !isPro) return date < twentyFourHoursFromNow;
    return false;
  };

  const isPast = (date: Date): boolean => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    return date < startOfToday;
  };

  const isWithin24h = (date: Date): boolean =>
    date < twentyFourHoursFromNow && date >= today;

  const days: React.JSX.Element[] = [];

  for (let i = 0; i < firstDay; i += 1) {
    days.push(<div key={`e-${i}`} className="h-12 w-full" />);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const selected = Boolean(selectedDate && date.toDateString() === selectedDate.toDateString());
    const disabled = isDisabled(date);
    const past = isPast(date);
    const within24h = isWithin24h(date);
    const isToday = date.toDateString() === today.toDateString();

    days.push(
      <motion.button
        key={day}
        whileHover={!disabled ? { scale: 1.05 } : {}}
        whileTap={!disabled ? { scale: 0.95 } : {}}
        onClick={() => onDayClick(date)}
        disabled={disabled}
        className={`
          relative h-12 w-full rounded-lg text-sm font-medium transition-all duration-200
          ${
            selected
              ? 'bg-fixly-accent text-white shadow-lg'
              : isToday
                ? 'border-2 border-fixly-primary bg-fixly-primary/10 text-fixly-primary'
                : disabled
                  ? 'cursor-not-allowed bg-gray-50 text-gray-300'
                  : past
                    ? 'text-gray-400 hover:bg-gray-50'
                    : 'text-fixly-text hover:bg-fixly-accent/10 hover:text-fixly-accent'
          }
          ${within24h && requiresPro24Hours && !isPro ? 'border border-amber-300 bg-amber-50' : ''}
        `}
      >
        {day}
        {within24h && requiresPro24Hours && !isPro ? (
          <div className="absolute -right-1 -top-1">
            <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
          </div>
        ) : null}
        {isToday && !selected ? (
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 transform">
            <div className="h-1 w-1 rounded-full bg-fixly-primary" />
          </div>
        ) : null}
      </motion.button>
    );
  }

  return (
    <>
      <div className="mb-4 grid grid-cols-7 gap-1">
        {WEEKDAY_LABELS.map((d) => (
          <div
            key={d}
            className="flex h-8 items-center justify-center text-sm font-medium text-gray-500"
          >
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">{days}</div>
    </>
  );
}
